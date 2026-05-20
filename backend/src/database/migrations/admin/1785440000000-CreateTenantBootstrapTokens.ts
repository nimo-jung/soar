/**
 * Migration: CreateTenantBootstrapTokens
 *
 * 목적: 테넌트 최초 관리자 토큰 + 빌링 단가 정책 테이블을 단일 마이그레이션으로 생성
 * 영향: 최초 관리자 등록 플로우와 빌링 정책 저장소를 동시에 초기화
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTenantBootstrapTokens1785440000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `tenant_bootstrap_tokens`');
    await queryRunner.query('DROP TABLE IF EXISTS `billing_pricing_policies`');
  }
}
