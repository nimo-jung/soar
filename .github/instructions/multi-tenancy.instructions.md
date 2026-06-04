---
applyTo: "**"
---

# 멀티테넌트 관리 기능 구현 규칙

TMS 플랫폼의 멀티테넌시(Multi-tenancy) 기능을 구현할 때 반드시 따라야 하는 비즈니스 로직 규칙이다.
Master Admin(공급자), Tenant Admin(고객사), 그리고 백엔드 기술 프레임워크 세 영역으로 나뉜다.

### 프론트엔드 구성 원칙

웹 UI는 목적과 보안 경계가 다르므로 두 개의 독립된 앱으로 분리한다.

| 앱 | 디렉토리 | 대상 | 특징 |
|----|----------|------|------|
| Master Admin UI | `frontend-admin/` | 시스템 공급자 | `MasterGuard` 인증, 브랜딩 고정 |
| Tenant UI | `frontend-tenant/` | 고객사 운영자·분석가·감사자 | `RolesGuard` + tenant scope, 화이트라벨링 적용 |

* 두 앱은 동일한 NestJS API(`/api`)를 바라보되, 진입점 URL과 인증 Guard가 다르다.
* 운영 배포에서는 단일 Gateway 진입점을 사용하되, 경로 기반으로 분리한다. (`/admin` = Master Admin UI, `/tenant` = Tenant UI)
* 경로 기반 배포 시 React Router basename 및 Vite base path를 앱별로 명시해 라우팅 충돌을 방지한다.
* Tenant UI에서만 로그인 응답의 `brandingConfig`를 기반으로 PrimeReact CSS 변수를 동적으로 적용한다.
* 공용 UI 컴포넌트(디자인 시스템)는 별도 패키지(`packages/ui`)로 분리하여 두 앱이 공유할 수 있다.

---

## 1. 테넌트 라이프사이클 관리 (Master Admin)

시스템 공급자가 전체 테넌트를 제어하는 기능이다.

* 테넌트 상태는 `ACTIVE | SUSPENDED | DELETED` Enum으로 관리하며, `tms_admin` DB의 `tenants` 테이블에 저장한다.
* 테넌트 설정 테이블에는 `eps_limit`(초당 허용 로그 건수), `storage_quota_gb`(스토리지 한도), `retention_days`(보관 주기) 컬럼을 반드시 포함한다.
* ClickHouse TTL은 테넌트 프로비저닝 시 `retention_days` 값을 기반으로 동적으로 설정한다. 하드코딩된 TTL 값을 사용하지 않는다.
* EPS·스토리지 실사용량은 별도 집계 테이블(`usage_snapshots`)에 배치(Batch)로 주기적으로 기록하여 빌링 데이터로 활용한다.
* 글로벌 위협 인텔리전스(TI) 배포는 마스터 관리자가 등록 시 RedPanda 전용 토픽(`ti.global.updates`)을 통해 모든 테넌트의 Go 분석 엔진으로 실시간 전파한다.
* Master Admin API는 반드시 별도의 `MasterGuard`를 통해 `tms_admin` 권한을 가진 계정만 접근 가능하도록 보호한다.

---

## 2. 테넌트 자율 관리 (Tenant Admin)

각 테넌트 내에서 고객사 관리자가 자율적으로 보안 환경을 설정하는 기능이다.

### Collector 관리

* 수집 포인트(Collector)의 API Key는 발급 시 `bcrypt` 또는 `AES-256`으로 암호화하여 DB에 저장한다.
* Plain text 키는 발급 응답에서 단 1회만 노출하며, 이후 재조회가 불가능하도록 구현한다.

### IP 화이트리스트

* Go 수집 엔진은 요청 수신 시 Redis 캐시(`tenant:{id}:whitelist`)를 조회하여 소스 IP를 실시간으로 검증한다. DB를 직접 조회하지 않는다.

### 로그 파싱 규칙

* 테넌트별 커스텀 파싱 룰(Parsing Rule)은 MariaDB tenant DB에 JSON 형태로 저장한다.
* Go 엔진이 기동 또는 규칙 변경 시 Redis에 캐싱하여 사용한다.

### 사용자 및 권한 관리 (RBAC)

* 테넌트 내 역할은 `운영자 | 분석가 | 감사자` 세 가지로 구분한다.
* 권한 검증은 NestJS `RolesGuard`에서 테넌트 스코프(`tenant_id + role`)로 함께 수행한다. 역할만으로 접근을 허용하지 않는다.

### system 테넌트 보호 규칙

* `system` 테넌트는 플랫폼 기본 운영 테넌트이므로 삭제(soft/hard)하거나 `SUSPENDED`로 전환할 수 없다.
* 백엔드 서비스 계층(`TenantsService`)에서 `system` 삭제/비활성화를 반드시 차단한다.
* 프론트엔드 테넌트 관리 화면에서도 `system` 행의 삭제/정지 액션 버튼을 비활성화하여 오작동을 방지한다.

### 최초 관리자 토큰/비밀번호 복구 토큰 규칙

* `초기 관리자 등록 토큰(bootstrap token)`은 최초 1회 등록 전용이다.
* 활성 사용자(`is_active=true`)가 1명이라도 존재하면 bootstrap token 발급을 허용하지 않는다.
* 최초 관리자 등록 API(`POST /auth/tenant/bootstrap`)는 활성 사용자가 이미 존재하는 경우 반드시 거부해야 한다.
* 계정 분실 복구는 bootstrap token을 재사용하지 않고, 별도의 `비밀번호 재설정 토큰(password reset token)` 흐름으로 처리한다.
* 비밀번호 재설정 토큰은 활성 사용자가 존재하는 테넌트에서만 발급 가능해야 하며, 대상 이메일과 매칭되는 활성 사용자에게만 사용 가능해야 한다.
* bootstrap token 및 password reset token 모두 단회성(사용 후 즉시 폐기, 만료시간 강제)으로 운영한다.

### 감사로그 (CUD 공통 의무)

* `frontend-admin`과 `frontend-tenant`에서 사용자가 수행하는 모든 CUD(Create/Update/Delete) 액션은 기본적으로 감사로그를 남겨야 한다.
* CUD 기능을 추가할 때는 프론트엔드 버튼/폼 구현과 함께 백엔드 API의 감사로그 기록(`AuditLogService`) 구현을 반드시 포함한다.
* 감사로그에는 최소한 행위자(사용자), 액션 코드, 대상 리소스, 테넌트 식별자(해당 시), 발생 시각이 포함되어야 한다.
* CUD API 코드 리뷰 기준: 감사로그 기록이 누락된 Create/Update/Delete 엔드포인트는 승인하지 않는다.
* CI 검증 기준: `backend`에서 `npm run check:audit:cud`를 통과하지 못하면 병합하지 않는다.

### 날짜 표시 형식 표준

* 운영 화면의 날짜 표기는 정밀도에 따라 아래 형식을 사용한다.
	* 날짜만: `YYYY-MM-DD`
	* 분까지: `YYYY-MM-DD HH:mm`
	* 초까지: `YYYY-MM-DD HH:mm:ss`
* 날짜 숫자는 0 패딩(2자리)을 적용한다.

### 알람 및 알림 정책

* 알림 발송(이메일·슬랙·SMS) 로직은 테넌트 설정으로부터 채널과 수신자를 동적으로 읽어 처리한다.
* 발송 결과는 별도 이력 테이블에 기록한다.

### 플레이북 (TMS)

* 테넌트별 자동 대응 워크플로우(Playbook)는 JSON 구조로 tenant DB에 저장한다.
* 실행 엔진은 플레이북 정의를 런타임에 동적으로 로드하여 수행한다. 정적 하드코딩된 워크플로우를 사용하지 않는다.

---

## 3. 테넌트 컨텍스트 전파 (Tenant Context Propagation)

모든 요청에 `tenant_id`가 포함되어 각 계층으로 자동 전파되어야 한다.

### NestJS

* 모든 API 요청은 `TenantMiddleware` 또는 `TenantGuard`에서 JWT의 `tenant_id`를 추출한다.
* 추출한 `tenant_id`는 `AsyncLocalStorage` 또는 `REQUEST` 스코프 Provider에 저장하여 이후 모든 Service·Repository 계층으로 자동 전파한다.
* Repository 계층에서 DB 커넥션 선택 및 쿼리 바인딩은 항상 Tenant Context에서 `tenant_id`를 읽어 처리하며, 직접 파라미터로 전달하는 방식을 남용하지 않는다.
* 테넌트 컨텍스트가 확인되지 않은 요청은 어떠한 DB 쿼리도 실행해서는 안 된다.

### Go 수집 엔진

* 수신 요청의 Header 또는 Payload에서 API Key를 추출하고, Redis(`tenant:{id}:api_key`)에서 `tenant_id` 매핑을 조회하여 인증한다.
* 인증 실패 시 로그를 즉시 거부하고 사유를 기록한다.

---

## 4. 데이터 격리 검증 (Data Isolation)

다른 테넌트의 데이터가 혼합되어 조회되지 않도록 격리를 보장해야 한다.

* ClickHouse 쿼리는 항상 테넌트 전용 DB(`db_tenant_{id}`)를 명시한다. `USE` 문 없이 공용 DB에서 테넌트 데이터를 조회하는 패턴을 금지한다.
* NestJS에서 ClickHouse 쿼리 생성 시 DB 이름은 Tenant Context로부터 동적으로 바인딩하며, 소스 코드에 테넌트 식별자를 하드코딩하지 않는다.
* 동적 커넥션 풀(Connection Pool)은 테넌트별로 독립적으로 관리하고, Redis에 커넥션 메타데이터를 캐싱하여 매 요청마다 신규 연결을 생성하지 않도록 한다.

---

## 5. 화이트 라벨링 (White Labeling)

고객사 접속 시 자사 브랜딩(로고, 컬러)이 적용되어야 한다.

* 테넌트 브랜딩 설정(`primary_color`, `logo_url`, `favicon_url` 등)은 tenant 설정 테이블의 JSON 컬럼(`branding_config`)에 저장하고 Redis에 캐싱한다.
* React 앱은 로그인 응답 payload에 포함된 `brandingConfig`를 기반으로 PrimeReact 테마의 CSS 변수(`:root` 커스텀 프로퍼티)를 동적으로 덮어써 브랜딩을 적용한다.
* 브랜딩 CSS 변수는 Zustand 전역 스토어에서 관리하며, 테넌트 전환 또는 재로그인 시 즉시 갱신한다.
* 브랜딩 설정이 없는 테넌트에게는 시스템 기본 테마(default theme)를 폴백(fallback)으로 제공한다.

---

## 6. 글로벌 멀티테넌트 스위치 (`isMultiTenantEnabled`)

전역 멀티테넌트 활성화 여부는 `master_auth_settings.is_multi_tenant_enabled` 값을 기준으로 동작한다.

* 설정 주체는 **Master Admin**이며, 인증 설정(`Admin Auth Settings`) API에서 관리한다.
* Tenant 화면/기능에서 전역 스위치를 변경하지 않는다.
* 인증 정책 값(`maxLoginFailures`, `lockMinutes`, `maxConcurrentSessions`, `autoLogoutTimeoutMinutes`)과 별개로,
  `isMultiTenantEnabled`는 **테넌트 식별 방식**을 전역에서 결정한다.

### `isMultiTenantEnabled = true`

* 테넌트 로그인 요청에서 `tenantSlug`가 반드시 필요하다.
* 로그인/잠금조회/부트스트랩/비밀번호 재설정은 요청의 `tenantSlug`를 기준으로 대상 테넌트를 결정한다.
* 테넌트별 인증 정책 및 실패 잠금 상태는 각 테넌트 스코프에서 독립적으로 적용된다.

### `isMultiTenantEnabled = false`

* 테넌트 로그인은 `system` 테넌트만 허용한다.
* `tenantSlug`가 전달되더라도 `system`이 아니면 인증을 거부한다.
* 잠금조회/부트스트랩/비밀번호 재설정의 대상 테넌트도 내부적으로 `system`으로 고정된다.

---

## 7. Syslog 수집 멀티테넌트 표준화 규칙 (Vector + Go)

동일 포트(예: `514`)로 다수 장비 로그가 유입되고, 고정 source IP를 보장할 수 없는 환경에서도 테넌트 격리를 유지하기 위한 표준이다.

### 파이프라인 기본 구조

* 네트워크 장비는 Syslog를 Vector 수집기로 전송한다.
* Vector는 2단계 처리(경량 벤더 분류 -> 벤더별 VRL 파싱)로 `device_code`를 추출한다.
* Vector는 정형화 이벤트를 RedPanda 입력 토픽으로 발행한다.
* Go 라우터 엔진은 `device_code`/`source_ip` 기반 최종 테넌트 판정을 수행한다.
* 판정 성공 이벤트만 테넌트 전용 토픽 및 테넌트 전용 ClickHouse DB로 전달한다.

### 벤더별 파싱 규칙

* 벤더별 로그 포맷 차이를 흡수하기 위해 VRL은 벤더 단위로 분리한다.
* 모든 이벤트에 모든 벤더 파서를 적용하지 않고, 공통 envelope 필드로 1차 분류 후 해당 벤더 파서만 적용한다.
* 벤더 파싱 실패 또는 `device_code` 추출 실패 이벤트는 즉시 quarantine 경로로 분리한다.

### 테넌트 판정 우선순위 (Go 최종 검증)

* 1순위: `device_code + source_ip`가 동일하게 일치하는 단일 테넌트가 있으면 해당 테넌트로 분류한다.
* 2순위: `device_code`만 일치하는 단일 테넌트가 있으면 해당 테넌트로 분류한다.
* 3순위: `device_code`가 없거나 불일치하고 `source_ip`만 일치하는 단일 테넌트가 있으면 해당 테넌트로 조건부 분류한다.
* 4순위: 1~3 조건에 해당하지 않으면 quarantine으로 분리한다.

### 모호성(다중 후보) 처리 규칙

* 어떤 단계에서든 후보 테넌트가 2개 이상이면 승인하지 않고 quarantine으로 분리한다.
* `device_code` 중복 등록, 공유 NAT, 광범위 CIDR 화이트리스트로 발생하는 다중 후보는 자동 승인하지 않는다.

### 신뢰도 등급 및 운영 규칙

* `device_code + source_ip` 매칭은 `HIGH` 신뢰도로 처리한다.
* `device_code only` 매칭은 `MEDIUM` 신뢰도로 처리한다.
* `source_ip only` 매칭은 `LOW` 신뢰도로 처리하고, 반드시 경고/리뷰 이벤트를 남긴다.
* `LOW` 이벤트가 반복되면 매핑 보강 또는 차단 정책을 적용한다.

### 식별자/매핑 데이터 규칙

* `device_code`는 전역 유일성(테넌트 간 중복 금지)을 보장해야 한다.
* 장비 등록/수정/비활성화 CUD는 감사로그 기록을 필수로 한다.
* 매핑 키는 Redis 캐시를 우선 사용하되, 매핑 미존재/비활성 장비는 fail-closed(즉시 quarantine)로 처리한다.

### 데이터 격리 및 저장 규칙

* 최종 저장은 반드시 `db_tenant_{id}`와 같이 테넌트 전용 DB로만 수행한다.
* quarantine 이벤트는 운영 분석을 위해 별도 토픽/테이블에 보관하되, 운영 테넌트 데이터 집계에는 포함하지 않는다.
