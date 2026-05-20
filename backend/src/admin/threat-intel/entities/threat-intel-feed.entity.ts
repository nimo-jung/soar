import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum TiDispatchStatus {
  PENDING = 'PENDING',
  DISPATCHED = 'DISPATCHED',
  FAILED = 'FAILED',
}

@Entity('threat_intel_feeds', { comment: '글로벌 위협 인텔리전스(TI) 피드 레지스트리' })
export class ThreatIntelFeed {
  @PrimaryGeneratedColumn({ comment: 'TI 피드 고유 ID' })
  id: number;

  @Column({ comment: '피드 유형 (IP, DOMAIN, HASH, URL 등)' })
  feedType: string;

  @Column({ comment: '위협 지표 값' })
  indicator: string;

  @Column({ nullable: true, comment: '위협 수준 (LOW, MEDIUM, HIGH, CRITICAL)' })
  severity: string;

  @Column({ type: 'text', nullable: true, comment: '위협 설명' })
  description: string;

  @Column({ nullable: true, comment: '출처' })
  source: string;

  @Column({ name: 'is_active', default: true, comment: '활성화 여부' })
  isActive: boolean;

  @Column({
    name: 'dispatch_status',
    type: 'enum',
    enum: TiDispatchStatus,
    default: TiDispatchStatus.PENDING,
    comment: 'RedPanda 전파 상태: PENDING | DISPATCHED | FAILED',
  })
  dispatchStatus: TiDispatchStatus;

  @Column({ name: 'dispatched_at', type: 'datetime', nullable: true, comment: '전파 완료 일시' })
  dispatchedAt: Date | null;

  @Column({ name: 'dispatch_error', type: 'text', nullable: true, comment: '전파 실패 오류 메시지' })
  dispatchError: string | null;

  @Column({ name: 'dispatch_attempts', type: 'int', default: 0, comment: '전파 시도 횟수' })
  dispatchAttempts: number;

  @Column({ name: 'expires_at', type: 'datetime', nullable: true, comment: '만료 일시' })
  expiresAt: Date | null;

  @CreateDateColumn({ comment: '등록 일시' })
  createdAt: Date;

  @UpdateDateColumn({ comment: '수정 일시' })
  updatedAt: Date;
}
