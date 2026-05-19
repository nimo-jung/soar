import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * RequireTenantIpCidrList
 * 목적: tenants.ipCidr를 로그 수집 대상 필수 값으로 강제하고 단일 IP/CIDR 콤마 목록 의미를 스키마에 반영
 * 영향도: NULL 값은 빈 문자열로 정규화 후 NOT NULL 제약 적용
 */
export class RequireTenantIpCidrList1779600000000 implements MigrationInterface {
  name = 'RequireTenantIpCidrList1779600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("UPDATE `tenants` SET `ipCidr` = '' WHERE `ipCidr` IS NULL");
    await queryRunner.query(
      "ALTER TABLE `tenants` MODIFY COLUMN `ipCidr` TEXT NOT NULL COMMENT '로그 수집 대상 IP 대역(단일 IP 또는 CIDR, 콤마 구분 목록)'",
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "ALTER TABLE `tenants` MODIFY COLUMN `ipCidr` TEXT NULL COMMENT '허용 IP 대역(CIDR 또는 콤마 구분 목록)'",
    );
  }
}
