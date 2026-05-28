import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * InitAdminSchema
 * 목적: tms_admin 초기 스키마를 단일 마이그레이션으로 구성한다.
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='마스터 관리자 계정 (tms_admin DB)'
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
      CREATE TABLE IF NOT EXISTS \`tenant_users\` (
        \`id\` INT NOT NULL AUTO_INCREMENT COMMENT '사용자 고유 ID',
        \`email\` VARCHAR(255) NOT NULL COMMENT '로그인 이메일',
        \`password_hash\` VARCHAR(255) NOT NULL COMMENT '비밀번호 해시 (bcrypt)',
        \`display_name\` VARCHAR(255) NOT NULL COMMENT '표시 이름',
        \`role\` ENUM('operator','analyst','auditor') NOT NULL DEFAULT 'analyst' COMMENT '역할: operator(운영자) | analyst(분석가) | auditor(감사자)',
        \`is_active\` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '계정 활성화 여부',
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '생성 일시',
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '수정 일시',
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uq_tenant_users_email\` (\`email\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='테넌트 내 사용자 계정 및 역할 (RBAC)'
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`alerts\` (
        \`id\` INT NOT NULL AUTO_INCREMENT COMMENT '알람 고유 ID',
        \`title\` VARCHAR(255) NOT NULL COMMENT '알람 제목',
        \`description\` TEXT NULL COMMENT '알람 설명',
        \`severity\` ENUM('LOW','MEDIUM','HIGH','CRITICAL') NOT NULL DEFAULT 'MEDIUM' COMMENT '위험도: LOW | MEDIUM | HIGH | CRITICAL',
        \`status\` ENUM('OPEN','IN_PROGRESS','RESOLVED','FALSE_POSITIVE') NOT NULL DEFAULT 'OPEN' COMMENT '처리 상태: OPEN | IN_PROGRESS | RESOLVED | FALSE_POSITIVE',
        \`rule_id\` VARCHAR(255) NULL COMMENT '트리거된 탐지 룰 ID',
        \`source_ip\` VARCHAR(255) NULL COMMENT '출발지 IP',
        \`assigned_to\` INT NULL COMMENT '담당자 사용자 ID',
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '생성 일시',
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '수정 일시',
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='보안 알람 이벤트'
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`alert_notification_policies\` (
        \`id\` INT NOT NULL AUTO_INCREMENT COMMENT '정책 고유 ID',
        \`channels\` JSON NOT NULL COMMENT '알림 채널 목록 (EMAIL|SLACK|SMS)',
        \`recipients\` JSON NOT NULL COMMENT '채널별 수신자 목록',
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '생성 일시',
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '수정 일시',
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='알림 채널 및 수신자 정책'
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`alert_notification_histories\` (
        \`id\` INT NOT NULL AUTO_INCREMENT COMMENT '발송 이력 고유 ID',
        \`alert_id\` INT NOT NULL COMMENT '대상 알림 ID',
        \`channel\` VARCHAR(255) NOT NULL COMMENT '발송 채널 (EMAIL|SLACK|SMS)',
        \`recipient\` VARCHAR(255) NOT NULL COMMENT '수신자',
        \`delivery_status\` VARCHAR(255) NOT NULL COMMENT '발송 결과 (SENT|FAILED)',
        \`error_message\` TEXT NULL COMMENT '실패 메시지',
        \`sent_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '발송 시각',
        PRIMARY KEY (\`id\`),
        KEY \`idx_alert_notification_histories_alert_id\` (\`alert_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='알림 발송 결과 이력'
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`parsing_rules\` (
        \`id\` INT NOT NULL AUTO_INCREMENT COMMENT '규칙 고유 ID',
        \`name\` VARCHAR(255) NOT NULL COMMENT '규칙 이름',
        \`rule_definition\` JSON NOT NULL COMMENT '파싱 규칙 정의 (JSON 구조)',
        \`log_source_type\` VARCHAR(255) NULL COMMENT '적용 대상 로그 소스 유형',
        \`is_active\` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '활성화 여부',
        \`priority\` INT NOT NULL DEFAULT 0 COMMENT '적용 우선순위 (낮을수록 먼저 적용)',
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '생성 일시',
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '수정 일시',
        PRIMARY KEY (\`id\`),
        KEY \`idx_parsing_rules_priority\` (\`priority\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='테넌트별 커스텀 로그 파싱 룰 (Go 엔진 Redis 캐싱)'
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
        \`dispatch_status\` ENUM('PENDING','DISPATCHED','FAILED') NOT NULL DEFAULT 'PENDING'
          COMMENT 'RedPanda 전파 상태: PENDING | DISPATCHED | FAILED',
        \`dispatched_at\` DATETIME NULL COMMENT '전파 완료 일시',
        \`dispatch_error\` TEXT NULL COMMENT '전파 실패 오류 메시지',
        \`dispatch_attempts\` INT NOT NULL DEFAULT 0 COMMENT '전파 시도 횟수',
        \`expires_at\` DATETIME NULL COMMENT '만료 일시',
        \`createdAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '등록 일시',
        \`updatedAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
          ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '수정 일시',
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='글로벌 위협 인텔리전스(TI) 피드 레지스트리'
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`system_health_snapshots\` (
        \`id\` INT NOT NULL AUTO_INCREMENT COMMENT '스냅샷 고유 ID',
        \`cpu_usage_pct\` FLOAT NOT NULL DEFAULT 0 COMMENT 'CPU 사용률 (%)',
        \`memory_usage_pct\` FLOAT NOT NULL DEFAULT 0 COMMENT '메모리 사용률 (%)',
        \`disk_usage_pct\` FLOAT NOT NULL DEFAULT 0 COMMENT '디스크 사용률 (%)',
        \`db_status\` ENUM('ONLINE','OFFLINE','UNKNOWN') NOT NULL DEFAULT 'UNKNOWN' COMMENT 'MariaDB 연결 상태',
        \`redis_status\` ENUM('ONLINE','OFFLINE','UNKNOWN') NOT NULL DEFAULT 'UNKNOWN' COMMENT 'Redis 연결 상태',
        \`clickhouse_status\` ENUM('ONLINE','OFFLINE','UNKNOWN') NOT NULL DEFAULT 'UNKNOWN' COMMENT 'ClickHouse 연결 상태',
        \`go_engine_status\` ENUM('ONLINE','OFFLINE','UNKNOWN') NOT NULL DEFAULT 'UNKNOWN' COMMENT 'Go 수집 엔진 상태',
        \`has_alert\` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '임계치 초과 알림 발생 여부',
        \`checked_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '점검 일시',
        PRIMARY KEY (\`id\`),
        INDEX \`idx_health_checked_at\` (\`checked_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      COMMENT='시스템 상태 이력 스냅샷'
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`system_alert_events\` (
        \`id\` INT NOT NULL AUTO_INCREMENT COMMENT '알림 이벤트 고유 ID',
        \`alert_type\` ENUM(
          'CPU_HIGH','MEMORY_HIGH','DISK_HIGH',
          'DB_DOWN','REDIS_DOWN','CLICKHOUSE_DOWN','GO_ENGINE_DOWN',
          'INTEGRITY_CHANGED','FILE_MISSING'
        ) NOT NULL COMMENT '알림 유형',
        \`severity\` ENUM('WARN','CRITICAL') NOT NULL DEFAULT 'WARN' COMMENT '심각도',
        \`message\` TEXT NOT NULL COMMENT '알림 메시지',
        \`metric_value\` FLOAT NULL COMMENT '측정 수치',
        \`alert_count\` INT NOT NULL DEFAULT 1 COMMENT '연속 알림 횟수',
        \`is_resolved\` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '해결 여부',
        \`resolved_at\` DATETIME NULL COMMENT '해결 일시',
        \`last_alerted_at\` DATETIME NULL COMMENT '마지막 알림 일시 (재알림 간격 계산용)',
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '최초 발생 일시',
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '수정 일시',
        PRIMARY KEY (\`id\`),
        INDEX \`idx_alert_type_resolved\` (\`alert_type\`, \`is_resolved\`),
        INDEX \`idx_alert_created\` (\`created_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      COMMENT='시스템 이상 알림 이벤트 이력'
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`integrity_baselines\` (
        \`id\` INT NOT NULL AUTO_INCREMENT COMMENT '기준 고유 ID',
        \`file_path\` VARCHAR(512) NOT NULL COMMENT '점검 대상 파일 경로',
        \`file_label\` VARCHAR(255) NOT NULL COMMENT '파일 식별 레이블',
        \`hash_algorithm\` VARCHAR(16) NOT NULL DEFAULT 'SHA256' COMMENT '해시 알고리즘',
        \`expected_hash\` VARCHAR(128) NULL COMMENT '기준(baseline) 해시 값',
        \`current_hash\` VARCHAR(128) NULL COMMENT '최근 점검 해시 값',
        \`status\` ENUM('OK','CHANGED','MISSING','UNCHECKED') NOT NULL DEFAULT 'UNCHECKED' COMMENT '점검 결과',
        \`last_checked_at\` DATETIME NULL COMMENT '마지막 점검 일시',
        \`last_synced_at\` DATETIME NULL COMMENT '마지막 동기화 일시',
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '등록 일시',
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '수정 일시',
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uq_integrity_file_path\` (\`file_path\`(512))
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      COMMENT='무결성 점검 기준 파일 레지스트리'
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
      CREATE TABLE IF NOT EXISTS \`master_settings\` (
        \`id\` int NOT NULL AUTO_INCREMENT COMMENT '설정 고유 ID',
        \`section\` varchar(100) NOT NULL COMMENT '설정 섹션 (예: smtp)',
        \`identy\` varchar(100) NOT NULL COMMENT '설정 식별자 (예: host, port)',
        \`value\` text NULL COMMENT '설정 값(문자열 저장)',
        \`vtype\` tinyint NOT NULL DEFAULT 1 COMMENT '값 타입 (1=text, 2=int, 3=float, 4=bool)',
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '생성 일시',
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '수정 일시',
        UNIQUE KEY \`UQ_master_settings_section_identy\` (\`section\`, \`identy\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='마스터 공통 시스템 설정(KV)'
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

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`billing_pricing_policies\` (
        \`id\` INT NOT NULL AUTO_INCREMENT COMMENT '정책 고유 ID',
        \`tier_code\` VARCHAR(50) NOT NULL COMMENT '적용 등급 코드 (LITE|PREMIUM|ENTERPRISE)',
        \`base_fee\` DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT '기본 요금',
        \`included_eps\` DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT '기본 포함 EPS',
        \`eps_overage_per_100\` DECIMAL(12,4) NOT NULL DEFAULT 0 COMMENT 'EPS 초과 100당 단가',
        \`storage_overage_per_gb\` DECIMAL(12,4) NOT NULL DEFAULT 0 COMMENT '스토리지 초과 GB당 단가',
        \`log_per_million\` DECIMAL(12,4) NOT NULL DEFAULT 0 COMMENT '로그 100만 건당 단가',
        \`currency\` VARCHAR(10) NOT NULL DEFAULT 'USD' COMMENT '통화 코드',
        \`createdAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '생성 일시',
        \`updatedAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
          ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '수정 일시',
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_billing_pricing_policies_tier_code\` (\`tier_code\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='등급별 빌링 단가 정책'
    `);

    await queryRunner.query(`
      INSERT INTO \`billing_pricing_policies\`
        (\`tier_code\`, \`base_fee\`, \`included_eps\`, \`eps_overage_per_100\`, \`storage_overage_per_gb\`, \`log_per_million\`, \`currency\`)
      VALUES
        ('LITE', 80.00, 100.00, 8.0000, 1.5000, 2.0000, 'USD'),
        ('PREMIUM', 250.00, 400.00, 6.0000, 1.2000, 1.5000, 'USD'),
        ('ENTERPRISE', 700.00, 1200.00, 4.0000, 0.9000, 1.0000, 'USD')
      ON DUPLICATE KEY UPDATE
        \`base_fee\` = VALUES(\`base_fee\`),
        \`included_eps\` = VALUES(\`included_eps\`),
        \`eps_overage_per_100\` = VALUES(\`eps_overage_per_100\`),
        \`storage_overage_per_gb\` = VALUES(\`storage_overage_per_gb\`),
        \`log_per_million\` = VALUES(\`log_per_million\`),
        \`currency\` = VALUES(\`currency\`)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`tenant_bootstrap_tokens\` (
        \`id\` INT NOT NULL AUTO_INCREMENT COMMENT '토큰 고유 ID',
        \`tenant_id\` INT NOT NULL COMMENT '대상 테넌트 ID',
        \`email\` VARCHAR(255) NULL COMMENT '초대 대상 이메일(선택)',
        \`token_hash\` VARCHAR(255) NOT NULL COMMENT '토큰 해시값 (bcrypt)',
        \`expires_at\` DATETIME NOT NULL COMMENT '토큰 만료 시각',
        \`used_at\` DATETIME NULL COMMENT '토큰 사용 시각',
        \`issued_by_master_user_id\` INT NULL COMMENT '발급한 마스터 관리자 ID',
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '생성 일시',
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
          ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '수정 일시',
        PRIMARY KEY (\`id\`),
        KEY \`IDX_tenant_bootstrap_tokens_tenant_id\` (\`tenant_id\`),
        KEY \`IDX_tenant_bootstrap_tokens_expires_at\` (\`expires_at\`),
        CONSTRAINT \`FK_tenant_bootstrap_tokens_tenant\`
          FOREIGN KEY (\`tenant_id\`) REFERENCES \`tenants\` (\`id\`)
          ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='테넌트 최초 관리자 등록용 1회성 토큰'
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`tenant_password_reset_tokens\` (
        \`id\` INT NOT NULL AUTO_INCREMENT COMMENT '토큰 고유 ID',
        \`tenant_id\` INT NOT NULL COMMENT '대상 테넌트 ID',
        \`email\` VARCHAR(255) NOT NULL COMMENT '재설정 대상 이메일',
        \`token_hash\` VARCHAR(255) NOT NULL COMMENT '토큰 해시값 (bcrypt)',
        \`expires_at\` DATETIME NOT NULL COMMENT '토큰 만료 시각',
        \`used_at\` DATETIME NULL COMMENT '토큰 사용 시각',
        \`issued_by_master_user_id\` INT NULL COMMENT '발급한 마스터 관리자 ID',
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '생성 일시',
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
          ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '수정 일시',
        PRIMARY KEY (\`id\`),
        KEY \`IDX_tenant_password_reset_tokens_tenant_id\` (\`tenant_id\`),
        KEY \`IDX_tenant_password_reset_tokens_email\` (\`email\`),
        KEY \`IDX_tenant_password_reset_tokens_expires_at\` (\`expires_at\`),
        CONSTRAINT \`FK_tenant_password_reset_tokens_tenant\`
          FOREIGN KEY (\`tenant_id\`) REFERENCES \`tenants\` (\`id\`)
          ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='테넌트 관리자 비밀번호 재설정용 1회성 토큰'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `tenant_password_reset_tokens`');
    await queryRunner.query('DROP TABLE IF EXISTS `tenant_bootstrap_tokens`');
    await queryRunner.query('DROP TABLE IF EXISTS `billing_pricing_policies`');
    await queryRunner.query('DROP TABLE IF EXISTS `auth_sessions`');
    await queryRunner.query('DROP TABLE IF EXISTS `auth_user_security_states`');
    await queryRunner.query('DROP TABLE IF EXISTS `master_settings`');
    await queryRunner.query('DROP TABLE IF EXISTS `master_auth_settings`');
    await queryRunner.query('DROP TABLE IF EXISTS `licenses`');
    await queryRunner.query('DROP TABLE IF EXISTS `integrity_baselines`');
    await queryRunner.query('DROP TABLE IF EXISTS `system_alert_events`');
    await queryRunner.query('DROP TABLE IF EXISTS `system_health_snapshots`');
    await queryRunner.query('DROP TABLE IF EXISTS `audit_logs`');
    await queryRunner.query('DROP TABLE IF EXISTS `threat_intel_feeds`');
    await queryRunner.query('DROP TABLE IF EXISTS `usage_snapshots`');
    await queryRunner.query('DROP TABLE IF EXISTS `parsing_rules`');
    await queryRunner.query('DROP TABLE IF EXISTS `alert_notification_histories`');
    await queryRunner.query('DROP TABLE IF EXISTS `alert_notification_policies`');
    await queryRunner.query('DROP TABLE IF EXISTS `alerts`');
    await queryRunner.query('DROP TABLE IF EXISTS `tenant_users`');
    await queryRunner.query('DROP TABLE IF EXISTS `tenant_settings`');
    await queryRunner.query('DROP TABLE IF EXISTS `tenants`');
    await queryRunner.query('DROP TABLE IF EXISTS `tenant_tiers`');
    await queryRunner.query('DROP TABLE IF EXISTS `master_users`');
  }
}
