/**
 * Migration: CreateAlertsTables
 *
 * 목적: tenant_db_* 스키마에 alerts, alert_notification_policies, alert_notification_histories 테이블 생성
 * 영향: 알림 이벤트 관리와 알림 전송 이력 기록 기능의 저장소를 제공
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAlertsTables1785410000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `alert_notification_histories`');
    await queryRunner.query('DROP TABLE IF EXISTS `alert_notification_policies`');
    await queryRunner.query('DROP TABLE IF EXISTS `alerts`');
  }
}
