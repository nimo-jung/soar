import { Injectable, Inject, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import http from 'http';
import https from 'https';
import type { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../../common/redis/redis.constants';
import { SystemHealthSnapshot, ServiceStatus } from './entities/system-health-snapshot.entity';
import { SystemAlertEvent, AlertType, AlertSeverity } from './entities/system-alert-event.entity';

const execAsync = promisify(exec);

const THRESHOLDS = {
  CPU_WARN: 80,
  CPU_CRITICAL: 95,
  MEMORY_WARN: 85,
  MEMORY_CRITICAL: 95,
  DISK_WARN: 80,
  DISK_CRITICAL: 90,
} as const;

const ALERT_COOLDOWN_MS = 5 * 60 * 1000; // 재알림 간격 5분

export interface HealthStatus {
  cpuUsagePct: number;
  memoryUsagePct: number;
  diskUsagePct: number;
  dbStatus: ServiceStatus;
  redisStatus: ServiceStatus;
  clickhouseStatus: ServiceStatus;
  goEngineStatus: ServiceStatus;
  checkedAt: Date;
  hasAlert: boolean;
  activeAlerts: SystemAlertEvent[];
}

@Injectable()
export class SystemStatusService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SystemStatusService.name);
  private healthCheckTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    @Inject(REDIS_CLIENT) private readonly redisClient: Redis,
    @InjectRepository(SystemHealthSnapshot)
    private readonly snapshotRepo: Repository<SystemHealthSnapshot>,
    @InjectRepository(SystemAlertEvent)
    private readonly alertRepo: Repository<SystemAlertEvent>,
  ) {}

  onModuleInit(): void {
    // 1분마다 주기적 점검
    this.healthCheckTimer = setInterval(() => {
      void this.runPeriodicCheck();
    }, 60_000);
  }

  onModuleDestroy(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  // ──────────────────────────────────────────────
  // CPU 사용률 측정 (200ms 샘플 delta)
  // ──────────────────────────────────────────────
  private getCpuUsage(): Promise<number> {
    return new Promise((resolve) => {
      const start = os.cpus();
      setTimeout(() => {
        const end = os.cpus();
        let idleDelta = 0;
        let totalDelta = 0;
        for (let i = 0; i < start.length; i++) {
          const s = start[i].times;
          const e = end[i].times;
          const idle = e.idle - s.idle;
          const total =
            (e.user - s.user) +
            (e.nice - s.nice) +
            (e.sys - s.sys) +
            (e.idle - s.idle) +
            ((e.irq ?? 0) - (s.irq ?? 0));
          idleDelta += idle;
          totalDelta += total;
        }
        const usage = totalDelta === 0 ? 0 : Math.round((1 - idleDelta / totalDelta) * 1000) / 10;
        resolve(Math.max(0, Math.min(100, usage)));
      }, 200);
    });
  }

  // ──────────────────────────────────────────────
  // 메모리 사용률
  // ──────────────────────────────────────────────
  private getMemoryUsage(): number {
    const total = os.totalmem();
    const free = os.freemem();
    return Math.round(((total - free) / total) * 1000) / 10;
  }

  // ──────────────────────────────────────────────
  // 디스크 사용률 (/ 기준)
  // ──────────────────────────────────────────────
  private async getDiskUsage(): Promise<number> {
    try {
      const { stdout } = await execAsync("df -P / | awk 'NR==2{print $5}' | tr -d '%'");
      const value = parseFloat(stdout.trim());
      return isNaN(value) ? 0 : value;
    } catch {
      return 0;
    }
  }

  // ──────────────────────────────────────────────
  // 서비스 헬스 체크
  // ──────────────────────────────────────────────
  private async checkDb(): Promise<ServiceStatus> {
    try {
      await this.dataSource.query('SELECT 1');
      return ServiceStatus.ONLINE;
    } catch {
      return ServiceStatus.OFFLINE;
    }
  }

  private async checkRedis(): Promise<ServiceStatus> {
    try {
      const pong = await this.redisClient.ping();
      return pong === 'PONG' ? ServiceStatus.ONLINE : ServiceStatus.OFFLINE;
    } catch {
      return ServiceStatus.OFFLINE;
    }
  }

  private async checkHttp(url: string): Promise<ServiceStatus> {
    return new Promise<ServiceStatus>((resolve) => {
      try {
        const parsed = new URL(url);
        const client = parsed.protocol === 'https:' ? https : http;
        const req = client.request(
          {
            method: 'GET',
            hostname: parsed.hostname,
            port: parsed.port || (parsed.protocol === 'https:' ? '443' : '80'),
            path: `${parsed.pathname}${parsed.search}`,
            timeout: 2000,
          },
          (res) => {
            res.resume();
            resolve(res.statusCode && res.statusCode < 500 ? ServiceStatus.ONLINE : ServiceStatus.OFFLINE);
          },
        );
        req.on('error', () => resolve(ServiceStatus.OFFLINE));
        req.on('timeout', () => {
          req.destroy();
          resolve(ServiceStatus.OFFLINE);
        });
        req.end();
      } catch {
        resolve(ServiceStatus.OFFLINE);
      }
    });
  }

  // ──────────────────────────────────────────────
  // 종합 점검 실행
  // ──────────────────────────────────────────────
  async checkCurrentStatus(): Promise<HealthStatus> {
    const clickhouseUrl = this.configService.get<string>('CLICKHOUSE_HEALTH_URL', 'http://clickhouse:8123/ping');
    const goEngineUrl = this.configService.get<string>('GO_ENGINE_HEALTH_URL', 'http://go-engine:8081/health');

    const [cpuUsagePct, diskUsagePct, dbStatus, redisStatus, clickhouseStatus, goEngineStatus] = await Promise.all([
      this.getCpuUsage(),
      this.getDiskUsage(),
      this.checkDb(),
      this.checkRedis(),
      this.checkHttp(clickhouseUrl),
      this.checkHttp(goEngineUrl),
    ]);

    const memoryUsagePct = this.getMemoryUsage();
    const checkedAt = new Date();

    const activeAlerts = await this.alertRepo.find({
      where: { isResolved: false },
      order: { createdAt: 'DESC' },
    });

    const hasAlert =
      cpuUsagePct >= THRESHOLDS.CPU_WARN ||
      memoryUsagePct >= THRESHOLDS.MEMORY_WARN ||
      diskUsagePct >= THRESHOLDS.DISK_WARN ||
      dbStatus === ServiceStatus.OFFLINE ||
      redisStatus === ServiceStatus.OFFLINE ||
      clickhouseStatus === ServiceStatus.OFFLINE ||
      goEngineStatus === ServiceStatus.OFFLINE;

    return {
      cpuUsagePct,
      memoryUsagePct,
      diskUsagePct,
      dbStatus,
      redisStatus,
      clickhouseStatus,
      goEngineStatus,
      checkedAt,
      hasAlert,
      activeAlerts,
    };
  }

  // ──────────────────────────────────────────────
  // 주기적 점검 + 저장 + 알림
  // ──────────────────────────────────────────────
  async runPeriodicCheck(): Promise<void> {
    try {
      const status = await this.checkCurrentStatus();

      const snapshot = this.snapshotRepo.create({
        cpuUsagePct: status.cpuUsagePct,
        memoryUsagePct: status.memoryUsagePct,
        diskUsagePct: status.diskUsagePct,
        dbStatus: status.dbStatus,
        redisStatus: status.redisStatus,
        clickhouseStatus: status.clickhouseStatus,
        goEngineStatus: status.goEngineStatus,
        hasAlert: status.hasAlert,
      });
      await this.snapshotRepo.save(snapshot);

      await this.processAlerts(status);
    } catch (err: unknown) {
      this.logger.error('주기적 헬스 체크 실패', err instanceof Error ? err.stack : String(err));
    }
  }

  // ──────────────────────────────────────────────
  // 알림 임계치 검사 및 쿨다운 적용 (5분 재알림)
  // ──────────────────────────────────────────────
  private async processAlerts(status: HealthStatus): Promise<void> {
    const checks: Array<{
      condition: boolean;
      type: AlertType;
      severity: AlertSeverity;
      message: string;
      value: number | null;
    }> = [
      {
        condition: status.cpuUsagePct >= THRESHOLDS.CPU_CRITICAL,
        type: AlertType.CPU_HIGH,
        severity: AlertSeverity.CRITICAL,
        message: `CPU 사용률 임계치 초과: ${status.cpuUsagePct.toFixed(1)}% (CRITICAL: ${THRESHOLDS.CPU_CRITICAL}%)`,
        value: status.cpuUsagePct,
      },
      {
        condition: status.cpuUsagePct >= THRESHOLDS.CPU_WARN && status.cpuUsagePct < THRESHOLDS.CPU_CRITICAL,
        type: AlertType.CPU_HIGH,
        severity: AlertSeverity.WARN,
        message: `CPU 사용률 경고: ${status.cpuUsagePct.toFixed(1)}% (WARN: ${THRESHOLDS.CPU_WARN}%)`,
        value: status.cpuUsagePct,
      },
      {
        condition: status.memoryUsagePct >= THRESHOLDS.MEMORY_CRITICAL,
        type: AlertType.MEMORY_HIGH,
        severity: AlertSeverity.CRITICAL,
        message: `메모리 사용률 임계치 초과: ${status.memoryUsagePct.toFixed(1)}%`,
        value: status.memoryUsagePct,
      },
      {
        condition: status.memoryUsagePct >= THRESHOLDS.MEMORY_WARN && status.memoryUsagePct < THRESHOLDS.MEMORY_CRITICAL,
        type: AlertType.MEMORY_HIGH,
        severity: AlertSeverity.WARN,
        message: `메모리 사용률 경고: ${status.memoryUsagePct.toFixed(1)}%`,
        value: status.memoryUsagePct,
      },
      {
        condition: status.diskUsagePct >= THRESHOLDS.DISK_CRITICAL,
        type: AlertType.DISK_HIGH,
        severity: AlertSeverity.CRITICAL,
        message: `디스크 사용률 임계치 초과: ${status.diskUsagePct.toFixed(1)}%`,
        value: status.diskUsagePct,
      },
      {
        condition: status.diskUsagePct >= THRESHOLDS.DISK_WARN && status.diskUsagePct < THRESHOLDS.DISK_CRITICAL,
        type: AlertType.DISK_HIGH,
        severity: AlertSeverity.WARN,
        message: `디스크 사용률 경고: ${status.diskUsagePct.toFixed(1)}%`,
        value: status.diskUsagePct,
      },
      {
        condition: status.dbStatus === ServiceStatus.OFFLINE,
        type: AlertType.DB_DOWN,
        severity: AlertSeverity.CRITICAL,
        message: 'MariaDB 연결 불가',
        value: null,
      },
      {
        condition: status.redisStatus === ServiceStatus.OFFLINE,
        type: AlertType.REDIS_DOWN,
        severity: AlertSeverity.CRITICAL,
        message: 'Redis 연결 불가',
        value: null,
      },
      {
        condition: status.clickhouseStatus === ServiceStatus.OFFLINE,
        type: AlertType.CLICKHOUSE_DOWN,
        severity: AlertSeverity.CRITICAL,
        message: 'ClickHouse 연결 불가',
        value: null,
      },
      {
        condition: status.goEngineStatus === ServiceStatus.OFFLINE,
        type: AlertType.GO_ENGINE_DOWN,
        severity: AlertSeverity.CRITICAL,
        message: 'Go 수집 엔진 연결 불가',
        value: null,
      },
    ];

    for (const check of checks) {
      if (!check.condition) {
        // 조건 해소 시 기존 미해결 알림 자동 해결
        await this.alertRepo.update(
          { alertType: check.type, isResolved: false },
          { isResolved: true, resolvedAt: new Date() },
        );
        continue;
      }

      // 동일 유형 미해결 알림 조회
      const existing = await this.alertRepo.findOne({
        where: { alertType: check.type, isResolved: false },
        order: { createdAt: 'DESC' },
      });

      const now = new Date();
      if (existing) {
        const lastAt = existing.lastAlertedAt ?? existing.createdAt;
        const elapsed = now.getTime() - lastAt.getTime();
        if (elapsed < ALERT_COOLDOWN_MS) {
          // 쿨다운 내: 카운트만 증가
          await this.alertRepo.update(existing.id, { alertCount: existing.alertCount + 1 });
          continue;
        }
        // 쿨다운 초과: lastAlertedAt 갱신
        await this.alertRepo.update(existing.id, {
          alertCount: existing.alertCount + 1,
          lastAlertedAt: now,
          message: check.message,
        });
      } else {
        // 신규 알림 생성
        await this.alertRepo.save(
          this.alertRepo.create({
            alertType: check.type,
            severity: check.severity,
            message: check.message,
            metricValue: check.value,
            alertCount: 1,
            isResolved: false,
            lastAlertedAt: now,
          }),
        );
      }
    }
  }

  // ──────────────────────────────────────────────
  // 조회 API
  // ──────────────────────────────────────────────
  async getHistory(page = 1, limit = 30): Promise<{ items: SystemHealthSnapshot[]; total: number }> {
    const [items, total] = await this.snapshotRepo.findAndCount({
      order: { checkedAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });
    return { items, total };
  }

  async getAlerts(page = 1, limit = 30, onlyActive = false): Promise<{ items: SystemAlertEvent[]; total: number }> {
    const query = this.alertRepo.createQueryBuilder('a').orderBy('a.createdAt', 'DESC');
    if (onlyActive) {
      query.where('a.isResolved = :f', { f: false });
    }
    const [items, total] = await query.skip((page - 1) * limit).take(limit).getManyAndCount();
    return { items, total };
  }

  async resolveAlert(id: number): Promise<void> {
    await this.alertRepo.update(id, { isResolved: true, resolvedAt: new Date() });
  }
}
