import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('usage_snapshots', { comment: 'EPS·스토리지 실사용량 배치 집계 테이블 (빌링 데이터)' })
@Index(['tenantId', 'snapshotAt'])
export class UsageSnapshot {
  @PrimaryGeneratedColumn({ comment: '스냅샷 고유 ID' })
  id: number;

  @Column({ name: 'tenant_id', comment: '대상 테넌트 ID' })
  tenantId: number;

  @Column({ name: 'eps_avg', type: 'float', default: 0, comment: '평균 EPS' })
  epsAvg: number;

  @Column({
    name: 'storage_used_gb',
    type: 'float',
    default: 0,
    comment: '실제 사용 스토리지 (GB)',
  })
  storageUsedGb: number;

  @Column({
    name: 'log_count',
    type: 'bigint',
    default: 0,
    comment: '해당 집계 기간 총 로그 건수',
  })
  logCount: number;

  @Column({ name: 'snapshot_at', type: 'datetime', comment: '집계 기준 일시' })
  snapshotAt: Date;

  @CreateDateColumn({ comment: '레코드 생성 일시' })
  createdAt: Date;
}
