import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTenantAuditLogsTable1785500000000 implements MigrationInterface {
  name = 'CreateTenantAuditLogsTable1785500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`audit_logs\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT COMMENT '감사 로그 고유 ID',
        \`actor_type\` ENUM('MASTER','TENANT','SYSTEM') NOT NULL DEFAULT 'SYSTEM' COMMENT '행위자 유형: MASTER | TENANT | SYSTEM',
        \`actor_id\` INT NULL COMMENT '행위자 ID (JWT sub)',
        \`actor_email\` VARCHAR(255) NULL COMMENT '행위자 이메일',
        \`tenant_slug\` VARCHAR(255) NULL COMMENT '테넌트 식별자(slug)',
        \`action\` VARCHAR(120) NOT NULL COMMENT '행위 코드 (예: TENANT_LOGIN)',
        \`resource_type\` VARCHAR(120) NULL COMMENT '대상 리소스 유형',
        \`resource_id\` VARCHAR(120) NULL COMMENT '대상 리소스 ID',
        \`message\` TEXT NULL COMMENT '행위 설명',
        \`metadata\` JSON NULL COMMENT '부가 메타데이터(JSON)',
        \`ip_address\` VARCHAR(64) NULL COMMENT '요청 IP 주소',
        \`user_agent\` TEXT NULL COMMENT '요청 User-Agent',
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '생성 일시',
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_tenant_audit_logs_created_at\` (\`created_at\`),
        INDEX \`IDX_tenant_audit_logs_action\` (\`action\`),
        INDEX \`IDX_tenant_audit_logs_actor_type\` (\`actor_type\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='테넌트 감사 로그'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `audit_logs`');
  }
}
