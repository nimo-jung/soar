import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { TenantConnectionService } from '../../common/database/tenant-connection.service';
import { Collector } from './entities/collector.entity';
import { CreateCollectorDto } from './dto/create-collector.dto';
import { TenantContext } from '../../common/context/tenant.context';

@Injectable()
export class CollectorsService {
  constructor(private readonly tenantConn: TenantConnectionService) {}

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
    await repo.update(id, { isActive: false });
  }
}
