# Admin Phase 1 티켓 분해본

작성일: 2026-05-20
기준 문서: docs/admin-menu-ia-mvp-api-draft.md
범위: Phase 1 (2주) - 메뉴/라우트 정합성 + Billing MVP + Monitoring MVP

## 1. 운영 원칙
1. 모든 CUD API는 감사로그를 기록한다.
2. 메뉴와 라우트는 1:1 대응한다.
3. 날짜 표시는 표준 포맷을 사용한다.
4. 멀티테넌트 컨텍스트 검증을 유지한다.
5. 완료 전 backend의 audit CUD 체크를 통과한다.

## 2. Epic 구성
1. EPIC-A1: Admin 메뉴-라우트 정합성 정리
2. EPIC-A2: Billing MVP 구현
3. EPIC-A3: Monitoring MVP 구현
4. EPIC-A4: 통합 검증/릴리즈 준비

## 3. 티켓 백로그

## EPIC-A1: Admin 메뉴-라우트 정합성

### A1-01. 메뉴-라우트 불일치 정리
- 목표: 사이드바 노출 메뉴와 실제 라우트를 일치시킨다.
- 작업 내용:
  1. billing, monitoring 메뉴 클릭 시 404/리다이렉트 오류 제거
  2. 미구현 메뉴는 숨김 또는 준비중 배지 정책 적용
  3. breadcrumb 동작 점검
- 범위:
  1. frontend 라우팅
  2. AdminLayout 메뉴 구성
- 산출물:
  1. 메뉴 정책 반영 코드
  2. QA 체크리스트
- 수용 기준:
  1. 메뉴 클릭 시 유효한 화면으로 이동
  2. 빈 라우트 없음
- 예상 공수: 0.5d
- 의존성: 없음

### A1-02. Billing/Monitoring 페이지 스캐폴딩
- 목표: MVP 페이지 골격을 먼저 확보한다.
- 작업 내용:
  1. BillingPage, MonitoringPage 생성
  2. App 라우트 연결
  3. 기본 필터/테이블 영역 placeholder 구성
- 산출물:
  1. 신규 페이지 2개
  2. 메뉴 진입 동선 연결
- 수용 기준:
  1. /billing, /monitoring 화면 렌더링
  2. 모바일/데스크탑 레이아웃 깨짐 없음
- 예상 공수: 0.5d
- 의존성: A1-01

## EPIC-A2: Billing MVP

### A2-01. Billing 백엔드 모듈 생성
- 목표: admin/billing API 모듈 기본 구조를 만든다.
- 작업 내용:
  1. backend/src/admin/billing 모듈/컨트롤러/서비스 생성
  2. AdminModule imports 연결
  3. MasterGuard 보호 적용
- 산출물:
  1. BillingModule
  2. 기본 헬스 엔드포인트
- 수용 기준:
  1. /admin/billing/* 경로 정상 응답
  2. 인증 없는 요청 차단
- 예상 공수: 0.5d
- 의존성: 없음

### A2-02. usage 조회 API 구현
- 목표: usage_snapshots 기반 목록 조회 API 제공
- 작업 내용:
  1. GET /admin/billing/usage 구현
  2. tenantId, tierCode, from, to, page, limit 필터 구현
  3. summary(totalLogCount, avgEps, avgStorageGb) 계산
- DTO 초안:
  1. GetUsageQueryDto
  2. UsageSnapshotItemDto
  3. UsageListResponseDto
- 수용 기준:
  1. 필터 정확성 확인
  2. 30일 조회 응답 목표 2초 내(개발 데이터 기준)
- 예상 공수: 1.5d
- 의존성: A2-01

### A2-03. usage CSV export API 구현
- 목표: 사용량 리포트 CSV 다운로드 지원
- 작업 내용:
  1. GET /admin/billing/usage/export 구현
  2. 조회 필터와 동일 조건 적용
  3. export 이벤트 감사로그 기록
- 수용 기준:
  1. UTF-8 CSV 다운로드 가능
  2. 행 수/합계가 목록 조회와 일치
- 예상 공수: 1d
- 의존성: A2-02

### A2-04. Billing 프론트 목록 화면
- 목표: 운영자가 사용량을 조회할 수 있는 기본 UI 제공
- 작업 내용:
  1. 기간/테넌트/티어 필터
  2. 표 컬럼: snapshotAt, tenant, epsAvg, storageUsedGb, logCount
  3. summary 카드 3종
  4. CSV 다운로드 버튼 연결
- 수용 기준:
  1. 필터 변경 시 목록/summary 동기화
  2. empty/error/loading 상태 처리
- 예상 공수: 1.5d
- 의존성: A2-02, A2-03

## EPIC-A3: Monitoring MVP

### A3-01. Monitoring 백엔드 모듈 생성
- 목표: admin/monitoring API 모듈 기본 구조를 만든다.
- 작업 내용:
  1. backend/src/admin/monitoring 모듈/컨트롤러/서비스 생성
  2. AdminModule imports 연결
  3. MasterGuard 보호 적용
- 수용 기준:
  1. /admin/monitoring/* 경로 정상 응답
  2. 인증 없는 요청 차단
- 예상 공수: 0.5d
- 의존성: 없음

### A3-02. monitoring overview API 구현
- 목표: 기본 관측 지표 API 제공
- 작업 내용:
  1. GET /admin/monitoring/overview 구현
  2. 응답: epsSeries, ingestErrorRate, parseErrorRate, avgIngestLatencyMs
  3. from/to/tenantId 필터 지원
- DTO 초안:
  1. MonitoringOverviewQueryDto
  2. MonitoringOverviewResponseDto
- 수용 기준:
  1. 기간 필터 시계열 정합성
  2. 지표 단위/소수점 표기 일관성
- 예상 공수: 1d
- 의존성: A3-01

### A3-03. monitoring events API 구현
- 목표: 운영 이벤트 목록 조회
- 작업 내용:
  1. GET /admin/monitoring/events 구현
  2. severity/tenant/from/to/page/limit 필터
  3. pagination 응답 제공
- DTO 초안:
  1. MonitoringEventsQueryDto
  2. MonitoringEventsResponseDto
- 수용 기준:
  1. 정렬 최신순
  2. severity 필터 정확성
- 예상 공수: 1d
- 의존성: A3-01

### A3-04. Monitoring 프론트 화면
- 목표: overview + 이벤트 목록을 하나의 운영 화면으로 제공
- 작업 내용:
  1. 상단 지표 카드 + EPS 추이 차트
  2. 하단 이벤트 테이블
  3. 필터 패널(tenant/date/severity)
- 수용 기준:
  1. 필터 변경 시 chart/table 동기화
  2. loading/error/empty 상태 처리
- 예상 공수: 1.5d
- 의존성: A3-02, A3-03

## EPIC-A4: 통합 검증/릴리즈 준비

### A4-01. 감사로그/권한 회귀 점검
- 목표: Phase 1 작업의 보안 회귀 방지
- 작업 내용:
  1. CUD 감사로그 누락 점검
  2. MasterGuard 접근 제어 점검
  3. 감사로그 액션 코드 정리
- 수용 기준:
  1. 감사로그 누락 0건
  2. 권한 없는 사용자 접근 불가
- 예상 공수: 0.5d
- 의존성: A2-03, A3-03

### A4-02. E2E 스모크 시나리오 추가
- 목표: 핵심 동선을 자동 검증한다.
- 작업 내용:
  1. 메뉴 진입 시나리오
  2. Billing 조회/CSV
  3. Monitoring 조회
- 수용 기준:
  1. CI에서 스모크 통과
  2. 실패 시 원인 식별 가능 로그
- 예상 공수: 1d
- 의존성: A2-04, A3-04

### A4-03. 운영 가이드 업데이트
- 목표: 운영자 인수인계 문서 보강
- 작업 내용:
  1. 화면 사용법
  2. 지표 해석 가이드
  3. 장애 시 대응 체크리스트
- 수용 기준:
  1. docs 반영 완료
  2. QA 리뷰 완료
- 예상 공수: 0.5d
- 의존성: A2-04, A3-04

## 4. 2주 스프린트 배치안

### Week 1
1. A1-01, A1-02
2. A2-01, A2-02
3. A3-01, A3-02

### Week 2
1. A2-03, A2-04
2. A3-03, A3-04
3. A4-01, A4-02, A4-03

## 5. 리스크 및 대응
1. 리스크: monitoring 원천 지표 데이터 부족
- 대응: 1차는 mock/샘플 집계 소스로 MVP 구축 후 실제 파이프라인 연동

2. 리스크: usage_snapshots 데이터 sparse
- 대응: empty state를 정상 시나리오로 정의하고 데이터 수집 배치 계획 병행

3. 리스크: 메뉴 노출 정책 혼선
- 대응: 미구현 메뉴는 기본 비노출 원칙, 필요 시 준비중 배지로만 노출

## 6. 즉시 생성 가능한 이슈 제목 샘플
1. [Admin][A1-01] 사이드바 메뉴와 라우트 정합성 정리
2. [Admin][A1-02] Billing/Monitoring 페이지 스캐폴딩 및 라우팅 연결
3. [Admin][A2-02] Billing usage 조회 API 및 DTO 구현
4. [Admin][A2-04] Billing 목록/요약/CSV 다운로드 UI 구현
5. [Admin][A3-02] Monitoring overview API 구현
6. [Admin][A3-04] Monitoring 대시보드 UI 구현
7. [Admin][A4-02] Admin Phase1 E2E 스모크 시나리오 추가
