#!/usr/bin/env bash
# =============================================================================
# SOAR 전체 프로세스 종료 스크립트
# 사용법: ./scripts/stop.sh [service]
#   ./scripts/stop.sh          → 모든 서비스 종료
#   ./scripts/stop.sh backend  → 백엔드만 종료
#   ./scripts/stop.sh docker   → Docker Compose 전체 종료
#   ./scripts/stop.sh infra    → 인프라 컨테이너만 종료
# =============================================================================
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PID_DIR="$REPO_ROOT/.pids"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; RESET='\033[0m'
info()    { echo -e "${CYAN}[INFO]${RESET}  $*"; }
success() { echo -e "${GREEN}[OK]${RESET}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*"; }

kill_service() {
  local name="$1"
  local pid_file="$PID_DIR/$name.pid"
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
    warn "$name PID 파일 없음 (이미 종료되었거나 시작하지 않음)"
  fi
}

stop_docker() {
  info "Docker Compose 컨테이너 종료 중..."
  docker compose -f "$REPO_ROOT/docker-compose.yml" --profile app down
  success "Docker Compose 종료 완료"
}

stop_infra() {
  info "인프라 컨테이너 종료 중..."
  docker compose -f "$REPO_ROOT/docker-compose.yml" down
  success "인프라 종료 완료"
}

SERVICE="${1:-all}"

case "$SERVICE" in
  docker)  stop_docker ;;
  infra)   stop_infra ;;
  backend) kill_service backend ;;
  admin)   kill_service frontend-admin ;;
  tenant)  kill_service frontend-tenant ;;
  engine)  kill_service go-engine ;;
  all)
    kill_service backend
    kill_service frontend-admin
    kill_service frontend-tenant
    kill_service go-engine
    echo ""
    info "인프라 컨테이너도 종료하려면: ./scripts/stop.sh infra"
    ;;
  *)
    echo "사용법: $0 [all|docker|infra|backend|admin|tenant|engine]"
    exit 1
    ;;
esac
