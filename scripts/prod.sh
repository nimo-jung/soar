#!/usr/bin/env bash
# =============================================================================
# TMS 운영 빌드 & 기동 스크립트 (production mode)
# 사용법: ./scripts/prod.sh [service]
#   ./scripts/prod.sh          → 전체 빌드 후 기동
#   ./scripts/prod.sh build    → 전체 빌드만 (기동 안 함)
#   ./scripts/prod.sh docker   → docker compose --profile prod --env-file .env.prod up -d (권장)
#   ./scripts/prod.sh fix-perms → RedPanda 데이터 경로 권한 복구 (sudo 필요)
#   ./scripts/prod.sh backend  → 백엔드 빌드 + 기동
#   ./scripts/prod.sh frontend → Frontend 빌드 (정적 파일 생성)
#   ./scripts/prod.sh master   → Frontend 빌드 (호환 별칭)
#   ./scripts/prod.sh engine   → Go Engine 빌드 + 기동
# =============================================================================
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${TMS_ENV_FILE:-$REPO_ROOT/.env.prod}"
export HOST_UID="${HOST_UID:-$(id -u)}"
export HOST_GID="${HOST_GID:-$(id -g)}"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'
info()    { echo -e "${CYAN}[INFO]${RESET}  $*"; }
success() { echo -e "${GREEN}[OK]${RESET}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
error()   { echo -e "${RED}[ERROR]${RESET} $*" >&2; }

# Preflight dependency check (docker/docker compose) — warn only
if [[ -f "$REPO_ROOT/scripts/check-deps.sh" ]]; then
  # shellcheck source=/dev/null
  source "$REPO_ROOT/scripts/check-deps.sh"
  if ! check_deps; then
    warn "Docker/Docker Compose 확인 실패 — docker 관련 명령은 실패할 수 있습니다."
  fi
fi

print_prod_stop_hint() {
  local scope="$1"

  echo ""
  echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
  echo -e "${BOLD} PROD 종료 안내${RESET}"
  case "$scope" in
    docker)
      echo -e "  앱 종료      → ./scripts/stop.sh prod"
      echo -e "  인프라 종료  → ./scripts/stop.sh infra"
      echo -e "  전체 종료    → ./scripts/stop.sh"
      ;;
    all)
      echo -e "  전체 종료    → ./scripts/stop.sh"
      ;;
    backend)
      echo -e "  Backend 종료 → ./scripts/stop.sh backend"
      echo -e "  인프라 종료  → ./scripts/stop.sh infra"
      ;;
    engine)
      echo -e "  Engine 종료  → ./scripts/stop.sh engine"
      echo -e "  인프라 종료  → ./scripts/stop.sh infra"
      ;;
    build)
      echo -e "  빌드 전용 실행입니다. 종료할 런타임 프로세스가 없습니다."
      ;;
    frontend|master)
      echo -e "  빌드 전용 실행입니다. 종료할 런타임 프로세스가 없습니다."
      ;;
  esac
  echo -e "  상태 확인    → ./scripts/status.sh"
  echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
}

if [[ ! -f "$ENV_FILE" ]]; then
  error "환경변수 파일이 없습니다: $ENV_FILE"
  error "예시: cp .env.example .env.prod 후 운영 값으로 수정하세요."
  exit 1
fi
set -a; source "$ENV_FILE"; set +a

if [[ "${NODE_ENV:-}" != "production" ]]; then
  warn "NODE_ENV=production 이 .env에 설정되어 있지 않습니다."
fi

PID_DIR="$REPO_ROOT/.pids"
mkdir -p "$PID_DIR"
save_pid() { echo "$!" > "$PID_DIR/$1.pid"; }

# ── 데이터 마운트 사전 점검(권한/쓰기 가능 여부) ─────────────────────────────
DATA_ROOT="${TMS_DATA_ROOT:-/home1/tms}"
PREFLIGHT_AUTOFIX="${TMS_PREFLIGHT_AUTOFIX:-0}"
STRICT_OWNER_CHECK="${TMS_STRICT_OWNER_CHECK:-0}"

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

fix_redpanda_permissions() {
  local dir="$DATA_ROOT/redpanda"
  local owner

  mkdir -p "$dir"
  owner="$(get_service_uid_gid RedPanda redpandadata/redpanda:v24.2.18 || true)"
  if [[ -z "$owner" ]]; then
    owner="101:101"
  fi

  info "RedPanda 권한 복구 실행: sudo chown -R $owner $dir && sudo chmod -R 750 $dir"
  sudo chown -R "$owner" "$dir"
  sudo chmod -R 750 "$dir"
  success "RedPanda 권한 복구 완료: $dir ($(stat -c '%u:%g %a' "$dir"))"
}

preflight_data_mounts() {
  if [[ "${TMS_SKIP_PREFLIGHT:-0}" == "1" ]]; then
    warn "TMS_SKIP_PREFLIGHT=1 이므로 데이터 마운트 사전 점검을 건너뜁니다."
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
    error "임시 우회가 필요하면 TMS_SKIP_PREFLIGHT=1 로 실행할 수 있습니다."
    return 1
  fi

  success "데이터 마운트 사전 점검 통과"
}

# ── 인프라 ────────────────────────────────────────────────────────────────────
start_infra() {
  preflight_data_mounts
  info "인프라 컨테이너 기동 중..."
  docker compose -f "$REPO_ROOT/docker-compose.yml" --env-file "$ENV_FILE" up -d \
    mariadb redis clickhouse redpanda
  ensure_tenant_db_grants || true
  success "인프라 기동 완료"
}

ensure_tenant_db_grants() {
  info "MariaDB tenant_db_% 권한 적용 확인 중..."

  if ! docker compose -f "$REPO_ROOT/docker-compose.yml" --env-file "$ENV_FILE" exec -T mariadb sh -lc "mysql -uroot -p\"\$MYSQL_ROOT_PASSWORD\" <<'SQL'
GRANT ALL PRIVILEGES ON \\`tenant_db_%\\`.* TO '${MARIADB_USER}'@'%';
GRANT CREATE ON *.* TO '${MARIADB_USER}'@'%';
FLUSH PRIVILEGES;
SQL" >/dev/null 2>&1; then
    warn "MariaDB 권한 자동 적용에 실패했습니다. 컨테이너 준비 상태 또는 docker 권한을 확인하세요."
    warn "수동 적용: docker exec -i tms-mariadb sh -lc 'mysql -uroot -p\"\$MARIADB_ROOT_PASSWORD\" -e \"GRANT ALL PRIVILEGES ON \\\`tenant_db_%\\\`.* TO \"\'${MARIADB_USER}\'\"@\"%\"; GRANT CREATE ON *.* TO \"\'${MARIADB_USER}\'\"@\"%\"; FLUSH PRIVILEGES;\"'"
    return 1
  fi

  success "MariaDB tenant_db_% 권한 적용 완료"
  return 0
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
build_frontend() {
  info "Frontend 빌드 중..."
  cd "$REPO_ROOT/frontend"
  npm ci
  npm run build
  success "Frontend 빌드 완료: frontend/dist/"
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
  preflight_data_mounts
  info "Docker Compose로 전체 앱 기동 중 (--profile prod)..."
  docker compose -f "$REPO_ROOT/docker-compose.yml" --profile prod --env-file "$ENV_FILE" up -d --build
  ensure_tenant_db_grants || true
  echo ""
  echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
  echo -e "${BOLD} TMS 운영 서버 기동 완료 (Docker)${RESET}"
  echo -e "  Master UI  → http://localhost:${PORT_FRONTEND:-5173}/master"
  echo -e "  Swagger    → http://localhost:${PORT_BACKEND:-3000}/docs"
  echo -e "  API/Auth   → http://localhost:${PORT_BACKEND:-3000}/api, /auth"
  echo -e "  Go Engine  → http://localhost:${PORT_GO_ENGINE:-8081}"
  echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
  echo -e "${YELLOW}종료: docker compose down${RESET}"
}

# ── 메인 ─────────────────────────────────────────────────────────────────────
SERVICE="${1:-all}"

case "$SERVICE" in
  fix-perms)
    fix_redpanda_permissions
    print_prod_stop_hint build
    ;;
  docker)
    start_docker
    print_prod_stop_hint docker
    ;;
  build)
    build_backend
    build_frontend
    build_engine
    success "전체 빌드 완료"
    print_prod_stop_hint build
    ;;
  backend)
    start_infra
    build_backend
    start_backend_prod
    print_prod_stop_hint backend
    ;;
  frontend|master)
    build_frontend
    print_prod_stop_hint frontend
    ;;
  engine)
    start_infra
    build_engine
    start_engine_prod
    print_prod_stop_hint engine
    ;;
  all)
    start_infra
    build_backend
    build_frontend
    build_engine
    sleep 3
    start_backend_prod
    start_engine_prod
    echo ""
    echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
    echo -e "${BOLD} TMS 운영 서버 기동 완료${RESET}"
    echo -e "  Backend    → http://localhost:${PORT_BACKEND:-3000}"
    echo -e "  Master UI  → frontend/dist/ (별도 웹서버 필요)"
    echo -e "  Go Engine  → http://localhost:${PORT_GO_ENGINE:-8081}"
    echo -e "${YELLOW}※ 운영 환경 권장: ./scripts/prod.sh docker${RESET}"
    echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
    print_prod_stop_hint all
    ;;
  *)
    error "알 수 없는 서비스: $SERVICE"
    echo "사용법: $0 [all|build|docker|fix-perms|backend|frontend|master|engine]"
    exit 1
    ;;
esac
