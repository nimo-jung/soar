import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SelectQueryBuilder, Repository } from 'typeorm';
import { GetUsageQueryDto } from './dto/get-usage-query.dto';
import { GetInvoicePreviewQueryDto } from './dto/get-invoice-preview-query.dto';
import { InvoicePreviewResponseDto, UsageListResponseDto } from './dto/usage-response.dto';
import { UsageSnapshot } from '../tenants/entities/usage-snapshot.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { TenantTier } from '../tenants/entities/tenant-tier.entity';

@Injectable()
export class BillingService {
  constructor(
    @InjectRepository(UsageSnapshot)
    private readonly usageSnapshotRepo: Repository<UsageSnapshot>,
  ) {}

  private parseDate(value?: string): Date | null {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private applyUsageFilters(
    qb: SelectQueryBuilder<UsageSnapshot>,
    query: GetUsageQueryDto,
  ): SelectQueryBuilder<UsageSnapshot> {
    const fromDate = this.parseDate(query.from);
    const toDate = this.parseDate(query.to);

    if (query.tenantId) {
      qb.andWhere('usage.tenant_id = :tenantId', { tenantId: query.tenantId });
    }

    if (query.tierCode) {
      qb.andWhere('tier.code = :tierCode', { tierCode: query.tierCode });
    }

    if (fromDate) {
      qb.andWhere('usage.snapshot_at >= :fromDate', { fromDate });
    }

    if (toDate) {
      qb.andWhere('usage.snapshot_at <= :toDate', { toDate });
    }

    return qb;
  }

  private toNumber(value: unknown): number {
    if (value === null || value === undefined) return 0;
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  }

  private formatDateTime(value: unknown): string {
    const date = value instanceof Date ? value : new Date(String(value));
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  async getUsage(query: GetUsageQueryDto): Promise<UsageListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const baseQb = this.usageSnapshotRepo
      .createQueryBuilder('usage')
      .leftJoin(Tenant, 'tenant', 'tenant.id = usage.tenant_id')
      .leftJoin(TenantTier, 'tier', 'tier.id = tenant.tierId');

    this.applyUsageFilters(baseQb, query);

    const total = await baseQb.clone().getCount();

    const rows = await baseQb
      .clone()
      .select([
        'usage.tenant_id AS tenantId',
        'tenant.name AS tenantName',
        'usage.snapshot_at AS snapshotAt',
        'usage.eps_avg AS epsAvg',
        'usage.storage_used_gb AS storageUsedGb',
        'usage.log_count AS logCount',
      ])
      .orderBy('usage.snapshot_at', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany();

    const summaryRaw = await baseQb
      .clone()
      .select([
        'COALESCE(SUM(usage.log_count), 0) AS totalLogCount',
        'COALESCE(AVG(usage.eps_avg), 0) AS avgEps',
        'COALESCE(AVG(usage.storage_used_gb), 0) AS avgStorageGb',
      ])
      .getRawOne();

    return {
      items: rows.map((row) => ({
        tenantId: this.toNumber(row.tenantId),
        tenantName: String(row.tenantName ?? '-'),
        snapshotAt: row.snapshotAt instanceof Date ? row.snapshotAt.toISOString() : String(row.snapshotAt),
        epsAvg: this.toNumber(row.epsAvg),
        storageUsedGb: this.toNumber(row.storageUsedGb),
        logCount: this.toNumber(row.logCount),
      })),
      summary: {
        totalLogCount: this.toNumber(summaryRaw?.totalLogCount),
        avgEps: this.toNumber(summaryRaw?.avgEps),
        avgStorageGb: this.toNumber(summaryRaw?.avgStorageGb),
      },
      pagination: {
        page,
        limit,
        total,
      },
    };
  }

  async exportUsageCsv(query: GetUsageQueryDto): Promise<string> {
    const baseQb = this.usageSnapshotRepo
      .createQueryBuilder('usage')
      .leftJoin(Tenant, 'tenant', 'tenant.id = usage.tenant_id')
      .leftJoin(TenantTier, 'tier', 'tier.id = tenant.tierId');

    this.applyUsageFilters(baseQb, query);

    const rows = await baseQb
      .clone()
      .select([
        'usage.snapshot_at AS snapshotAt',
        'usage.tenant_id AS tenantId',
        'tenant.name AS tenantName',
        'tier.code AS tierCode',
        'usage.eps_avg AS epsAvg',
        'usage.storage_used_gb AS storageUsedGb',
        'usage.log_count AS logCount',
      ])
      .orderBy('usage.snapshot_at', 'DESC')
      .limit(10000)
      .getRawMany();

    const headers = ['snapshot_at', 'tenant_id', 'tenant_name', 'tier_code', 'eps_avg', 'storage_used_gb', 'log_count'];
    const escapeCsv = (value: unknown): string => {
      const str = String(value ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const lines = rows.map((row) => [
      escapeCsv(this.formatDateTime(row.snapshotAt)),
      escapeCsv(row.tenantId),
      escapeCsv(row.tenantName ?? '-'),
      escapeCsv(row.tierCode ?? '-'),
      escapeCsv(this.toNumber(row.epsAvg)),
      escapeCsv(this.toNumber(row.storageUsedGb)),
      escapeCsv(this.toNumber(row.logCount)),
    ].join(','));

    return `\uFEFF${headers.join(',')}\n${lines.join('\n')}`;
  }

  getInvoicePreview(_query: GetInvoicePreviewQueryDto): InvoicePreviewResponseDto {
    return {
      items: [],
    };
  }
}
