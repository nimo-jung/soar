#!/usr/bin/env bash
# =============================================================================
# TMS 전체 프로세스 종료 스크립트
# 사용법: ./scripts/stop.sh [service]
#   ./scripts/stop.sh          → 로컬 프로세스 + dev/prod/infra 전체 종료
#   ./scripts/stop.sh backend  → 백엔드만 종료
#   ./scripts/stop.sh frontend → frontend UI만 종료
#   ./scripts/stop.sh master   → frontend UI만 종료 (호환 별칭)
#   ./scripts/stop.sh docker   → Docker Compose 전체 종료(컨테이너 전부)
#   ./scripts/stop.sh dev      → dev 관련 로컬 프로세스 + dev 컨테이너 종료
#   ./scripts/stop.sh prod     → prod 관련 로컬 프로세스 + prod 컨테이너 종료
#   ./scripts/stop.sh infra    → 인프라 컨테이너만 종료
# =============================================================================
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PID_DIR="$REPO_ROOT/.pids"
COMPOSE_FILE="$REPO_ROOT/docker-compose.yml"
ENV_DEV_FILE="$REPO_ROOT/.env.dev"
ENV_PROD_FILE="$REPO_ROOT/.env.prod"

[[ -f "$ENV_DEV_FILE" ]] && { set -a; source "$ENV_DEV_FILE"; set +a; }
[[ -f "$ENV_PROD_FILE" ]] && { set -a; source "$ENV_PROD_FILE"; set +a; }

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; RESET='\033[0m'
info()    { echo -e "${CYAN}[INFO]${RESET}  $*"; }
success() { echo -e "${GREEN}[OK]${RESET}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*"; }

find_pid_by_port() {
  local port="$1"
  ss -ltnp "( sport = :$port )" 2>/dev/null \
    | awk -F'pid=' 'NR > 1 && /pid=/ { split($2, a, ","); print a[1]; exit }'
}

port_for_service() {
  local name="$1"
  case "$name" in
    backend) echo "${PORT_BACKEND:-3000}" ;;
    frontend) echo "${PORT_FRONTEND:-5173}" ;;
    go-engine) echo "${PORT_GO_ENGINE:-8081}" ;;
    *) echo "" ;;
  esac
}

stop_compose_services() {
  local profile="$1"
  shift
  local services=("$@")
  if [[ ${#services[@]} -eq 0 ]]; then
    warn "중지할 Compose 서비스가 없습니다."
    return 0
  fi

  # 서비스명을 직접 지정해 profile 여부와 관계없이 정지/삭제 시도
  docker compose -f "$COMPOSE_FILE" stop "${services[@]}" || true
  docker compose -f "$COMPOSE_FILE" rm -f "${services[@]}" || true
}

kill_service() {
  local name="$1"
  local pid_file="$PID_DIR/$name.pid"
  local service_port
  local fallback_pid

  if [[ -f "$pid_file" ]]; then
    local pid
    pid=$(cat "$pid_file")
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid"
      success "$name (PID $pid) 종료됨"
    else
      warn "$name (PID $pid) 이미 종료된 상태"
    fi
    rm -f "$pid_file"
  else
    warn "$name PID 파일 없음 (포트 기반으로 확인 시도)"
  fi

  service_port="$(port_for_service "$name")"
  if [[ -n "$service_port" ]]; then
    fallback_pid="$(find_pid_by_port "$service_port")"
    if [[ -n "$fallback_pid" ]] && kill -0 "$fallback_pid" 2>/dev/null; then
      kill "$fallback_pid" || true
      success "$name 포트($service_port) 기반 프로세스 종료됨 (PID $fallback_pid)"
    fi
  fi
}

stop_docker() {
  info "Docker Compose 컨테이너 종료 중..."
  docker compose -f "$COMPOSE_FILE" down
  success "Docker Compose 종료 완료"
}

stop_dev() {
  info "dev 관련 로컬 프로세스 및 컨테이너 종료 중..."
  kill_service backend
  kill_service frontend
  kill_service go-engine
  stop_compose_services "dev" backend-dev vector-dev go-engine-dev frontend-dev mailpit
  success "dev 프로파일 종료 완료"
}

stop_prod() {
  info "prod 관련 로컬 프로세스 및 컨테이너 종료 중..."
  kill_service backend
  kill_service frontend
  kill_service go-engine
  stop_compose_services "prod" backend-prod vector-prod go-engine-prod frontend-prod mailpit
  success "prod 프로파일 종료 완료"
}

stop_infra() {
  info "인프라 컨테이너 종료 중..."
  stop_compose_services "" mariadb redis clickhouse redpanda redpanda-console mailpit
  success "인프라 종료 완료"
}

SERVICE="${1:-all}"

case "$SERVICE" in
  docker)  stop_docker ;;
  dev)     stop_dev ;;
  prod)    stop_prod ;;
  infra)   stop_infra ;;
  backend)
    kill_service backend
    stop_compose_services "dev" backend-dev
    stop_compose_services "prod" backend-prod
    ;;
  frontend|master)
    kill_service frontend
    stop_compose_services "dev" frontend-dev
    stop_compose_services "prod" frontend-prod
    ;;
  engine)
    kill_service go-engine
    stop_compose_services "dev" vector-dev go-engine-dev
    stop_compose_services "prod" vector-prod go-engine-prod
    ;;
  all)
    kill_service backend
    kill_service frontend
    kill_service go-engine
    stop_dev
    stop_prod
    stop_infra
    success "로컬 프로세스 + dev/prod/infra 전체 종료 완료"
    ;;
  *)
    echo "사용법: $0 [all|docker|dev|prod|infra|backend|frontend|master|engine]"
    exit 1
    ;;
esac
