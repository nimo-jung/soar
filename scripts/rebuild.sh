#!/usr/bin/env bash
# =============================================================================
# TMS Docker 캐시 정리 + 완전 재빌드/재기동 스크립트
# 사용법: ./scripts/rebuild.sh [dev|prod] [--yes] [--skip-prune] [--with-volumes] [--with-db-reset]
#   ./scripts/rebuild.sh dev
#   ./scripts/rebuild.sh prod --yes
#   ./scripts/rebuild.sh dev --yes --with-volumes
#   ./scripts/rebuild.sh dev --yes --with-db-reset
# =============================================================================
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MODE="dev"
FORCE="0"
SKIP_PRUNE="0"
WITH_VOLUMES="0"
WITH_DB_RESET="0"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; RESET='\033[0m'
info()    { echo -e "${CYAN}[INFO]${RESET}  $*"; }
success() { echo -e "${GREEN}[OK]${RESET}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
error()   { echo -e "${RED}[ERROR]${RESET} $*" >&2; }

usage() {
  cat <<'EOF'
사용법: ./scripts/rebuild.sh [dev|prod] [--yes] [--skip-prune] [--with-volumes] [--with-db-reset]

옵션:
  dev|prod        실행 모드 (기본: dev)
  --yes           확인 프롬프트 없이 진행
  --skip-prune    Docker build cache/image prune 생략
  --with-volumes  compose down 시 named volume까지 삭제 (매우 파괴적)
  --with-db-reset 재기동 후 admin DB reset + tenant_db_* 전체 삭제 실행

예시:
  ./scripts/rebuild.sh dev
  ./scripts/rebuild.sh dev --yes
  ./scripts/rebuild.sh dev --yes --with-db-reset
  ./scripts/rebuild.sh prod --yes --with-volumes
EOF
}

confirm() {
  local message="$1"

  if [[ "$FORCE" == "1" ]]; then
    return 0
  fi

  if [[ ! -t 0 ]]; then
    error "비대화형 환경에서는 --yes 옵션이 필요합니다."
    return 1
  fi

  echo ""
  warn "$message"
  read -r -p "계속하시겠습니까? [y/N]: " answer
  if [[ ! "$answer" =~ ^[Yy]$ ]]; then
    info "요청에 의해 작업을 취소했습니다."
    return 1
  fi
}

if ! command -v docker >/dev/null 2>&1; then
  error "docker 명령을 찾을 수 없습니다."
  exit 1
fi

while [[ $# -gt 0 ]]; do
  case "$1" in
    dev|prod)
      MODE="$1"
      ;;
    --yes)
      FORCE="1"
      ;;
    --skip-prune)
      SKIP_PRUNE="1"
      ;;
    --with-volumes)
      WITH_VOLUMES="1"
      ;;
    --with-db-reset)
      WITH_DB_RESET="1"
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      error "알 수 없는 옵션: $1"
      usage
      exit 1
      ;;
  esac
  shift
done

ENV_FILE="$REPO_ROOT/.env.$MODE"
if [[ ! -f "$ENV_FILE" ]]; then
  error "환경변수 파일이 없습니다: $ENV_FILE"
  exit 1
fi

COMPOSE_BASE=(docker compose -f "$REPO_ROOT/docker-compose.yml" --profile "$MODE" --env-file "$ENV_FILE")

summary_message="Docker 캐시 정리 + 완전 재빌드/재기동을 수행합니다. (mode=$MODE"
if [[ "$WITH_VOLUMES" == "1" ]]; then
  summary_message+=", named volume 삭제 포함"
fi
if [[ "$WITH_DB_RESET" == "1" ]]; then
  summary_message+=", DB reset + tenant DB 전체 삭제 포함"
fi
summary_message+=")"

confirm "$summary_message" || exit 1

info "실행 모드: $MODE (env: $ENV_FILE)"

if [[ "$WITH_VOLUMES" == "1" ]]; then
  warn "named volume까지 삭제합니다. DB/Redis 등 데이터가 유실될 수 있습니다."
  "${COMPOSE_BASE[@]}" down -v --remove-orphans
else
  "${COMPOSE_BASE[@]}" down --remove-orphans
fi

if [[ "$SKIP_PRUNE" == "0" ]]; then
  info "Docker build cache 정리 중..."
  docker builder prune -af
  info "Dangling/unused image 정리 중..."
  docker image prune -f
else
  warn "--skip-prune 옵션으로 cache/image prune을 생략합니다."
fi

info "이미지 재빌드 + 컨테이너 재생성 + 익명 볼륨 갱신(node_modules) 중..."
"${COMPOSE_BASE[@]}" up -d --build --force-recreate --renew-anon-volumes

if [[ "$WITH_DB_RESET" == "1" ]]; then
  info "DB reset 수행 중... (./scripts/migrate.sh reset db --yes $MODE)"
  "$REPO_ROOT/scripts/migrate.sh" reset db --yes "$MODE"
  info "테넌트 DB 전체 삭제 수행 중... (./scripts/migrate.sh reset all-tenants --yes $MODE)"
  "$REPO_ROOT/scripts/migrate.sh" reset all-tenants --yes "$MODE"
fi

success "완전 재빌드/재기동 완료"
echo ""
echo "다음 확인 명령:"
echo "  docker compose --profile $MODE --env-file $ENV_FILE ps"
echo "  docker compose --profile $MODE --env-file $ENV_FILE logs -f backend-$MODE"
