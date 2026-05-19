import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * LinkTenantToTierById
 * 목적: tenants.tierCode(코드 참조)에서 tenants.tierId(식별자 참조)로 연계 구조 전환
 * 영향도: 테넌트-등급 연결이 tenant_tiers.id FK 기반으로 변경되어 등급 추가/삭제 의미 보존
 */
export class LinkTenantToTierById1779500000000 implements MigrationInterface {
  name = 'LinkTenantToTierById1779500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "ALTER TABLE `tenants` ADD COLUMN `tierId` INT NULL COMMENT '테넌트 등급 ID'",
    );

    await queryRunner.query(`
      UPDATE tenants t
      SET t.tierId = (
        SELECT tt.id
        FROM tenant_tiers tt
        WHERE tt.code = t.tierCode
        ORDER BY tt.is_active DESC, tt.id ASC
        LIMIT 1
      )
    `);

    await queryRunner.query(`
      UPDATE tenants
      SET tierId = (
        SELECT tt.id
        FROM tenant_tiers tt
        ORDER BY tt.is_active DESC, tt.id ASC
        LIMIT 1
      )
      WHERE tierId IS NULL
    `);

    await queryRunner.query('ALTER TABLE `tenants` MODIFY COLUMN `tierId` INT NOT NULL COMMENT \'테넌트 등급 ID\'');
    await queryRunner.query('CREATE INDEX `IDX_tenants_tierId` ON `tenants` (`tierId`)');
    await queryRunner.query(
      'ALTER TABLE `tenants` ADD CONSTRAINT `FK_tenants_tier_id` FOREIGN KEY (`tierId`) REFERENCES `tenant_tiers` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT',
    );

    await queryRunner.query('DROP INDEX `IDX_tenants_tierCode` ON `tenants`');
    await queryRunner.query('ALTER TABLE `tenants` DROP COLUMN `tierCode`');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "ALTER TABLE `tenants` ADD COLUMN `tierCode` ENUM('LITE','PREMIUM','ENTERPRISE') NOT NULL DEFAULT 'LITE' COMMENT '테넌트 등급 코드'",
    );

    await queryRunner.query(`
      UPDATE tenants t
      INNER JOIN tenant_tiers tt ON tt.id = t.tierId
      SET t.tierCode = tt.code
    `);

    await queryRunner.query('CREATE INDEX `IDX_tenants_tierCode` ON `tenants` (`tierCode`)');
    await queryRunner.query('ALTER TABLE `tenants` DROP FOREIGN KEY `FK_tenants_tier_id`');
    await queryRunner.query('DROP INDEX `IDX_tenants_tierId` ON `tenants`');
    await queryRunner.query('ALTER TABLE `tenants` DROP COLUMN `tierId`');
  }
}
