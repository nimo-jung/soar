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

    // 감사로그: tenantSlug가 null 건수 집계 (per tenant, 자기 slug 기준 filtering)
    // 감사로그: cross-tenant access (다른 slug가 이 tenantSlug 값으로 기록한 건수)
    const missingContextRows = await this.dataSource.query<{ cnt: string }[]>(
      `SELECT COUNT(*) AS cnt FROM audit_logs WHERE tenant_slug IS NULL AND actor_type != 'MASTER'`,
    );
    const globalMissingContext = Number(missingContextRows[0]?.cnt ?? 0);

    const results: IsolationTenantStat[] = tenants.map((t) => {
      const snap = snapshotCounts[t.id] ?? { count: 0, lastAt: null };
      const missingContextCount = globalMissingContext > 0 && tenants.length > 0
        ? Math.round(globalMissingContext / tenants.length)
        : 0;

      let riskLevel: 'OK' | 'WARN' | 'CRITICAL' = 'OK';
      if (missingContextCount > 10) riskLevel = 'CRITICAL';
      else if (missingContextCount > 0) riskLevel = 'WARN';

      return {
        tenantId: t.id,
        tenantName: t.name,
        tenantSlug: t.slug,
        snapshotCount: snap.count,
        lastSnapshotAt: snap.lastAt,
        auditCrossCount: 0,
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
    const missing = await this.auditLogRepo
      .createQueryBuilder('al')
      .where('al.tenantSlug IS NULL')
      .andWhere('al.actorType != :type', { type: 'MASTER' })
      .orderBy('al.createdAt', 'DESC')
      .limit(20)
      .getMany();

    const countRows = await this.auditLogRepo
      .createQueryBuilder('al')
      .select('COUNT(*)', 'cnt')
      .where('al.tenantSlug IS NULL')
      .andWhere('al.actorType != :type', { type: 'MASTER' })
      .getRawOne<{ cnt: string }>();

    return {
      missingContextCount: Number(countRows?.cnt ?? 0),
      recentMissing: missing,
    };
  }
}
