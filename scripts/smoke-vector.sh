#!/usr/bin/env bash
# =============================================================================
# Vector -> RedPanda -> Go Router 파이프라인 스모크 테스트
# 사용법:
#   ./scripts/smoke-vector.sh dev
#   ./scripts/smoke-vector.sh prod
# =============================================================================
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MODE="${1:-dev}"

if [[ "$MODE" != "dev" && "$MODE" != "prod" ]]; then
  echo "Usage: $0 [dev|prod]"
  exit 1
fi

ENV_FILE="$REPO_ROOT/.env.$MODE"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "[ERR] env file not found: $ENV_FILE"
  exit 1
fi

set -a
source "$ENV_FILE"
set +a

VECTOR_PORT="${PORT_VECTOR_SYSLOG_UDP:-1514}"
SAMPLE_DEVICE_CODE="${SMOKE_DEVICE_CODE:-SMOKE-DEVICE-001}"
SAMPLE_MESSAGE="<134>1 $(date -u +%Y-%m-%dT%H:%M:%SZ) smoke-host app - - - device_code=${SAMPLE_DEVICE_CODE} test_message=vector_smoke"

echo "[INFO] MODE=$MODE"
echo "[INFO] send UDP syslog -> localhost:${VECTOR_PORT}"
printf "%s\n" "$SAMPLE_MESSAGE" | nc -u -w1 127.0.0.1 "$VECTOR_PORT"

echo "[INFO] check latest messages in logs.parsed.input"
docker compose -f "$REPO_ROOT/docker-compose.yml" --env-file "$ENV_FILE" exec -T redpanda \
  rpk topic consume logs.parsed.input -n 1 --offset end || true

echo "[DONE] vector smoke finished"
