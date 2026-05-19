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

  @Column({
    name: 'max_login_failures',
    type: 'int',
    default: 3,
    comment: '로그인 실패 허용 횟수 (1~5)',
  })
  maxLoginFailures: number;

  @Column({
    name: 'lock_minutes',
    type: 'int',
    default: 5,
    comment: '로그인 잠금 시간(분) (3~30)',
  })
  lockMinutes: number;

  @Column({
    name: 'max_concurrent_sessions',
    type: 'int',
    default: 1,
    comment: '계정당 동시 로그인 허용 세션 수 (1~5)',
  })
  maxConcurrentSessions: number;

  @Column({
    name: 'auto_logout_timeout_minutes',
    type: 'int',
    default: 5,
    comment: '자동 로그아웃 타임아웃(분). 0이면 만료 없음',
  })
  autoLogoutTimeoutMinutes: number;

  @CreateDateColumn({ comment: '생성 일시' })
  createdAt: Date;

  @UpdateDateColumn({ comment: '수정 일시' })
  updatedAt: Date;
}
