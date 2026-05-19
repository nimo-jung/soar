import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TenantTier } from './tenant-tier.entity';

export enum TenantStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  DELETED = 'DELETED',
}

@Entity('tenants', { comment: '멀티테넌트 고객사 목록' })
export class Tenant {
  @PrimaryGeneratedColumn({ comment: '테넌트 고유 ID' })
  id: number;

  @Column({ unique: true, comment: '테넌트 슬러그 (DB명 접미사로 사용)' })
  slug: string;

  @Column({ comment: '고객사명' })
  name: string;

  @Column({
    type: 'enum',
    enum: TenantStatus,
    default: TenantStatus.ACTIVE,
    comment: '테넌트 상태: ACTIVE | SUSPENDED | DELETED',
  })
  status: TenantStatus;

  @Column({ nullable: true, comment: '담당자 이메일' })
  contactEmail: string;

  @Column({ type: 'datetime', nullable: true, comment: '사용 기한(만료 일시)' })
  expiresAt: Date | null;

  @Column({ type: 'text', nullable: false, comment: '로그 수집 대상 IP 대역(단일 IP 또는 CIDR, 콤마 구분 목록)' })
  ipCidr: string;

  @ManyToOne(() => TenantTier)
  @JoinColumn({ name: 'tierId', referencedColumnName: 'id' })
  tier: TenantTier;

  @Column({ name: 'tierId', type: 'int', comment: '테넌트 등급 ID' })
  tierId: number;

  @CreateDateColumn({ comment: '생성 일시' })
  createdAt: Date;

  @UpdateDateColumn({ comment: '수정 일시' })
  updatedAt: Date;
}
