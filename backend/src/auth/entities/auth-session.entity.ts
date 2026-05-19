import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { AuthScope } from '../auth-policy.constants';

@Entity('auth_sessions', { comment: '로그인 세션 관리 (동시 로그인/자동 만료)' })
@Index('idx_auth_sessions_scope_tenant_account', ['scope', 'tenantSlug', 'accountId'])
@Index('uq_auth_sessions_jti', ['jti'], { unique: true })
export class AuthSession {
  @PrimaryGeneratedColumn({ comment: '세션 고유 ID' })
  id: number;

  @Column({
    type: 'varchar',
    length: 16,
    comment: '인증 스코프: MASTER | TENANT',
  })
  scope: AuthScope;

  @Column({
    name: 'tenant_slug',
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: '테넌트 슬러그 (MASTER는 NULL)',
  })
  tenantSlug: string | null;

  @Column({
    name: 'account_id',
    type: 'varchar',
    length: 64,
    comment: '계정 식별자(계정 PK)',
  })
  accountId: string;

  @Column({
    name: 'jti',
    type: 'varchar',
    length: 64,
    comment: 'JWT 고유 식별자',
  })
  jti: string;

  @Column({
    name: 'is_revoked',
    type: 'boolean',
    default: false,
    comment: '세션 강제 만료 여부',
  })
  isRevoked: boolean;

  @Column({
    name: 'expires_at',
    type: 'datetime',
    precision: 6,
    nullable: true,
    comment: '세션 만료 시각 (NULL이면 만료 없음)',
  })
  expiresAt: Date | null;

  @Column({
    name: 'last_activity_at',
    type: 'datetime',
    precision: 6,
    comment: '마지막 활동 시각',
  })
  lastActivityAt: Date;

  @CreateDateColumn({ comment: '생성 일시' })
  createdAt: Date;

  @UpdateDateColumn({ comment: '수정 일시' })
  updatedAt: Date;
}
