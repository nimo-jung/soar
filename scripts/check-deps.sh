#!/usr/bin/env bash
# Simple host dependency checker: docker + docker compose
set -euo pipefail

info() { echo "[INFO] $*"; }
warn() { echo "[WARN] $*"; }
error() { echo "[ERROR] $*" >&2; }

check_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    error "docker 명령을 찾을 수 없습니다. https://docs.docker.com/get-docker/ 를 참조하세요."
    return 1
  fi
  if ! docker info >/dev/null 2>&1; then
    error "Docker 데몬에 접근할 수 없습니다. Docker가 실행 중인지 및 현재 사용자 권한을 확인하세요."
    return 2
  fi
  return 0
}

check_compose() {
  if docker compose version >/dev/null 2>&1; then
    return 0
  fi
  if command -v docker-compose >/dev/null 2>&1; then
    return 0
  fi
  error "docker compose 플러그인 또는 docker-compose 바이너리가 필요합니다. 설치 후 다시 시도하세요."
  return 1
}

check_deps() {
  local ok=0
  check_docker || ok=1
  check_compose || ok=1
  if [[ $ok -ne 0 ]]; then
    return 1
  fi
  info "필수 의존성 통과: docker + docker compose"
  return 0
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  if ! check_deps; then
    exit 1
  fi
fi
