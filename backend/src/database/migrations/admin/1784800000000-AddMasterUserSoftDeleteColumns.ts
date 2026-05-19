import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * AddMasterUserSoftDeleteColumns
 * 목적: master_users 테이블에 소프트 삭제/복구를 위한 상태 컬럼 추가
 * 영향도: 기존 계정은 ACTIVE로 간주되며, 로그인 쿼리 조건에 status 필터가 추가됨
 */
export class AddMasterUserSoftDeleteColumns1784800000000 implements MigrationInterface {
  name = 'AddMasterUserSoftDeleteColumns1784800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasStatus = await queryRunner.hasColumn('master_users', 'status');
    if (!hasStatus) {
      await queryRunner.addColumn(
        'master_users',
        new TableColumn({
          name: 'status',
          type: 'enum',
          enum: ['ACTIVE', 'DELETED'],
          default: "'ACTIVE'",
          isNullable: false,
          comment: '계정 상태: ACTIVE | DELETED',
        }),
      );
    }

    const hasDeletedAt = await queryRunner.hasColumn('master_users', 'deletedAt');
    if (!hasDeletedAt) {
      await queryRunner.addColumn(
        'master_users',
        new TableColumn({
          name: 'deletedAt',
          type: 'datetime',
          precision: 6,
          isNullable: true,
          comment: '소프트 삭제 일시 (복구 시 NULL)',
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasDeletedAt = await queryRunner.hasColumn('master_users', 'deletedAt');
    if (hasDeletedAt) {
      await queryRunner.dropColumn('master_users', 'deletedAt');
    }

    const hasStatus = await queryRunner.hasColumn('master_users', 'status');
    if (hasStatus) {
      await queryRunner.dropColumn('master_users', 'status');
    }
  }
}
