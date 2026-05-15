import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * InitAdminSchema
 * 목적: soar_admin DB 초기 스키마 생성
 * 생성 테이블:
 *   - master_users       : 마스터 관리자 계정
 *   - tenants            : 고객사 테넌트 목록
 *   - tenant_settings    : 테넌트별 제한·정책 설정 (tenants FK)
 *   - usage_snapshots    : EPS·스토리지 사용량 배치 집계
 *   - threat_intel_feeds : 글로벌 위협 인텔리전스 피드
 * 영향도: 신규 스키마 생성 전용, 기존 데이터 없음
 */
export class InitAdminSchema1778803200000 implements MigrationInterface {
  name = 'InitAdminSchema1778803200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── master_users ────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`master_users\` (
        \`id\`           INT          NOT NULL AUTO_INCREMENT COMMENT '계정 고유 ID',
        \`email\`        VARCHAR(255) NOT NULL COMMENT '로그인 이메일',
        \`passwordHash\` VARCHAR(255) NOT NULL COMMENT '비밀번호 해시 (bcrypt)',
        \`isActive\`     TINYINT(1)   NOT NULL DEFAULT 1 COMMENT '계정 활성 여부',
        \`createdAt\`    DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '생성 일시',
        \`updatedAt\`    DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
                          ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '수정 일시',
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`IDX_master_users_email\` (\`email\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='마스터 관리자 계정 (soar_admin DB)'
    `);

    // ── tenants ─────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`tenants\` (
        \`id\`           INT                                    NOT NULL AUTO_INCREMENT COMMENT '테넌트 고유 ID',
        \`slug\`         VARCHAR(255)                           NOT NULL COMMENT '테넌트 슬러그 (DB명 접미사로 사용)',
        \`name\`         VARCHAR(255)                           NOT NULL COMMENT '고객사명',
        \`status\`       ENUM('ACTIVE','SUSPENDED','DELETED')   NOT NULL DEFAULT 'ACTIVE'
                         COMMENT '테넌트 상태: ACTIVE | SUSPENDED | DELETED',
        \`contactEmail\` VARCHAR(255)                           NULL COMMENT '담당자 이메일',
        \`createdAt\`    DATETIME(6)                            NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '생성 일시',
        \`updatedAt\`    DATETIME(6)                            NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
                         ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '수정 일시',
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`IDX_tenants_slug\` (\`slug\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='멀티테넌트 고객사 목록'
    `);

    // ── tenant_settings ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`tenant_settings\` (
        \`id\`                INT          NOT NULL AUTO_INCREMENT COMMENT '설정 고유 ID',
        \`tenant_id\`         INT          NOT NULL COMMENT '대상 테넌트 ID',
        \`eps_limit\`         INT          NOT NULL DEFAULT 1000
                              COMMENT '초당 허용 이벤트 수(EPS) 한도',
        \`storage_quota_gb\`  INT          NOT NULL DEFAULT 100
                              COMMENT '스토리지 허용 한도 (GB)',
        \`retention_days\`    INT          NOT NULL DEFAULT 90
                              COMMENT 'ClickHouse TTL 기준 로그 보관 주기 (일)',
        \`branding_config\`   JSON         NULL
                              COMMENT '화이트라벨링 설정 (primary_color, logo_url, favicon_url 등)',
        \`createdAt\`         DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '생성 일시',
        \`updatedAt\`         DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
                              ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '수정 일시',
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`IDX_tenant_settings_tenant_id\` (\`tenant_id\`),
        CONSTRAINT \`FK_tenant_settings_tenant\`
          FOREIGN KEY (\`tenant_id\`) REFERENCES \`tenants\` (\`id\`)
          ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='테넌트별 제한·정책 설정'
    `);

    // ── usage_snapshots ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`usage_snapshots\` (
        \`id\`               INT         NOT NULL AUTO_INCREMENT COMMENT '스냅샷 고유 ID',
        \`tenant_id\`        INT         NOT NULL COMMENT '대상 테넌트 ID',
        \`eps_avg\`          FLOAT       NOT NULL DEFAULT 0 COMMENT '평균 EPS',
        \`storage_used_gb\`  FLOAT       NOT NULL DEFAULT 0 COMMENT '실제 사용 스토리지 (GB)',
        \`log_count\`        BIGINT      NOT NULL DEFAULT 0 COMMENT '해당 집계 기간 총 로그 건수',
        \`snapshot_at\`      DATETIME    NOT NULL COMMENT '집계 기준 일시',
        \`createdAt\`        DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '레코드 생성 일시',
        PRIMARY KEY (\`id\`),
        KEY \`IDX_usage_snapshots_tenant_snapshot\` (\`tenant_id\`, \`snapshot_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        COMMENT='EPS·스토리지 실사용량 배치 집계 테이블 (빌링 데이터)'
    `);

    // ── threat_intel_feeds ───────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`threat_intel_feeds\` (
        \`id\`          INT          NOT NULL AUTO_INCREMENT COMMENT 'TI 피드 고유 ID',
        \`feedType\`    VARCHAR(255) NOT NULL COMMENT '피드 유형 (IP, DOMAIN, HASH, URL 등)',
        \`indicator\`   VARCHAR(255) NOT NULL COMMENT '위협 지표 값',
        \`severity\`    VARCHAR(255) NULL COMMENT '위협 수준 (LOW, MEDIUM, HIGH, CRITICAL)',
        \`description\` TEXT         NULL COMMENT '위협 설명',
        \`source\`      VARCHAR(255) NULL COMMENT '출처',
        \`is_active\`   TINYINT(1)   NOT NULL DEFAULT 1 COMMENT '활성화 여부',
        \`expires_at\`  DATETIME     NULL COMMENT '만료 일시',
        \`createdAt\`   DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '등록 일시',
        \`updatedAt\`   DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
                        ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '수정 일시',
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='글로벌 위협 인텔리전스(TI) 피드 레지스트리'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // FK 제약 있는 테이블부터 역순 삭제
    await queryRunner.query(`DROP TABLE IF EXISTS \`tenant_settings\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`usage_snapshots\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`threat_intel_feeds\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`master_users\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`tenants\``);
  }
}
