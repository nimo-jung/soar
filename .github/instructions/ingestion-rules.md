---
applyTo: "**"
---

# Log Ingestion & Processing Rules

## 1. 수집 엔진 (GoLang)
- Vector는 경량 파싱 후 원본 이벤트를 RedPanda의 `raw-logs` 토픽으로 전송.
- Go 엔진은 인리치먼트(GeoIP/CIDR/자산 매핑)와 배치 적재를 담당한다.
- 수집 실패/파싱 실패/검증 실패 이벤트는 `dead-letter-queue` 토픽으로 격리하고 재처리 정책을 운영한다.

## 2. 적재 규칙 (ClickHouse)
- 1,000건 단위 또는 5초 주기로 배치 Insert 수행 (성능 최적화).
- 테넌트별로 `Database`를 물리적으로 분리하여 `INSERT INTO tenant_{id}.logs` 쿼리 실행.
- 로그 저장 기간(TTL)은 테넌트별 `retention_days` 설정을 MariaDB에서 조회하여 동적으로 적용.
- ClickHouse 쿼리는 항상 테넌트 전용 DB를 명시하고 공용 DB 조회 패턴을 금지한다.

## 3. 인리치먼트 및 중복 제어
- GeoIP/CIDR/자산 매핑은 메모리 캐시 기반으로 처리하고, 조회 시점 변환을 금지한다.
- 벡터 DB 적재는 `tenant + signature + asset_class` 고유키 업서트를 표준으로 하며 중복 삽입을 금지한다.
- 원시 5-Tuple은 메타데이터로 저장하고, 임베딩 본문에는 추상화된 위협 맥락을 사용한다.