import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('ip_whitelist', { comment: 'Collector 소스 IP 화이트리스트 (Redis 캐싱 기준 원본)' })
export class IpWhitelist {
  @PrimaryGeneratedColumn({ comment: '규칙 고유 ID' })
  id: number;

  @Column({ name: 'ip_address', comment: 'CIDR 또는 단일 IP (예: 192.168.1.0/24)' })
  ipAddress: string;

  @Column({ nullable: true, comment: '설명' })
  description: string;

  @Column({ name: 'is_active', default: true, comment: '활성화 여부' })
  isActive: boolean;

  @CreateDateColumn({ comment: '생성 일시' })
  createdAt: Date;

  @UpdateDateColumn({ comment: '수정 일시' })
  updatedAt: Date;
}
