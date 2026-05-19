import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { AuditActorType, AuditLog } from './entities/audit-log.entity';

export interface AuditLogRecordInput {
  actorType?: AuditActorType;
  actorId?: number | null;
  actorEmail?: string | null;
  tenantSlug?: string | null;
  action: string;
  resourceType?: string | null;
  resourceId?: string | null;
  message?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface AuditLogListQuery {
  limit?: number;
  action?: string;
  actorType?: AuditActorType;
}

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
  ) {}

  async record(input: AuditLogRecordInput): Promise<AuditLog> {
    const log = this.auditLogRepo.create({
      actorType: input.actorType ?? AuditActorType.SYSTEM,
      actorId: input.actorId ?? null,
      actorEmail: input.actorEmail ?? null,
      tenantSlug: input.tenantSlug ?? null,
      action: input.action,
      resourceType: input.resourceType ?? null,
      resourceId: input.resourceId ?? null,
      message: input.message ?? null,
      metadata: input.metadata ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    });

    return this.auditLogRepo.save(log);
  }

  async findAll(query: AuditLogListQuery): Promise<AuditLog[]> {
    const limit = Math.min(Math.max(query.limit ?? 50, 1), 200);

    const qb = this.auditLogRepo
      .createQueryBuilder('audit')
      .orderBy('audit.created_at', 'DESC')
      .limit(limit);

    this.applyFilters(qb, query);
    return qb.getMany();
  }

  private applyFilters(qb: SelectQueryBuilder<AuditLog>, query: AuditLogListQuery): void {
    if (query.action) {
      qb.andWhere('audit.action LIKE :action', { action: `%${query.action}%` });
    }

    if (query.actorType) {
      qb.andWhere('audit.actor_type = :actorType', { actorType: query.actorType });
    }
  }
}
