#!/usr/bin/env bash
# =============================================================================
# SOAR DB 마이그레이션 실행 스크립트
# 사용법: ./scripts/migrate.sh [run|revert|generate <name>] [dev|prod]
# =============================================================================
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MODE="${SOAR_MODE:-dev}"
ENV_FILE="$REPO_ROOT/.env.$MODE"

CYAN='\033[0;36m'; GREEN='\033[0;32m'; RED='\033[0;31m'; RESET='\033[0m'
info()    { echo -e "${CYAN}[INFO]${RESET}  $*"; }
success() { echo -e "${GREEN}[OK]${RESET}    $*"; }
error()   { echo -e "${RED}[ERROR]${RESET} $*" >&2; }

if [[ ! -f "$ENV_FILE" ]]; then
  error "환경변수 파일이 없습니다: $ENV_FILE"
  exit 1
fi
set -a; source "$ENV_FILE"; set +a

cd "$REPO_ROOT/backend"
[[ -d node_modules ]] || npm ci

CMD="${1:-run}"
shift || true

# 마지막 인자가 dev/prod면 실행 모드로 해석
if [[ "${!#:-}" == "dev" || "${!#:-}" == "prod" ]]; then
  MODE="${!#}"
  ENV_FILE="$REPO_ROOT/.env.$MODE"
  if [[ ! -f "$ENV_FILE" ]]; then
    error "환경변수 파일이 없습니다: $ENV_FILE"
    exit 1
  fi
  set -a; source "$ENV_FILE"; set +a
  set -- "${@:1:$(($#-1))}"
fi

case "$CMD" in
  run)
    info "soar_admin 마이그레이션 실행..."
    npm run migration:run:admin
    success "마이그레이션 완료"
    ;;
  revert)
    info "soar_admin 마이그레이션 롤백..."
    npm run migration:revert:admin
    success "롤백 완료"
    ;;
  generate)
    NAME="${1:-unnamed}"
    info "마이그레이션 파일 생성: $NAME"
    npm run "migration:generate:admin" --name="$NAME"
    success "생성 완료: src/database/migrations/admin/"
    ;;
  *)
    echo "사용법: $0 [run|revert|generate <name>] [dev|prod]"
    exit 1
    ;;
esac
