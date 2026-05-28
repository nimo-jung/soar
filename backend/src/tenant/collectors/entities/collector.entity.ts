import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('collectors', { comment: '로그 수집 포인트(Collector) 등록 정보' })
export class Collector {
  @PrimaryGeneratedColumn({ comment: 'Collector 고유 ID' })
  id: number;

  @Column({ comment: 'Collector 이름' })
  name: string;

  @Column({ nullable: true, comment: '설명' })
  description: string;

  @Column({ name: 'api_key_hash', comment: 'API Key 해시 (bcrypt, 원본 재조회 불가)' })
  apiKeyHash: string;

  @Column({ name: 'is_active', default: true, comment: '활성화 여부' })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', comment: '생성 일시' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '수정 일시' })
  updatedAt: Date;
}
