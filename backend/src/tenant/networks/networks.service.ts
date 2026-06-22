import { Injectable } from '@nestjs/common';
import { TenantConnectionService } from '../../common/database/tenant-connection.service';
import { NetworkEntity } from './entities/network.entity';
import { CreateNetworkDto } from './dto/create-network.dto';
import { UpdateNetworkDto } from './dto/update-network.dto';
import { TenantContext } from '../../common/context/tenant.context';

@Injectable()
export class NetworksService {
  constructor(
    private readonly tenantConn: TenantConnectionService
  ) {}
  
  private async getRepo(tenantId: string) {
    const conn = await this.tenantConn.getConnection(tenantId);
    return conn.getRepository(NetworkEntity);
  }
  
  async findAll(): Promise<NetworkEntity[]> {
    const tenantId = TenantContext.getTenantId();    
    const repo = await this.getRepo(tenantId);
    return repo.find();
  }

  async create(dto: CreateNetworkDto) {
    const tenantId = TenantContext.getTenantId();
    const repo = await this.getRepo(tenantId);
    const entity = repo.create(dto);
    return repo.save(entity);
  }

  async update(id: number, dto: UpdateNetworkDto) {
    const tenantId = TenantContext.getTenantId();
    const repo = await this.getRepo(tenantId);
    return repo.update(id, dto);
  }

  async remove(id: number) {
    const tenantId = TenantContext.getTenantId();
    const repo = await this.getRepo(tenantId);
    return repo.delete(id);
  }
}
