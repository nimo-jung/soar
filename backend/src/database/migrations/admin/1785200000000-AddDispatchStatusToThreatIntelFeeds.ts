/**
 * Migration: AddDispatchStatusToThreatIntelFeeds
 *
 * 목적: threat_intel_feeds 테이블에 RedPanda 전파 상태 추적 컬럼 추가
 * 영향: threat_intel_feeds 테이블에 dispatch_status, dispatched_at, dispatch_error, dispatch_attempts 컬럼 추가
 *      기존 행은 PENDING 상태로 초기화됨
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDispatchStatusToThreatIntelFeeds1785200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`threat_intel_feeds\`
        ADD COLUMN IF NOT EXISTS \`dispatch_status\` ENUM('PENDING','DISPATCHED','FAILED') NOT NULL DEFAULT 'PENDING'
          COMMENT 'RedPanda 전파 상태: PENDING | DISPATCHED | FAILED'
          AFTER \`is_active\`,
        ADD COLUMN IF NOT EXISTS \`dispatched_at\` DATETIME NULL
          COMMENT '전파 완료 일시'
          AFTER \`dispatch_status\`,
        ADD COLUMN IF NOT EXISTS \`dispatch_error\` TEXT NULL
          COMMENT '전파 실패 오류 메시지'
          AFTER \`dispatched_at\`,
        ADD COLUMN IF NOT EXISTS \`dispatch_attempts\` INT NOT NULL DEFAULT 0
          COMMENT '전파 시도 횟수'
          AFTER \`dispatch_error\`
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`threat_intel_feeds\`
        DROP COLUMN IF EXISTS \`dispatch_attempts\`,
        DROP COLUMN IF EXISTS \`dispatch_error\`,
        DROP COLUMN IF EXISTS \`dispatched_at\`,
        DROP COLUMN IF EXISTS \`dispatch_status\`
    `);
  }
}
