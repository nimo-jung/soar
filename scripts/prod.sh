#!/usr/bin/env bash
# =============================================================================
# SOAR 운영 빌드 & 기동 스크립트 (production mode)
# 사용법: ./scripts/prod.sh [service]
#   ./scripts/prod.sh          → 전체 빌드 후 기동
#   ./scripts/prod.sh build    → 전체 빌드만 (기동 안 함)
#   ./scripts/prod.sh docker   → docker compose --profile app up -d (권장)
#   ./scripts/prod.sh backend  → 백엔드 빌드 + 기동
#   ./scripts/prod.sh admin    → Frontend Admin 빌드 (정적 파일 생성)
#   ./scripts/prod.sh tenant   → Frontend Tenant 빌드 (정적 파일 생성)
#   ./scripts/prod.sh engine   → Go Engine 빌드 + 기동
# =============================================================================
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$REPO_ROOT/.env"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'
info()    { echo -e "${CYAN}[INFO]${RESET}  $*"; }
success() { echo -e "${GREEN}[OK]${RESET}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
error()   { echo -e "${RED}[ERROR]${RESET} $*" >&2; }

if [[ ! -f "$ENV_FILE" ]]; then
  error ".env 파일이 없습니다. cp .env.example .env 후 설정하세요."
  exit 1
fi
set -a; source "$ENV_FILE"; set +a

if [[ "${NODE_ENV:-}" != "production" ]]; then
  warn "NODE_ENV=production 이 .env에 설정되어 있지 않습니다."
fi

PID_DIR="$REPO_ROOT/.pids"
mkdir -p "$PID_DIR"
save_pid() { echo "$!" > "$PID_DIR/$1.pid"; }

# ── 인프라 ────────────────────────────────────────────────────────────────────
start_infra() {
  info "인프라 컨테이너 기동 중..."
  docker compose -f "$REPO_ROOT/docker-compose.yml" up -d \
    mariadb redis clickhouse redpanda
  success "인프라 기동 완료"
}

# ── Backend 빌드 + 기동 ───────────────────────────────────────────────────────
build_backend() {
  info "Backend 빌드 중 (TypeScript → dist/)..."
  cd "$REPO_ROOT/backend"
  npm ci --omit=dev
  npm run build
  success "Backend 빌드 완료: dist/"
}

start_backend_prod() {
  info "Backend (production) 기동 중..."
  cd "$REPO_ROOT/backend"
  NODE_ENV=production node dist/main &
  save_pid backend
  success "Backend PID: $(cat "$PID_DIR/backend.pid")  →  http://localhost:${PORT_BACKEND:-3000}"
}

# ── Frontend 빌드 ─────────────────────────────────────────────────────────────
build_admin() {
  info "Frontend Admin 빌드 중..."
  cd "$REPO_ROOT/frontend-admin"
  npm ci
  npm run build
  success "Frontend Admin 빌드 완료: frontend-admin/dist/"
}

build_tenant() {
  info "Frontend Tenant 빌드 중..."
  cd "$REPO_ROOT/frontend-tenant"
  npm ci
  npm run build
  success "Frontend Tenant 빌드 완료: frontend-tenant/dist/"
}

# ── Go Engine 빌드 + 기동 ────────────────────────────────────────────────────
build_engine() {
  info "Go Engine 빌드 중..."
  cd "$REPO_ROOT/go-engine"
  if ! command -v go &>/dev/null; then
    error "Go가 설치되어 있지 않습니다."
    return 1
  fi
  go mod download
  CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o "$REPO_ROOT/go-engine/bin/go-engine" ./cmd/engine
  success "Go Engine 빌드 완료: go-engine/bin/go-engine"
}

start_engine_prod() {
  info "Go Engine (production) 기동 중..."
  REDIS_HOST="${REDIS_HOST:-localhost}" \
  REDIS_PORT="${REDIS_PORT:-6379}" \
  REDIS_PASSWORD="${REDIS_PASSWORD:-}" \
  REDPANDA_HOST="${REDPANDA_HOST:-localhost}" \
  REDPANDA_PORT="${PORT_REDPANDA_KAFKA:-19092}" \
  PORT="${PORT_GO_ENGINE:-8081}" \
  "$REPO_ROOT/go-engine/bin/go-engine" &
  save_pid go-engine
  success "Go Engine PID: $(cat "$PID_DIR/go-engine.pid")  →  http://localhost:${PORT_GO_ENGINE:-8081}"
}

# ── Docker Compose 통합 기동 (권장) ──────────────────────────────────────────
start_docker() {
  info "Docker Compose로 전체 앱 기동 중 (--profile app)..."
  docker compose -f "$REPO_ROOT/docker-compose.yml" --profile app up -d --build
  echo ""
  echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
  echo -e "${BOLD} SOAR 운영 서버 기동 완료 (Docker)${RESET}"
  echo -e "  Backend    → http://localhost:${PORT_BACKEND:-3000}"
  echo -e "  Swagger    → http://localhost:${PORT_BACKEND:-3000}/docs"
  echo -e "  Admin UI   → http://localhost:${PORT_FRONTEND_ADMIN:-5174}"
  echo -e "  Tenant UI  → http://localhost:${PORT_FRONTEND_TENANT:-5173}"
  echo -e "  Go Engine  → http://localhost:${PORT_GO_ENGINE:-8081}"
  echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
  echo -e "${YELLOW}종료: docker compose --profile app down${RESET}"
}

# ── 메인 ─────────────────────────────────────────────────────────────────────
SERVICE="${1:-all}"

case "$SERVICE" in
  docker)
    start_docker
    ;;
  build)
    build_backend
    build_admin
    build_tenant
    build_engine
    success "전체 빌드 완료"
    ;;
  backend)
    start_infra
    build_backend
    start_backend_prod
    ;;
  admin)
    build_admin
    ;;
  tenant)
    build_tenant
    ;;
  engine)
    start_infra
    build_engine
    start_engine_prod
    ;;
  all)
    start_infra
    build_backend
    build_admin
    build_tenant
    build_engine
    sleep 3
    start_backend_prod
    start_engine_prod
    echo ""
    echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
    echo -e "${BOLD} SOAR 운영 서버 기동 완료${RESET}"
    echo -e "  Backend    → http://localhost:${PORT_BACKEND:-3000}"
    echo -e "  Go Engine  → http://localhost:${PORT_GO_ENGINE:-8081}"
    echo -e "  Admin UI   → frontend-admin/dist/ (별도 웹서버 필요)"
    echo -e "  Tenant UI  → frontend-tenant/dist/ (별도 웹서버 필요)"
    echo -e "${YELLOW}※ 운영 환경 권장: ./scripts/prod.sh docker${RESET}"
    echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
    echo -e "${YELLOW}종료: ./scripts/stop.sh${RESET}"
    ;;
  *)
    error "알 수 없는 서비스: $SERVICE"
    echo "사용법: $0 [all|build|docker|backend|admin|tenant|engine]"
    exit 1
    ;;
esac
