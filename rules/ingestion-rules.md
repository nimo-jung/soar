# Log Ingestion & Processing Rules

## 1. 수집 엔진 (GoLang)
- 수집된 원본 로그는 가공 전 반드시 RedPanda의 `raw-logs` 토픽으로 전송.
- 파싱 실패 시 `dead-letter-queue` 토픽으로 격리하여 유실 방지.

## 2. 적재 규칙 (ClickHouse)
- 1,000건 단위 또는 5초 주기로 배치 Insert 수행 (성능 최적화).
- 테넌트별로 `Database`를 물리적으로 분리하여 `INSERT INTO tenant_{id}.logs` 쿼리 실행.
- 로그 저장 기간(TTL)은 테넌트별 설정값(기본 90일)을 MariaDB에서 조회하여 적용.