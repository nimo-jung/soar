import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type Redis from 'ioredis';
import { TenantConnectionService } from '../../common/database/tenant-connection.service';
import { TenantContext } from '../../common/context/tenant.context';
import { REDIS_CLIENT } from '../../common/redis/redis.module';
import { ParsingRule } from './entities/parsing-rule.entity';
import { CreateParsingRuleDto } from './dto/create-parsing-rule.dto';
import { UpdateParsingRuleDto } from './dto/update-parsing-rule.dto';

@Injectable()
export class ParsingRulesService {
  constructor(
    private readonly tenantConn: TenantConnectionService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  private async getRepo(tenantId: string) {
    const conn = await this.tenantConn.getConnection(tenantId);
    return conn.getRepository(ParsingRule);
  }

  private redisKey(tenantId: string): string {
    return `tenant:${tenantId}:parsing_rules`;
  }

  async findAll(): Promise<ParsingRule[]> {
    const tenantId = TenantContext.getTenantId();
    const repo = await this.getRepo(tenantId);
    return repo.find({ order: { priority: 'ASC', createdAt: 'DESC' } });
  }

  async create(dto: CreateParsingRuleDto): Promise<ParsingRule> {
    const tenantId = TenantContext.getTenantId();
    const repo = await this.getRepo(tenantId);

    const entity = repo.create({
      name: dto.name,
      ruleDefinition: dto.ruleDefinition,
      logSourceType: dto.logSourceType ?? '',
      isActive: true,
      priority: dto.priority ?? 0,
    });

    const created = await repo.save(entity);
    await this.syncCache(tenantId);
    return created;
  }

  async update(id: number, dto: UpdateParsingRuleDto): Promise<ParsingRule> {
    const tenantId = TenantContext.getTenantId();
    const repo = await this.getRepo(tenantId);

    const rule = await repo.findOne({ where: { id } });
    if (!rule) {
      throw new NotFoundException(`parsing rule id=${id} not found`);
    }

    if (dto.name !== undefined) {
      rule.name = dto.name;
    }
    if (dto.ruleDefinition !== undefined) {
      rule.ruleDefinition = dto.ruleDefinition;
    }
    if (dto.logSourceType !== undefined) {
      rule.logSourceType = dto.logSourceType;
    }
    if (dto.isActive !== undefined) {
      rule.isActive = dto.isActive;
    }
    if (dto.priority !== undefined) {
      rule.priority = dto.priority;
    }

    const updated = await repo.save(rule);
    await this.syncCache(tenantId);
    return updated;
  }

  async deactivate(id: number): Promise<void> {
    const tenantId = TenantContext.getTenantId();
    const repo = await this.getRepo(tenantId);

    const rule = await repo.findOne({ where: { id } });
    if (!rule) {
      throw new NotFoundException(`parsing rule id=${id} not found`);
    }

    await repo.update(id, { isActive: false });
    await this.syncCache(tenantId);
  }

  async syncCache(tenantId?: string): Promise<void> {
    const resolvedTenantId = tenantId ?? TenantContext.getTenantId();
    const repo = await this.getRepo(resolvedTenantId);
    const rules = await repo.find({
      where: { isActive: true },
      order: { priority: 'ASC', createdAt: 'ASC' },
    });

    const payload = rules.map((rule) => ({
      id: rule.id,
      name: rule.name,
      ruleDefinition: rule.ruleDefinition,
      priority: rule.priority,
      isActive: rule.isActive,
      logSourceType: rule.logSourceType,
    }));

    await this.redis.set(this.redisKey(resolvedTenantId), JSON.stringify(payload));
  }
}
