# Auth & User Business Rules

## 1. 회원가입 (Signup)
- 모든 유저는 특정 `Tenant`에 소속되어야 함.
- 비밀번호는 반드시 `bcrypt`를 사용하여 솔팅(Salting) 후 해시 저장.
- 회원가입 성공 시, 해당 테넌트의 전용 MariaDB 스키마가 존재하는지 확인하고 없으면 자동 생성 스크립트 실행.

## 2. 로그인 (Login)
- JWT 전략을 사용하며 Payload에 `userId`, `tenantId`, `role`을 포함함.
- 로그인 시도 5회 실패 시 Redis를 이용해 30분간 해당 IP 차단.
- 모든 API 요청 시 JWT의 `tenantId`와 요청 헤더의 `x-tenant-id`가 일치하는지 Interceptor에서 검증.

## 3. 권한 (RBAC)
- Role은 `SUPER_ADMIN`, `TENANT_ADMIN`, `USER`로 구분.
- 테넌트 설정 변경은 `TENANT_ADMIN` 이상만 가능함.