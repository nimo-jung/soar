import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum PlaybookStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

@Entity('playbooks', { comment: 'TMS 자동 대응 플레이북 정의' })
export class Playbook {
  @PrimaryGeneratedColumn({ comment: '플레이북 고유 ID' })
  id: number;

  @Column({ comment: '플레이북 이름' })
  name: string;

  @Column({ type: 'text', nullable: true, comment: '플레이북 설명' })
  description: string;

  @Column({
    type: 'json',
    comment: '워크플로우 정의 JSON (트리거 조건 + 액션 스텝)',
  })
  definition: Record<string, unknown>;

  @Column({
    type: 'enum',
    enum: PlaybookStatus,
    default: PlaybookStatus.DRAFT,
    comment: '상태: DRAFT | ACTIVE | ARCHIVED',
  })
  status: PlaybookStatus;

  @Column({ name: 'created_by', nullable: true, comment: '작성자 사용자 ID' })
  createdBy: number;

  @CreateDateColumn({ comment: '생성 일시' })
  createdAt: Date;

  @UpdateDateColumn({ comment: '수정 일시' })
  updatedAt: Date;
}
