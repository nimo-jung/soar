import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TenantRole } from '../../../common/guards/roles.guard';

@Entity('tenant_users', { comment: '테넌트 내 사용자 계정 및 역할 (RBAC)' })
export class TenantUser {
  @PrimaryGeneratedColumn({ comment: '사용자 고유 ID' })
  id: number;

  @Column({ unique: true, comment: '로그인 이메일' })
  email: string;

  @Column({ name: 'password_hash', comment: '비밀번호 해시 (bcrypt)' })
  passwordHash: string;

  @Column({ name: 'display_name', comment: '표시 이름' })
  displayName: string;

  @Column({
    type: 'enum',
    enum: TenantRole,
    default: TenantRole.ANALYST,
    comment: '역할: operator(운영자) | analyst(분석가) | auditor(감사자)',
  })
  role: TenantRole;

  @Column({ name: 'is_active', default: true, comment: '계정 활성화 여부' })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', comment: '생성 일시' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '수정 일시' })
  updatedAt: Date;
}
