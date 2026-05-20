import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import type Redis from 'ioredis';
import { TenantConnectionService } from '../../common/database/tenant-connection.service';
import { Collector } from './entities/collector.entity';
import { CreateCollectorDto } from './dto/create-collector.dto';
import { TenantContext } from '../../common/context/tenant.context';
import { REDIS_CLIENT } from '../../common/redis/redis.module';

@Injectable()
export class CollectorsService {
  constructor(
    private readonly tenantConn: TenantConnectionService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  private async getRepo(tenantId: string) {
    const conn = await this.tenantConn.getConnection(tenantId);
    return conn.getRepository(Collector);
  }

  /**
   * Collector 생성 및 API Key 발급
   * - plain text key는 응답에 단 1회만 반환, 이후 재조회 불가
   */
  async create(dto: CreateCollectorDto): Promise<Collector & { plainApiKey: string }> {
    const tenantId = TenantContext.getTenantId();
    const repo = await this.getRepo(tenantId);

    const plainApiKey = crypto.randomBytes(32).toString('hex');
    const apiKeyHash = await bcrypt.hash(plainApiKey, 12);

    const collector = repo.create({ ...dto, apiKeyHash });
    const saved = await repo.save(collector);

    try {
      await this.persistApiKeyMapping(tenantId, saved.id, plainApiKey);
    } catch (error) {
      // Redis 매핑 실패 시 미완성 Collector를 남기지 않도록 즉시 롤백한다.
      await repo.remove(saved);
      throw error;
    }

    return { ...saved, plainApiKey };
  }

  async findAll(): Promise<Collector[]> {
    const tenantId = TenantContext.getTenantId();
    const repo = await this.getRepo(tenantId);
    return repo.find({ order: { createdAt: 'DESC' } });
  }

  async deactivate(id: number): Promise<void> {
    const tenantId = TenantContext.getTenantId();
    const repo = await this.getRepo(tenantId);
    const collector = await repo.findOne({ where: { id } });
    if (!collector) {
      throw new NotFoundException(`collector id=${id} not found`);
    }

    await repo.update(id, { isActive: false });
    await this.revokeApiKeyMappings(tenantId, id);
  }

  private authKey(apiKey: string): string {
    return `api_key:${apiKey}`;
  }

  private collectorApiIndexKey(tenantId: string, collectorId: number): string {
    return `tenant:${tenantId}:collector:${collectorId}:api_keys`;
  }

  private async persistApiKeyMapping(tenantId: string, collectorId: number, plainApiKey: string): Promise<void> {
    const pipeline = this.redis.pipeline();
    pipeline.set(this.authKey(plainApiKey), tenantId);
    pipeline.sadd(this.collectorApiIndexKey(tenantId, collectorId), plainApiKey);
    await pipeline.exec();
  }

  private async revokeApiKeyMappings(tenantId: string, collectorId: number): Promise<void> {
    const indexKey = this.collectorApiIndexKey(tenantId, collectorId);
    const apiKeys = await this.redis.smembers(indexKey);
    if (apiKeys.length === 0) {
      await this.redis.del(indexKey);
      return;
    }

    const pipeline = this.redis.pipeline();
    for (const apiKey of apiKeys) {
      pipeline.del(this.authKey(apiKey));
    }
    pipeline.del(indexKey);
    await pipeline.exec();
  }
}
