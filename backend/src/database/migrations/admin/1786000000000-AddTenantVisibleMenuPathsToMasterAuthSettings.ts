import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTenantVisibleMenuPathsToMasterAuthSettings1786000000000 implements MigrationInterface {
  name = 'AddTenantVisibleMenuPathsToMasterAuthSettings1786000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE master_auth_settings
      ADD COLUMN tenant_visible_menu_paths TEXT NULL COMMENT '테넌트 권한 로그인 시 사이드바에 표시할 메뉴 경로 목록'
      AFTER is_multi_tenant_enabled
    `);

    await queryRunner.query(`
      UPDATE master_auth_settings
      SET tenant_visible_menu_paths = '["/dashboard","/alerts","/playbooks","/collectors","/settings","/users","/audit-logs","/auth-settings"]'
      WHERE tenant_visible_menu_paths IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE master_auth_settings
      DROP COLUMN tenant_visible_menu_paths
    `);
  }
}
