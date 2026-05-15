# soar

## docker 사용법

### 1. 환경 변수 파일 준비
cp .env.example .env

### 2. 인프라만 기동 (MariaDB, Redis, ClickHouse, RedPanda)
docker compose up -d

### 3. 전체 기동 (앱 포함)
docker compose --profile app up -d