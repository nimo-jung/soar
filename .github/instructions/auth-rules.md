---
applyTo: "**"
---

# Auth & User Business Rules

## 1. 계정/비밀번호 기본 규칙
- 비밀번호 저장은 반드시 bcrypt 해시를 사용한다.
- Master Admin 계정은 tms_admin.master_users에서 관리한다.
- Tenant 사용자 계정은 tenant_db_{slug}.tenant_users에서 관리한다.

## 2. 로그인 엔드포인트 규칙
- Master 로그인 엔드포인트는 POST /auth/master/login 이다.
- Tenant 로그인 엔드포인트는 POST /auth/tenant/login 이다.
- Master 로그인 요청 본문은 email, password를 포함해야 한다.
- Tenant 로그인 요청 본문은 tenantSlug, email, password를 포함해야 한다.
- Tenant 로그인 응답에는 accessToken과 brandingConfig를 포함해야 한다.

## 3. JWT 및 권한 규칙
- JWT에는 isMaster, role, tenantId(tenant 계정인 경우)를 포함한다.
- Master API는 MasterGuard로 보호하고, Tenant API는 TenantGuard + RolesGuard로 보호한다.
- Tenant RBAC 역할은 운영자(OPERATOR), 분석가(ANALYST), 감사자(AUDITOR)를 사용한다.

## 4. Dev/Prod 접근 경로 규칙
- Dev 모드에서는 각 UI가 Vite proxy를 통해 backend-dev로 인증 요청을 전달해야 한다.
- 컨테이너 환경의 dev proxy target은 localhost가 아닌 backend-dev 서비스명을 기본값으로 사용한다.
- Prod 모드에서는 frontend(UI)와 backend(API/Auth/Docs)를 직접 노출한다.
- Prod UI 경로는 /master를 사용하고, API/Auth/Docs는 backend 엔드포인트를 사용한다.

## 5. 인증 장애 예방/검증 규칙
- 로그인 500 에러 발생 시 우선 DB 스키마와 권한(tms_admin, tenant_db_*)을 확인한다.
- 운영 환경에서는 auto-migration을 사용하지 않고 마이그레이션을 명시적으로 수행한다.
- 배포/변경 후 scripts/smoke.sh dev 또는 scripts/smoke.sh prod 로 인증 스모크 테스트를 수행한다.
- 프론트에서 ECONNREFUSED가 보이면 Vite proxy target과 backend 서비스 상태를 우선 점검한다.