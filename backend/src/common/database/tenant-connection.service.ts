import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

/**
 * TenantConnectionService: 테넌트별 독립 DataSource를 관리하는 팩토리
 * - 연결 풀을 재사용하여 매 요청마다 신규 연결을 생성하지 않음
 * - Redis에 커넥션 메타데이터를 캐싱하는 확장 포인트 포함
 */
@Injectable()
export class TenantConnectionService implements OnModuleDestroy {
  private readonly connections = new Map<string, DataSource>();

  constructor(private readonly config: ConfigService) {}

  async getConnection(tenantId: string): Promise<DataSource> {
    const existing = this.connections.get(tenantId);
    if (existing?.isInitialized) {
      return existing;
    }

    const dbName = `tenant_db_${tenantId}`;
    const dataSource = new DataSource({
      type: 'mysql',
      host: this.config.get<string>('DB_HOST', 'localhost'),
      port: this.config.get<number>('DB_PORT', 3306),
      username: this.config.get<string>('DB_USER', 'soar'),
      password: this.config.get<string>('DB_PASSWORD', 'soarpassword'),
      database: dbName,
      entities: [__dirname + '/../../tenant/**/*.entity{.ts,.js}'],
      synchronize: false,
      charset: 'utf8mb4',
      timezone: '+00:00',
      extra: {
        connectionLimit: 5,
      },
    });

    await dataSource.initialize();
    this.connections.set(tenantId, dataSource);
    return dataSource;
  }

  async closeConnection(tenantId: string): Promise<void> {
    const conn = this.connections.get(tenantId);
    if (conn?.isInitialized) {
      await conn.destroy();
      this.connections.delete(tenantId);
    }
  }

  async onModuleDestroy(): Promise<void> {
    const closeAll = Array.from(this.connections.values()).map((ds) =>
      ds.isInitialized ? ds.destroy() : Promise.resolve(),
    );
    await Promise.all(closeAll);
    this.connections.clear();
  }
}
