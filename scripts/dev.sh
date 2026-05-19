#!/usr/bin/env bash
# =============================================================================
# SOAR 개발 서버 일괄 기동 스크립트 (dev mode)
# 사용법: ./scripts/dev.sh [service]
#   기본 동작: dev 컨테이너(profile=dev) 기반 기동
#   ./scripts/dev.sh          → 인프라 + backend-dev + frontend-dev + go-engine-dev
#   ./scripts/dev.sh infra    → 인프라만 (MariaDB, Redis, ClickHouse, RedPanda)
#   ./scripts/dev.sh backend  → backend-dev만
#   ./scripts/dev.sh admin    → frontend-admin-dev만
#   ./scripts/dev.sh tenant   → frontend-tenant-dev만
#   ./scripts/dev.sh engine   → go-engine-dev만
#   로컬 실행 강제: SOAR_DEV_RUNTIME=local ./scripts/dev.sh [service]
# =============================================================================
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${SOAR_ENV_FILE:-$REPO_ROOT/.env.dev}"
DEV_RUNTIME="${SOAR_DEV_RUNTIME:-docker}"

# ── 색상 출력 헬퍼 ───────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'
info()    { echo -e "${CYAN}[INFO]${RESET}  $*"; }
success() { echo -e "${GREEN}[OK]${RESET}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
error()   { echo -e "${RED}[ERROR]${RESET} $*" >&2; }

print_dev_stop_hint() {
  local scope="$1"

  echo ""
  echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
  echo -e "${BOLD} DEV 종료 안내${RESET}"
  case "$scope" in
    all)
      echo -e "  전체 종료    → ./scripts/stop.sh"
      ;;
    infra)
      echo -e "  인프라 종료  → ./scripts/stop.sh infra"
      ;;
    backend)
      echo -e "  Backend 종료 → ./scripts/stop.sh backend"
      echo -e "  인프라 종료  → ./scripts/stop.sh infra"
      ;;
    admin)
      echo -e "  Admin 종료   → ./scripts/stop.sh admin"
      ;;
    tenant)
      echo -e "  Tenant 종료  → ./scripts/stop.sh tenant"
      ;;
    engine)
      echo -e "  Engine 종료  → ./scripts/stop.sh engine"
      echo -e "  인프라 종료  → ./scripts/stop.sh infra"
      ;;
  esac
  echo -e "  상태 확인    → ./scripts/status.sh"
  echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
}

# ── .env.dev 확인 ────────────────────────────────────────────────────────────
if [[ ! -f "$ENV_FILE" ]]; then
  warn "환경변수 파일이 없습니다: $ENV_FILE"
  warn "예시: cp $REPO_ROOT/.env.example $REPO_ROOT/.env.dev"
  exit 1
fi
set -a; source "$ENV_FILE"; set +a

# ── PID 파일 관리 ─────────────────────────────────────────────────────────────
PID_DIR="$REPO_ROOT/.pids"
mkdir -p "$PID_DIR"
LOG_DIR="$REPO_ROOT/.logs"
mkdir -p "$LOG_DIR"

save_pid() { echo "$!" > "$PID_DIR/$1.pid"; }

start_bg_with_log() {
  local name="$1"
  shift
  local log_file="$LOG_DIR/$name.log"

  "$@" >"$log_file" 2>&1 &
  save_pid "$name"
  success "$name 로그: $log_file"
}

start_dev_containers() {
  local services=("$@")
  info "Dev 컨테이너 기동 중 (${services[*]})..."
  docker compose -f "$REPO_ROOT/docker-compose.yml" --profile dev --env-file "$ENV_FILE" up -d "${services[@]}"
  success "Dev 컨테이너 기동 완료"
}

# ── 데이터 마운트 사전 점검(권한/쓰기 가능 여부) ─────────────────────────────
DATA_ROOT="${SOAR_DATA_ROOT:-/home1/soar}"
PREFLIGHT_AUTOFIX="${SOAR_PREFLIGHT_AUTOFIX:-1}"
STRICT_OWNER_CHECK="${SOAR_STRICT_OWNER_CHECK:-0}"
WORKSPACE_AUTOFIX="${SOAR_WORKSPACE_AUTOFIX:-1}"

is_world_writable() {
  local mode="$1"
  local last_digit="${mode: -1}"
  [[ "$last_digit" =~ [2367] ]]
}

check_mount_writable() {
  local service_name="$1"
  local image="$2"
  local host_dir="$3"
  local container_dir="$4"
  local run_user="${5:-}"

  if [[ -n "$run_user" ]]; then
    if ! docker run --rm \
        --user "$run_user" \
        -v "$host_dir:$container_dir" \
        --entrypoint sh "$image" \
        -lc "touch '$container_dir/.perm_check' && rm -f '$container_dir/.perm_check'" >/dev/null 2>&1; then
      error "$service_name 데이터 경로 쓰기 테스트 실패: $host_dir"
      return 1
    fi
  else
    if ! docker run --rm \
        -v "$host_dir:$container_dir" \
        --entrypoint sh "$image" \
        -lc "touch '$container_dir/.perm_check' && rm -f '$container_dir/.perm_check'" >/dev/null 2>&1; then
      error "$service_name 데이터 경로 쓰기 테스트 실패: $host_dir"
      return 1
    fi
  fi

  return 0
}

get_service_uid_gid() {
  local service_name="$1"
  local image="$2"

  case "$service_name" in
    MariaDB)
      docker run --rm --entrypoint sh "$image" -lc 'id -u mysql 2>/dev/null && id -g mysql 2>/dev/null' 2>/dev/null | paste -sd ':' -
      ;;
    Redis)
      docker run --rm --entrypoint sh "$image" -lc 'id -u redis 2>/dev/null && id -g redis 2>/dev/null' 2>/dev/null | paste -sd ':' -
      ;;
    ClickHouse)
      docker run --rm --entrypoint sh "$image" -lc 'id -u clickhouse 2>/dev/null && id -g clickhouse 2>/dev/null' 2>/dev/null | paste -sd ':' -
      ;;
    RedPanda)
      docker run --rm --entrypoint sh "$image" -lc 'id -u && id -g' 2>/dev/null | paste -sd ':' -
      ;;
    *)
      docker run --rm --entrypoint sh "$image" -lc 'id -u && id -g' 2>/dev/null | paste -sd ':' -
      ;;
  esac
}

try_autofix_permissions() {
  local host_dir="$1"
  local owner="$2"

  if [[ "$PREFLIGHT_AUTOFIX" != "1" ]]; then
    return 1
  fi

  if command -v sudo >/dev/null 2>&1 && sudo -n true 2>/dev/null; then
    info "자동 보정 적용: sudo chown -R $owner $host_dir && sudo chmod -R 750 $host_dir"
    sudo chown -R "$owner" "$host_dir"
    sudo chmod -R 750 "$host_dir"
    return 0
  fi

  if command -v sudo >/dev/null 2>&1 && [[ -t 0 ]]; then
    info "자동 보정을 위해 sudo 권한 승인을 시도합니다."
    if sudo chown -R "$owner" "$host_dir" && sudo chmod -R 750 "$host_dir"; then
      return 0
    fi
  fi

  warn "자동 보정을 요청했지만 sudo 무비밀번호 권한이 없어 적용할 수 없습니다."
  return 1
}

check_owner_match() {
  local service_name="$1"
  local host_dir="$2"
  local expected_owner="$3"
  local required="${4:-0}"
  local owner

  if [[ -z "$expected_owner" ]]; then
    warn "$service_name UID/GID 확인 실패. 소유권 검증을 건너뜁니다."
    return 0
  fi

  owner="$(stat -c '%u:%g' "$host_dir")"
  if [[ "$owner" == "$expected_owner" ]]; then
    return 0
  fi

  warn "$service_name 디렉토리 소유권 불일치: 현재 $owner, 권장 $expected_owner"
  if try_autofix_permissions "$host_dir" "$expected_owner"; then
    owner="$(stat -c '%u:%g' "$host_dir")"
    if [[ "$owner" == "$expected_owner" ]]; then
      success "$service_name 소유권 자동 보정 완료"
      return 0
    fi
  fi

  warn "권장 조치: sudo chown -R $expected_owner $host_dir && sudo chmod -R 750 $host_dir"
  if [[ "$required" == "1" || "$STRICT_OWNER_CHECK" == "1" ]]; then
    return 1
  fi

  return 0
}

check_redpanda_owner() {
  local dir="$1"
  local expected_owner
  expected_owner="$(get_service_uid_gid RedPanda redpandadata/redpanda:v24.2.18 || true)"
  check_owner_match "RedPanda" "$dir" "$expected_owner" 1
}

preflight_data_mounts() {
  if [[ "${SOAR_SKIP_PREFLIGHT:-0}" == "1" ]]; then
    warn "SOAR_SKIP_PREFLIGHT=1 이므로 데이터 마운트 사전 점검을 건너뜁니다."
    return 0
  fi

  info "데이터 마운트 사전 점검 중... (root: $DATA_ROOT)"
  if [[ "$PREFLIGHT_AUTOFIX" == "1" ]]; then
    info "자동 보정 모드 활성화: 소유권/권한 불일치 시 수정 시도"
  fi
  if [[ "$STRICT_OWNER_CHECK" == "1" ]]; then
    info "엄격 소유권 점검 모드 활성화: 불일치 시 실패 처리"
  fi

  local services=(mariadb redis clickhouse redpanda)
  local failed=0
  local dir mode

  for svc in "${services[@]}"; do
    dir="$DATA_ROOT/$svc"
    mkdir -p "$dir"
    mode="$(stat -c '%a' "$dir")"
    if is_world_writable "$mode"; then
      warn "$dir 권한이 과도하게 열려있습니다($mode). 권장: 750 또는 770"
    fi
  done

  # 서비스별 이미지 사용자와 소유권 일치 여부를 점검한다.
  local mariadb_owner redis_owner clickhouse_owner redpanda_owner
  mariadb_owner="$(get_service_uid_gid MariaDB mariadb:11.4 || true)"
  redis_owner="$(get_service_uid_gid Redis redis:7.4-alpine || true)"
  clickhouse_owner="$(get_service_uid_gid ClickHouse clickhouse/clickhouse-server:24.8 || true)"
  redpanda_owner="$(get_service_uid_gid RedPanda redpandadata/redpanda:v24.2.18 || true)"

  check_owner_match "MariaDB" "$DATA_ROOT/mariadb" "$mariadb_owner" || failed=1
  check_owner_match "Redis" "$DATA_ROOT/redis" "$redis_owner" || failed=1
  check_owner_match "ClickHouse" "$DATA_ROOT/clickhouse" "$clickhouse_owner" || failed=1

  check_mount_writable "MariaDB" "mariadb:11.4" "$DATA_ROOT/mariadb" "/var/lib/mysql" "$mariadb_owner" || failed=1
  check_mount_writable "Redis" "redis:7.4-alpine" "$DATA_ROOT/redis" "/data" "$redis_owner" || failed=1
  check_mount_writable "ClickHouse" "clickhouse/clickhouse-server:24.8" "$DATA_ROOT/clickhouse" "/var/lib/clickhouse" "$clickhouse_owner" || failed=1
  check_mount_writable "RedPanda" "redpandadata/redpanda:v24.2.18" "$DATA_ROOT/redpanda" "/var/lib/redpanda/data" "$redpanda_owner" || failed=1

  check_redpanda_owner "$DATA_ROOT/redpanda" || failed=1

  if [[ "$failed" -ne 0 ]]; then
    error "데이터 마운트 사전 점검 실패. 권한 조정 후 다시 실행하세요."
    error "임시 우회가 필요하면 SOAR_SKIP_PREFLIGHT=1 로 실행할 수 있습니다."
    return 1
  fi

  success "데이터 마운트 사전 점검 통과"
}

# ── 워크스페이스 쓰기 권한 점검(backend/dist 등) ─────────────────────────────
ensure_workspace_writable() {
  local path="$1"
  local label="$2"
  local uid_gid

  [[ -e "$path" ]] || return 0

  if [[ -w "$path" ]]; then
    return 0
  fi

  warn "$label 경로에 쓰기 권한이 없습니다: $path"
  if [[ "$WORKSPACE_AUTOFIX" != "1" ]]; then
    error "자동 보정이 비활성화되어 있습니다. (SOAR_WORKSPACE_AUTOFIX=0)"
    error "수동 조치: sudo chown -R $(id -u):$(id -g) $path && sudo chmod -R u+rwX $path"
    return 1
  fi

  uid_gid="$(id -u):$(id -g)"

  if command -v sudo >/dev/null 2>&1 && sudo -n true 2>/dev/null; then
    info "자동 보정 적용: sudo chown -R $uid_gid $path && sudo chmod -R u+rwX $path"
    sudo chown -R "$uid_gid" "$path"
    sudo chmod -R u+rwX "$path"
  elif command -v sudo >/dev/null 2>&1 && [[ -t 0 ]]; then
    info "워크스페이스 권한 자동 보정을 위해 sudo 권한 승인을 시도합니다."
    if ! sudo chown -R "$uid_gid" "$path" || ! sudo chmod -R u+rwX "$path"; then
      error "$label 자동 보정에 실패했습니다."
      return 1
    fi
  else
    error "sudo를 사용할 수 없어 $label 자동 보정을 진행할 수 없습니다."
    error "수동 조치: sudo chown -R $uid_gid $path && sudo chmod -R u+rwX $path"
    return 1
  fi

  if [[ ! -w "$path" ]]; then
    error "$label 자동 보정 후에도 쓰기 권한이 없습니다: $path"
    return 1
  fi

  success "$label 쓰기 권한 확인 완료"
}

# ── 인프라 (Docker Compose) ───────────────────────────────────────────────────
start_infra() {
  preflight_data_mounts
  info "인프라 컨테이너 기동 중 (MariaDB, Redis, ClickHouse, RedPanda)..."
  docker compose -f "$REPO_ROOT/docker-compose.yml" --env-file "$ENV_FILE" up -d \
    mariadb redis clickhouse redpanda redpanda-console
  success "인프라 기동 완료"
}

# ── Backend ───────────────────────────────────────────────────────────────────
start_backend() {
  info "Backend (NestJS dev) 기동 중..."
  cd "$REPO_ROOT/backend"
  ensure_workspace_writable "$REPO_ROOT/backend/dist" "backend/dist"
  [[ -d node_modules ]] || npm ci
  start_bg_with_log backend env NODE_ENV=development npm run start:dev
  success "Backend PID: $(cat "$PID_DIR/backend.pid")  →  http://localhost:${PORT_BACKEND:-3000}"
  success "Swagger:  http://localhost:${PORT_BACKEND:-3000}/docs"
}

# ── Frontend Admin ────────────────────────────────────────────────────────────
start_admin() {
  info "Frontend Admin (Vite dev) 기동 중..."
  cd "$REPO_ROOT/frontend-admin"
  [[ -d node_modules ]] || npm install
  start_bg_with_log frontend-admin npm run dev
  success "Admin UI PID: $(cat "$PID_DIR/frontend-admin.pid")  →  http://localhost:${PORT_FRONTEND_ADMIN:-5174}"
}

# ── Frontend Tenant ───────────────────────────────────────────────────────────
start_tenant() {
  info "Frontend Tenant (Vite dev) 기동 중..."
  cd "$REPO_ROOT/frontend-tenant"
  [[ -d node_modules ]] || npm install
  start_bg_with_log frontend-tenant npm run dev
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
  start_bg_with_log go-engine env \
    REDIS_HOST="${REDIS_HOST:-localhost}" \
    REDIS_PORT="${REDIS_PORT:-6379}" \
    REDIS_PASSWORD="${REDIS_PASSWORD:-}" \
    REDPANDA_HOST="${REDPANDA_HOST:-localhost}" \
    REDPANDA_PORT="${PORT_REDPANDA_KAFKA:-19092}" \
    PORT="${PORT_GO_ENGINE:-8081}" \
    go run ./cmd/engine
  success "Go Engine PID: $(cat "$PID_DIR/go-engine.pid")  →  http://localhost:${PORT_GO_ENGINE:-8081}"
}

# ── 메인 ─────────────────────────────────────────────────────────────────────
SERVICE="${1:-all}"

if [[ "$DEV_RUNTIME" != "docker" && "$DEV_RUNTIME" != "local" ]]; then
  error "SOAR_DEV_RUNTIME 값이 올바르지 않습니다: $DEV_RUNTIME (허용: docker|local)"
  exit 1
fi

info "DEV runtime: $DEV_RUNTIME"

case "$SERVICE" in
  infra)
    start_infra
    print_dev_stop_hint infra
    ;;
  backend)
    if [[ "$DEV_RUNTIME" == "docker" ]]; then
      start_infra
      start_dev_containers backend-dev
    else
      start_infra
      start_backend
    fi
    print_dev_stop_hint backend
    ;;
  admin)
    if [[ "$DEV_RUNTIME" == "docker" ]]; then
      start_dev_containers frontend-admin-dev
    else
      start_admin
    fi
    print_dev_stop_hint admin
    ;;
  tenant)
    if [[ "$DEV_RUNTIME" == "docker" ]]; then
      start_dev_containers frontend-tenant-dev
    else
      start_tenant
    fi
    print_dev_stop_hint tenant
    ;;
  engine)
    if [[ "$DEV_RUNTIME" == "docker" ]]; then
      start_infra
      start_dev_containers go-engine-dev
    else
      start_infra
      start_engine
    fi
    print_dev_stop_hint engine
    ;;
  all)
    if [[ "$DEV_RUNTIME" == "docker" ]]; then
      start_infra
      sleep 3
      start_dev_containers backend-dev frontend-admin-dev frontend-tenant-dev go-engine-dev
    else
      start_infra
      sleep 3
      start_backend
      start_admin
      start_tenant
      start_engine
    fi
    echo ""
    echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
    echo -e "${BOLD} SOAR 개발 서버 기동 완료${RESET}"
    echo -e "  Backend    → http://localhost:${PORT_BACKEND:-3000}"
    echo -e "  Swagger    → http://localhost:${PORT_BACKEND:-3000}/docs"
    echo -e "  Admin UI   → http://localhost:${PORT_FRONTEND_ADMIN:-5174}"
    echo -e "  Tenant UI  → http://localhost:${PORT_FRONTEND_TENANT:-5173}"
    echo -e "  Go Engine  → http://localhost:${PORT_GO_ENGINE:-8081}"
    echo -e "  RedPanda   → http://localhost:${PORT_REDPANDA_CONSOLE:-8080}"
    echo -e "  Logs       → $LOG_DIR/*.log"
    echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
    print_dev_stop_hint all
    ;;
  *)
    error "알 수 없는 서비스: $SERVICE"
    echo "사용법: $0 [all|infra|backend|admin|tenant|engine]"
    exit 1
    ;;
esac
