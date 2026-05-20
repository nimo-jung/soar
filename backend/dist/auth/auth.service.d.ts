import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { MasterUser } from '../admin/master-users/entities/master-user.entity';
import { Tenant } from '../admin/tenants/entities/tenant.entity';
import { TenantSettings } from '../admin/tenants/entities/tenant-settings.entity';
import { TenantConnectionService } from '../common/database/tenant-connection.service';
import { LoginDto } from './dto/login.dto';
import { TenantLoginDto } from './dto/tenant-login.dto';
import { AuditLogService } from '../common/audit/audit-log.service';
import { AuthPolicy } from './auth-policy.constants';
import { MasterAuthSettings } from './entities/master-auth-settings.entity';
import { AuthUserSecurityState } from './entities/auth-user-security-state.entity';
import { BootstrapMasterDto } from './dto/bootstrap-master.dto';
import { ProductInfoService } from '../admin/product-info/product-info.service';
import { SessionStoreService } from '../common/session/session-store.service';
interface AuthAuditContext {
    ipAddress?: string | null;
    userAgent?: string | null;
}
export declare class AuthService {
    private readonly masterUserRepo;
    private readonly tenantRepo;
    private readonly tenantSettingsRepo;
    private readonly masterAuthSettingsRepo;
    private readonly securityStateRepo;
    private readonly tenantConnectionService;
    private readonly jwtService;
    private readonly auditLogService;
    private readonly productInfoService;
    private readonly sessionStore;
    constructor(masterUserRepo: Repository<MasterUser>, tenantRepo: Repository<Tenant>, tenantSettingsRepo: Repository<TenantSettings>, masterAuthSettingsRepo: Repository<MasterAuthSettings>, securityStateRepo: Repository<AuthUserSecurityState>, tenantConnectionService: TenantConnectionService, jwtService: JwtService, auditLogService: AuditLogService, productInfoService: ProductInfoService, sessionStore: SessionStoreService);
    private normalizeLoginId;
    private resolvePolicy;
    private getMasterAuthPolicy;
    private isMultiTenantEnabled;
    private getTenantAuthPolicyByTenantId;
    private getSecurityState;
    private ensureNotLocked;
    private recordFailedAttempt;
    private resetSecurityState;
    private buildSessionIdentity;
    private sessionSetKey;
    private assertConcurrentSessionLimit;
    private sessionExpiresAt;
    private sessionExpiresIn;
    private createSessionAndToken;
    private safeAudit;
    getMasterBootstrapStatus(): Promise<{
        requiresBootstrap: boolean;
    }>;
    bootstrapMaster(dto: BootstrapMasterDto, context: AuthAuditContext): Promise<{
        success: true;
        demoLicenseCreated: boolean;
    }>;
    getPublicLicenseStatus(): Promise<{
        daysRemaining: number | null;
        expiresAt: string | null;
    }>;
    private computeExpiryWarning;
    getPublicTenantExpiryStatus(tenantSlug: string): Promise<{
        daysRemaining: number | null;
        expiresAt: string | null;
    }>;
    loginAsMaster(dto: LoginDto, context: AuthAuditContext): Promise<{
        accessToken: string;
        authSettings: AuthPolicy;
        sessionExpiresAt: string | null;
        licenseWarning: {
            daysRemaining: number;
            expiresAt: string;
        } | null;
    }>;
    loginAsTenant(dto: TenantLoginDto, context: AuthAuditContext): Promise<{
        accessToken: string;
        brandingConfig: Record<string, string> | null;
        authSettings: AuthPolicy;
        sessionExpiresAt: string | null;
        tenantWarning: {
            daysRemaining: number;
            expiresAt: string;
        } | null;
    }>;
    extendSession(authHeader: string | undefined): Promise<{
        accessToken: string;
        sessionExpiresAt: string | null;
        authSettings: AuthPolicy;
    }>;
    logout(authHeader: string | undefined, context: AuthAuditContext): Promise<{
        success: true;
    }>;
    logoutByToken(token: string | undefined, context: AuthAuditContext): Promise<{
        success: true;
    }>;
    private revokeSessionByToken;
}
export {};
