import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { AuthScope } from '../auth-policy.constants';

@Entity('auth_user_security_states', { comment: '로그인 실패 횟수/잠금 상태 관리' })
@Index('uq_auth_user_security_states_scope_tenant_login', ['scope', 'tenantSlug', 'loginId'], { unique: true })
export class AuthUserSecurityState {
  @PrimaryGeneratedColumn({ comment: '보안 상태 고유 ID' })
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
    name: 'login_id',
    type: 'varchar',
    length: 255,
    comment: '로그인 식별자(이메일)',
  })
  loginId: string;

  @Column({
    name: 'failed_attempts',
    type: 'int',
    default: 0,
    comment: '현재 누적 로그인 실패 횟수',
  })
  failedAttempts: number;

  @Column({
    name: 'lock_until',
    type: 'datetime',
    precision: 6,
    nullable: true,
    comment: '계정 잠금 만료 시각',
  })
  lockUntil: Date | null;

  @CreateDateColumn({ comment: '생성 일시' })
  createdAt: Date;

  @UpdateDateColumn({ comment: '수정 일시' })
  updatedAt: Date;
}
