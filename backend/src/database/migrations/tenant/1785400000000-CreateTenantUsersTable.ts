/**
 * Migration: CreateTenantUsersTable
 *
 * 목적: tenant_db_* 스키마에 tenant_users 테이블을 생성한다.
 * 영향: 테넌트 사용자 계정/역할(RBAC) 관리 및 사용자 관리 API 동작 기반을 제공한다.
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `tenant_users`');
  }
}
