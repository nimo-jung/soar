import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('alert_notification_policies', { comment: '알림 채널 및 수신자 정책' })
export class AlertNotificationPolicy {
  @PrimaryGeneratedColumn({ comment: '정책 고유 ID' })
  id: number;

  @Column({ type: 'json', comment: '알림 채널 목록 (EMAIL|SLACK|SMS)' })
  channels: string[];

  @Column({ type: 'json', comment: '채널별 수신자 목록' })
  recipients: string[];

  @CreateDateColumn({ comment: '생성 일시' })
  createdAt: Date;

  @UpdateDateColumn({ comment: '수정 일시' })
  updatedAt: Date;
}
