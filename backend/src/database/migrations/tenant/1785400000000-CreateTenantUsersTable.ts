/**
 * Migration: CreateTenantUsersTable
 *
 * 목적: tenant_db_* 스키마 초기 테이블(tenant_users, alerts, alert_notification_*, parsing_rules)을 단일 마이그레이션으로 생성한다.
 * 영향: 테넌트 사용자/RBAC, 알림 정책·이력, 파싱 룰 저장소를 동시에 초기화한다.
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTenantUsersTable1785400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `parsing_rules`');
    await queryRunner.query('DROP TABLE IF EXISTS `alert_notification_histories`');
    await queryRunner.query('DROP TABLE IF EXISTS `alert_notification_policies`');
    await queryRunner.query('DROP TABLE IF EXISTS `alerts`');
    await queryRunner.query('DROP TABLE IF EXISTS `tenant_users`');
  }
}
