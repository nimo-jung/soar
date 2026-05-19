import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableIndex,
} from 'typeorm';

/**
 * AddAuthPolicyAndSessionTables
 * 목적: 인증 정책(실패 잠금/동시 세션/자동 로그아웃) 및 세션 관리 테이블 추가
 * 영향도: 로그인/로그아웃/세션 연장 플로우가 정책 기반으로 동작하며 tenant_settings에 인증 정책 컬럼이 확장됨
 */
export class AddAuthPolicyAndSessionTables1784900000000 implements MigrationInterface {
  name = 'AddAuthPolicyAndSessionTables1784900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tenantPolicyColumns: Array<{ name: string; comment: string; defaultValue: string }> = [
      { name: 'max_login_failures', comment: '로그인 실패 허용 횟수 (1~5)', defaultValue: '3' },
      { name: 'lock_minutes', comment: '로그인 잠금 시간(분) (3~30)', defaultValue: '5' },
      { name: 'max_concurrent_sessions', comment: '계정당 동시 로그인 허용 세션 수 (1~5)', defaultValue: '1' },
      { name: 'auto_logout_timeout_minutes', comment: '자동 로그아웃 타임아웃(분). 0이면 만료 없음', defaultValue: '5' },
    ];

    for (const column of tenantPolicyColumns) {
      const hasColumn = await queryRunner.hasColumn('tenant_settings', column.name);
      if (!hasColumn) {
        await queryRunner.addColumn(
          'tenant_settings',
          new TableColumn({
            name: column.name,
            type: 'int',
            isNullable: false,
            default: column.defaultValue,
            comment: column.comment,
          }),
        );
      }
    }

    const hasMasterAuthSettings = await queryRunner.hasTable('master_auth_settings');
    if (!hasMasterAuthSettings) {
      await queryRunner.createTable(
        new Table({
          name: 'master_auth_settings',
          comment: '마스터 관리자 인증 정책 설정',
          columns: [
            {
              name: 'id',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
              comment: '인증 설정 고유 ID',
            },
            {
              name: 'max_login_failures',
              type: 'int',
              isNullable: false,
              default: '3',
              comment: '로그인 실패 허용 횟수 (1~5)',
            },
            {
              name: 'lock_minutes',
              type: 'int',
              isNullable: false,
              default: '5',
              comment: '로그인 잠금 시간(분) (3~30)',
            },
            {
              name: 'max_concurrent_sessions',
              type: 'int',
              isNullable: false,
              default: '1',
              comment: '계정당 동시 로그인 허용 세션 수 (1~5)',
            },
            {
              name: 'auto_logout_timeout_minutes',
              type: 'int',
              isNullable: false,
              default: '5',
              comment: '자동 로그아웃 타임아웃(분). 0이면 만료 없음',
            },
            {
              name: 'createdAt',
              type: 'datetime',
              precision: 6,
              default: 'CURRENT_TIMESTAMP(6)',
              comment: '생성 일시',
            },
            {
              name: 'updatedAt',
              type: 'datetime',
              precision: 6,
              default: 'CURRENT_TIMESTAMP(6)',
              onUpdate: 'CURRENT_TIMESTAMP(6)',
              comment: '수정 일시',
            },
          ],
        }),
      );

      await queryRunner.query(`
        INSERT INTO master_auth_settings (
          max_login_failures,
          lock_minutes,
          max_concurrent_sessions,
          auto_logout_timeout_minutes
        )
        VALUES (3, 5, 1, 5)
      `);
    }

    const hasSecurityState = await queryRunner.hasTable('auth_user_security_states');
    if (!hasSecurityState) {
      await queryRunner.createTable(
        new Table({
          name: 'auth_user_security_states',
          comment: '로그인 실패 횟수/잠금 상태 관리',
          columns: [
            {
              name: 'id',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
              comment: '보안 상태 고유 ID',
            },
            {
              name: 'scope',
              type: 'varchar',
              length: '16',
              isNullable: false,
              comment: '인증 스코프: MASTER | TENANT',
            },
            {
              name: 'tenant_slug',
              type: 'varchar',
              length: '100',
              isNullable: true,
              comment: '테넌트 슬러그 (MASTER는 NULL)',
            },
            {
              name: 'login_id',
              type: 'varchar',
              length: '255',
              isNullable: false,
              comment: '로그인 식별자(이메일)',
            },
            {
              name: 'failed_attempts',
              type: 'int',
              isNullable: false,
              default: '0',
              comment: '현재 누적 로그인 실패 횟수',
            },
            {
              name: 'lock_until',
              type: 'datetime',
              precision: 6,
              isNullable: true,
              comment: '계정 잠금 만료 시각',
            },
            {
              name: 'createdAt',
              type: 'datetime',
              precision: 6,
              default: 'CURRENT_TIMESTAMP(6)',
              comment: '생성 일시',
            },
            {
              name: 'updatedAt',
              type: 'datetime',
              precision: 6,
              default: 'CURRENT_TIMESTAMP(6)',
              onUpdate: 'CURRENT_TIMESTAMP(6)',
              comment: '수정 일시',
            },
          ],
        }),
      );

      await queryRunner.createIndex(
        'auth_user_security_states',
        new TableIndex({
          name: 'uq_auth_user_security_states_scope_tenant_login',
          columnNames: ['scope', 'tenant_slug', 'login_id'],
          isUnique: true,
        }),
      );
    }

    const hasAuthSessions = await queryRunner.hasTable('auth_sessions');
    if (!hasAuthSessions) {
      await queryRunner.createTable(
        new Table({
          name: 'auth_sessions',
          comment: '로그인 세션 관리 (동시 로그인/자동 만료)',
          columns: [
            {
              name: 'id',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
              comment: '세션 고유 ID',
            },
            {
              name: 'scope',
              type: 'varchar',
              length: '16',
              isNullable: false,
              comment: '인증 스코프: MASTER | TENANT',
            },
            {
              name: 'tenant_slug',
              type: 'varchar',
              length: '100',
              isNullable: true,
              comment: '테넌트 슬러그 (MASTER는 NULL)',
            },
            {
              name: 'account_id',
              type: 'varchar',
              length: '64',
              isNullable: false,
              comment: '계정 식별자(계정 PK)',
            },
            {
              name: 'jti',
              type: 'varchar',
              length: '64',
              isNullable: false,
              comment: 'JWT 고유 식별자',
            },
            {
              name: 'is_revoked',
              type: 'tinyint',
              width: 1,
              isNullable: false,
              default: '0',
              comment: '세션 강제 만료 여부',
            },
            {
              name: 'expires_at',
              type: 'datetime',
              precision: 6,
              isNullable: true,
              comment: '세션 만료 시각 (NULL이면 만료 없음)',
            },
            {
              name: 'last_activity_at',
              type: 'datetime',
              precision: 6,
              isNullable: false,
              comment: '마지막 활동 시각',
            },
            {
              name: 'createdAt',
              type: 'datetime',
              precision: 6,
              default: 'CURRENT_TIMESTAMP(6)',
              comment: '생성 일시',
            },
            {
              name: 'updatedAt',
              type: 'datetime',
              precision: 6,
              default: 'CURRENT_TIMESTAMP(6)',
              onUpdate: 'CURRENT_TIMESTAMP(6)',
              comment: '수정 일시',
            },
          ],
        }),
      );

      await queryRunner.createIndex(
        'auth_sessions',
        new TableIndex({
          name: 'uq_auth_sessions_jti',
          columnNames: ['jti'],
          isUnique: true,
        }),
      );

      await queryRunner.createIndex(
        'auth_sessions',
        new TableIndex({
          name: 'idx_auth_sessions_scope_tenant_account',
          columnNames: ['scope', 'tenant_slug', 'account_id'],
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasAuthSessions = await queryRunner.hasTable('auth_sessions');
    if (hasAuthSessions) {
      await queryRunner.dropTable('auth_sessions');
    }

    const hasSecurityState = await queryRunner.hasTable('auth_user_security_states');
    if (hasSecurityState) {
      await queryRunner.dropTable('auth_user_security_states');
    }

    const hasMasterAuthSettings = await queryRunner.hasTable('master_auth_settings');
    if (hasMasterAuthSettings) {
      await queryRunner.dropTable('master_auth_settings');
    }

    const tenantPolicyColumns = [
      'auto_logout_timeout_minutes',
      'max_concurrent_sessions',
      'lock_minutes',
      'max_login_failures',
    ];

    for (const columnName of tenantPolicyColumns) {
      const hasColumn = await queryRunner.hasColumn('tenant_settings', columnName);
      if (hasColumn) {
        await queryRunner.dropColumn('tenant_settings', columnName);
      }
    }
  }
}
