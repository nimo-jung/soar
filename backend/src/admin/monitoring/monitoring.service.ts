import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import http from 'http';
import https from 'https';
import { GetMonitoringOverviewQueryDto } from './dto/get-monitoring-overview-query.dto';
import { GetMonitoringEventsQueryDto } from './dto/get-monitoring-events-query.dto';
import { MonitoringEventsResponseDto, MonitoringOverviewResponseDto } from './dto/monitoring-response.dto';
import { UsageSnapshot } from '../tenants/entities/usage-snapshot.entity';
import { AuditLog } from '../../common/audit/entities/audit-log.entity';
import { Tenant } from '../tenants/entities/tenant.entity';

type EngineMetricsResponse = {
  status?: string;
  ingestErrorRate?: number;
  parseErrorRate?: number;
  avgIngestLatencyMs?: number;
  checkedAt?: string;
};

@Injectable()
export class MonitoringService {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(UsageSnapshot)
    private readonly usageSnapshotRepo: Repository<UsageSnapshot>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
  ) {}

  private parseDate(value?: string): Date | null {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private toNumber(value: unknown): number {
    const num = Number(value ?? 0);
    return Number.isFinite(num) ? num : 0;
  }

  private severityFromAction(action: string): string {
    const upper = action.toUpperCase();
    if (upper.includes('FAIL') || upper.includes('ERROR') || upper.includes('DELETE')) return 'HIGH';
    if (upper.includes('UPDATE') || upper.includes('SUSPEND') || upper.includes('DEACTIVATE')) return 'MEDIUM';
    return 'LOW';
  }

  private async checkEngineHealth(): Promise<{ healthy: boolean; checkedAt: string | null }> {
    const healthUrl = this.configService.get<string>('GO_ENGINE_HEALTH_URL', 'http://localhost:8081/health');

    try {
      const parsed = new URL(healthUrl);
      const client = parsed.protocol === 'https:' ? https : http;

      const healthy = await new Promise<boolean>((resolve) => {
        const req = client.request(
          {
            method: 'GET',
            hostname: parsed.hostname,
            port: parsed.port,
            path: `${parsed.pathname}${parsed.search}`,
            timeout: 1500,
          },
          (res) => {
            if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
              resolve(false);
              return;
            }

            let body = '';
            res.setEncoding('utf8');
            res.on('data', (chunk) => {
              body += chunk;
            });
            res.on('end', () => {
              try {
                const json = JSON.parse(body) as { status?: string };
                resolve((json.status ?? '').toLowerCase() === 'ok');
              } catch {
                resolve(false);
              }
            });
          },
        );

        req.on('error', () => resolve(false));
        req.on('timeout', () => {
          req.destroy();
          resolve(false);
        });
        req.end();
      });

      return {
        healthy,
        checkedAt: new Date().toISOString(),
      };
    } catch {
      return {
        healthy: false,
        checkedAt: new Date().toISOString(),
      };
    }
  }

  private async fetchEngineMetrics(): Promise<EngineMetricsResponse | null> {
    const metricsUrl = this.configService.get<string>('GO_ENGINE_METRICS_URL', 'http://localhost:8081/metrics');

    try {
      const parsed = new URL(metricsUrl);
      const client = parsed.protocol === 'https:' ? https : http;

      const metrics = await new Promise<EngineMetricsResponse | null>((resolve) => {
        const req = client.request(
          {
            method: 'GET',
            hostname: parsed.hostname,
            port: parsed.port,
            path: `${parsed.pathname}${parsed.search}`,
            timeout: 1500,
          },
          (res) => {
            if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
              resolve(null);
              return;
            }

            let body = '';
            res.setEncoding('utf8');
            res.on('data', (chunk) => {
              body += chunk;
            });
            res.on('end', () => {
              try {
                const json = JSON.parse(body) as EngineMetricsResponse;
                if ((json.status ?? '').toLowerCase() !== 'ok') {
                  resolve(null);
                  return;
                }
                resolve(json);
              } catch {
                resolve(null);
              }
            });
          },
        );

        req.on('error', () => resolve(null));
        req.on('timeout', () => {
          req.destroy();
          resolve(null);
        });
        req.end();
      });

      return metrics;
    } catch {
      return null;
    }
  }

  async getOverview(query: GetMonitoringOverviewQueryDto): Promise<MonitoringOverviewResponseDto> {
    const fromDate = this.parseDate(query.from);
    const toDate = this.parseDate(query.to);

    const epsQb = this.usageSnapshotRepo
      .createQueryBuilder('usage')
      .select('usage.snapshot_at', 'snapshotAt')
      .addSelect('SUM(usage.eps_avg)', 'epsValue')
      .groupBy('usage.snapshot_at')
      .orderBy('usage.snapshot_at', 'ASC');

    if (query.tenantId) {
      epsQb.andWhere('usage.tenant_id = :tenantId', { tenantId: query.tenantId });
    }
    if (fromDate) {
      epsQb.andWhere('usage.snapshot_at >= :fromDate', { fromDate });
    }
    if (toDate) {
      epsQb.andWhere('usage.snapshot_at <= :toDate', { toDate });
    }

    const epsRaw = await epsQb.getRawMany();

    const auditBaseQb = this.auditLogRepo.createQueryBuilder('audit');
    if (fromDate) {
      auditBaseQb.andWhere('audit.created_at >= :fromDate', { fromDate });
    }
    if (toDate) {
      auditBaseQb.andWhere('audit.created_at <= :toDate', { toDate });
    }

    const [totalEvents, errorEvents] = await Promise.all([
      auditBaseQb.clone().getCount(),
      auditBaseQb
        .clone()
        .andWhere('(audit.action LIKE :fail OR audit.action LIKE :error)', {
          fail: '%FAIL%',
          error: '%ERROR%',
        })
        .getCount(),
    ]);

    const parseErrorEvents = await auditBaseQb
      .clone()
      .andWhere('audit.action LIKE :parse', { parse: '%PARS%' })
      .getCount();

    const avgLatencyRaw = await auditBaseQb
      .clone()
      .select(
        "COALESCE(AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(audit.metadata, '$.ingestLatencyMs')) AS DECIMAL(10,2))), 0)",
        'avgLatency',
      )
      .getRawOne();

    const toRate = (count: number) => (totalEvents > 0 ? Number(((count / totalEvents) * 100).toFixed(2)) : 0);

    const engineMetrics = await this.fetchEngineMetrics();
    const engine = await this.checkEngineHealth();

    const ingestErrorRate = engineMetrics?.ingestErrorRate ?? toRate(errorEvents);
    const parseErrorRate = engineMetrics?.parseErrorRate ?? toRate(parseErrorEvents);
    const avgIngestLatencyMs = engineMetrics?.avgIngestLatencyMs ?? this.toNumber(avgLatencyRaw?.avgLatency);
    const engineCheckedAt = engineMetrics?.checkedAt ?? engine.checkedAt;

    return {
      epsSeries: epsRaw.map((row) => ({
        ts: row.snapshotAt instanceof Date ? row.snapshotAt.toISOString() : String(row.snapshotAt),
        value: this.toNumber(row.epsValue),
      })),
      ingestErrorRate: this.toNumber(ingestErrorRate),
      parseErrorRate: this.toNumber(parseErrorRate),
      avgIngestLatencyMs: this.toNumber(avgIngestLatencyMs),
      engineHealthy: engine.healthy,
      engineCheckedAt,
    };
  }

  async getEvents(query: GetMonitoringEventsQueryDto): Promise<MonitoringEventsResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const fromDate = this.parseDate(query.from);
    const toDate = this.parseDate(query.to);

    const qb = this.auditLogRepo.createQueryBuilder('audit');
    if (query.tenantId) {
      const tenant = await this.tenantRepo.findOne({ where: { id: query.tenantId } });
      if (!tenant) {
        return {
          items: [],
          pagination: {
            page,
            limit,
            total: 0,
          },
        };
      }
      qb.andWhere('audit.tenant_slug = :tenantSlug', { tenantSlug: tenant.slug });
    }
    if (query.severity) {
      const severity = query.severity.toUpperCase();
      if (severity === 'HIGH') {
        qb.andWhere('(audit.action LIKE :fail OR audit.action LIKE :error OR audit.action LIKE :delete)', {
          fail: '%FAIL%',
          error: '%ERROR%',
          delete: '%DELETE%',
        });
      } else if (severity === 'MEDIUM') {
        qb.andWhere('(audit.action LIKE :update OR audit.action LIKE :suspend OR audit.action LIKE :deactivate)', {
          update: '%UPDATE%',
          suspend: '%SUSPEND%',
          deactivate: '%DEACTIVATE%',
        });
      } else if (severity === 'LOW') {
        qb.andWhere('(audit.action NOT LIKE :fail AND audit.action NOT LIKE :error AND audit.action NOT LIKE :delete)', {
          fail: '%FAIL%',
          error: '%ERROR%',
          delete: '%DELETE%',
        });
      }
    }
    if (fromDate) {
      qb.andWhere('audit.created_at >= :fromDate', { fromDate });
    }
    if (toDate) {
      qb.andWhere('audit.created_at <= :toDate', { toDate });
    }

    const total = await qb.clone().getCount();
    const rows = await qb
      .clone()
      .orderBy('audit.created_at', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit)
      .getMany();

    const tenantSlugs = Array.from(new Set(rows.map((row) => row.tenantSlug).filter((slug): slug is string => !!slug)));
    const tenants = tenantSlugs.length
      ? await this.tenantRepo
          .createQueryBuilder('tenant')
          .where('tenant.slug IN (:...slugs)', { slugs: tenantSlugs })
          .getMany()
      : [];
    const tenantBySlug = new Map(tenants.map((tenant) => [tenant.slug, tenant]));

    return {
      items: rows.map((row) => {
        const mappedTenant = row.tenantSlug ? tenantBySlug.get(row.tenantSlug) : undefined;
        return {
        id: String(row.id),
        tenantId: mappedTenant?.id ?? null,
        tenantLabel: mappedTenant?.name ?? row.tenantSlug ?? '-',
        code: row.action,
        message: row.message ?? '-',
        severity: this.severityFromAction(row.action),
        occurredAt: row.createdAt.toISOString(),
        };
      }),
      pagination: {
        page,
        limit,
        total,
      },
    };
  }
}
