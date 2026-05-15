import { Injectable } from '@nestjs/common';
import { TenantConnectionService } from '../../common/database/tenant-connection.service';
import { IpWhitelist } from './entities/ip-whitelist.entity';
import { TenantContext } from '../../common/context/tenant.context';

@Injectable()
export class IpWhitelistService {
  constructor(private readonly tenantConn: TenantConnectionService) {}

  private async getRepo(tenantId: string) {
    const conn = await this.tenantConn.getConnection(tenantId);
    return conn.getRepository(IpWhitelist);
  }

  async findAll(): Promise<IpWhitelist[]> {
    const tenantId = TenantContext.getTenantId();
    const repo = await this.getRepo(tenantId);
    return repo.find({ where: { isActive: true }, order: { createdAt: 'DESC' } });
  }

  async create(ipAddress: string, description?: string): Promise<IpWhitelist> {
    const tenantId = TenantContext.getTenantId();
    const repo = await this.getRepo(tenantId);
    const entry = repo.create({ ipAddress, description });
    return repo.save(entry);
  }

  async remove(id: number): Promise<void> {
    const tenantId = TenantContext.getTenantId();
    const repo = await this.getRepo(tenantId);
    await repo.update(id, { isActive: false });
  }
}
