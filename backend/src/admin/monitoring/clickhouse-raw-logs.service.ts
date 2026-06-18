import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export type RawLogEvent = {
  occurredAt: string;
  tenantId: number;
  tenantLabel: string;
  severity: string;
  code: string;
  message: string;
};

export type RawLogsQueryResult = {
  items: RawLogEvent[];
  total: number;
};

export type EpsPoint = {
  ts: string;
  value: number;
};

@Injectable()
export class ClickHouseRawLogsService {
  private readonly logger = new Logger(ClickHouseRawLogsService.name);
  private readonly baseUrl: string;
  private readonly auth: string;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('CLICKHOUSE_HOST', 'clickhouse');
    const port = this.configService.get<string>('CLICKHOUSE_HTTP_PORT', '8123');
    const user = this.configService.get<string>('CLICKHOUSE_USER', 'tms');
    const password = this.configService.get<string>('CLICKHOUSE_PASSWORD', '');
    this.baseUrl = `http://${host}:${port}`;
    this.auth = `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`;
  }

  private async query<T>(sql: string): Promise<T[]> {
    try {
      const res = await axios.post<string>(`${this.baseUrl}/?default_format=JSONEachRow`, sql, {
        headers: {
          Authorization: this.auth,
          'Content-Type': 'text/plain',
        },
        timeout: 10000,
        responseType: 'text',
      });

      if (!res.data?.trim()) return [];
      return res.data
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line) as T);
    } catch (err) {
      this.logger.error(`ClickHouse query error: ${(err as Error).message}, SQL: ${sql.substring(0, 200)}`);
      return [];
    }
  }

  /**
   * Discover all tenant databases that have a raw_logs table.
   */
  async discoverTenantDatabases(): Promise<string[]> {
    const rows = await this.query<{ name: string }>(
      `SELECT name FROM system.databases WHERE name LIKE 'db_tenant_%'`,
    );
    return rows.map((r) => r.name);
  }

  /**
   * Build and execute a UNION ALL query across all tenant raw_logs tables.
   * Extracts key fields from raw_json (JSON) inline.
   */
  async getRecentEvents(
    limit: number,
    offset: number,
    filters?: {
      tenantId?: number;
      from?: string;
      to?: string;
      severity?: string;
    },
  ): Promise<RawLogsQueryResult> {
    const databases = await this.discoverTenantDatabases();
    if (!databases.length) return { items: [], total: 0 };

    // Build per-database SELECT using JSONExtract from raw_json
    const selects = databases.map((db) => {
      const tenantId = db.replace('db_tenant_', '');
      return `
        SELECT
          toString(timestamp) AS occurredAt,
          '${tenantId}' AS tenantId,
          JSONExtractString(raw_json, 'source_ip') AS sourceIp,
          JSONExtractString(raw_json, 'vendor') AS vendor,
          JSONExtractString(raw_json, 'device_code') AS deviceCode,
          JSONExtractString(raw_json, 'log_type') AS logType,
          raw_json AS rawJson
        FROM \`${db}\`.raw_logs
      `;
    });

    const unionSql = selects.join('\nUNION ALL\n');

    // Build CTE
    let sql = `
      WITH base AS (
        ${unionSql}
      )
      SELECT
        occurredAt,
        tenantId,
        sourceIp,
        vendor,
        deviceCode,
        logType,
        rawJson
      FROM base
      WHERE 1=1
    `;

    const params: string[] = [];

    if (filters?.tenantId) {
      sql += ` AND tenantId = '${filters.tenantId}'`;
    }
    if (filters?.from) {
      sql += ` AND occurredAt >= '${filters.from}'`;
    }
    if (filters?.to) {
      sql += ` AND occurredAt <= '${filters.to}'`;
    }

    // Count query
    const countSql = `SELECT count() AS cnt FROM (${sql})`;
    const countRows = await this.query<{ cnt: string }>(countSql);
    const total = countRows.length > 0 ? Number(countRows[0].cnt) : 0;

    // Data query
    sql += ` ORDER BY occurredAt DESC LIMIT ${limit} OFFSET ${offset}`;
    const rows = await this.query<{
      occurredAt: string;
      tenantId: string;
      sourceIp: string;
      vendor: string;
      deviceCode: string;
      logType: string;
      rawJson: string;
    }>(sql);

    return {
      items: rows.map((r) => ({
        occurredAt: r.occurredAt,
        tenantId: Number(r.tenantId),
        tenantLabel: `Tenant #${r.tenantId}`,
        severity: this.inferSeverity(r),
        code: r.logType || r.vendor || r.deviceCode || '-',
        message: r.sourceIp
          ? `[${r.vendor || '?'}] ${r.sourceIp}${r.logType ? ` / ${r.logType}` : ''}`
          : `[${r.vendor || '?'}] ${r.deviceCode || '-'}`,
      })),
      total,
    };
  }

  /**
   * Query EPS time series from raw_logs: count events per 5-minute bucket across all tenants.
   * Returns empty array if no ClickHouse tenant databases exist.
   */
  async getEpsSeries(
    from?: string,
    to?: string,
    tenantId?: number,
  ): Promise<EpsPoint[]> {
    const databases = await this.discoverTenantDatabases();
    if (!databases.length) return [];

    const selects = databases.map((db) => {
      return `
        SELECT
          toStartOfFiveMinutes(timestamp) AS bucket,
          count() AS cnt
        FROM \`${db}\`.raw_logs
        GROUP BY bucket
      `;
    });

    const unionSql = selects.join('\nUNION ALL\n');

    let sql = `
      SELECT
        toString(bucket) AS ts,
        sum(cnt) AS value
      FROM (
        ${unionSql}
      ) AS all_buckets
      WHERE 1=1
    `;

    if (from) sql += ` AND bucket >= '${from}'`;
    if (to) sql += ` AND bucket <= '${to}'`;

    sql += ` GROUP BY bucket ORDER BY bucket ASC`;

    const rows = await this.query<{ ts: string; value: string }>(sql);
    return rows.map((r) => ({ ts: r.ts, value: Number(r.value) }));
  }

  private inferSeverity(row: {
    vendor: string;
    deviceCode: string;
    logType: string;
    rawJson: string;
  }): string {
    // Try to extract severity from raw_json
    try {
      const parsed = JSON.parse(row.rawJson) as Record<string, unknown>;
      const sev = String(parsed.severity ?? parsed.event_severity ?? parsed.priority ?? '').toUpperCase();
      if (sev === 'CRIT' || sev === 'CRITICAL' || sev === 'EMERG' || sev === 'ALERT') return 'HIGH';
      if (sev === 'ERR' || sev === 'ERROR' || sev === 'WARNING' || sev === 'WARN') return 'MEDIUM';
      if (sev) return 'LOW';
    } catch {
      // ignore
    }
    // Fallback by log type
    const type = (row.logType ?? '').toLowerCase();
    if (type.includes('threat') || type.includes('attack') || type.includes('malware')) return 'HIGH';
    if (type.includes('alert') || type.includes('anomaly')) return 'MEDIUM';
    return 'LOW';
  }
}