import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Inject } from '@nestjs/common';
import { MoreThanOrEqual, Repository } from 'typeorm';
import Redis from 'ioredis';
import { UsageSnapshot } from '../tenants/entities/usage-snapshot.entity';
import { Tenant, TenantStatus } from '../tenants/entities/tenant.entity';
import { AuditLog } from '../../common/audit/entities/audit-log.entity';
import { REDIS_CLIENT } from '../../common/redis/redis.constants';

type EngineMetricsSnapshot = {
  ingestTotal: number;
};

type ClickHouseTenantUsage = {
  totalRows: number;
  totalBytes: number;
};

@Injectable()
export class UsageSnapshotBatchService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(UsageSnapshotBatchService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly configService: ConfigService,
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
    @InjectRepository(UsageSnapshot)
    private readonly usageSnapshotRepo: Repository<UsageSnapshot>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
  ) {}

  private getRedisKeyForTenantRows(tenantId: number): string {
    return `usage_snapshot:last_total_rows:${tenantId}`;
  }

  private getRedisKeyForEngineTotal(): string {
    return 'usage_snapshot:last_engine_ingest_total';
  }

  private getClickHouseBaseUrl(): string {
    const host = this.configService.get<string>('CLICKHOUSE_HOST', 'localhost');
    const port = this.configService.get<string>('CLICKHOUSE_HTTP_PORT', '8123');
    const protocol = this.configService.get<string>('CLICKHOUSE_HTTP_PROTOCOL', 'http');
    return `${protocol}://${host}:${port}`;
  }

  private getGoEngineMetricsUrl(): string {
    const host = this.configService.get<string>('GO_ENGINE_HOST', 'localhost');
    const port = this.configService.get<string>('GO_ENGINE_PORT', '8080');
    const path = this.configService.get<string>('GO_ENGINE_METRICS_PATH', '/metrics');
    return `http://${host}:${port}${path}`;
  }

  private async fetchEngineMetricsSnapshot(): Promise<EngineMetricsSnapshot | null> {
    try {
      const res = await fetch(this.getGoEngineMetricsUrl(), { method: 'GET' });
      if (!res.ok) {
        return null;
      }
      const payload = await res.json() as { ingestTotal?: unknown };
      const ingestTotal = Number(payload.ingestTotal ?? 0);
      return {
        ingestTotal: Number.isFinite(ingestTotal) && ingestTotal >= 0 ? ingestTotal : 0,
      };
    } catch {
      return null;
    }
  }

  private async queryClickHouse(sql: string): Promise<Array<Record<string, unknown>>> {
    const username = this.configService.get<string>('CLICKHOUSE_USER', 'default');
    const password = this.configService.get<string>('CLICKHOUSE_PASSWORD', '');

    const params = new URLSearchParams({
      query: `${sql} FORMAT JSON`,
    });

    const headers: Record<string, string> = {
      'Content-Type': 'text/plain',
    };

    if (username) {
      headers.Authorization = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
    }

    const res = await fetch(`${this.getClickHouseBaseUrl()}/?${params.toString()}`, {
      method: 'GET',
      headers,
    });

    if (!res.ok) {
      throw new Error(`clickhouse query failed: ${res.status}`);
    }

    const json = await res.json() as { data?: Array<Record<string, unknown>> };
    return Array.isArray(json.data) ? json.data : [];
  }

  private async fetchClickHouseTenantUsage(tenantId: number): Promise<ClickHouseTenantUsage | null> {
    const tenantDatabase = `db_tenant_${tenantId}`;
    const escapedDatabase = tenantDatabase.replace(/'/g, "''");

    try {
      const rows = await this.queryClickHouse(`
        SELECT
          COALESCE(SUM(rows), 0) AS totalRows,
          COALESCE(SUM(bytes_on_disk), 0) AS totalBytes
        FROM system.parts
        WHERE active = 1
          AND database = '${escapedDatabase}'
      `);

      const row = rows[0] ?? {};
      const totalRows = Number(row.totalRows ?? 0);
      const totalBytes = Number(row.totalBytes ?? 0);

      return {
        totalRows: Number.isFinite(totalRows) && totalRows >= 0 ? totalRows : 0,
        totalBytes: Number.isFinite(totalBytes) && totalBytes >= 0 ? totalBytes : 0,
      };
    } catch {
      return null;
    }
  }

  async onModuleInit(): Promise<void> {
    const enabled = this.configService.get<string>('USAGE_SNAPSHOT_COLLECT_ENABLED', 'true') === 'true';
    if (!enabled) {
      return;
    }

    const intervalMs = Number(this.configService.get<string>('USAGE_SNAPSHOT_BATCH_INTERVAL_MS', '300000'));
    if (!Number.isFinite(intervalMs) || intervalMs < 60000) {
      this.logger.warn('USAGE_SNAPSHOT_BATCH_INTERVAL_MS is invalid; fallback 300000ms');
    }

    const normalizedInterval = Number.isFinite(intervalMs) && intervalMs >= 60000 ? intervalMs : 300000;

    this.timer = setInterval(() => {
      void this.collectNow();
    }, normalizedInterval);

    const runOnBoot = this.configService.get<string>('USAGE_SNAPSHOT_RUN_ON_BOOT', 'true') === 'true';
    if (runOnBoot) {
      await this.collectNow();
    }

    this.logger.log(`Usage snapshot batch started (interval=${normalizedInterval}ms)`);
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async collectNow(snapshotAt = new Date()): Promise<{ collected: number; snapshotAt: string }> {
    const windowMinutes = Number(this.configService.get<string>('USAGE_SNAPSHOT_WINDOW_MINUTES', '5'));
    const avgLogBytes = Number(this.configService.get<string>('USAGE_SNAPSHOT_AVG_LOG_BYTES', '1200'));
    const normalizedWindowMinutes = Number.isFinite(windowMinutes) && windowMinutes > 0 ? windowMinutes : 5;
    const normalizedAvgLogBytes = Number.isFinite(avgLogBytes) && avgLogBytes > 0 ? avgLogBytes : 1200;

    const fromDate = new Date(snapshotAt.getTime() - normalizedWindowMinutes * 60 * 1000);
    const tenants = await this.tenantRepo.find({ where: { status: TenantStatus.ACTIVE } });
    const engineMetrics = await this.fetchEngineMetricsSnapshot();

    let globalEngineEps = 0;
    if (engineMetrics) {
      const lastEngineTotal = Number(await this.redis.get(this.getRedisKeyForEngineTotal()));
      const last = Number.isFinite(lastEngineTotal) && lastEngineTotal >= 0 ? lastEngineTotal : 0;
      const delta = Math.max(0, engineMetrics.ingestTotal - last);
      globalEngineEps = delta / (normalizedWindowMinutes * 60);
      await this.redis.set(this.getRedisKeyForEngineTotal(), String(engineMetrics.ingestTotal));
    }

    const rows: UsageSnapshot[] = [];

    for (const tenant of tenants) {
      const clickHouseUsage = await this.fetchClickHouseTenantUsage(tenant.id);
      const fallbackLogCount = await this.auditLogRepo.count({
        where: {
          tenantSlug: tenant.slug,
          createdAt: MoreThanOrEqual(fromDate),
        },
      });

      const lastRowsFromRedis = Number(await this.redis.get(this.getRedisKeyForTenantRows(tenant.id)));
      const previousRows = Number.isFinite(lastRowsFromRedis) && lastRowsFromRedis >= 0 ? lastRowsFromRedis : 0;

      const clickHouseTotalRows = clickHouseUsage?.totalRows ?? 0;
      const clickHouseDeltaRows = clickHouseUsage
        ? Math.max(0, clickHouseTotalRows - previousRows)
        : 0;

      const logCount = clickHouseUsage ? clickHouseDeltaRows : fallbackLogCount;

      const windowSeconds = normalizedWindowMinutes * 60;
      const epsFromWindow = windowSeconds > 0 ? Number((logCount / windowSeconds).toFixed(4)) : 0;
      const epsFromEngine = tenants.length > 0 ? Number((globalEngineEps / tenants.length).toFixed(4)) : 0;
      const epsAvg = clickHouseUsage ? epsFromWindow : (epsFromWindow || epsFromEngine);

      const previous = await this.usageSnapshotRepo.findOne({
        where: { tenantId: tenant.id },
        order: { snapshotAt: 'DESC' },
      });

      const incrementalStorageGb = (logCount * normalizedAvgLogBytes) / (1024 ** 3);
      const storageFromClickHouseGb = clickHouseUsage ? clickHouseUsage.totalBytes / (1024 ** 3) : null;
      const storageUsedGb = Number((storageFromClickHouseGb ?? ((previous?.storageUsedGb ?? 0) + incrementalStorageGb)).toFixed(6));

      if (clickHouseUsage) {
        await this.redis.set(this.getRedisKeyForTenantRows(tenant.id), String(clickHouseUsage.totalRows));
      }

      rows.push(this.usageSnapshotRepo.create({
        tenantId: tenant.id,
        epsAvg,
        storageUsedGb,
        logCount,
        snapshotAt,
      }));
    }

    if (rows.length > 0) {
      await this.usageSnapshotRepo.save(rows);
    }

    return {
      collected: rows.length,
      snapshotAt: snapshotAt.toISOString(),
    };
  }
}
