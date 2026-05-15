import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum PlaybookRunStatus {
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

@Entity('playbook_runs', { comment: '플레이북 실행 이력' })
export class PlaybookRun {
  @PrimaryGeneratedColumn({ comment: '실행 고유 ID' })
  id: number;

  @Column({ name: 'playbook_id', comment: '실행된 플레이북 ID' })
  playbookId: number;

  @Column({ name: 'alert_id', type: 'int', nullable: true, comment: '트리거된 알람 ID' })
  alertId: number | null;

  @Column({
    type: 'enum',
    enum: PlaybookRunStatus,
    default: PlaybookRunStatus.RUNNING,
    comment: '실행 상태',
  })
  status: PlaybookRunStatus;

  @Column({ name: 'result_summary', type: 'json', nullable: true, comment: '실행 결과 요약' })
  resultSummary: Record<string, unknown> | null;

  @Column({ name: 'started_at', type: 'datetime', comment: '실행 시작 일시' })
  startedAt: Date;

  @Column({ name: 'finished_at', type: 'datetime', nullable: true, comment: '실행 완료 일시' })
  finishedAt: Date | null;

  @CreateDateColumn({ comment: '레코드 생성 일시' })
  createdAt: Date;
}
