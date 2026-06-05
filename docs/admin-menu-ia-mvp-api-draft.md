# Admin 메뉴 IA + MVP 스펙 + API/DTO 초안

작성일: 2026-05-20
대상: Sniper TMS Master Console (frontend + backend/admin)

## 1) 목적
- 현재 구현 상태를 기준으로, 멀티테넌트 TMS 운영에 필요한 Admin 기능/메뉴를 출시 제품 벤치마크 관점에서 우선순위화한다.
- 즉시 개발 가능한 수준으로 화면 단위 MVP 요구사항과 백엔드 API/DTO 초안을 제공한다.

## 2) 정보구조(IA) 제안

### 2.1 최상위 메뉴
1. 운영 관리
2. 보안감사
3. 시스템 설정
4. 운영 도구

### 2.2 메뉴 트리

#### 운영 관리
1. 테넌트 관리
2. 등급/플랜 관리
3. 쿼터 정책 관리
4. 글로벌 위협 인텔리전스
5. 빌링/사용량
6. 플랫폼 모니터링

#### 보안감사
1. 감사로그
2. 정책 변경 이력
3. 관리자 행위 리포트

#### 시스템 설정
1. 마스터 사용자
2. 인증 설정
3. 제품/라이선스

#### 운영 도구
1. 데이터 격리 검증
2. 배포/파이프라인 상태
3. 작업 이력/재시도

## 3) 출시 제품 비교 기반 핵심 포함 기능

### 3.1 이미 많은 제품에서 기본 제공하는 항목 (반드시 포함)
1. Tenant Lifecycle: 생성/정지/삭제/복구, 만료일, 플랜, 상태
2. Quota & Usage: EPS, Storage, Retention 정책 + 사용량 조회
3. Billing: usage snapshot 기반 기간별 과금/리포트
4. Monitoring: 수집량, 실패율, 지연, 에러 이벤트
5. Threat Intel: 피드 등록/비활성화 + 배포 결과 추적
6. Audit/Compliance: CUD 감사로그, 정책 변경 감사

### 3.2 2026년 기준 확산 기능 (P2~P3)
1. 비용 예측/과금 이상탐지
2. SLO 및 에러버짓 기반 경보
3. 격리 위반 자동탐지/차단
4. 컴플라이언스 자동 리포트

## 4) 화면별 MVP 스펙

## 4.1 테넌트 관리
목표: 테넌트 라이프사이클과 기본 정책 연결

필수 기능
1. 목록/검색/필터: 상태, 만료 임박, 등급
2. 생성/수정/정지/복구/삭제(소프트)
3. 상세 패널: tier, ipCidr, expiresAt, contact
4. 설정 바로가기: 쿼터 정책, 사용량 보기

성공 기준
1. 테넌트 상태 전환이 감사로그에 100% 기록
2. 삭제된 테넌트 보호 규칙 준수

## 4.2 등급/플랜 관리
목표: 플랜(티어) 정의와 테넌트 할당 기준 운영

필수 기능
1. 티어 CRUD
2. 삭제 전 사용중 여부 차단
3. 티어별 quota 기본값 확인

성공 기준
1. 중복 규칙(name, quota 조합) 검증
2. CUD 감사로그 누락 0건

## 4.3 쿼터 정책 관리 (신규)
목표: tenant_settings를 운영 UI로 노출

필수 기능
1. EPS 한도, Storage 한도, Retention 일수 조회/수정
2. 일괄 변경(선택 테넌트 다건 적용)
3. 변경 diff 미리보기

성공 기준
1. 변경 즉시 반영 + 감사로그 기록
2. 유효성 검증 실패 시 상세 사유 반환

## 4.4 글로벌 위협 인텔리전스
목표: 피드 운영 + 배포 상태 가시화

필수 기능
1. 피드 등록/비활성화
2. 피드 유형/심각도/소스 필터
3. 배포 상태 탭: 전파 성공/실패/재시도

성공 기준
1. 등록 CUD 감사로그 기록
2. 배포 실패 케이스 재시도 가능

## 4.5 빌링/사용량 (신규)
목표: usage_snapshots 기반 운영/정산 데이터 제공

필수 기능
1. 기간별 사용량 조회(tenant, tier, 날짜)
2. 지표: epsAvg, storageUsedGb, logCount
3. CSV 내보내기

성공 기준
1. 조회 성능: 최근 30일 기준 응답 2초 내 목표
2. 기간/테넌트 필터 정확성

## 4.6 플랫폼 모니터링 (신규)
목표: 수집/파이프라인 헬스 확인

필수 기능
1. 전체/테넌트별 EPS 추이
2. 수집 실패율, 파싱 실패율, 적재 지연
3. 최근 오류 이벤트 피드

성공 기준
1. 장애 징후 조기 식별 가능
2. 테넌트별 drill-down 제공

## 4.7 감사로그
목표: CUD 및 인증 이벤트 추적 강화

필수 기능
1. actor/action/resource/tenant/time 필터
2. 상세 metadata 조회
3. 정책 변경 전후 diff 표시

성공 기준
1. CUD 기능 신규 추가 시 감사로그 누락 0건

## 4.8 데이터 격리 검증 (신규)
목표: 멀티테넌트 격리 리스크 조기 발견

필수 기능
1. tenant context 누락 요청 감지 지표
2. 테넌트 경계 위반 의심 쿼리 이벤트 목록
3. 검증 리포트 다운로드

성공 기준
1. 격리 관련 이상 이벤트 추적 가능

## 5) 백엔드 API/DTO 초안

## 5.1 Quota 정책
Base: /admin/tenants

1. GET /:id/settings
- 응답 DTO: TenantSettingsResponse
  - tenantId: number
  - epsLimit: number
  - storageQuotaGb: number
  - retentionDays: number
  - updatedAt: string

2. PATCH /:id/settings
- 요청 DTO: UpdateTenantSettingsDto
  - epsLimit?: number (min 1)
  - storageQuotaGb?: number (min 1)
  - retentionDays?: number (min 1)
- 응답 DTO: TenantSettingsResponse
- 감사로그 action: TENANT_SETTINGS_UPDATE

3. PATCH /settings/batch
- 요청 DTO: BatchUpdateTenantSettingsDto
  - tenantIds: number[]
  - patch: UpdateTenantSettingsDto
  - reason: string
- 응답 DTO: BatchUpdateResultDto
  - total: number
  - succeeded: number
  - failed: Array<{ tenantId: number; reason: string }>
- 감사로그 action: TENANT_SETTINGS_BATCH_UPDATE

## 5.2 Billing/Usage
Base: /admin/billing

1. GET /usage
- Query DTO: GetUsageQueryDto
  - tenantId?: number
  - tierCode?: string
  - from: string (YYYY-MM-DD)
  - to: string (YYYY-MM-DD)
  - page?: number
  - limit?: number
- 응답 DTO: UsageListResponseDto
  - items: UsageSnapshotItemDto[]
  - summary: { totalLogCount: number; avgEps: number; avgStorageGb: number }
  - pagination: { page: number; limit: number; total: number }

2. GET /usage/export
- Query DTO: GetUsageQueryDto
- 응답: text/csv stream
- 감사로그 action: BILLING_USAGE_EXPORT

3. GET /invoices/preview
- Query DTO: GetInvoicePreviewQueryDto
  - billingMonth: string (YYYY-MM)
  - tenantId?: number
- 응답 DTO: InvoicePreviewResponseDto

## 5.3 Monitoring
Base: /admin/monitoring

1. GET /overview
- Query DTO: MonitoringOverviewQueryDto
  - tenantId?: number
  - from: string
  - to: string
- 응답 DTO: MonitoringOverviewResponseDto
  - epsSeries: Array<{ ts: string; value: number }>
  - ingestErrorRate: number
  - parseErrorRate: number
  - avgIngestLatencyMs: number

2. GET /events
- Query DTO: MonitoringEventsQueryDto
  - severity?: string
  - tenantId?: number
  - from?: string
  - to?: string
  - page?: number
  - limit?: number
- 응답 DTO: MonitoringEventsResponseDto
  - items: Array<{ id: string; tenantId: number; code: string; message: string; severity: string; occurredAt: string }>
  - pagination

## 5.4 Threat Intel 배포 상태
Base: /admin/threat-intel

1. GET /deployments
- Query DTO: GetThreatIntelDeploymentsQueryDto
  - feedId?: number
  - tenantId?: number
  - status?: SUCCESS|FAILED|PENDING
  - from?: string
  - to?: string
- 응답 DTO: ThreatIntelDeploymentListResponseDto

2. POST /:feedId/retry
- 요청 DTO: RetryThreatIntelDeploymentDto
  - tenantIds?: number[]
  - reason: string
- 응답 DTO: RetryThreatIntelDeploymentResponseDto
- 감사로그 action: THREAT_INTEL_DEPLOY_RETRY

## 5.5 Data Isolation 검증
Base: /admin/isolation

1. GET /health
- 응답 DTO: IsolationHealthResponseDto
  - contextMissingCount24h: number
  - crossTenantQuerySuspects24h: number
  - lastCheckedAt: string

2. GET /events
- Query DTO: GetIsolationEventsQueryDto
  - from?: string
  - to?: string
  - severity?: LOW|MEDIUM|HIGH
  - page?: number
  - limit?: number
- 응답 DTO: IsolationEventsResponseDto

## 6) 프론트 라우팅/메뉴 반영안

## 6.1 신규 라우트
1. /billing
2. /monitoring
3. /quotas
4. /isolation

## 6.2 메뉴 정합성 규칙
1. 사이드바 메뉴는 실제 Route와 1:1 매핑
2. 미구현 페이지는 메뉴 노출 금지 또는 명시적 배지(준비중)
3. CUD 가능 화면은 저장/삭제 버튼 동작 시 결과 다이얼로그 + 감사로그 API 연동

## 7) 단계별 구현 로드맵

## Phase 1 (2주)
1. 메뉴/라우트 정합성 정리
2. Billing MVP 목록 + 기간 필터 + CSV
3. Monitoring MVP overview + 이벤트 목록

## Phase 2 (2주)
1. Quota 정책 관리 화면 + batch update
2. Threat Intel 배포 상태/재시도
3. 정책 변경 이력(감사로그 확장)

## Phase 3 (2주)
1. Data Isolation 검증 대시보드
2. SLO/알람 룰 추가
3. 운영 리포트 자동화

## 8) 수용 기준(Definition of Done)
1. Admin의 모든 CUD API가 감사로그를 기록한다.
2. 메뉴 클릭 시 404/빈 라우트가 없다.
3. 날짜 포맷 표준(YYYY-MM-DD, YYYY-MM-DD HH:mm, YYYY-MM-DD HH:mm:ss)을 준수한다.
4. 멀티테넌트 경계(tenant context) 없는 조회/수정 요청은 차단된다.
5. CI에서 audit CUD 체크를 통과한다.
