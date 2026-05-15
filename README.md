# SOAR

Security Orchestration, Automation and Response 플랫폼.
멀티테넌트 아키텍처로 구성되며, 테넌트별 물리적 데이터 격리와 고성능 로그 분석을 제공합니다.

## 기술 스택

| 영역 | 기술 |
|------|------|
| Backend | NestJS (TypeORM, JWT, Swagger) |
| Frontend Admin | React + PrimeReact + Zustand (포트 5174) |
| Frontend Tenant | React + PrimeReact + Zustand (포트 5173) |
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
./scripts/dev.sh admin    # Frontend Admin (Vite dev, 포트 5174)
./scripts/dev.sh tenant   # Frontend Tenant (Vite dev, 포트 5173)
./scripts/dev.sh engine   # Go Engine (go run, 포트 8081)
```

기동 후 접속 주소:

| 서비스 | 주소 |
|--------|------|
| Backend API | http://localhost:3000 |
| Swagger 문서 | http://localhost:3000/docs |
| Master Admin UI | http://localhost:5174 |
| Tenant UI | http://localhost:5173 |
| Go Engine (수집) | http://localhost:8081/ingest |
| RedPanda Console | http://localhost:8080 |

### 3. 운영 모드

```bash
# ★ 권장: Docker Compose로 전체 빌드 + 기동
./scripts/prod.sh docker

# 빌드만 (dist/ 생성)
./scripts/prod.sh build

# 개별 서비스 빌드 + 기동
./scripts/prod.sh backend  # NestJS 빌드 후 node dist/main
./scripts/prod.sh engine   # Go 바이너리 빌드 후 실행
./scripts/prod.sh admin    # Vite 빌드 → frontend-admin/dist/
./scripts/prod.sh tenant   # Vite 빌드 → frontend-tenant/dist/
```

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
```

### 6. 상태 확인

```bash
./scripts/status.sh   # 인프라 컨테이너 + 앱 프로세스 상태 일괄 확인
```

---

## Docker 직접 사용법

```bash
# 환경 변수 파일 준비
cp .env.example .env

# 인프라만 기동 (MariaDB, Redis, ClickHouse, RedPanda)
docker compose up -d

# 전체 기동 (앱 포함)
docker compose --profile app up -d

# 종료
docker compose --profile app down

# 데이터 볼륨까지 삭제
docker compose down -v
```

---

## 프로젝트 구조

```
soar/
├── backend/              # NestJS API (포트 3000)
│   └── src/
│       ├── admin/        # /admin/* — MasterGuard (공급자 전용)
│       ├── tenant/       # /api/*   — TenantGuard + RolesGuard
│       ├── auth/         # 로그인 (master / tenant)
│       └── common/       # Guards, Middleware, Context, DB Factory
├── frontend-admin/       # Master Admin UI (포트 5174)
├── frontend-tenant/      # Tenant UI, 화이트라벨링 (포트 5173)
├── go-engine/            # 로그 수집·파싱·RedPanda 발행·ClickHouse 적재
├── infra/                # MariaDB init, ClickHouse config
├── scripts/              # dev.sh / prod.sh / stop.sh / status.sh / migrate.sh
└── docker-compose.yml
```