import { Injectable, Logger } from '@nestjs/common';
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
import { ClickHouseRawLogsService } from './clickhouse-raw-logs.service';

type EngineMetricsResponse = {
  status?: string;
  ingestErrorRate?: number;
  parseErrorRate?: number;
  avgIngestLatencyMs?: number;
  checkedAt?: string;
};

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(UsageSnapshot)
    private readonly usageSnapshotRepo: Repository<UsageSnapshot>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    private readonly chRawLogsService: ClickHouseRawLogsService,
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

    // EPS series from ClickHouse raw_logs (actual collected log count per 5min bucket)
    const epsSeries = await this.chRawLogsService.getEpsSeries(
      query.from || undefined,
      query.to || undefined,
      query.tenantId ?? undefined,
    );

    // For ingest/parse error rates and latency, still use audit_logs as fallback (Go Engine metrics preferred)
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
      epsSeries,
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

    const chResult = await this.chRawLogsService.getRecentEvents(limit, (page - 1) * limit, {
      tenantId: query.tenantId ?? undefined,
      from: query.from || undefined,
      to: query.to || undefined,
      severity: query.severity || undefined,
    });

    return {
      items: chResult.items.map((item) => ({
        id: `ch-${item.occurredAt}-${item.tenantId}`,
        tenantId: item.tenantId,
        tenantLabel: item.tenantLabel,
        code: item.code,
        message: item.message,
        severity: item.severity,
        occurredAt: item.occurredAt,
      })),
      pagination: { page, limit, total: chResult.total },
    };
  }
}
