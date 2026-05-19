import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { MasterUser } from '../admin/master-users/entities/master-user.entity';
import { Tenant } from '../admin/tenants/entities/tenant.entity';
import { TenantSettings } from '../admin/tenants/entities/tenant-settings.entity';
import { TenantConnectionService } from '../common/database/tenant-connection.service';
import { LoginDto } from './dto/login.dto';
import { TenantLoginDto } from './dto/tenant-login.dto';
import { AuditLogService } from '../common/audit/audit-log.service';
interface AuthAuditContext {
    ipAddress?: string | null;
    userAgent?: string | null;
}
export declare class AuthService {
    private readonly masterUserRepo;
    private readonly tenantRepo;
    private readonly tenantSettingsRepo;
    private readonly tenantConnectionService;
    private readonly jwtService;
    private readonly auditLogService;
    constructor(masterUserRepo: Repository<MasterUser>, tenantRepo: Repository<Tenant>, tenantSettingsRepo: Repository<TenantSettings>, tenantConnectionService: TenantConnectionService, jwtService: JwtService, auditLogService: AuditLogService);
    private safeAudit;
    loginAsMaster(dto: LoginDto, context: AuthAuditContext): Promise<{
        accessToken: string;
    }>;
    loginAsTenant(dto: TenantLoginDto, context: AuthAuditContext): Promise<{
        accessToken: string;
        brandingConfig: Record<string, string> | null;
    }>;
    logout(authHeader: string | undefined, context: AuthAuditContext): Promise<{
        success: true;
    }>;
}
export {};
