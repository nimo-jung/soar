# go-engine Metrics Endpoint Spec (Draft)

작성일: 2026-05-20
대상: go-engine /metrics, backend monitoring 연동

## Endpoint
- Method: GET
- Path: /metrics
- Content-Type: application/json

## Response schema
```json
{
  "status": "ok",
  "ingestTotal": 1024,
  "ingestSuccess": 1002,
  "ingestFailure": 10,
  "parseFailure": 8,
  "publishFailure": 4,
  "ingestErrorRate": 1.37,
  "parseErrorRate": 0.78,
  "avgIngestLatencyMs": 24.15,
  "lastIngestAt": "2026-05-20T04:36:12Z",
  "checkedAt": "2026-05-20T04:36:15Z"
}
```

## Field definition
- status: 엔드포인트 상태 문자열(ok)
- ingestTotal: 총 수신 처리 시도 수
- ingestSuccess: 정상 처리 건수
- ingestFailure: 인증/화이트리스트/입력 오류 등 실패 건수
- parseFailure: 파싱 실패 건수
- publishFailure: RedPanda 발행 실패 건수
- ingestErrorRate: (ingestFailure + publishFailure) / ingestTotal * 100
- parseErrorRate: parseFailure / ingestTotal * 100
- avgIngestLatencyMs: ingest 핸들러 평균 처리 시간(ms)
- lastIngestAt: 마지막 ingest 처리 시각(UTC ISO)
- checkedAt: metrics 응답 생성 시각(UTC ISO)

## Backend integration rule
- backend Monitoring overview는 우선 /metrics 값을 사용한다.
- /metrics 호출 실패 시 기존 fallback 집계(audit_logs 기반)를 사용한다.
- engineHealthy는 /health 결과를 사용하고, metrics와 독립적으로 처리한다.

## Env variables
- GO_ENGINE_HEALTH_URL: 예) http://go-engine-dev:8081/health
- GO_ENGINE_METRICS_URL: 예) http://go-engine-dev:8081/metrics
