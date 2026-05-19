import { MigrationInterface, QueryRunner } from 'typeorm';

export class AllowDuplicateTenantTierCode1779300000000 implements MigrationInterface {
  name = 'AllowDuplicateTenantTierCode1779300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `tenants` DROP FOREIGN KEY `FK_tenants_tier_code`;');
    await queryRunner.query('DROP INDEX `IDX_tenant_tiers_code` ON `tenant_tiers`;');
    await queryRunner.query('CREATE INDEX `IDX_tenant_tiers_code` ON `tenant_tiers` (`code`);');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX `IDX_tenant_tiers_code` ON `tenant_tiers`;');
    await queryRunner.query('CREATE UNIQUE INDEX `IDX_tenant_tiers_code` ON `tenant_tiers` (`code`);');
    await queryRunner.query(
      'ALTER TABLE `tenants` ADD CONSTRAINT `FK_tenants_tier_code` FOREIGN KEY (`tierCode`) REFERENCES `tenant_tiers` (`code`) ON UPDATE CASCADE ON DELETE RESTRICT;',
    );
  }
}
