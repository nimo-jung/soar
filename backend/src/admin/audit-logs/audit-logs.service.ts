import { BadRequestException, Injectable } from '@nestjs/common';
import { AuditLogService } from '../../common/audit/audit-log.service';
import { GetAuditLogsQueryDto, AuditLogSource } from './dto/get-audit-logs-query.dto';
import { TenantConnectionService } from '../../common/database/tenant-connection.service';
import { TenantAuditLog } from '../../tenant/audit-logs/entities/tenant-audit-log.entity';
import { SelectQueryBuilder } from 'typeorm';

@Injectable()
export class AuditLogsService {
  constructor(
    private readonly auditLogService: AuditLogService,
    private readonly tenantConnectionService: TenantConnectionService,
  ) {}

  async findAll(query: GetAuditLogsQueryDto) {
    if (query.source === AuditLogSource.TENANT) {
      if (!query.tenantSlug?.trim()) {
        throw new BadRequestException('TENANT 소스 조회 시 tenantSlug는 필수입니다.');
      }

      return this.findFromTenantDb(query.tenantSlug.trim(), query);
    }

    return this.auditLogService.findAll(query);
  }

  private async findFromTenantDb(tenantSlug: string, query: GetAuditLogsQueryDto): Promise<TenantAuditLog[]> {
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

  private applyFilters(qb: SelectQueryBuilder<TenantAuditLog>, query: GetAuditLogsQueryDto): void {
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
