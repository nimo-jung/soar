import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';

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

  @CreateDateColumn({ comment: '생성 일시' })
  createdAt: Date;

  @UpdateDateColumn({ comment: '수정 일시' })
  updatedAt: Date;
}
