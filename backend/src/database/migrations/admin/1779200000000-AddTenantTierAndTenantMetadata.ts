import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * AddTenantTierAndTenantMetadata
 * 목적: 테넌트 등급(티어) 관리 테이블 및 테넌트 메타데이터(사용기한, IP 대역, 등급) 추가
 * 영향도: soar_admin 스키마 확장, 기존 tenants 데이터는 기본 등급 LITE로 이관
 */
export class AddTenantTierAndTenantMetadata1779200000000 implements MigrationInterface {
  name = 'AddTenantTierAndTenantMetadata1779200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`tenant_tiers\` (
        \`id\`                 INT NOT NULL AUTO_INCREMENT COMMENT '등급 고유 ID',
        \`code\`               ENUM('LITE','PREMIUM','ENTERPRISE') NOT NULL COMMENT '등급 코드',
        \`name\`               VARCHAR(255) NOT NULL COMMENT '등급 표시명',
        \`daily_log_quota_gb\` INT NOT NULL COMMENT '하루 로그 저장 용량 한도(GB)',
        \`max_users\`          INT NOT NULL COMMENT '테넌트 사용자 수 한도',
        \`description\`        VARCHAR(255) NULL COMMENT '등급 설명',
        \`is_active\`          TINYINT(1) NOT NULL DEFAULT 1 COMMENT '등급 활성 여부',
        \`createdAt\`          DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '생성 일시',
        \`updatedAt\`          DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
                                ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '수정 일시',
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`IDX_tenant_tiers_code\` (\`code\`)
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
      ALTER TABLE \`tenants\`
      ADD COLUMN \`expiresAt\` DATETIME NULL COMMENT '사용 기한(만료 일시)',
      ADD COLUMN \`ipCidr\` VARCHAR(255) NULL COMMENT '허용 IP 대역(CIDR 또는 콤마 구분 목록)',
      ADD COLUMN \`tierCode\` ENUM('LITE','PREMIUM','ENTERPRISE') NOT NULL DEFAULT 'LITE' COMMENT '테넌트 등급 코드'
    `);

    await queryRunner.query(`CREATE INDEX \`IDX_tenants_tierCode\` ON \`tenants\` (\`tierCode\`)`);
    await queryRunner.query(`
      ALTER TABLE \`tenants\`
      ADD CONSTRAINT \`FK_tenants_tier_code\`
      FOREIGN KEY (\`tierCode\`) REFERENCES \`tenant_tiers\` (\`code\`)
      ON UPDATE CASCADE
      ON DELETE RESTRICT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `tenants` DROP FOREIGN KEY `FK_tenants_tier_code`');
    await queryRunner.query('DROP INDEX `IDX_tenants_tierCode` ON `tenants`');
    await queryRunner.query('ALTER TABLE `tenants` DROP COLUMN `tierCode`');
    await queryRunner.query('ALTER TABLE `tenants` DROP COLUMN `ipCidr`');
    await queryRunner.query('ALTER TABLE `tenants` DROP COLUMN `expiresAt`');
    await queryRunner.query('DROP TABLE IF EXISTS `tenant_tiers`');
  }
}
