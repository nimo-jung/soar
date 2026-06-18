#!/usr/bin/env bash
# =============================================================================
# ClickHouse 테스트 데이터 생성 스크립트
#
# MariaDB tenants 테이블의 실제 테넌트 ID를 조회하여
# db_tenant_{id} 형식의 데이터베이스에 raw_logs 샘플 데이터를 삽입합니다.
#
# EPS 추이 차트와 최근 이벤트 테이블에 데이터가 표시됩니다.
#
# 사용법:
#   ./scripts/seed-clickhouse.sh
#   ./scripts/seed-clickhouse.sh --reset    # 기존 데이터 삭제 후 재삽입
# =============================================================================
set -euo pipefail

if [[ "${1:-}" == "--reset" ]]; then
  echo "[INFO] 기존 db_tenant_* 데이터베이스 삭제 중..."
  DB_LIST=$(echo "SELECT name FROM system.databases WHERE name LIKE 'db_tenant_%'" | docker exec -i tms-clickhouse clickhouse-client --host localhost --port 9000 -u tms --password clickhousepassword 2>&1)
  for db in $DB_LIST; do
    echo "DROP DATABASE IF EXISTS \`$db\`" | docker exec -i tms-clickhouse clickhouse-client --host localhost --port 9000 -u tms --password clickhousepassword 2>&1
    echo "[OK] $db 삭제 완료"
  done
elif [[ -n "${1:-}" ]]; then
  echo "사용법: $0 [--reset]"
  exit 1
fi

# ── MariaDB에서 실제 테넌트 목록 조회 ─────────────────────────────────────
echo "[INFO] MariaDB에서 테넌트 목록 조회 중..."
TENANT_DATA=$(docker exec tms-mariadb bash -c 'mariadb -utms -ptmspassword tms_admin -B -N -e "SELECT id, slug, name FROM tenants"' 2>/dev/null || echo "")

if [[ -z "$TENANT_DATA" ]]; then
  echo "[INFO] MariaDB 조회 실패, 기본 테넌트 사용"
  TENANT_DATA="1 system 시스템
2 nimo 윈스테크넷"
fi

echo "[INFO] ClickHouse 테스트 데이터 생성 시작"

# stdin 충돌 방지를 위해 process substitution 사용
while read -r DB_ID SLUG TENANT_NAME; do
  [[ -z "$DB_ID" ]] && continue

  DB_NAME="db_tenant_${DB_ID}"
  echo "=== $TENANT_NAME (ID=$DB_ID, slug=$SLUG) ==="

  # DB 생성
  echo "CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` ENGINE=Atomic" | docker exec -i tms-clickhouse clickhouse-client --host localhost --port 9000 -u tms --password clickhousepassword 2>&1

  # raw_logs 테이블 생성
  echo "CREATE TABLE IF NOT EXISTS \`${DB_NAME}\`.raw_logs (timestamp DateTime, raw_json String) ENGINE = TinyLog" | docker exec -i tms-clickhouse clickhouse-client --host localhost --port 9000 -u tms --password clickhousepassword 2>&1

  # 배치 INSERT: 지난 120분간 5분 버킷, 버킷당 2~9개 로그
  INSERT_SQL="INSERT INTO \`${DB_NAME}\`.raw_logs (timestamp, raw_json) VALUES "
  FIRST=true
  ROW_COUNT=0

  for ((i=0; i<24; i++)); do
    MINUTES_AGO=$(( 120 - i * 5 ))
    EVENTS_PER_BUCKET=$(( (RANDOM % 8 + 2) ))

    for ((j=0; j<EVENTS_PER_BUCKET; j++)); do
      TIMESTAMP_OFFSET=$(( MINUTES_AGO * 60 + j * 2 ))
      TS=$(date -u -d "-${TIMESTAMP_OFFSET} seconds" '+%Y-%m-%d %H:%M:%S')

      SEVERITIES=("info" "notice" "warning" "error" "critical")
      SEVERITY="${SEVERITIES[$(( RANDOM % 5 ))]}"
      LOG_TYPES=("syslog" "firewall" "netflow" "edr" "waf" "dns" "vpn")
      LOG_TYPE_VAL="${LOG_TYPES[$(( RANDOM % 7 ))]}"
      SOURCE_IP="192.168.$(( RANDOM % 255 )).$(( (RANDOM % 254) + 1 ))"

      RAW_JSON="{\"source_ip\":\"${SOURCE_IP}\",\"vendor\":\"generic\",\"device_code\":\"device-${SLUG}\",\"log_type\":\"${LOG_TYPE_VAL}\",\"severity\":\"${SEVERITY}\",\"event_severity\":\"${SEVERITY}\",\"message\":\"[${TENANT_NAME}] Sample log from ${SLUG} device #${j}\",\"host\":\"${SLUG}-collector.local\"}"

      if $FIRST; then
        INSERT_SQL+="('${TS}','${RAW_JSON}')"
        FIRST=false
      else
        INSERT_SQL+=",('${TS}','${RAW_JSON}')"
      fi
      ROW_COUNT=$((ROW_COUNT + 1))

      # 50개마다 한 번씩 flush (쿼리 크기 제한 방지)
      if (( ROW_COUNT % 50 == 0 )); then
        echo "$INSERT_SQL" | docker exec -i tms-clickhouse clickhouse-client --host localhost --port 9000 -u tms --password clickhousepassword 2>&1
        INSERT_SQL="INSERT INTO \`${DB_NAME}\`.raw_logs (timestamp, raw_json) VALUES "
        FIRST=true
      fi
    done
  done

  # 남은 데이터 flush
  if ! $FIRST; then
    echo "$INSERT_SQL" | docker exec -i tms-clickhouse clickhouse-client --host localhost --port 9000 -u tms --password clickhousepassword 2>&1
  fi

  echo "[OK] ${DB_NAME} (${TENANT_NAME}): ${ROW_COUNT}개 로그 삽입 완료"
done < <(echo "$TENANT_DATA")

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  EPS 추이: 지난 120분간 5분 버킷 데이터"
echo "  최근 이벤트: 각 테넌트별 raw_logs 이벤트"
echo ""
echo "  확인: 모니터링 페이지 (http://localhost:5173/system/monitoring) 새로고침"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"