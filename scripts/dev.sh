#!/usr/bin/env bash
# =============================================================================
# SOAR 개발 서버 일괄 기동 스크립트 (dev mode)
# 사용법: ./scripts/dev.sh [service]
#   ./scripts/dev.sh          → 인프라 + 백엔드 + 프론트엔드 전체 기동
#   ./scripts/dev.sh infra    → 인프라만 (MariaDB, Redis, ClickHouse, RedPanda)
#   ./scripts/dev.sh backend  → 백엔드만
#   ./scripts/dev.sh admin    → Frontend Admin만
#   ./scripts/dev.sh tenant   → Frontend Tenant만
#   ./scripts/dev.sh engine   → Go Engine만
# =============================================================================
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$REPO_ROOT/.env"

# ── 색상 출력 헬퍼 ───────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'
info()    { echo -e "${CYAN}[INFO]${RESET}  $*"; }
success() { echo -e "${GREEN}[OK]${RESET}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
error()   { echo -e "${RED}[ERROR]${RESET} $*" >&2; }

# ── .env 확인 ────────────────────────────────────────────────────────────────
if [[ ! -f "$ENV_FILE" ]]; then
  warn ".env 파일이 없습니다. .env.example 을 복사합니다..."
  cp "$REPO_ROOT/.env.example" "$ENV_FILE"
  warn ".env 파일을 열어 비밀번호 등을 설정한 뒤 다시 실행하세요."
  exit 1
fi
set -a; source "$ENV_FILE"; set +a

# ── PID 파일 관리 ─────────────────────────────────────────────────────────────
PID_DIR="$REPO_ROOT/.pids"
mkdir -p "$PID_DIR"

save_pid() { echo "$!" > "$PID_DIR/$1.pid"; }

# ── 인프라 (Docker Compose) ───────────────────────────────────────────────────
start_infra() {
  info "인프라 컨테이너 기동 중 (MariaDB, Redis, ClickHouse, RedPanda)..."
  docker compose -f "$REPO_ROOT/docker-compose.yml" up -d \
    mariadb redis clickhouse redpanda redpanda-console
  success "인프라 기동 완료"
}

# ── Backend ───────────────────────────────────────────────────────────────────
start_backend() {
  info "Backend (NestJS dev) 기동 중..."
  cd "$REPO_ROOT/backend"
  [[ -d node_modules ]] || npm ci
  NODE_ENV=development npm run start:dev &
  save_pid backend
  success "Backend PID: $(cat "$PID_DIR/backend.pid")  →  http://localhost:${PORT_BACKEND:-3000}"
  success "Swagger:  http://localhost:${PORT_BACKEND:-3000}/docs"
}

# ── Frontend Admin ────────────────────────────────────────────────────────────
start_admin() {
  info "Frontend Admin (Vite dev) 기동 중..."
  cd "$REPO_ROOT/frontend-admin"
  [[ -d node_modules ]] || npm ci
  npm run dev &
  save_pid frontend-admin
  success "Admin UI PID: $(cat "$PID_DIR/frontend-admin.pid")  →  http://localhost:${PORT_FRONTEND_ADMIN:-5174}"
}

# ── Frontend Tenant ───────────────────────────────────────────────────────────
start_tenant() {
  info "Frontend Tenant (Vite dev) 기동 중..."
  cd "$REPO_ROOT/frontend-tenant"
  [[ -d node_modules ]] || npm ci
  npm run dev &
  save_pid frontend-tenant
  success "Tenant UI PID: $(cat "$PID_DIR/frontend-tenant.pid")  →  http://localhost:${PORT_FRONTEND_TENANT:-5173}"
}

# ── Go Engine ─────────────────────────────────────────────────────────────────
start_engine() {
  info "Go Engine 기동 중..."
  cd "$REPO_ROOT/go-engine"
  if ! command -v go &>/dev/null; then
    error "Go가 설치되어 있지 않습니다. 'sudo snap install go' 또는 docker 모드를 사용하세요."
    return 1
  fi
  go mod download
  REDIS_HOST="${REDIS_HOST:-localhost}" \
  REDIS_PORT="${REDIS_PORT:-6379}" \
  REDIS_PASSWORD="${REDIS_PASSWORD:-}" \
  REDPANDA_HOST="${REDPANDA_HOST:-localhost}" \
  REDPANDA_PORT="${PORT_REDPANDA_KAFKA:-19092}" \
  PORT="${PORT_GO_ENGINE:-8081}" \
  go run ./cmd/engine &
  save_pid go-engine
  success "Go Engine PID: $(cat "$PID_DIR/go-engine.pid")  →  http://localhost:${PORT_GO_ENGINE:-8081}"
}

# ── 메인 ─────────────────────────────────────────────────────────────────────
SERVICE="${1:-all}"

case "$SERVICE" in
  infra)   start_infra ;;
  backend) start_infra; start_backend ;;
  admin)   start_admin ;;
  tenant)  start_tenant ;;
  engine)  start_infra; start_engine ;;
  all)
    start_infra
    sleep 3
    start_backend
    start_admin
    start_tenant
    start_engine
    echo ""
    echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
    echo -e "${BOLD} SOAR 개발 서버 기동 완료${RESET}"
    echo -e "  Backend    → http://localhost:${PORT_BACKEND:-3000}"
    echo -e "  Swagger    → http://localhost:${PORT_BACKEND:-3000}/docs"
    echo -e "  Admin UI   → http://localhost:${PORT_FRONTEND_ADMIN:-5174}"
    echo -e "  Tenant UI  → http://localhost:${PORT_FRONTEND_TENANT:-5173}"
    echo -e "  Go Engine  → http://localhost:${PORT_GO_ENGINE:-8081}"
    echo -e "  RedPanda   → http://localhost:${PORT_REDPANDA_CONSOLE:-8080}"
    echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
    echo -e "${YELLOW}종료: ./scripts/stop.sh${RESET}"
    ;;
  *)
    error "알 수 없는 서비스: $SERVICE"
    echo "사용법: $0 [all|infra|backend|admin|tenant|engine]"
    exit 1
    ;;
esac
