import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('billing_pricing_policies', { comment: '등급별 빌링 단가 정책' })
export class BillingPricingPolicy {
  @PrimaryGeneratedColumn({ comment: '정책 고유 ID' })
  id: number;

  @Column({ name: 'tier_code', unique: true, comment: '적용 등급 코드 (LITE|PREMIUM|ENTERPRISE)' })
  tierCode: string;

  @Column({ name: 'base_fee', type: 'decimal', precision: 12, scale: 2, default: 0, comment: '기본 요금' })
  baseFee: number;

  @Column({ name: 'included_eps', type: 'decimal', precision: 12, scale: 2, default: 0, comment: '기본 포함 EPS' })
  includedEps: number;

  @Column({ name: 'eps_overage_per_100', type: 'decimal', precision: 12, scale: 4, default: 0, comment: 'EPS 초과 100당 단가' })
  epsOveragePer100: number;

  @Column({ name: 'storage_overage_per_gb', type: 'decimal', precision: 12, scale: 4, default: 0, comment: '스토리지 초과 GB당 단가' })
  storageOveragePerGb: number;

  @Column({ name: 'log_per_million', type: 'decimal', precision: 12, scale: 4, default: 0, comment: '로그 100만 건당 단가' })
  logPerMillion: number;

  @Column({ name: 'currency', default: 'USD', comment: '통화 코드' })
  currency: string;

  @CreateDateColumn({ comment: '생성 일시' })
  createdAt: Date;

  @UpdateDateColumn({ comment: '수정 일시' })
  updatedAt: Date;
}
