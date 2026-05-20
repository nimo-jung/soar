import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * InitAdminSchema
 * 목적: soar_admin 초기 스키마를 단일 마이그레이션으로 구성한다.
 * 영향도: 프로젝트 초기 단계용 스쿼시 마이그레이션. 분할 마이그레이션 대체.
 */
export class InitAdminSchema1785100000000 implements MigrationInterface {
  name = 'InitAdminSchema1785100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`master_users\` (
        \`id\` INT NOT NULL AUTO_INCREMENT COMMENT '계정 고유 ID',
        \`email\` VARCHAR(255) NOT NULL COMMENT '로그인 이메일',
        \`passwordHash\` VARCHAR(255) NOT NULL COMMENT '비밀번호 해시 (bcrypt)',
        \`passwordHistory\` JSON NULL COMMENT '최근 비밀번호 해시 이력 (재사용 방지용)',
        \`isActive\` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '계정 활성 여부',
        \`status\` ENUM('ACTIVE','DELETED') NOT NULL DEFAULT 'ACTIVE' COMMENT '계정 상태: ACTIVE | DELETED',
        \`deletedAt\` DATETIME(6) NULL COMMENT '소프트 삭제 일시 (복구 시 NULL)',
        \`createdAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '생성 일시',
        \`updatedAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
          ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '수정 일시',
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`IDX_master_users_email\` (\`email\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='마스터 관리자 계정 (soar_admin DB)'
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`tenant_tiers\` (
        \`id\` INT NOT NULL AUTO_INCREMENT COMMENT '등급 고유 ID',
        \`code\` ENUM('LITE','PREMIUM','ENTERPRISE') NOT NULL COMMENT '등급 코드',
        \`name\` VARCHAR(255) NOT NULL COMMENT '등급 표시명',
        \`daily_log_quota_gb\` INT NOT NULL COMMENT '하루 로그 저장 용량 한도(GB)',
        \`max_users\` INT NOT NULL COMMENT '테넌트 사용자 수 한도',
        \`description\` TEXT NULL COMMENT '등급 설명',
        \`is_active\` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '등급 활성 여부',
        \`createdAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '생성 일시',
        \`updatedAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
          ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '수정 일시',
        PRIMARY KEY (\`id\`),
        KEY \`IDX_tenant_tiers_code\` (\`code\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='테넌트 등급(요금제) 정의'
    `);

    await queryRunner.query(`
      INSERT INTO \`tenant_tiers\` (\`code\`, \`name\`, \`daily_log_quota_gb\`, \`max_users\`, \`description\`, \`is_active\`)
      VALUES
        ('LITE', 'Lite', 1, 1, '하루 로그 저장용량 1GB / 테넌트 사용자 1명', 1),
        ('PREMIUM', '프리미엄', 10, 3, '하루 로그 저장용량 10GB / 테넌트 사용자 3명', 1),
        ('ENTERPRISE', '엔터프라이즈', 100, 10, '하루 로그 저장용량 100GB / 테넌트 사용자 10명', 1)
      ON DUPLICATE KEY UPDATE
        \`name\` = VALUES(\`name\`),
        \`daily_log_quota_gb\` = VALUES(\`daily_log_quota_gb\`),
        \`max_users\` = VALUES(\`max_users\`),
        \`description\` = VALUES(\`description\`),
        \`is_active\` = VALUES(\`is_active\`)
    `);

    await queryRunner.query(`
      INSERT INTO \`tenant_tiers\` (\`code\`, \`name\`, \`daily_log_quota_gb\`, \`max_users\`, \`description\`, \`is_active\`)
      SELECT 'ENTERPRISE', '무제한', 0, 0, 'System 전용 무제한 티어', 1
      FROM DUAL
      WHERE NOT EXISTS (
        SELECT 1
        FROM \`tenant_tiers\`
        WHERE \`name\` = '무제한'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`tenants\` (
        \`id\` INT NOT NULL AUTO_INCREMENT COMMENT '테넌트 고유 ID',
        \`slug\` VARCHAR(255) NOT NULL COMMENT '테넌트 슬러그 (DB명 접미사로 사용)',
        \`name\` VARCHAR(255) NOT NULL COMMENT '고객사명',
        \`status\` ENUM('ACTIVE','SUSPENDED','DELETED') NOT NULL DEFAULT 'ACTIVE'
          COMMENT '테넌트 상태: ACTIVE | SUSPENDED | DELETED',
        \`contactEmail\` VARCHAR(255) NULL COMMENT '담당자 이메일',
        \`expiresAt\` DATETIME NULL COMMENT '사용 기한(만료 일시)',
        \`ipCidr\` TEXT NOT NULL COMMENT '로그 수집 대상 IP 대역(단일 IP 또는 CIDR, 콤마 구분 목록)',
        \`tierId\` INT NOT NULL COMMENT '테넌트 등급 ID',
        \`createdAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '생성 일시',
        \`updatedAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
          ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '수정 일시',
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`IDX_tenants_slug\` (\`slug\`),
        KEY \`IDX_tenants_tierId\` (\`tierId\`),
        CONSTRAINT \`FK_tenants_tier_id\`
          FOREIGN KEY (\`tierId\`) REFERENCES \`tenant_tiers\` (\`id\`)
          ON UPDATE CASCADE ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='멀티테넌트 고객사 목록'
    `);

    await queryRunner.query(`
      INSERT INTO \`tenants\` (\`slug\`, \`name\`, \`status\`, \`contactEmail\`, \`expiresAt\`, \`ipCidr\`, \`tierId\`)
      SELECT
        'system',
        '시스템',
        'ACTIVE',
        'system@localhost',
        NULL,
        '0.0.0.0',
        (
          SELECT \`id\`
          FROM \`tenant_tiers\`
          WHERE \`name\` = '무제한'
          ORDER BY \`id\` ASC
          LIMIT 1
        )
      FROM DUAL
      WHERE NOT EXISTS (
        SELECT 1
        FROM \`tenants\`
        WHERE \`slug\` = 'system'
      )
    `);

    await queryRunner.query(`
      UPDATE \`tenants\`
      SET
        \`name\` = '시스템',
        \`status\` = 'ACTIVE',
        \`expiresAt\` = NULL,
        \`ipCidr\` = '0.0.0.0',
        \`tierId\` = (
          SELECT \`id\`
          FROM \`tenant_tiers\`
          WHERE \`name\` = '무제한'
          ORDER BY \`id\` ASC
          LIMIT 1
        )
      WHERE \`slug\` = 'system'
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`tenant_settings\` (
        \`id\` INT NOT NULL AUTO_INCREMENT COMMENT '설정 고유 ID',
        \`tenant_id\` INT NOT NULL COMMENT '대상 테넌트 ID',
        \`eps_limit\` INT NOT NULL DEFAULT 1000 COMMENT '초당 허용 이벤트 수(Events Per Second) 한도',
        \`storage_quota_gb\` INT NOT NULL DEFAULT 100 COMMENT '스토리지 허용 한도 (GB)',
        \`retention_days\` INT NOT NULL DEFAULT 90 COMMENT 'ClickHouse TTL 기준 로그 보관 주기 (일)',
        \`branding_config\` JSON NULL COMMENT '화이트라벨링 설정 (primary_color, logo_url, favicon_url 등)',
        \`max_login_failures\` INT NOT NULL DEFAULT 3 COMMENT '로그인 실패 허용 횟수 (1~5)',
        \`lock_minutes\` INT NOT NULL DEFAULT 5 COMMENT '로그인 잠금 시간(분) (3~30)',
        \`max_concurrent_sessions\` INT NOT NULL DEFAULT 1 COMMENT '계정당 동시 로그인 허용 세션 수 (1~5)',
        \`auto_logout_timeout_minutes\` INT NOT NULL DEFAULT 5 COMMENT '자동 로그아웃 타임아웃(분). 0이면 만료 없음',
        \`createdAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '생성 일시',
        \`updatedAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
          ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '수정 일시',
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`IDX_tenant_settings_tenant_id\` (\`tenant_id\`),
        CONSTRAINT \`FK_tenant_settings_tenant\`
          FOREIGN KEY (\`tenant_id\`) REFERENCES \`tenants\` (\`id\`)
          ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='테넌트별 제한·정책 설정'
    `);

    await queryRunner.query(`
      INSERT INTO \`tenant_settings\` (
        \`tenant_id\`,
        \`eps_limit\`,
        \`storage_quota_gb\`,
        \`retention_days\`,
        \`branding_config\`,
        \`max_login_failures\`,
        \`lock_minutes\`,
        \`max_concurrent_sessions\`,
        \`auto_logout_timeout_minutes\`
      )
      SELECT
        t.id,
        0,
        0,
        36500,
        NULL,
        3,
        5,
        1,
        5
      FROM \`tenants\` t
      WHERE t.slug = 'system'
      AND NOT EXISTS (
        SELECT 1
        FROM \`tenant_settings\` ts
        WHERE ts.\`tenant_id\` = t.id
      )
    `);

    await queryRunner.query(`
      UPDATE \`tenant_settings\` ts
      JOIN \`tenants\` t ON t.id = ts.\`tenant_id\`
      SET
        ts.\`eps_limit\` = 0,
        ts.\`storage_quota_gb\` = 0,
        ts.\`retention_days\` = 36500
      WHERE t.\`slug\` = 'system'
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`usage_snapshots\` (
        \`id\` INT NOT NULL AUTO_INCREMENT COMMENT '스냅샷 고유 ID',
        \`tenant_id\` INT NOT NULL COMMENT '대상 테넌트 ID',
        \`eps_avg\` FLOAT NOT NULL DEFAULT 0 COMMENT '평균 EPS',
        \`storage_used_gb\` FLOAT NOT NULL DEFAULT 0 COMMENT '실제 사용 스토리지 (GB)',
        \`log_count\` BIGINT NOT NULL DEFAULT 0 COMMENT '해당 집계 기간 총 로그 건수',
        \`snapshot_at\` DATETIME NOT NULL COMMENT '집계 기준 일시',
        \`createdAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '레코드 생성 일시',
        PRIMARY KEY (\`id\`),
        KEY \`IDX_usage_snapshots_tenant_snapshot\` (\`tenant_id\`, \`snapshot_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='EPS·스토리지 실사용량 배치 집계 테이블 (빌링 데이터)'
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`threat_intel_feeds\` (
        \`id\` INT NOT NULL AUTO_INCREMENT COMMENT 'TI 피드 고유 ID',
        \`feedType\` VARCHAR(255) NOT NULL COMMENT '피드 유형 (IP, DOMAIN, HASH, URL 등)',
        \`indicator\` VARCHAR(255) NOT NULL COMMENT '위협 지표 값',
        \`severity\` VARCHAR(255) NULL COMMENT '위협 수준 (LOW, MEDIUM, HIGH, CRITICAL)',
        \`description\` TEXT NULL COMMENT '위협 설명',
        \`source\` VARCHAR(255) NULL COMMENT '출처',
        \`is_active\` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '활성화 여부',
        \`expires_at\` DATETIME NULL COMMENT '만료 일시',
        \`createdAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '등록 일시',
        \`updatedAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
          ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '수정 일시',
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='글로벌 위협 인텔리전스(TI) 피드 레지스트리'
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`audit_logs\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT COMMENT '감사 로그 고유 ID',
        \`actor_type\` ENUM('MASTER','TENANT','SYSTEM') NOT NULL DEFAULT 'SYSTEM' COMMENT '행위자 유형: MASTER | TENANT | SYSTEM',
        \`actor_id\` INT NULL COMMENT '행위자 ID (JWT sub)',
        \`actor_email\` VARCHAR(255) NULL COMMENT '행위자 이메일',
        \`tenant_slug\` VARCHAR(255) NULL COMMENT '테넌트 식별자(slug)',
        \`action\` VARCHAR(120) NOT NULL COMMENT '행위 코드 (예: TENANT_TIER_DELETE)',
        \`resource_type\` VARCHAR(120) NULL COMMENT '대상 리소스 유형',
        \`resource_id\` VARCHAR(120) NULL COMMENT '대상 리소스 ID',
        \`message\` TEXT NULL COMMENT '행위 설명',
        \`metadata\` JSON NULL COMMENT '부가 메타데이터(JSON)',
        \`ip_address\` VARCHAR(64) NULL COMMENT '요청 IP 주소',
        \`user_agent\` TEXT NULL COMMENT '요청 User-Agent',
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '생성 일시',
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_audit_logs_created_at\` (\`created_at\`),
        INDEX \`IDX_audit_logs_action\` (\`action\`),
        INDEX \`IDX_audit_logs_actor_type\` (\`actor_type\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='관리자/인증 이벤트 감사 로그'
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`licenses\` (
        \`id\` INT NOT NULL AUTO_INCREMENT COMMENT '라이선스 고유 ID',
        \`license_key\` TEXT NOT NULL COMMENT '라이선스 키',
        \`expires_at\` DATETIME NOT NULL COMMENT '라이선스 만료 일시',
        \`nic_mac_address\` VARCHAR(64) NULL COMMENT '라이선스가 귀속된 NIC MAC 주소',
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '등록 일시',
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
          ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '수정 일시',
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='제품 라이선스 정보'
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`master_auth_settings\` (
        \`id\` INT NOT NULL AUTO_INCREMENT COMMENT '인증 설정 고유 ID',
        \`max_login_failures\` INT NOT NULL DEFAULT 3 COMMENT '로그인 실패 허용 횟수 (1~5)',
        \`lock_minutes\` INT NOT NULL DEFAULT 5 COMMENT '로그인 잠금 시간(분) (3~30)',
        \`max_concurrent_sessions\` INT NOT NULL DEFAULT 1 COMMENT '계정당 동시 로그인 허용 세션 수 (1~5)',
        \`auto_logout_timeout_minutes\` INT NOT NULL DEFAULT 5 COMMENT '자동 로그아웃 타임아웃(분). 0이면 만료 없음',
        \`is_multi_tenant_enabled\` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '멀티테넌트 기능 활성화 여부',
        \`createdAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '생성 일시',
        \`updatedAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
          ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '수정 일시',
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='마스터 관리자 인증 정책 설정'
    `);

    await queryRunner.query(`
      INSERT INTO \`master_auth_settings\` (
        \`id\`,
        \`max_login_failures\`,
        \`lock_minutes\`,
        \`max_concurrent_sessions\`,
        \`auto_logout_timeout_minutes\`,
        \`is_multi_tenant_enabled\`
      )
      VALUES (1, 3, 5, 1, 5, 0)
      ON DUPLICATE KEY UPDATE
        \`max_login_failures\` = VALUES(\`max_login_failures\`),
        \`lock_minutes\` = VALUES(\`lock_minutes\`),
        \`max_concurrent_sessions\` = VALUES(\`max_concurrent_sessions\`),
        \`auto_logout_timeout_minutes\` = VALUES(\`auto_logout_timeout_minutes\`),
        \`is_multi_tenant_enabled\` = VALUES(\`is_multi_tenant_enabled\`)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`auth_user_security_states\` (
        \`id\` INT NOT NULL AUTO_INCREMENT COMMENT '보안 상태 고유 ID',
        \`scope\` VARCHAR(16) NOT NULL COMMENT '인증 스코프: MASTER | TENANT',
        \`tenant_slug\` VARCHAR(100) NULL COMMENT '테넌트 슬러그 (MASTER는 NULL)',
        \`login_id\` VARCHAR(255) NOT NULL COMMENT '로그인 식별자(이메일)',
        \`failed_attempts\` INT NOT NULL DEFAULT 0 COMMENT '현재 누적 로그인 실패 횟수',
        \`lock_until\` DATETIME(6) NULL COMMENT '계정 잠금 만료 시각',
        \`createdAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '생성 일시',
        \`updatedAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
          ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '수정 일시',
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uq_auth_user_security_states_scope_tenant_login\` (\`scope\`, \`tenant_slug\`, \`login_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='로그인 실패 횟수/잠금 상태 관리'
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`auth_sessions\` (
        \`id\` INT NOT NULL AUTO_INCREMENT COMMENT '세션 고유 ID',
        \`scope\` VARCHAR(16) NOT NULL COMMENT '인증 스코프: MASTER | TENANT',
        \`tenant_slug\` VARCHAR(100) NULL COMMENT '테넌트 슬러그 (MASTER는 NULL)',
        \`account_id\` VARCHAR(64) NOT NULL COMMENT '계정 식별자(계정 PK)',
        \`jti\` VARCHAR(64) NOT NULL COMMENT 'JWT 고유 식별자',
        \`is_revoked\` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '세션 강제 만료 여부',
        \`expires_at\` DATETIME(6) NULL COMMENT '세션 만료 시각 (NULL이면 만료 없음)',
        \`last_activity_at\` DATETIME(6) NOT NULL COMMENT '마지막 활동 시각',
        \`createdAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '생성 일시',
        \`updatedAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
          ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '수정 일시',
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uq_auth_sessions_jti\` (\`jti\`),
        KEY \`idx_auth_sessions_scope_tenant_account\` (\`scope\`, \`tenant_slug\`, \`account_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='로그인 세션 관리 (동시 로그인/자동 만료)'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `auth_user_security_states`');
    await queryRunner.query('DROP TABLE IF EXISTS `master_auth_settings`');
    await queryRunner.query('DROP TABLE IF EXISTS `licenses`');
    await queryRunner.query('DROP TABLE IF EXISTS `audit_logs`');
    await queryRunner.query('DROP TABLE IF EXISTS `threat_intel_feeds`');
    await queryRunner.query('DROP TABLE IF EXISTS `usage_snapshots`');
    await queryRunner.query('DROP TABLE IF EXISTS `tenant_settings`');
    await queryRunner.query('DROP TABLE IF EXISTS `tenants`');
    await queryRunner.query('DROP TABLE IF EXISTS `tenant_tiers`');
    await queryRunner.query('DROP TABLE IF EXISTS `master_users`');
  }
}
