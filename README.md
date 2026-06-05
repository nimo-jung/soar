# TMS

TMS 플랫폼.
멀티테넌트 아키텍처로 구성되며, 테넌트별 물리적 데이터 격리와 고성능 로그 분석을 제공합니다.

## 기술 스택

| 영역 | 기술 |
|------|------|
| Backend | NestJS (TypeORM, JWT, Swagger) |
| Frontend | React + PrimeReact + Zustand (포트 5173) |
| Log Engine | Go + RedPanda (kafka-go) + ClickHouse |
| DB | MariaDB (관리), ClickHouse (로그 OLAP) |
| Cache | Redis (세션·화이트리스트·파싱룰 캐싱) |

---

## 빠른 시작

### 1. 최초 설치

```bash
# 의존성 설치 + .env 초기화
./scripts/setup.sh
```

`.env` 파일을 열어 비밀번호를 설정한 뒤 진행합니다.

### 2. 개발 모드

```bash
# 인프라 + 전체 서비스 한 번에 기동
./scripts/dev.sh

# 개별 서비스만 기동
./scripts/dev.sh infra    # MariaDB, Redis, ClickHouse, RedPanda 컨테이너만
./scripts/dev.sh backend  # NestJS (hot-reload)
./scripts/dev.sh frontend # Frontend (Vite dev, 포트 5173)
./scripts/dev.sh engine   # Go Engine (go run, 포트 8081)

# 데이터 마운트 권한 자동 보정(가능한 경우 sudo 필요)
TMS_PREFLIGHT_AUTOFIX=1 ./scripts/dev.sh infra

# dev.sh는 기본적으로 자동 보정을 시도합니다. 비활성화하려면:
TMS_PREFLIGHT_AUTOFIX=0 ./scripts/dev.sh infra

# 임시로 권한 사전 점검 우회 (권장하지 않음)
TMS_SKIP_PREFLIGHT=1 ./scripts/dev.sh infra
```

기동 후 접속 주소:

| 서비스 | 주소 |
|--------|------|
| Backend API | http://localhost:3000 |
| Swagger 문서 | http://localhost:3000/docs |
| Master UI | http://localhost:5173/master |
| Go Engine (수집) | http://localhost:8081/ingest |
| Vector Syslog (UDP/TCP) | localhost:1514 |
| RedPanda Console | http://localhost:8080 |
| Mailpit (SMTP 테스트 UI) | http://localhost:8025 |

### 3. 운영 모드

```bash
# ★ 권장: Docker Compose로 전체 빌드 + 기동
./scripts/prod.sh docker

# 빌드만 (dist/ 생성)
./scripts/prod.sh build

# 개별 서비스 빌드 + 기동
./scripts/prod.sh backend  # NestJS 빌드 후 node dist/main
./scripts/prod.sh engine   # Go 바이너리 빌드 후 실행
./scripts/prod.sh frontend # Vite 빌드 → frontend/dist/

# 데이터 마운트 권한 자동 보정(가능한 경우 sudo 필요)
TMS_PREFLIGHT_AUTOFIX=1 ./scripts/prod.sh docker

# 임시로 권한 사전 점검 우회 (권장하지 않음)
TMS_SKIP_PREFLIGHT=1 ./scripts/prod.sh docker
```

운영 모드 단일 진입점:

| 용도 | 주소 |
|------|------|
| Master UI | http://localhost:5173/master |
| Backend API/Auth | http://localhost:3000/api, http://localhost:3000/auth |
| Swagger | http://localhost:3000/docs |

### 4. 서비스 종료

```bash
./scripts/stop.sh          # 앱 프로세스 전체 종료
./scripts/stop.sh backend  # 백엔드만 종료
./scripts/stop.sh docker   # Docker Compose 전체 종료
./scripts/stop.sh infra    # 인프라 컨테이너만 종료
```

### 5. DB 마이그레이션

```bash
./scripts/migrate.sh run                       # 마이그레이션 실행
./scripts/migrate.sh revert                    # 마지막 마이그레이션 롤백
./scripts/migrate.sh generate CreateUserTable  # 마이그레이션 파일 생성
./scripts/migrate.sh reset db --yes            # tms_admin DB 재생성 + 마이그레이션 + Seed
./scripts/migrate.sh reset tables --yes        # tms_admin 테이블 삭제 + 마이그레이션 + Seed
```

### 6. 상태 확인

```bash
./scripts/status.sh   # 인프라 컨테이너 + 앱 프로세스 상태 일괄 확인
```

### 6-1. Docker 캐시 정리 + 완전 재빌드

```bash
# dev 기준: 캐시 정리 + 컨테이너 재생성 + 익명 볼륨(node_modules) 갱신
./scripts/rebuild.sh dev --yes

# prod 기준
./scripts/rebuild.sh prod --yes

# 재빌드 후 DB reset(db drop/create + migration)까지 한 번에 수행
./scripts/rebuild.sh dev --yes --with-db-reset

# (주의) named volume까지 삭제하여 데이터 초기화 포함
./scripts/rebuild.sh dev --yes --with-volumes
```

### 7. 스모크 테스트

```bash
# 개발 모드 검증 (backend + master-ui 프록시 로그인 포함)
./scripts/smoke.sh dev

# 운영 모드 검증 (backend/master 직접 접근 기준)
./scripts/smoke.sh prod

# Vector -> RedPanda 파이프라인 스모크
./scripts/smoke-vector.sh dev
```

### 8. Vector 기반 라우팅 모드

`go-engine`는 기본적으로 HTTP 수집 엔드포인트를 유지하면서, 환경변수로 Vector 입력 토픽 라우팅을 동시에 수행할 수 있습니다.

주요 환경변수:

```bash
ENGINE_PIPELINE_MODE=vector
ROUTER_INPUT_TOPIC=logs.parsed.input
ROUTER_QUARANTINE_TOPIC=logs.quarantine
ROUTER_CONSUMER_GROUP=tms-router-dev
```

Vector 설정 파일은 `infra/vector/vector.yaml`에 있으며, 벤더 분류/파싱 실패 이벤트는 `logs.quarantine` 토픽으로 분리됩니다.

---

## Docker 직접 사용법

```bash
# 환경 변수 파일 준비
cp .env.example .env.dev
cp .env.example .env.prod

# 인프라만 기동 (MariaDB, Redis, ClickHouse, RedPanda)
docker compose up -d

# 개발 모드 전체 기동
docker compose --profile dev --env-file .env.dev up -d --build

# 운영 모드 전체 기동
docker compose --profile prod --env-file .env.prod up -d --build

# 운영 모드 접근
# http://localhost:5173/master
# http://localhost:3000/docs

# 종료
docker compose down

# 데이터 볼륨까지 삭제
docker compose down -v
```

### SMTP 설정

토큰 발급 이메일 전송을 위해 SMTP 설정이 필요합니다.

- 개발(dev): `mailpit` 컨테이너를 기본 사용 (`SMTP_HOST=mailpit`, `SMTP_PORT=1025`)
- 운영(prod): 기본값은 내부 `mailpit` fallback 사용. 외부 SMTP 사용 가능 시 `.env.prod` 값으로 교체

필수/권장 환경변수:

```bash
SMTP_HOST=...
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=no-reply@example.com
TENANT_BOOTSTRAP_URL=https://admin.example.com/login
```

---

## 프로젝트 구조

```
tms/
├── backend/              # NestJS API (포트 3000)
│   └── src/
│       ├── admin/        # /admin/* — MasterGuard (공급자 전용)
│       ├── tenant/       # /api/*   — TenantGuard + RolesGuard
│       ├── auth/         # 로그인 (master / tenant)
│       └── common/       # Guards, Middleware, Context, DB Factory
├── frontend/      # Unified Master UI (포트 5173)
├── go-engine/            # 로그 수집·파싱·RedPanda 발행·ClickHouse 적재
├── infra/                # MariaDB init, ClickHouse config, Vector config
├── scripts/              # dev.sh / prod.sh / stop.sh / status.sh / migrate.sh / smoke.sh
└── docker-compose.yml
```