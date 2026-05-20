import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('master_auth_settings', { comment: '마스터 관리자 인증 정책 설정' })
export class MasterAuthSettings {
  @PrimaryGeneratedColumn({ comment: '인증 설정 고유 ID' })
  id: number;

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

  @Column({
    name: 'is_multi_tenant_enabled',
    type: 'boolean',
    default: false,
    comment: '멀티테넌트 기능 활성화 여부',
  })
  isMultiTenantEnabled: boolean;

  @CreateDateColumn({ comment: '생성 일시' })
  createdAt: Date;

  @UpdateDateColumn({ comment: '수정 일시' })
  updatedAt: Date;
}
