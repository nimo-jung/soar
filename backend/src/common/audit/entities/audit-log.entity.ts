import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum AuditActorType {
  MASTER = 'MASTER',
  TENANT = 'TENANT',
  SYSTEM = 'SYSTEM',
}

@Entity('audit_logs', { comment: '관리자/인증 이벤트 감사 로그' })
export class AuditLog {
  @PrimaryGeneratedColumn({ comment: '감사 로그 고유 ID' })
  id: number;

  @Column({
    name: 'actor_type',
    type: 'enum',
    enum: AuditActorType,
    default: AuditActorType.SYSTEM,
    comment: '행위자 유형: MASTER | TENANT | SYSTEM',
  })
  actorType: AuditActorType;

  @Column({ name: 'actor_id', type: 'int', nullable: true, comment: '행위자 ID (JWT sub)' })
  actorId: number | null;

  @Column({ name: 'actor_email', type: 'varchar', length: 255, nullable: true, comment: '행위자 이메일' })
  actorEmail: string | null;

  @Column({ name: 'tenant_slug', type: 'varchar', length: 100, nullable: true, comment: '테넌트 식별자(slug)' })
  tenantSlug: string | null;

  @Column({ comment: '행위 코드 (예: TENANT_TIER_DELETE)' })
  action: string;

  @Column({ name: 'resource_type', type: 'varchar', length: 100, nullable: true, comment: '대상 리소스 유형' })
  resourceType: string | null;

  @Column({ name: 'resource_id', type: 'varchar', length: 100, nullable: true, comment: '대상 리소스 ID' })
  resourceId: string | null;

  @Column({ type: 'text', nullable: true, comment: '행위 설명' })
  message: string | null;

  @Column({ type: 'json', nullable: true, comment: '부가 메타데이터(JSON)' })
  metadata: Record<string, unknown> | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 64, nullable: true, comment: '요청 IP 주소' })
  ipAddress: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true, comment: '요청 User-Agent' })
  userAgent: string | null;

  @CreateDateColumn({ name: 'created_at', comment: '생성 일시' })
  createdAt: Date;
}
