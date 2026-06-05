# go-engine Metrics v2 Spec (Tenant-aware)

작성일: 2026-05-20
대상: go-engine `/metrics/v2`, backend monitoring v2 연동

## 목표
- 기존 글로벌 누적 메트릭을 유지하면서 tenant 단위 운영 지표를 함께 제공한다.
- Master Admin Monitoring에서 전체/테넌트 필터를 API 한 번으로 처리할 수 있게 한다.

## Endpoint
- Method: GET
- Path: /metrics/v2
- Content-Type: application/json

## Query Parameters
- `tenantId` (optional): 특정 테넌트만 조회
- `window` (optional): 집계 구간 (`5m`, `15m`, `1h`, `24h`), 기본 `15m`
- `limit` (optional): tenant breakdown 최대 개수, 기본 `100`, 최대 `1000`

## Response Schema
```json
{
  "status": "ok",
  "window": "15m",
  "checkedAt": "2026-05-20T05:01:00Z",
  "global": {
    "ingestTotal": 1024,
    "ingestSuccess": 1002,
    "ingestFailure": 10,
    "parseFailure": 8,
    "publishFailure": 4,
    "ingestErrorRate": 1.37,
    "parseErrorRate": 0.78,
    "avgIngestLatencyMs": 24.15,
    "eps": 68.27,
    "lastIngestAt": "2026-05-20T05:00:54Z"
  },
  "tenantBreakdown": [
    {
      "tenantId": "demo",
      "ingestTotal": 512,
      "ingestSuccess": 505,
      "ingestFailure": 4,
      "parseFailure": 2,
      "publishFailure": 1,
      "ingestErrorRate": 0.98,
      "parseErrorRate": 0.39,
      "avgIngestLatencyMs": 19.31,
      "eps": 34.13,
      "lastIngestAt": "2026-05-20T05:00:52Z"
    }
  ],
  "series": {
    "eps": [
      { "ts": "2026-05-20T04:46:00Z", "value": 61.3 },
      { "ts": "2026-05-20T04:47:00Z", "value": 65.7 }
    ],
    "ingestErrorRate": [
      { "ts": "2026-05-20T04:46:00Z", "value": 1.1 },
      { "ts": "2026-05-20T04:47:00Z", "value": 0.9 }
    ],
    "parseErrorRate": [
      { "ts": "2026-05-20T04:46:00Z", "value": 0.6 },
      { "ts": "2026-05-20T04:47:00Z", "value": 0.5 }
    ],
    "avgIngestLatencyMs": [
      { "ts": "2026-05-20T04:46:00Z", "value": 26.8 },
      { "ts": "2026-05-20T04:47:00Z", "value": 22.1 }
    ]
  }
}
```

## 계산 규칙
- `ingestErrorRate = (ingestFailure + publishFailure) / ingestTotal * 100`
- `parseErrorRate = parseFailure / ingestTotal * 100`
- `eps = ingestSuccess / windowSeconds`
- `avgIngestLatencyMs = window 내 처리시간 평균`

## 구현 지침 (go-engine)
1. In-memory ring buffer로 최근 `24h` 분단위 버킷 유지
2. tenantId별 버킷 맵 구성 (`map[tenantId]bucket[]`)
3. `/metrics`는 기존 글로벌 누적 유지, `/metrics/v2`는 window 집계 응답
4. 고카디널리티 보호를 위해 `limit` 적용, 초과 tenant는 `others`로 합산

## 구현 지침 (backend)
1. Monitoring overview v2에서 `/metrics/v2` 우선 호출
2. 실패 시 `/metrics` -> fallback DB 집계 순으로 degrade
3. `tenantId` 숫자와 tenant slug 매핑은 admin DB의 tenants 테이블 기준

## 보안/운영 지침
1. `/metrics/v2`는 내부망 접근 또는 backend allowlist 제한
2. 응답 timeout 1.5초, 실패 시 즉시 fallback
3. 응답에 민감정보(API key, IP 원문) 포함 금지

## 단계별 적용안
1. Step 1: `/metrics/v2` global + series 구현
2. Step 2: tenantBreakdown 구현
3. Step 3: backend monitoring v2 query(`tenantId`, `window`) 연동
4. Step 4: frontend 차트 탭(EPS/에러율/지연) 추가
