import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum IntegrityStatus {
  OK = 'OK',
  CHANGED = 'CHANGED',
  MISSING = 'MISSING',
  UNCHECKED = 'UNCHECKED',
}

@Entity('integrity_baselines', { comment: '무결성 점검 기준 파일 레지스트리 (해시 기반 변조 탐지)' })
export class IntegrityBaseline {
  @PrimaryGeneratedColumn({ comment: '기준 고유 ID' })
  id: number;

  @Column({ name: 'file_path', unique: true, comment: '점검 대상 파일 절대 경로 또는 컨테이너 내 경로' })
  filePath: string;

  @Column({ name: 'file_label', comment: '파일 식별 레이블 (표시용)' })
  fileLabel: string;

  @Column({ name: 'hash_algorithm', default: 'SHA256', comment: '해시 알고리즘' })
  hashAlgorithm: string;

  @Column({ name: 'expected_hash', type: 'varchar', length: 128, nullable: true, comment: '기준(baseline) 해시 값' })
  expectedHash: string | null;

  @Column({ name: 'current_hash', type: 'varchar', length: 128, nullable: true, comment: '최근 점검 시 계산된 해시 값' })
  currentHash: string | null;

  @Column({
    name: 'status',
    type: 'enum',
    enum: IntegrityStatus,
    default: IntegrityStatus.UNCHECKED,
    comment: '점검 결과 상태: OK | CHANGED | MISSING | UNCHECKED',
  })
  status: IntegrityStatus;

  @Column({ name: 'last_checked_at', type: 'datetime', nullable: true, comment: '마지막 점검 일시' })
  lastCheckedAt: Date | null;

  @Column({ name: 'last_synced_at', type: 'datetime', nullable: true, comment: '마지막 동기화(기준 갱신) 일시' })
  lastSyncedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', comment: '등록 일시' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '수정 일시' })
  updatedAt: Date;
}
