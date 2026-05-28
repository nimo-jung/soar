import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { AuditActorType, AuditLog } from './entities/audit-log.entity';
import { TenantConnectionService } from '../database/tenant-connection.service';
import { TenantAuditLog } from '../../tenant/audit-logs/entities/tenant-audit-log.entity';

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
  tenantSlug?: string;
}

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
    private readonly tenantConnectionService: TenantConnectionService,
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

    const saved = await this.auditLogRepo.save(log);

    await this.recordToTenantDb(log);
    return saved;
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

    if (query.tenantSlug) {
      qb.andWhere('audit.tenant_slug = :tenantSlug', { tenantSlug: query.tenantSlug });
    }
  }

  private async recordToTenantDb(log: AuditLog): Promise<void> {
    if (log.actorType !== AuditActorType.TENANT || !log.tenantSlug) {
      return;
    }

    try {
      const tenantId = this.toTenantId(log.tenantSlug);
      const conn = await this.tenantConnectionService.getConnection(tenantId);
      const tenantAuditRepo = conn.getRepository(TenantAuditLog);

      await tenantAuditRepo.save(
        tenantAuditRepo.create({
          actorType: log.actorType,
          actorId: log.actorId,
          actorEmail: log.actorEmail,
          tenantSlug: log.tenantSlug,
          action: log.action,
          resourceType: log.resourceType,
          resourceId: log.resourceId,
          message: log.message,
          metadata: log.metadata,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
        }),
      );
    } catch {
      // 테넌트 감사 로그 저장 실패가 원본(admin) 감사 로그 저장을 막지 않도록 무시한다.
    }
  }

  private toTenantId(tenantSlug: string): string {
    return tenantSlug.replace(/-/g, '_');
  }
}
