import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 목적: Collector 기반 멀티테넌트 라우팅을 위해 device_code/source_ip 컬럼을 추가한다.
 * 영향: tenant_db_*의 collectors 테이블에 라우팅 식별 필드가 생기며, 기존 데이터는 백필 대상이다.
 */
export class AddCollectorRoutingColumns1785600000000 implements MigrationInterface {
  name = 'AddCollectorRoutingColumns1785600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`collectors\`
      ADD COLUMN IF NOT EXISTS \`device_code\` VARCHAR(128) NULL COMMENT '장비 고유 코드 (라우팅 식별자)'
    `);

    await queryRunner.query(`
      ALTER TABLE \`collectors\`
      ADD COLUMN IF NOT EXISTS \`source_ip\` VARCHAR(45) NULL COMMENT '장비 고정 Source IP (선택)'
    `);

    await queryRunner.query(`
      CREATE INDEX \`idx_collectors_device_code\`
      ON \`collectors\` (\`device_code\`)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX `idx_collectors_device_code` ON `collectors`');
    await queryRunner.query('ALTER TABLE `collectors` DROP COLUMN `source_ip`');
    await queryRunner.query('ALTER TABLE `collectors` DROP COLUMN `device_code`');
  }
}
