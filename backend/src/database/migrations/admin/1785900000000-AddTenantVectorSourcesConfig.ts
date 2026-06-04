import { MigrationInterface, QueryRunner } from 'typeorm';

// 목적: 테넌트별 Vector source 인스턴스 설정(JSON) 저장 컬럼 추가
// 영향: tenant_settings 테이블에 nullable JSON 컬럼을 추가하여 기존 데이터와 호환 유지
export class AddTenantVectorSourcesConfig1785900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`tenant_settings\`
      ADD COLUMN \`vector_sources_config\` JSON NULL COMMENT '테넌트별 Vector source 인스턴스 설정 목록'
      AFTER \`branding_config\`
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`tenant_settings\`
      DROP COLUMN \`vector_sources_config\`
    `);
  }
}
