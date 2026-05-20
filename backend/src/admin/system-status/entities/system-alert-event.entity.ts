import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum AlertSeverity {
  WARN = 'WARN',
  CRITICAL = 'CRITICAL',
}

export enum AlertType {
  CPU_HIGH = 'CPU_HIGH',
  MEMORY_HIGH = 'MEMORY_HIGH',
  DISK_HIGH = 'DISK_HIGH',
  DB_DOWN = 'DB_DOWN',
  REDIS_DOWN = 'REDIS_DOWN',
  CLICKHOUSE_DOWN = 'CLICKHOUSE_DOWN',
  GO_ENGINE_DOWN = 'GO_ENGINE_DOWN',
  INTEGRITY_CHANGED = 'INTEGRITY_CHANGED',
  FILE_MISSING = 'FILE_MISSING',
}

@Entity('system_alert_events', { comment: '시스템 이상 알림 이벤트 이력 (임계치 초과, 서비스 다운, 무결성 변조)' })
export class SystemAlertEvent {
  @PrimaryGeneratedColumn({ comment: '알림 이벤트 고유 ID' })
  id: number;

  @Column({
    name: 'alert_type',
    type: 'enum',
    enum: AlertType,
    comment: '알림 유형',
  })
  alertType: AlertType;

  @Column({
    name: 'severity',
    type: 'enum',
    enum: AlertSeverity,
    default: AlertSeverity.WARN,
    comment: '심각도',
  })
  severity: AlertSeverity;

  @Column({ type: 'text', comment: '알림 메시지' })
  message: string;

  @Column({ name: 'metric_value', type: 'float', nullable: true, comment: '측정 수치 (CPU%, Memory% 등)' })
  metricValue: number | null;

  @Column({ name: 'alert_count', type: 'int', default: 1, comment: '동일 유형 연속 알림 횟수' })
  alertCount: number;

  @Column({ name: 'is_resolved', default: false, comment: '해결 여부' })
  isResolved: boolean;

  @Column({ name: 'resolved_at', type: 'datetime', nullable: true, comment: '해결 일시' })
  resolvedAt: Date | null;

  @Column({ name: 'last_alerted_at', type: 'datetime', nullable: true, comment: '마지막 알림 발생 일시 (재알림 간격 계산용)' })
  lastAlertedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', comment: '최초 발생 일시' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '수정 일시' })
  updatedAt: Date;
}
