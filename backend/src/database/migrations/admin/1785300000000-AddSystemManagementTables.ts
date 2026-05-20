/**
 * Migration: AddSystemManagementTables
 *
 * 목적: 시스템 상태 이력 관리 및 무결성 점검 기능에 필요한 테이블 3개 추가
 *   - system_health_snapshots: CPU/Memory/Disk/서비스 헬스 주기적 스냅샷
 *   - system_alert_events: 임계치 초과·서비스 다운·무결성 이상 알림 이벤트
 *   - integrity_baselines: 파일 해시 기반 무결성 기준 레지스트리
 *
 * 영향: soar_admin DB에 3개 테이블 신규 생성. 기존 데이터 영향 없음.
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSystemManagementTables1785300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`system_health_snapshots\` (
        \`id\` INT NOT NULL AUTO_INCREMENT COMMENT '스냅샷 고유 ID',
        \`cpu_usage_pct\` FLOAT NOT NULL DEFAULT 0 COMMENT 'CPU 사용률 (%)',
        \`memory_usage_pct\` FLOAT NOT NULL DEFAULT 0 COMMENT '메모리 사용률 (%)',
        \`disk_usage_pct\` FLOAT NOT NULL DEFAULT 0 COMMENT '디스크 사용률 (%)',
        \`db_status\` ENUM('ONLINE','OFFLINE','UNKNOWN') NOT NULL DEFAULT 'UNKNOWN' COMMENT 'MariaDB 연결 상태',
        \`redis_status\` ENUM('ONLINE','OFFLINE','UNKNOWN') NOT NULL DEFAULT 'UNKNOWN' COMMENT 'Redis 연결 상태',
        \`clickhouse_status\` ENUM('ONLINE','OFFLINE','UNKNOWN') NOT NULL DEFAULT 'UNKNOWN' COMMENT 'ClickHouse 연결 상태',
        \`go_engine_status\` ENUM('ONLINE','OFFLINE','UNKNOWN') NOT NULL DEFAULT 'UNKNOWN' COMMENT 'Go 수집 엔진 상태',
        \`has_alert\` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '임계치 초과 알림 발생 여부',
        \`checked_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '점검 일시',
        PRIMARY KEY (\`id\`),
        INDEX \`idx_health_checked_at\` (\`checked_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      COMMENT='시스템 상태 이력 스냅샷'
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`system_alert_events\` (
        \`id\` INT NOT NULL AUTO_INCREMENT COMMENT '알림 이벤트 고유 ID',
        \`alert_type\` ENUM(
          'CPU_HIGH','MEMORY_HIGH','DISK_HIGH',
          'DB_DOWN','REDIS_DOWN','CLICKHOUSE_DOWN','GO_ENGINE_DOWN',
          'INTEGRITY_CHANGED','FILE_MISSING'
        ) NOT NULL COMMENT '알림 유형',
        \`severity\` ENUM('WARN','CRITICAL') NOT NULL DEFAULT 'WARN' COMMENT '심각도',
        \`message\` TEXT NOT NULL COMMENT '알림 메시지',
        \`metric_value\` FLOAT NULL COMMENT '측정 수치',
        \`alert_count\` INT NOT NULL DEFAULT 1 COMMENT '연속 알림 횟수',
        \`is_resolved\` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '해결 여부',
        \`resolved_at\` DATETIME NULL COMMENT '해결 일시',
        \`last_alerted_at\` DATETIME NULL COMMENT '마지막 알림 일시 (재알림 간격 계산용)',
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '최초 발생 일시',
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '수정 일시',
        PRIMARY KEY (\`id\`),
        INDEX \`idx_alert_type_resolved\` (\`alert_type\`, \`is_resolved\`),
        INDEX \`idx_alert_created\` (\`created_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      COMMENT='시스템 이상 알림 이벤트 이력'
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`integrity_baselines\` (
        \`id\` INT NOT NULL AUTO_INCREMENT COMMENT '기준 고유 ID',
        \`file_path\` VARCHAR(512) NOT NULL COMMENT '점검 대상 파일 경로',
        \`file_label\` VARCHAR(255) NOT NULL COMMENT '파일 식별 레이블',
        \`hash_algorithm\` VARCHAR(16) NOT NULL DEFAULT 'SHA256' COMMENT '해시 알고리즘',
        \`expected_hash\` VARCHAR(128) NULL COMMENT '기준(baseline) 해시 값',
        \`current_hash\` VARCHAR(128) NULL COMMENT '최근 점검 해시 값',
        \`status\` ENUM('OK','CHANGED','MISSING','UNCHECKED') NOT NULL DEFAULT 'UNCHECKED' COMMENT '점검 결과',
        \`last_checked_at\` DATETIME NULL COMMENT '마지막 점검 일시',
        \`last_synced_at\` DATETIME NULL COMMENT '마지막 동기화 일시',
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '등록 일시',
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '수정 일시',
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uq_integrity_file_path\` (\`file_path\`(512))
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      COMMENT='무결성 점검 기준 파일 레지스트리'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`integrity_baselines\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`system_alert_events\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`system_health_snapshots\``);
  }
}
