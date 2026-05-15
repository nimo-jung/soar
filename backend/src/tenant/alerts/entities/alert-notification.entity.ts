import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('alert_notifications', { comment: '알람 알림 발송 이력 (이메일·슬랙·SMS)' })
export class AlertNotification {
  @PrimaryGeneratedColumn({ comment: '발송 이력 고유 ID' })
  id: number;

  @Column({ name: 'alert_id', comment: '대상 알람 ID' })
  alertId: number;

  @Column({ comment: '발송 채널 (EMAIL, SLACK, SMS)' })
  channel: string;

  @Column({ comment: '수신자 (이메일 주소, 슬랙 채널명 등)' })
  recipient: string;

  @Column({ name: 'is_success', default: true, comment: '발송 성공 여부' })
  isSuccess: boolean;

  @Column({ name: 'error_message', type: 'text', nullable: true, comment: '실패 시 오류 메시지' })
  errorMessage: string | null;

  @CreateDateColumn({ comment: '발송 일시' })
  createdAt: Date;
}
