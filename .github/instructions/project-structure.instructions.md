---
applyTo: "**"
---

# SOAR 프로젝트 디렉토리 구조 규칙

이 파일은 프로젝트가 성장하면서 지속적으로 갱신한다.
새 모듈·컴포넌트를 추가할 때는 아래 구조를 기준으로 위치를 결정하고, 이 파일을 함께 업데이트한다.

---

## Backend (NestJS) — `backend/`

단일 NestJS 앱. 라우트 prefix와 Guard로 Admin/Tenant 영역을 분리한다.

```
backend/
└── src/
    ├── admin/                   # /admin/* — MasterGuard 적용 (soar_admin 계정 전용)
    │   ├── tenants/             # 테넌트 생성·정지·삭제·라이선스
    │   ├── quotas/              # EPS 제한·스토리지 할당·보관 주기
    │   ├── billing/             # 사용량 집계·빌링 리포트
    │   ├── monitoring/          # 전체 테넌트 로그 유입·시스템 부하 모니터링
    │   └── threat-intel/        # 글로벌 TI 등록 및 RedPanda 전파
    │
    ├── tenant/                  # /api/* — TenantGuard + RolesGuard 적용
    │   ├── collectors/          # Collector 등록·API Key 발급
    │   ├── ip-whitelist/        # 소스 IP 화이트리스트 관리
    │   ├── parsing-rules/       # 커스텀 로그 파싱 룰
    │   ├── users/               # 테넌트 내 사용자·역할 관리 (RBAC)
    │   ├── dashboard/           # 대시보드 위젯 설정
    │   ├── alerts/              # 알람 정책·알림 발송 이력
    │   └── playbooks/           # SOAR 플레이북 편집·실행
    │
    └── common/                  # 공유 인프라 (두 영역에서 재사용)
        ├── guards/              # MasterGuard, TenantGuard, RolesGuard
        ├── middleware/          # TenantMiddleware (JWT → tenant_id 추출)
        ├── context/             # TenantContext (AsyncLocalStorage)
        ├── database/            # 동적 DB 커넥션 팩토리 (MariaDB, ClickHouse)
        └── decorators/          # @CurrentTenant(), @Roles() 등 커스텀 데코레이터
```

---

## Frontend — Admin UI (`frontend-admin/`)

시스템 공급자 전용. 화이트라벨링 없음. `MasterGuard` 인증.

```
frontend-admin/
├── nginx.conf                 # Prod 정적 서빙용 Nginx 설정
└── src/
    ├── pages/
    │   ├── tenants/             # 테넌트 목록·생성·정지·삭제
    │   ├── quotas/              # EPS·스토리지·보관 주기 설정
    │   ├── billing/             # 사용량 리포트·과금 데이터
    │   ├── monitoring/          # 전체 테넌트 통합 모니터링 대시보드
    │   └── threat-intel/        # 글로벌 TI 등록·배포 현황
    ├── components/              # Admin 전용 PrimeReact 컴포넌트
    ├── store/                   # Zustand 전역 상태
    └── api/                     # axios 인스턴스 (/admin/* 엔드포인트)
```

---

## Frontend — Tenant UI (`frontend-tenant/`)

고객사 운영자·분석가·감사자 전용. 로그인 시 `brandingConfig` 기반 화이트라벨링 적용.

```
frontend-tenant/
├── nginx.conf                 # Prod 정적 서빙용 Nginx 설정
└── src/
    ├── pages/
    │   ├── dashboard/           # 커스텀 위젯 대시보드
    │   ├── collectors/          # Collector 관리·API Key 발급
    │   ├── alerts/              # 알람 목록·알림 정책 설정
    │   ├── playbooks/           # SOAR 플레이북 편집·승인
    │   ├── users/               # 테넌트 내 사용자·역할 관리
    │   └── settings/            # IP 화이트리스트·파싱 룰·브랜딩 설정
    ├── components/              # Tenant 전용 PrimeReact 컴포넌트
    ├── store/
    │   ├── auth.store.ts        # JWT·사용자 정보
    │   └── branding.store.ts    # brandingConfig CSS 변수 관리 (Zustand)
    └── api/                     # axios 인스턴스 (/api/* 엔드포인트)
```

---

## Analysis Engine (GoLang) — `go-engine/`

```

---

## Infrastructure & Runtime — `infra/`, root files

운영 모드에서는 단일 진입점 Gateway를 사용하고, 개발/운영은 profile 기반으로 분리한다.

```
infra/
├── mariadb/
├── clickhouse/
└── gateway/
    └── nginx.conf             # Prod 통합 진입점 (/admin, /tenant, /api, /auth, /docs)

.
├── docker-compose.yml         # dev/prod profile 및 gateway-prod 정의
├── .env.dev                   # 개발 모드 환경변수
└── .env.prod                  # 운영 모드 환경변수
```

---

## Operations Scripts — `scripts/`

운영 안정성 확보를 위한 스크립트는 아래를 기본으로 유지한다.

```
scripts/
├── dev.sh                     # 개발 모드 기동 + 데이터 마운트 preflight
├── prod.sh                    # 운영 모드 기동 + gateway 안내
├── smoke.sh                   # dev/prod 로그인·라우팅 스모크 테스트
├── migrate.sh
├── status.sh
└── stop.sh
```
go-engine/
└── internal/
    ├── ingestion/               # HTTP 수집 엔드포인트 (API Key 인증)
    ├── parsing/                 # 테넌트별 파싱 룰 적용 (Redis 캐시)
    ├── publisher/               # RedPanda raw-logs 토픽 발행
    ├── consumer/                # RedPanda 메시지 소비 → ClickHouse 배치 적재
    ├── whitelist/               # Redis 기반 소스 IP 검증
    └── context/                 # tenant_id 컨텍스트 전파
```

---

## 공유 UI 컴포넌트 (선택) — `packages/ui/`

두 프론트엔드 앱이 공통으로 사용하는 PrimeReact 기반 디자인 시스템.
모노레포 구조가 필요할 경우 추가한다.

```
packages/ui/
└── src/
    ├── components/              # 공용 Button, Table, Chart 래퍼
    └── theme/                   # PrimeReact CSS 변수 기본값 (default theme)
```
