#!/usr/bin/env bash
# =============================================================================
# SOAR 최초 설치 스크립트 (npm install + .env 초기화)
# 사용법: ./scripts/setup.sh
# =============================================================================
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

BOLD='\033[1m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; RESET='\033[0m'
info()    { echo -e "${CYAN}[INFO]${RESET}  $*"; }
success() { echo -e "${GREEN}[OK]${RESET}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*"; }

echo -e "${BOLD}SOAR 초기 설치 시작${RESET}"
echo ""

# ── .env 초기화 ───────────────────────────────────────────────────────────────
if [[ ! -f "$REPO_ROOT/.env" ]]; then
  cp "$REPO_ROOT/.env.example" "$REPO_ROOT/.env"
  warn ".env 파일을 생성했습니다. 비밀번호를 반드시 변경하세요: $REPO_ROOT/.env"
else
  info ".env 파일이 이미 존재합니다. 스킵"
fi

# ── Backend npm ci ────────────────────────────────────────────────────────────
info "Backend 의존성 설치 중..."
cd "$REPO_ROOT/backend" && npm ci
success "Backend 의존성 설치 완료"

# ── Frontend Admin npm ci ─────────────────────────────────────────────────────
info "Frontend Admin 의존성 설치 중..."
cd "$REPO_ROOT/frontend-admin" && npm ci
success "Frontend Admin 의존성 설치 완료"

# ── Frontend Tenant npm ci ────────────────────────────────────────────────────
info "Frontend Tenant 의존성 설치 중..."
cd "$REPO_ROOT/frontend-tenant" && npm ci
success "Frontend Tenant 의존성 설치 완료"

# ── Go 의존성 다운로드 ────────────────────────────────────────────────────────
if command -v go &>/dev/null; then
  info "Go 모듈 다운로드 중..."
  cd "$REPO_ROOT/go-engine" && go mod download
  success "Go 모듈 다운로드 완료"
else
  warn "Go가 설치되어 있지 않습니다. Go Engine은 Docker로 기동됩니다."
fi

echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${BOLD} 설치 완료! 다음 단계:${RESET}"
echo -e "  1. .env 파일에서 비밀번호 설정 확인"
echo -e "  2. 인프라 기동:  docker compose up -d"
echo -e "  3. DB 마이그레이션: ./scripts/migrate.sh run"
echo -e "  4. 개발 서버:    ./scripts/dev.sh"
echo -e "     또는"
echo -e "  4. 운영 배포:    ./scripts/prod.sh docker"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
