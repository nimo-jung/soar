import { Injectable } from '@nestjs/common';
import { SelectQueryBuilder } from 'typeorm';
import { TenantConnectionService } from '../../common/database/tenant-connection.service';
import { TenantAuditLog } from './entities/tenant-audit-log.entity';
import { GetTenantAuditLogsQueryDto } from './dto/get-tenant-audit-logs-query.dto';

@Injectable()
export class TenantAuditLogsService {
  constructor(private readonly tenantConnectionService: TenantConnectionService) {}

  async findAll(tenantSlug: string, query: GetTenantAuditLogsQueryDto): Promise<TenantAuditLog[]> {
    const tenantId = this.toTenantId(tenantSlug);
    const conn = await this.tenantConnectionService.getConnection(tenantId);
    const repo = conn.getRepository(TenantAuditLog);

    const limit = Math.min(Math.max(query.limit ?? 50, 1), 200);
    const qb = repo
      .createQueryBuilder('audit')
      .orderBy('audit.created_at', 'DESC')
      .limit(limit);

    this.applyFilters(qb, query);
    return qb.getMany();
  }

  private applyFilters(
    qb: SelectQueryBuilder<TenantAuditLog>,
    query: GetTenantAuditLogsQueryDto,
  ): void {
    if (query.action) {
      qb.andWhere('audit.action LIKE :action', { action: `%${query.action}%` });
    }

    if (query.actorType) {
      qb.andWhere('audit.actor_type = :actorType', { actorType: query.actorType });
    }
  }

  private toTenantId(tenantSlug: string): string {
    return tenantSlug.replace(/-/g, '_');
  }
}
