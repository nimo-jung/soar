#!/usr/bin/env bash
# =============================================================================
# SOAR 서비스 상태 확인 스크립트
# 사용법: ./scripts/status.sh
# =============================================================================
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PID_DIR="$REPO_ROOT/.pids"
ENV_FILE="$REPO_ROOT/.env"

[[ -f "$ENV_FILE" ]] && { set -a; source "$ENV_FILE"; set +a; }

BOLD='\033[1m'; GREEN='\033[0;32m'; RED='\033[0;31m'
YELLOW='\033[1;33m'; CYAN='\033[0;36m'; RESET='\033[0m'

check_pid() {
  local name="$1" label="$2" url="$3"
  local pid_file="$PID_DIR/$name.pid"
  if [[ -f "$pid_file" ]] && kill -0 "$(cat "$pid_file")" 2>/dev/null; then
    printf "  ${GREEN}●${RESET} %-20s PID %-7s  %s\n" "$label" "$(cat "$pid_file")" "$url"
  else
    printf "  ${RED}○${RESET} %-20s ${YELLOW}중지됨${RESET}\n" "$label"
  fi
}

check_container() {
  local container="$1" label="$2"
  if docker inspect "$container" --format '{{.State.Status}}' 2>/dev/null | grep -q "running"; then
    printf "  ${GREEN}●${RESET} %-20s running\n" "$label"
  else
    printf "  ${RED}○${RESET} %-20s ${YELLOW}중지됨${RESET}\n" "$label"
  fi
}

echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${BOLD} SOAR 서비스 상태${RESET}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"

echo -e "\n${CYAN}[ 인프라 컨테이너 ]${RESET}"
check_container soar-mariadb    "MariaDB"
check_container soar-redis      "Redis"
check_container soar-clickhouse "ClickHouse"
check_container soar-redpanda   "RedPanda"
check_container soar-redpanda-console "RedPanda Console"

echo -e "\n${CYAN}[ 애플리케이션 프로세스 ]${RESET}"
check_pid backend       "Backend (NestJS)"   "http://localhost:${PORT_BACKEND:-3000}"
check_pid go-engine     "Go Engine"          "http://localhost:${PORT_GO_ENGINE:-8081}"
check_pid frontend-admin  "Admin UI"         "http://localhost:${PORT_FRONTEND_ADMIN:-5174}"
check_pid frontend-tenant "Tenant UI"        "http://localhost:${PORT_FRONTEND_TENANT:-5173}"

echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
