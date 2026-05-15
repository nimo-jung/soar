import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { MasterUser } from '../admin/master-users/entities/master-user.entity';
import { Tenant } from '../admin/tenants/entities/tenant.entity';
import { TenantSettings } from '../admin/tenants/entities/tenant-settings.entity';
import { TenantConnectionService } from '../common/database/tenant-connection.service';
import { LoginDto } from './dto/login.dto';
import { TenantLoginDto } from './dto/tenant-login.dto';
export declare class AuthService {
    private readonly masterUserRepo;
    private readonly tenantRepo;
    private readonly tenantSettingsRepo;
    private readonly tenantConnectionService;
    private readonly jwtService;
    constructor(masterUserRepo: Repository<MasterUser>, tenantRepo: Repository<Tenant>, tenantSettingsRepo: Repository<TenantSettings>, tenantConnectionService: TenantConnectionService, jwtService: JwtService);
    loginAsMaster(dto: LoginDto): Promise<{
        accessToken: string;
    }>;
    loginAsTenant(dto: TenantLoginDto): Promise<{
        accessToken: string;
        brandingConfig: Record<string, string> | null;
    }>;
}
