/**
 * Migration: CreateParsingRulesTable
 *
 * 목적: tenant_db_* 스키마에 parsing_rules 테이블을 생성한다.
 * 영향: 테넌트별 커스텀 파싱 룰 저장 및 Redis 캐시 반영 API의 저장소를 제공한다.
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateParsingRulesTable1785420000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`parsing_rules\` (
        \`id\` INT NOT NULL AUTO_INCREMENT COMMENT '규칙 고유 ID',
        \`name\` VARCHAR(255) NOT NULL COMMENT '규칙 이름',
        \`rule_definition\` JSON NOT NULL COMMENT '파싱 규칙 정의 (JSON 구조)',
        \`log_source_type\` VARCHAR(255) NULL COMMENT '적용 대상 로그 소스 유형',
        \`is_active\` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '활성화 여부',
        \`priority\` INT NOT NULL DEFAULT 0 COMMENT '적용 우선순위 (낮을수록 먼저 적용)',
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '생성 일시',
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '수정 일시',
        PRIMARY KEY (\`id\`),
        KEY \`idx_parsing_rules_priority\` (\`priority\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='테넌트별 커스텀 로그 파싱 룰 (Go 엔진 Redis 캐싱)'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `parsing_rules`');
  }
}
