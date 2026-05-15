import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from './tenant.entity';

@Entity('tenant_settings', { comment: '테넌트별 제한·정책 설정' })
export class TenantSettings {
  @PrimaryGeneratedColumn({ comment: '설정 고유 ID' })
  id: number;

  @OneToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id', comment: '대상 테넌트 ID' })
  tenantId: number;

  @Column({
    name: 'eps_limit',
    type: 'int',
    default: 1000,
    comment: '초당 허용 이벤트 수(Events Per Second) 한도',
  })
  epsLimit: number;

  @Column({
    name: 'storage_quota_gb',
    type: 'int',
    default: 100,
    comment: '스토리지 허용 한도 (GB)',
  })
  storageQuotaGb: number;

  @Column({
    name: 'retention_days',
    type: 'int',
    default: 90,
    comment: 'ClickHouse TTL 기준 로그 보관 주기 (일)',
  })
  retentionDays: number;

  @Column({
    name: 'branding_config',
    type: 'json',
    nullable: true,
    comment: '화이트라벨링 설정 (primary_color, logo_url, favicon_url 등)',
  })
  brandingConfig: Record<string, string> | null;

  @CreateDateColumn({ comment: '생성 일시' })
  createdAt: Date;

  @UpdateDateColumn({ comment: '수정 일시' })
  updatedAt: Date;
}
