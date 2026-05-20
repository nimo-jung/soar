import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SelectQueryBuilder, Repository } from 'typeorm';
import { GetUsageQueryDto } from './dto/get-usage-query.dto';
import { GetInvoicePreviewQueryDto } from './dto/get-invoice-preview-query.dto';
import { InvoicePreviewResponseDto, UsageListResponseDto } from './dto/usage-response.dto';
import { BillingPricingPolicyListResponseDto, UpsertBillingPricingPoliciesDto } from './dto/pricing-policy.dto';
import { UsageSnapshot } from '../tenants/entities/usage-snapshot.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { TenantTier } from '../tenants/entities/tenant-tier.entity';
import { BillingPricingPolicy } from './entities/billing-pricing-policy.entity';

type PricingPolicy = {
  baseFee: number;
  includedEps: number;
  epsOveragePer100: number;
  storageOveragePerGb: number;
  logPerMillion: number;
  currency: string;
};

@Injectable()
export class BillingService {
  constructor(
    @InjectRepository(UsageSnapshot)
    private readonly usageSnapshotRepo: Repository<UsageSnapshot>,
    @InjectRepository(BillingPricingPolicy)
    private readonly billingPricingPolicyRepo: Repository<BillingPricingPolicy>,
  ) {}

  private readonly defaultPricingByTierCode: Record<string, PricingPolicy> = {
    LITE: {
      baseFee: 80,
      includedEps: 100,
      epsOveragePer100: 8,
      storageOveragePerGb: 1.5,
      logPerMillion: 2,
      currency: 'USD',
    },
    PREMIUM: {
      baseFee: 250,
      includedEps: 400,
      epsOveragePer100: 6,
      storageOveragePerGb: 1.2,
      logPerMillion: 1.5,
      currency: 'USD',
    },
    ENTERPRISE: {
      baseFee: 700,
      includedEps: 1200,
      epsOveragePer100: 4,
      storageOveragePerGb: 0.9,
      logPerMillion: 1,
      currency: 'USD',
    },
  };

  private async getPricingByTierCode(): Promise<Record<string, PricingPolicy>> {
    const pricing = { ...this.defaultPricingByTierCode };
    const policies = await this.billingPricingPolicyRepo.find();

    for (const policy of policies) {
      const tierCode = String(policy.tierCode ?? '').toUpperCase();
      if (!tierCode) {
        continue;
      }

      pricing[tierCode] = {
        baseFee: this.toNumber(policy.baseFee),
        includedEps: this.toNumber(policy.includedEps),
        epsOveragePer100: this.toNumber(policy.epsOveragePer100),
        storageOveragePerGb: this.toNumber(policy.storageOveragePerGb),
        logPerMillion: this.toNumber(policy.logPerMillion),
        currency: String(policy.currency ?? 'USD').toUpperCase(),
      };
    }

    return pricing;
  }

  async getPricingPolicies(): Promise<BillingPricingPolicyListResponseDto> {
    const policies = await this.billingPricingPolicyRepo.find({
      order: { tierCode: 'ASC' },
    });

    return {
      items: policies.map((policy) => ({
        tierCode: String(policy.tierCode ?? '').toUpperCase(),
        baseFee: this.toNumber(policy.baseFee),
        includedEps: this.toNumber(policy.includedEps),
        epsOveragePer100: this.toNumber(policy.epsOveragePer100),
        storageOveragePerGb: this.toNumber(policy.storageOveragePerGb),
        logPerMillion: this.toNumber(policy.logPerMillion),
        currency: String(policy.currency ?? 'USD').toUpperCase(),
      })),
    };
  }

  async upsertPricingPolicies(dto: UpsertBillingPricingPoliciesDto): Promise<BillingPricingPolicyListResponseDto> {
    const payload = dto.items.map((item) => this.billingPricingPolicyRepo.create({
      tierCode: item.tierCode.toUpperCase(),
      baseFee: item.baseFee,
      includedEps: item.includedEps,
      epsOveragePer100: item.epsOveragePer100,
      storageOveragePerGb: item.storageOveragePerGb,
      logPerMillion: item.logPerMillion,
      currency: String(item.currency ?? 'USD').toUpperCase(),
    }));

    await this.billingPricingPolicyRepo.upsert(payload, ['tierCode']);

    return this.getPricingPolicies();
  }

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

  async getInvoicePreview(query: GetInvoicePreviewQueryDto): Promise<InvoicePreviewResponseDto> {
    const monthMatch = /^(\d{4})-(\d{2})$/.exec(query.billingMonth);
    if (!monthMatch) {
      return { items: [] };
    }

    const year = Number(monthMatch[1]);
    const month = Number(monthMatch[2]) - 1;
    const start = new Date(Date.UTC(year, month, 1, 0, 0, 0));
    const end = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0));

    const qb = this.usageSnapshotRepo
      .createQueryBuilder('usage')
      .innerJoin(Tenant, 'tenant', 'tenant.id = usage.tenant_id')
      .innerJoin(TenantTier, 'tier', 'tier.id = tenant.tierId')
      .where('usage.snapshot_at >= :start', { start })
      .andWhere('usage.snapshot_at < :end', { end });

    if (query.tenantId) {
      qb.andWhere('usage.tenant_id = :tenantId', { tenantId: query.tenantId });
    }

    const rows = await qb
      .select([
        'usage.tenant_id AS tenantId',
        'tenant.name AS tenantName',
        'tier.code AS tierCode',
        'tier.daily_log_quota_gb AS tierStorageQuotaGb',
        'COALESCE(AVG(usage.eps_avg), 0) AS avgEps',
        'COALESCE(MAX(usage.storage_used_gb), 0) AS maxStorageUsedGb',
        'COALESCE(SUM(usage.log_count), 0) AS totalLogCount',
      ])
      .groupBy('usage.tenant_id')
      .addGroupBy('tenant.name')
      .addGroupBy('tier.code')
      .addGroupBy('tier.daily_log_quota_gb')
      .orderBy('usage.tenant_id', 'ASC')
      .getRawMany();

    const pricingByTierCode = await this.getPricingByTierCode();

    const items = rows.map((row) => {
      const tierCode = String(row.tierCode ?? 'LITE').toUpperCase();
      const pricing = pricingByTierCode[tierCode] ?? pricingByTierCode.LITE;

      const avgEps = this.toNumber(row.avgEps);
      const maxStorageUsedGb = this.toNumber(row.maxStorageUsedGb);
      const totalLogCount = this.toNumber(row.totalLogCount);
      const storageQuotaGb = this.toNumber(row.tierStorageQuotaGb);

      const epsOverageBlocks = Math.max(0, avgEps - pricing.includedEps) / 100;
      const storageOverageGb = Math.max(0, maxStorageUsedGb - storageQuotaGb);
      const logMillions = totalLogCount / 1_000_000;

      const amount = pricing.baseFee
        + (epsOverageBlocks * pricing.epsOveragePer100)
        + (storageOverageGb * pricing.storageOveragePerGb)
        + (logMillions * pricing.logPerMillion);

      return {
        tenantId: this.toNumber(row.tenantId),
        tenantName: String(row.tenantName ?? '-'),
        billingMonth: query.billingMonth,
        amount: Number(amount.toFixed(2)),
        currency: pricing.currency,
      };
    });

    return { items };
  }
}
