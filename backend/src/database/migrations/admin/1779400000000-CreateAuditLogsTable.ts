import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * CreateAuditLogsTable
 * 목적: 관리자 영역 CUD/인증 이벤트를 저장하는 감사로그 테이블(audit_logs) 추가
 * 영향도: soar_admin 스키마에 append-only 감사 데이터가 누적되며, 관리자 UI에서 조회 가능해짐
 */
export class CreateAuditLogsTable1779400000000 implements MigrationInterface {
  name = 'CreateAuditLogsTable1779400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `audit_logs`');
  }
}
