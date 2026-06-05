#!/usr/bin/env bash
# =============================================================================
# TMS 스모크 테스트 스크립트
# 사용법: ./scripts/smoke.sh [dev|prod]
# =============================================================================
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MODE="${1:-dev}"

if [[ "$MODE" != "dev" && "$MODE" != "prod" ]]; then
  echo "사용법: $0 [dev|prod]"
  exit 1
fi

ENV_FILE="$REPO_ROOT/.env.$MODE"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "[ERROR] 환경변수 파일이 없습니다: $ENV_FILE"
  exit 1
fi

set -a
source "$ENV_FILE"
set +a

GREEN='\033[0;32m'; RED='\033[0;31m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; RESET='\033[0m'
info()    { echo -e "${CYAN}[INFO]${RESET}  $*"; }
success() { echo -e "${GREEN}[OK]${RESET}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
error()   { echo -e "${RED}[ERROR]${RESET} $*"; }

MASTER_EMAIL="${MASTER_ADMIN_EMAIL:-admin@tms.io}"
MASTER_PASSWORD="${MASTER_ADMIN_PASSWORD:-ChangeMe1234!}"
TENANT_SLUG="${SMOKE_TENANT_SLUG:-demo}"
TENANT_EMAIL="${SMOKE_TENANT_EMAIL:-operator@demo.local}"
TENANT_PASSWORD="${SMOKE_TENANT_PASSWORD:-Demo1234!}"

if [[ "$MODE" == "dev" ]]; then
  BACKEND_BASE="http://localhost:${PORT_BACKEND:-3000}"
  MASTER_BASE="http://localhost:${PORT_FRONTEND:-5173}"
  RUN_TENANT_LOGIN="${RUN_TENANT_LOGIN:-1}"
else
  BACKEND_BASE="http://localhost:${PORT_BACKEND:-3000}"
  MASTER_BASE="http://localhost:${PORT_FRONTEND:-5173}"
  RUN_TENANT_LOGIN="${RUN_TENANT_LOGIN:-0}"
fi

check_code() {
  local name="$1" expected="$2" actual="$3"
  if [[ "$actual" == "$expected" ]]; then
    success "$name -> HTTP $actual"
  else
    error "$name -> HTTP $actual (expected $expected)"
    return 1
  fi
}

post_json() {
  local url="$1" payload="$2" out_file="$3"
  curl --max-time 10 -sS -o "$out_file" -w '%{http_code}' \
    -X POST "$url" \
    -H 'Content-Type: application/json' \
    -d "$payload"
}

failed=0
info "TMS 스모크 테스트 시작 (mode=$MODE)"

if [[ "$MODE" == "dev" ]]; then
  code=$(curl --max-time 10 -sS -o /tmp/tms_smoke_docs_dev.txt -w '%{http_code}' "$BACKEND_BASE/docs/" || echo 000)
  check_code "dev backend docs" 200 "$code" || failed=1

  code=$(post_json "$BACKEND_BASE/auth/master/login" "{\"email\":\"$MASTER_EMAIL\",\"password\":\"$MASTER_PASSWORD\"}" /tmp/tms_smoke_master_backend.json || echo 000)
  check_code "dev backend master login" 200 "$code" || failed=1

  code=$(post_json "$MASTER_BASE/auth/master/login" "{\"email\":\"$MASTER_EMAIL\",\"password\":\"$MASTER_PASSWORD\"}" /tmp/tms_smoke_master_masterui.json || echo 000)
  check_code "dev master-ui proxy master login" 200 "$code" || failed=1

  if [[ "$RUN_TENANT_LOGIN" == "1" ]]; then
    code=$(post_json "$MASTER_BASE/auth/tenant/login" "{\"tenantSlug\":\"$TENANT_SLUG\",\"email\":\"$TENANT_EMAIL\",\"password\":\"$TENANT_PASSWORD\"}" /tmp/tms_smoke_tenant_masterui.json || echo 000)
    check_code "dev master-ui proxy tenant login" 200 "$code" || failed=1
  else
    warn "tenant 로그인 점검을 건너뜁니다. (RUN_TENANT_LOGIN=$RUN_TENANT_LOGIN)"
  fi
else
  code=$(curl --max-time 10 -sS -o /tmp/tms_smoke_docs_prod.txt -w '%{http_code}' "$BACKEND_BASE/docs/" || echo 000)
  check_code "prod backend docs" 200 "$code" || failed=1

  code=$(curl --max-time 10 -sS -o /tmp/tms_smoke_master_ui_prod.txt -w '%{http_code}' "$MASTER_BASE/master/" || echo 000)
  check_code "prod master ui shell" 200 "$code" || failed=1

  if [[ "$MASTER_PASSWORD" == replace_with* ]]; then
    warn "MASTER_ADMIN_PASSWORD가 placeholder 값입니다. master login 점검을 건너뜁니다."
  else
    code=$(post_json "$BACKEND_BASE/auth/master/login" "{\"email\":\"$MASTER_EMAIL\",\"password\":\"$MASTER_PASSWORD\"}" /tmp/tms_smoke_master_backend_prod.json || echo 000)
    check_code "prod backend master login" 200 "$code" || failed=1
  fi

  if [[ "$RUN_TENANT_LOGIN" == "1" ]]; then
    code=$(post_json "$BACKEND_BASE/auth/tenant/login" "{\"tenantSlug\":\"$TENANT_SLUG\",\"email\":\"$TENANT_EMAIL\",\"password\":\"$TENANT_PASSWORD\"}" /tmp/tms_smoke_tenant_backend_prod.json || echo 000)
    check_code "prod backend tenant login" 200 "$code" || failed=1
  else
    warn "tenant 로그인 점검을 건너뜁니다. (RUN_TENANT_LOGIN=$RUN_TENANT_LOGIN)"
  fi
fi

if [[ "$failed" -eq 0 ]]; then
  success "스모크 테스트 통과"
  exit 0
fi

error "스모크 테스트 실패"
exit 1
