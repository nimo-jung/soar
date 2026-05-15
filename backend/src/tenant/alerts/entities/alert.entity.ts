import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum AlertSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum AlertStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  FALSE_POSITIVE = 'FALSE_POSITIVE',
}

@Entity('alerts', { comment: '보안 알람 이벤트' })
export class Alert {
  @PrimaryGeneratedColumn({ comment: '알람 고유 ID' })
  id: number;

  @Column({ comment: '알람 제목' })
  title: string;

  @Column({ type: 'text', nullable: true, comment: '알람 설명' })
  description: string;

  @Column({
    type: 'enum',
    enum: AlertSeverity,
    default: AlertSeverity.MEDIUM,
    comment: '위험도: LOW | MEDIUM | HIGH | CRITICAL',
  })
  severity: AlertSeverity;

  @Column({
    type: 'enum',
    enum: AlertStatus,
    default: AlertStatus.OPEN,
    comment: '처리 상태: OPEN | IN_PROGRESS | RESOLVED | FALSE_POSITIVE',
  })
  status: AlertStatus;

  @Column({ name: 'rule_id', nullable: true, comment: '트리거된 탐지 룰 ID' })
  ruleId: string;

  @Column({ name: 'source_ip', nullable: true, comment: '출발지 IP' })
  sourceIp: string;

  @Column({ name: 'assigned_to', nullable: true, comment: '담당자 사용자 ID' })
  assignedTo: number;

  @CreateDateColumn({ comment: '생성 일시' })
  createdAt: Date;

  @UpdateDateColumn({ comment: '수정 일시' })
  updatedAt: Date;
}
