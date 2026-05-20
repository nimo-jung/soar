import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum ServiceStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  UNKNOWN = 'UNKNOWN',
}

@Entity('system_health_snapshots', { comment: '시스템 상태 이력 스냅샷 (CPU/Memory/Disk/서비스 헬스)' })
export class SystemHealthSnapshot {
  @PrimaryGeneratedColumn({ comment: '스냅샷 고유 ID' })
  id: number;

  @Column({ name: 'cpu_usage_pct', type: 'float', default: 0, comment: 'CPU 사용률 (%)' })
  cpuUsagePct: number;

  @Column({ name: 'memory_usage_pct', type: 'float', default: 0, comment: '메모리 사용률 (%)' })
  memoryUsagePct: number;

  @Column({ name: 'disk_usage_pct', type: 'float', default: 0, comment: '디스크 사용률 (%)' })
  diskUsagePct: number;

  @Column({
    name: 'db_status',
    type: 'enum',
    enum: ServiceStatus,
    default: ServiceStatus.UNKNOWN,
    comment: 'MariaDB 연결 상태',
  })
  dbStatus: ServiceStatus;

  @Column({
    name: 'redis_status',
    type: 'enum',
    enum: ServiceStatus,
    default: ServiceStatus.UNKNOWN,
    comment: 'Redis 연결 상태',
  })
  redisStatus: ServiceStatus;

  @Column({
    name: 'clickhouse_status',
    type: 'enum',
    enum: ServiceStatus,
    default: ServiceStatus.UNKNOWN,
    comment: 'ClickHouse 연결 상태',
  })
  clickhouseStatus: ServiceStatus;

  @Column({
    name: 'go_engine_status',
    type: 'enum',
    enum: ServiceStatus,
    default: ServiceStatus.UNKNOWN,
    comment: 'Go 수집 엔진 상태',
  })
  goEngineStatus: ServiceStatus;

  @Column({ name: 'has_alert', default: false, comment: '임계치 초과로 알림이 발생한 스냅샷 여부' })
  hasAlert: boolean;

  @CreateDateColumn({ name: 'checked_at', comment: '점검 일시' })
  checkedAt: Date;
}
