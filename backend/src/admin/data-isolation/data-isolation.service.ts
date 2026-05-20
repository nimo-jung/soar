import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Tenant } from '../tenants/entities/tenant.entity';
import { AuditLog } from '../../common/audit/entities/audit-log.entity';

export interface IsolationTenantStat {
  tenantId: number;
  tenantName: string;
  tenantSlug: string;
  snapshotCount: number;
  lastSnapshotAt: string | null;
  auditCrossCount: number;     // 해당 테넌트 감사로그에서 다른 tenantSlug 행위자가 기록된 건수
  missingContextCount: number; // tenantSlug가 null인 감사로그 건수 (컨텍스트 누락 의심)
  riskLevel: 'OK' | 'WARN' | 'CRITICAL';
}

export interface IsolationSummary {
  totalTenants: number;
  okCount: number;
  warnCount: number;
  criticalCount: number;
  tenants: IsolationTenantStat[];
  checkedAt: string;
}

@Injectable()
export class DataIsolationService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
    private readonly dataSource: DataSource,
  ) {}

  async getStats(): Promise<IsolationSummary> {
    const tenants = await this.tenantRepo.find({
      where: [{ status: 'ACTIVE' as never }, { status: 'SUSPENDED' as never }],
      order: { name: 'ASC' },
    });

    // 스냅샷 건수 집계
    const snapshotCounts: Record<number, { count: number; lastAt: string | null }> = {};
    const snapshotRows = await this.dataSource.query<{ tenant_id: number; cnt: string; last_at: string | null }[]>(
      `SELECT tenant_id, COUNT(*) AS cnt, MAX(snapshot_at) AS last_at FROM usage_snapshots GROUP BY tenant_id`,
    );
    for (const row of snapshotRows) {
      snapshotCounts[row.tenant_id] = { count: Number(row.cnt), lastAt: row.last_at };
    }

    const gapStats = await Promise.all(
      tenants.map(async (tenant) => ({
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        ...(await this.getTenantGapCounts(tenant.slug)),
      })),
    );
    const gapByTenantSlug = new Map(gapStats.map((row) => [row.tenantSlug, row]));

    const results: IsolationTenantStat[] = tenants.map((t) => {
      const snap = snapshotCounts[t.id] ?? { count: 0, lastAt: null };
      const gap = gapByTenantSlug.get(t.slug);
      const auditCrossCount = gap?.auditCrossCount ?? 0;
      const missingContextCount = gap?.missingContextCount ?? 0;

      let riskLevel: 'OK' | 'WARN' | 'CRITICAL' = 'OK';
      if (auditCrossCount > 0 || missingContextCount >= 10) {
        riskLevel = 'CRITICAL';
      } else if (missingContextCount > 0 || snap.count === 0) {
        riskLevel = 'WARN';
      }

      return {
        tenantId: t.id,
        tenantName: t.name,
        tenantSlug: t.slug,
        snapshotCount: snap.count,
        lastSnapshotAt: snap.lastAt,
        auditCrossCount,
        missingContextCount,
        riskLevel,
      };
    });

    const okCount = results.filter((r) => r.riskLevel === 'OK').length;
    const warnCount = results.filter((r) => r.riskLevel === 'WARN').length;
    const criticalCount = results.filter((r) => r.riskLevel === 'CRITICAL').length;

    return {
      totalTenants: tenants.length,
      okCount,
      warnCount,
      criticalCount,
      tenants: results,
      checkedAt: new Date().toISOString(),
    };
  }

  /**
   * 특정 테넌트에 대한 감사로그 컨텍스트 누락 건수를 실제로 집계
   */
  async getTenantAuditGaps(tenantSlug: string): Promise<{ missingContextCount: number; recentMissing: AuditLog[] }> {
    const normalized = tenantSlug.trim();
    if (!normalized) {
      return { missingContextCount: 0, recentMissing: [] };
    }

    const missing = await this.auditLogRepo
      .createQueryBuilder('al')
      .where('al.tenantSlug IS NULL')
      .andWhere('al.actorType != :type', { type: 'MASTER' })
      .andWhere(
        `(
          JSON_UNQUOTE(JSON_EXTRACT(al.metadata, '$.targetTenantSlug')) = :tenantSlug
          OR JSON_UNQUOTE(JSON_EXTRACT(al.metadata, '$.tenantSlug')) = :tenantSlug
        )`,
        { tenantSlug: normalized },
      )
      .orderBy('al.createdAt', 'DESC')
      .limit(20)
      .getMany();

    const countRows = await this.auditLogRepo
      .createQueryBuilder('al')
      .select('COUNT(*)', 'cnt')
      .where('al.tenantSlug IS NULL')
      .andWhere('al.actorType != :type', { type: 'MASTER' })
      .andWhere(
        `(
          JSON_UNQUOTE(JSON_EXTRACT(al.metadata, '$.targetTenantSlug')) = :tenantSlug
          OR JSON_UNQUOTE(JSON_EXTRACT(al.metadata, '$.tenantSlug')) = :tenantSlug
        )`,
        { tenantSlug: normalized },
      )
      .getRawOne<{ cnt: string }>();

    return {
      missingContextCount: Number(countRows?.cnt ?? 0),
      recentMissing: missing,
    };
  }

  private async getTenantGapCounts(tenantSlug: string): Promise<{ auditCrossCount: number; missingContextCount: number }> {
    const crossRows = await this.dataSource.query<{ cnt: string }[]>(
      `
      SELECT COUNT(*) AS cnt
      FROM audit_logs al
      WHERE al.actor_type = 'TENANT'
        AND (
          (
            al.tenant_slug = ?
            AND JSON_UNQUOTE(JSON_EXTRACT(al.metadata, '$.targetTenantSlug')) IS NOT NULL
            AND JSON_UNQUOTE(JSON_EXTRACT(al.metadata, '$.targetTenantSlug')) != ?
          )
          OR
          (
            al.tenant_slug != ?
            AND JSON_UNQUOTE(JSON_EXTRACT(al.metadata, '$.targetTenantSlug')) = ?
          )
        )
      `,
      [tenantSlug, tenantSlug, tenantSlug, tenantSlug],
    );

    const missingRows = await this.dataSource.query<{ cnt: string }[]>(
      `
      SELECT COUNT(*) AS cnt
      FROM audit_logs al
      WHERE al.actor_type = 'TENANT'
        AND al.tenant_slug IS NULL
        AND (
          JSON_UNQUOTE(JSON_EXTRACT(al.metadata, '$.targetTenantSlug')) = ?
          OR JSON_UNQUOTE(JSON_EXTRACT(al.metadata, '$.tenantSlug')) = ?
        )
      `,
      [tenantSlug, tenantSlug],
    );

    return {
      auditCrossCount: Number(crossRows[0]?.cnt ?? 0),
      missingContextCount: Number(missingRows[0]?.cnt ?? 0),
    };
  }
}
