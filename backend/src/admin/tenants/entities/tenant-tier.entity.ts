import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum TenantTierCode {
  LITE = 'LITE',
  PREMIUM = 'PREMIUM',
  ENTERPRISE = 'ENTERPRISE',
}

@Entity('tenant_tiers', { comment: '테넌트 등급(요금제) 정의' })
export class TenantTier {
  @PrimaryGeneratedColumn({ comment: '등급 고유 ID' })
  id: number;

  @Column({
    type: 'enum',
    enum: TenantTierCode,
    comment: '등급 코드: LITE | PREMIUM | ENTERPRISE',
  })
  code: TenantTierCode;

  @Column({ comment: '등급 표시명' })
  name: string;

  @Column({
    name: 'daily_log_quota_gb',
    type: 'int',
    comment: '하루 로그 저장 용량 한도(GB)',
  })
  dailyLogQuotaGb: number;

  @Column({ name: 'max_users', type: 'int', comment: '테넌트 사용자 수 한도' })
  maxUsers: number;

  @Column({ type: 'text', nullable: true, comment: '등급 설명' })
  description: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true, comment: '등급 활성 여부' })
  isActive: boolean;

  @CreateDateColumn({ comment: '생성 일시' })
  createdAt: Date;

  @UpdateDateColumn({ comment: '수정 일시' })
  updatedAt: Date;
}
