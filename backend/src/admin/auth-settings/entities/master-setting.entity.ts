import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity('master_settings', { comment: '마스터 공통 시스템 설정(KV)' })
@Unique('UQ_master_settings_section_identy', ['section', 'identy'])
export class MasterSetting {
  @PrimaryGeneratedColumn({ comment: '설정 고유 ID' })
  id: number;

  @Column({ name: 'section', type: 'varchar', length: 100, comment: '설정 섹션 (예: smtp)' })
  section: string;

  @Column({ name: 'identy', type: 'varchar', length: 100, comment: '설정 식별자 (예: host, port)' })
  identy: string;

  @Column({ name: 'value', type: 'text', nullable: true, comment: '설정 값(문자열 저장)' })
  value: string | null;

  @Column({ name: 'vtype', type: 'tinyint', default: 1, comment: '값 타입 (1=text, 2=int, 3=float, 4=bool)' })
  vtype: number;

  @CreateDateColumn({ name: 'created_at', comment: '생성 일시' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '수정 일시' })
  updatedAt: Date;
}
