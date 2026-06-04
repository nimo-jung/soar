import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
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

    const normalizedDeviceCode = this.normalizeDeviceCode(dto.deviceCode ?? dto.name);
    await this.reserveDeviceCode(tenantId, normalizedDeviceCode);

    const plainApiKey = crypto.randomBytes(32).toString('hex');
    const apiKeyHash = await bcrypt.hash(plainApiKey, 12);
    const normalizedSourceIp = dto.sourceIp?.trim() || null;
    let saved: Collector | null = null;

    try {
      const collector = repo.create({
        ...dto,
        deviceCode: normalizedDeviceCode,
        sourceIp: normalizedSourceIp,
        apiKeyHash,
      });
      saved = await repo.save(collector);
      await this.persistApiKeyMapping(tenantId, saved.id, plainApiKey);
      await this.persistRoutingMappings(tenantId, saved.id, normalizedDeviceCode, saved.sourceIp);
      return { ...saved, plainApiKey };
    } catch (error) {
      // Redis 매핑 실패 시 미완성 Collector를 남기지 않도록 즉시 롤백한다.
      if (saved) {
        await repo.remove(saved);
      }
      await this.releaseDeviceCodeOwner(normalizedDeviceCode);
      throw error;
    }
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
    await this.revokeRoutingMappings(tenantId, id, collector.deviceCode, collector.sourceIp);
    await this.releaseDeviceCodeOwner(this.normalizeDeviceCode(collector.deviceCode));
  }

  private authKey(apiKey: string): string {
    return `api_key:${apiKey}`;
  }

  private normalizeDeviceCode(deviceCode: string): string {
    return deviceCode.trim().toUpperCase();
  }

  private deviceCodeOwnerKey(deviceCode: string): string {
    return `device_code_owner:${deviceCode}`;
  }

  private deviceCodeTenantKey(deviceCode: string): string {
    return `device_code:${deviceCode}:tenant`;
  }

  private deviceCodeSourceIpsKey(tenantId: string, collectorId: number, deviceCode: string): string {
    return `tenant:${tenantId}:collector:${collectorId}:device_code:${deviceCode}:source_ips`;
  }

  private sourceIpTenantsKey(sourceIp: string): string {
    return `source_ip:${sourceIp}:tenants`;
  }

  private collectorApiIndexKey(tenantId: string, collectorId: number): string {
    return `tenant:${tenantId}:collector:${collectorId}:api_keys`;
  }

  private async reserveDeviceCode(tenantId: string, deviceCode: string): Promise<void> {
    const key = this.deviceCodeOwnerKey(deviceCode);
    const ok = await this.redis.set(key, tenantId, 'NX');
    if (ok === 'OK') {
      return;
    }

    const currentOwner = await this.redis.get(key);
    if (currentOwner === tenantId) {
      throw new ConflictException(`device_code '${deviceCode}' is already registered in this tenant.`);
    }

    throw new ConflictException(`device_code '${deviceCode}' is already owned by another tenant.`);
  }

  private async releaseDeviceCodeOwner(deviceCode: string): Promise<void> {
    await this.redis.del(this.deviceCodeOwnerKey(deviceCode));
  }

  private async persistApiKeyMapping(tenantId: string, collectorId: number, plainApiKey: string): Promise<void> {
    const pipeline = this.redis.pipeline();
    pipeline.set(this.authKey(plainApiKey), tenantId);
    pipeline.sadd(this.collectorApiIndexKey(tenantId, collectorId), plainApiKey);
    await pipeline.exec();
  }

  private async persistRoutingMappings(
    tenantId: string,
    collectorId: number,
    deviceCode: string,
    sourceIp: string | null,
  ): Promise<void> {
    const pipeline = this.redis.pipeline();
    pipeline.set(this.deviceCodeTenantKey(deviceCode), tenantId);
    if (sourceIp) {
      pipeline.sadd(this.deviceCodeSourceIpsKey(tenantId, collectorId, deviceCode), sourceIp);
      pipeline.sadd(this.sourceIpTenantsKey(sourceIp), tenantId);
    }
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

  private async revokeRoutingMappings(
    tenantId: string,
    collectorId: number,
    deviceCode: string,
    sourceIp: string | null,
  ): Promise<void> {
    const normalizedDeviceCode = this.normalizeDeviceCode(deviceCode);
    const pipeline = this.redis.pipeline();
    pipeline.del(this.deviceCodeTenantKey(normalizedDeviceCode));
    pipeline.del(this.deviceCodeSourceIpsKey(tenantId, collectorId, normalizedDeviceCode));
    if (sourceIp) {
      pipeline.srem(this.sourceIpTenantsKey(sourceIp), tenantId);
    }
    await pipeline.exec();
  }
}
