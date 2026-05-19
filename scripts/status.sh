#!/usr/bin/env bash
# =============================================================================
# SOAR 서비스 상태 확인 스크립트
# 사용법: ./scripts/status.sh
# =============================================================================
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PID_DIR="$REPO_ROOT/.pids"
ENV_DEV_FILE="$REPO_ROOT/.env.dev"
ENV_PROD_FILE="$REPO_ROOT/.env.prod"

[[ -f "$ENV_DEV_FILE" ]] && { set -a; source "$ENV_DEV_FILE"; set +a; }
[[ -f "$ENV_PROD_FILE" ]] && { set -a; source "$ENV_PROD_FILE"; set +a; }

BOLD='\033[1m'; GREEN='\033[0;32m'; RED='\033[0;31m'
YELLOW='\033[1;33m'; CYAN='\033[0;36m'; RESET='\033[0m'

docker_running() {
  local container="$1"
  docker inspect "$container" --format '{{.State.Status}}' 2>/dev/null | grep -q "running"
}

find_pid_by_port() {
  local port="$1"
  ss -ltnp "( sport = :$port )" 2>/dev/null \
    | awk -F'pid=' 'NR > 1 && /pid=/ { split($2, a, ","); print a[1]; exit }'
}

pid_listens_on_port() {
  local pid="$1" port="$2"
  ss -ltnp "( sport = :$port )" 2>/dev/null | grep -q "pid=$pid,"
}

check_pid() {
  local name="$1" label="$2" url="$3" port="$4"
  local pid_file="$PID_DIR/$name.pid"
  local pid=""
  local managed=0

  if [[ -f "$pid_file" ]]; then
    pid="$(cat "$pid_file")"
    if kill -0 "$pid" 2>/dev/null; then
      if pid_listens_on_port "$pid" "$port"; then
        managed=1
      else
        pid=""
        rm -f "$pid_file"
      fi
    else
      pid=""
      rm -f "$pid_file"
    fi
  fi

  if [[ -z "$pid" ]]; then
    pid="$(find_pid_by_port "$port")"
  fi

  if [[ -n "$pid" ]]; then
    if [[ "$managed" -eq 1 ]]; then
      printf "  ${GREEN}●${RESET} %-20s PID %-7s  %s\n" "$label" "$pid" "$url"
    else
      printf "  ${YELLOW}◐${RESET} %-20s PID %-7s  %s ${YELLOW}(포트 감지)${RESET}\n" "$label" "$pid" "$url"
    fi
  else
    printf "  ${RED}○${RESET} %-20s ${YELLOW}중지됨${RESET}\n" "$label"
  fi
}

check_container() {
  local container="$1" label="$2"
  if docker_running "$container"; then
    printf "  ${GREEN}●${RESET} %-20s running\n" "$label"
  else
    printf "  ${RED}○${RESET} %-20s ${YELLOW}중지됨${RESET}\n" "$label"
  fi
}

print_mode_summary() {
  local infra_running=0
  local dev_running=0
  local prod_running=0
  local total_running=0

  local infra_containers=(
    soar-mariadb
    soar-redis
    soar-clickhouse
    soar-redpanda
    soar-redpanda-console
  )
  local dev_containers=(
    soar-backend-dev
    soar-go-engine-dev
    soar-frontend-admin-dev
    soar-frontend-tenant-dev
  )
  local prod_containers=(
    soar-backend-prod
    soar-go-engine-prod
    soar-frontend-admin-prod
    soar-frontend-tenant-prod
    soar-gateway-prod
  )

  for container in "${infra_containers[@]}"; do
    if docker_running "$container"; then
      infra_running=$((infra_running + 1))
      total_running=$((total_running + 1))
    fi
  done

  for container in "${dev_containers[@]}"; do
    if docker_running "$container"; then
      dev_running=$((dev_running + 1))
      total_running=$((total_running + 1))
    fi
  done

  for container in "${prod_containers[@]}"; do
    if docker_running "$container"; then
      prod_running=$((prod_running + 1))
      total_running=$((total_running + 1))
    fi
  done

  echo -e "\n${CYAN}[ 실행 요약 ]${RESET}"
  printf "  %-20s %s/%s\n" "Infra" "$infra_running" "${#infra_containers[@]}"
  printf "  %-20s %s/%s\n" "Dev" "$dev_running" "${#dev_containers[@]}"
  printf "  %-20s %s/%s\n" "Prod" "$prod_running" "${#prod_containers[@]}"
  printf "  %-20s %s\n" "Total Running" "$total_running"

  echo -e "\n${CYAN}[ 추천 종료 명령 ]${RESET}"
  if [[ "$total_running" -eq 0 ]]; then
    echo -e "  ${YELLOW}실행 중인 컨테이너가 없습니다.${RESET}"
  else
    if [[ "$dev_running" -gt 0 ]]; then
      printf "  %s\n" "./scripts/stop.sh dev"
    fi
    if [[ "$prod_running" -gt 0 ]]; then
      printf "  %s\n" "./scripts/stop.sh prod"
    fi
    if [[ "$infra_running" -gt 0 ]]; then
      printf "  %s\n" "./scripts/stop.sh infra"
    fi
  fi
  printf "  %s\n" "./scripts/stop.sh      # 전체 종료"
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

echo -e "\n${CYAN}[ Dev 컨테이너 ]${RESET}"
check_container soar-backend-dev "Backend Dev"
check_container soar-go-engine-dev "Go Engine Dev"
check_container soar-frontend-admin-dev "Admin UI Dev"
check_container soar-frontend-tenant-dev "Tenant UI Dev"

echo -e "\n${CYAN}[ Prod 컨테이너 ]${RESET}"
check_container soar-backend-prod "Backend Prod"
check_container soar-go-engine-prod "Go Engine Prod"
check_container soar-frontend-admin-prod "Admin UI Prod"
check_container soar-frontend-tenant-prod "Tenant UI Prod"
check_container soar-gateway-prod "Gateway Prod"

echo -e "\n${CYAN}[ 로컬 프로세스 ]${RESET}"
check_pid backend       "Backend (NestJS)"   "http://localhost:${PORT_BACKEND:-3000}" "${PORT_BACKEND:-3000}"
check_pid go-engine     "Go Engine"          "http://localhost:${PORT_GO_ENGINE:-8081}" "${PORT_GO_ENGINE:-8081}"
check_pid frontend-admin  "Admin UI"         "http://localhost:${PORT_FRONTEND_ADMIN:-5174}" "${PORT_FRONTEND_ADMIN:-5174}"
check_pid frontend-tenant "Tenant UI"        "http://localhost:${PORT_FRONTEND_TENANT:-5173}" "${PORT_FRONTEND_TENANT:-5173}"

print_mode_summary

echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
