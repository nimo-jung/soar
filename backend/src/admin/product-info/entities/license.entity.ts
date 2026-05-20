import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('licenses', { comment: '제품 라이선스 정보' })
export class License {
  @PrimaryGeneratedColumn({ comment: '라이선스 고유 ID' })
  id: number;

  @Column({ name: 'license_key', type: 'text', comment: '라이선스 키' })
  licenseKey: string;

  @Column({ name: 'expires_at', type: 'datetime', comment: '라이선스 만료 일시' })
  expiresAt: Date;

  @Column({
    name: 'nic_mac_address',
    type: 'varchar',
    length: 64,
    nullable: true,
    comment: '라이선스가 귀속된 NIC MAC 주소',
  })
  nicMacAddress: string | null;

  @CreateDateColumn({ name: 'created_at', comment: '등록 일시' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '수정 일시' })
  updatedAt: Date;
}
