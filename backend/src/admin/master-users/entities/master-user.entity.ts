import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('master_users', { comment: '마스터 관리자 계정 (soar_admin DB)' })
export class MasterUser {
  @PrimaryGeneratedColumn({ comment: '계정 고유 ID' })
  id: number;

  @Column({ unique: true, comment: '로그인 이메일' })
  email: string;

  @Column({ comment: '비밀번호 해시 (bcrypt)' })
  passwordHash: string;

  @Column({ default: true, comment: '계정 활성 여부' })
  isActive: boolean;

  @CreateDateColumn({ comment: '생성 일시' })
  createdAt: Date;

  @UpdateDateColumn({ comment: '수정 일시' })
  updatedAt: Date;
}
