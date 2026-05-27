import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum MasterUserStatus {
  ACTIVE = 'ACTIVE',
  DELETED = 'DELETED',
}

@Entity('master_users', { comment: '마스터 관리자 계정 (tms_admin DB)' })
export class MasterUser {
  @PrimaryGeneratedColumn({ comment: '계정 고유 ID' })
  id: number;

  @Column({ unique: true, comment: '로그인 이메일' })
  email: string;

  @Column({ comment: '비밀번호 해시 (bcrypt)' })
  passwordHash: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: '최근 비밀번호 해시 이력 (재사용 방지용)',
  })
  passwordHistory: string[] | null;

  @Column({
    type: 'enum',
    enum: MasterUserStatus,
    default: MasterUserStatus.ACTIVE,
    comment: '계정 상태: ACTIVE | DELETED',
  })
  status: MasterUserStatus;

  @Column({ default: true, comment: '계정 활성 여부' })
  isActive: boolean;

  @Column({ type: 'datetime', nullable: true, comment: '소프트 삭제 일시 (복구 시 NULL)' })
  deletedAt: Date | null;

  @CreateDateColumn({ comment: '생성 일시' })
  createdAt: Date;

  @UpdateDateColumn({ comment: '수정 일시' })
  updatedAt: Date;
}
