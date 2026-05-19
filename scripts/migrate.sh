#!/usr/bin/env bash
# =============================================================================
# SOAR DB 마이그레이션 실행 스크립트
# 사용법: ./scripts/migrate.sh [run|revert|generate <name>|reset [db|tables] [--yes]] [dev|prod]
# =============================================================================
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MODE="${SOAR_MODE:-dev}"
ENV_FILE="$REPO_ROOT/.env.$MODE"

CYAN='\033[0;36m'; GREEN='\033[0;32m'; RED='\033[0;31m'; RESET='\033[0m'
info()    { echo -e "${CYAN}[INFO]${RESET}  $*"; }
success() { echo -e "${GREEN}[OK]${RESET}    $*"; }
error()   { echo -e "${RED}[ERROR]${RESET} $*" >&2; }

print_migrate_hint() {
  local action="$1"

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo " 마이그레이션 실행 안내"
  echo "  모드         : $MODE"
  echo "  환경파일     : $ENV_FILE"

  case "$action" in
    run)
      echo "  상태 확인     : ./scripts/status.sh"
      echo "  스모크 테스트 : ./scripts/smoke.sh $MODE"
      echo "  롤백 실행     : ./scripts/migrate.sh revert $MODE"
      ;;
    revert)
      echo "  재적용 실행   : ./scripts/migrate.sh run $MODE"
      ;;
    generate)
      echo "  적용 실행     : ./scripts/migrate.sh run $MODE"
      ;;
    reset)
      echo "  기본 실행     : ./scripts/migrate.sh run $MODE"
      echo "  상태 확인     : ./scripts/status.sh"
      echo "  스모크 테스트 : ./scripts/smoke.sh $MODE"
      ;;
  esac
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

confirm_destructive() {
  local message="$1"
  local force_flag="${2:-}"

  if [[ "$force_flag" == "--yes" || "${SOAR_MIGRATE_FORCE:-0}" == "1" ]]; then
    return 0
  fi

  if [[ ! -t 0 ]]; then
    error "파괴적 작업입니다. --yes 또는 SOAR_MIGRATE_FORCE=1 옵션이 필요합니다."
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

reset_admin_database() {
  info "soar_admin DB DROP/CREATE 수행 중..."
  node <<'NODE'
const mysql = require('mysql2/promise');

const host = process.env.DB_HOST || 'localhost';
const port = Number(process.env.DB_PORT || '3306');
const user = process.env.DB_USER || 'soar';
const password = process.env.DB_PASSWORD || 'soarpassword';
const database = process.env.DB_NAME || 'soar_admin';

if (!/^[A-Za-z0-9_]+$/.test(database)) {
  throw new Error(`Unsafe DB name: ${database}`);
}

async function main() {
  const conn = await mysql.createConnection({ host, port, user, password });
  await conn.query(`DROP DATABASE IF EXISTS \`${database}\``);
  await conn.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await conn.end();
  console.log(`[Reset] Database recreated: ${database}`);
}

main().catch((err) => {
  console.error('[Reset] Failed to recreate database:', err.message);
  process.exit(1);
});
NODE
}

reset_admin_tables() {
  info "soar_admin 테이블 스키마 DROP 수행 중..."
  npx typeorm-ts-node-commonjs -d src/database/admin-data-source.ts schema:drop
}

run_admin_migrate_and_seed() {
  info "soar_admin 마이그레이션 실행..."
  npm run migration:run:admin
  info "Admin Seed 실행..."
  npm run setup
}

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

info "마이그레이션 모드: $MODE (env: $ENV_FILE)"

case "$CMD" in
  run)
    info "soar_admin 마이그레이션 실행..."
    npm run migration:run:admin
    success "마이그레이션 완료"
    print_migrate_hint run
    ;;
  revert)
    info "soar_admin 마이그레이션 롤백..."
    npm run migration:revert:admin
    success "롤백 완료"
    print_migrate_hint revert
    ;;
  generate)
    NAME="${1:-unnamed}"
    info "마이그레이션 파일 생성: $NAME"
    npm run "migration:generate:admin" --name="$NAME"
    success "생성 완료: src/database/migrations/admin/"
    print_migrate_hint generate
    ;;
  reset)
    RESET_KIND="${1:-db}"
    FORCE_FLAG="${2:-}"

    if [[ "$RESET_KIND" != "db" && "$RESET_KIND" != "tables" ]]; then
      error "reset 옵션은 db 또는 tables만 지원합니다."
      echo "사용법: $0 reset [db|tables] [--yes] [dev|prod]"
      exit 1
    fi

    if [[ "$RESET_KIND" == "db" ]]; then
      confirm_destructive "DB를 삭제 후 재생성합니다: soar_admin" "$FORCE_FLAG" || exit 1
      reset_admin_database
    else
      confirm_destructive "soar_admin의 모든 테이블을 삭제합니다." "$FORCE_FLAG" || exit 1
      reset_admin_tables
    fi

    run_admin_migrate_and_seed
    success "리셋 완료 ($RESET_KIND)"
    print_migrate_hint reset
    ;;
  *)
    echo "사용법: $0 [run|revert|generate <name>|reset [db|tables] [--yes]] [dev|prod]"
    exit 1
    ;;
esac
