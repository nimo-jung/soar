import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Tenant } from './tenant.entity';

@Entity('tenant_password_reset_tokens', { comment: '테넌트 관리자 비밀번호 재설정용 1회성 토큰' })
export class TenantPasswordResetToken {
  @PrimaryGeneratedColumn({ comment: '토큰 고유 ID' })
  id: number;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id', referencedColumnName: 'id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id', type: 'int', comment: '대상 테넌트 ID' })
  tenantId: number;

  @Column({ name: 'email', type: 'varchar', length: 255, comment: '재설정 대상 이메일' })
  email: string;

  @Column({ name: 'token_hash', type: 'varchar', length: 255, comment: '토큰 해시값 (bcrypt)' })
  tokenHash: string;

  @Column({ name: 'expires_at', type: 'datetime', comment: '토큰 만료 시각' })
  expiresAt: Date;

  @Column({ name: 'used_at', type: 'datetime', nullable: true, comment: '토큰 사용 시각' })
  usedAt: Date | null;

  @Column({ name: 'issued_by_master_user_id', type: 'int', nullable: true, comment: '발급한 마스터 관리자 ID' })
  issuedByMasterUserId: number | null;

  @CreateDateColumn({ name: 'created_at', comment: '생성 일시' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '수정 일시' })
  updatedAt: Date;
}
