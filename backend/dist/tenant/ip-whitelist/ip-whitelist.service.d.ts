import { TenantConnectionService } from '../../common/database/tenant-connection.service';
import { IpWhitelist } from './entities/ip-whitelist.entity';
export declare class IpWhitelistService {
    private readonly tenantConn;
    constructor(tenantConn: TenantConnectionService);
    private getRepo;
    findAll(): Promise<IpWhitelist[]>;
    create(ipAddress: string, description?: string): Promise<IpWhitelist>;
    remove(id: number): Promise<void>;
}
