import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('alert_notification_histories', { comment: '알림 발송 결과 이력' })
export class AlertNotificationHistory {
  @PrimaryGeneratedColumn({ comment: '발송 이력 고유 ID' })
  id: number;

  @Column({ name: 'alert_id', type: 'int', comment: '대상 알림 ID' })
  alertId: number;

  @Column({ comment: '발송 채널 (EMAIL|SLACK|SMS)' })
  channel: string;

  @Column({ comment: '수신자' })
  recipient: string;

  @Column({ name: 'delivery_status', comment: '발송 결과 (SENT|FAILED)' })
  deliveryStatus: string;

  @Column({ name: 'error_message', type: 'text', nullable: true, comment: '실패 메시지' })
  errorMessage: string | null;

  @CreateDateColumn({ name: 'sent_at', comment: '발송 시각' })
  sentAt: Date;
}
