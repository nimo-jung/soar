import type { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { TenantLoginDto } from './dto/tenant-login.dto';
import { BootstrapMasterDto } from './dto/bootstrap-master.dto';
import { BootstrapTenantDto } from './dto/bootstrap-tenant.dto';
import { ResetTenantPasswordDto } from './dto/reset-tenant-password.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    private getRequestContext;
    getLicenseStatus(): Promise<{
        daysRemaining: number | null;
        expiresAt: string | null;
    }>;
    getTenantExpiryStatus(tenantSlug: string | undefined): Promise<{
        daysRemaining: number | null;
        expiresAt: string | null;
    }>;
    getMasterLockStatus(email: string | undefined): Promise<{
        locked: boolean;
        lockedUntil: string | null;
    }>;
    getTenantLockStatus(tenantSlug: string | undefined, email: string | undefined): Promise<{
        locked: boolean;
        lockedUntil: string | null;
    }>;
    getMultiTenantStatus(): Promise<{
        isMultiTenantEnabled: boolean;
    }>;
    masterLogin(dto: LoginDto, req: Request): Promise<{
        accessToken: string;
        authSettings: import("./auth-policy.constants").AuthPolicy;
        sessionExpiresAt: string | null;
        licenseWarning: {
            daysRemaining: number;
            expiresAt: string;
        } | null;
    }>;
    masterBootstrap(dto: BootstrapMasterDto, req: Request): Promise<{
        success: true;
        demoLicenseCreated: boolean;
    }>;
    masterBootstrapStatus(): Promise<{
        requiresBootstrap: boolean;
    }>;
    tenantLogin(dto: TenantLoginDto, req: Request): Promise<{
        accessToken: string;
        brandingConfig: Record<string, string> | null;
        authSettings: import("./auth-policy.constants").AuthPolicy;
        sessionExpiresAt: string | null;
        tenantWarning: {
            daysRemaining: number;
            expiresAt: string;
        } | null;
    }>;
    tenantBootstrapStatus(tenantSlug: string | undefined): Promise<{
        requiresBootstrap: boolean;
    }>;
    tenantBootstrap(dto: BootstrapTenantDto, req: Request): Promise<{
        success: true;
        tenantSlug: string;
        email: string;
    }>;
    resetTenantPassword(dto: ResetTenantPasswordDto, req: Request): Promise<{
        success: true;
        tenantSlug: string;
        email: string;
    }>;
    logout(authorization: string | undefined, req: Request): Promise<{
        success: true;
    }>;
    beaconLogout(token: string | undefined, req: Request): Promise<{
        success: true;
    }>;
    extendSession(authorization: string | undefined): Promise<{
        accessToken: string;
        sessionExpiresAt: string | null;
        authSettings: import("./auth-policy.constants").AuthPolicy;
    }>;
    validateSession(authorization: string | undefined): Promise<{
        valid: true;
    }>;
}
