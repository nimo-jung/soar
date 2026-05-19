import type { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { TenantLoginDto } from './dto/tenant-login.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    private getRequestContext;
    masterLogin(dto: LoginDto, req: Request): Promise<{
        accessToken: string;
        authSettings: import("./auth-policy.constants").AuthPolicy;
        sessionExpiresAt: string | null;
    }>;
    tenantLogin(dto: TenantLoginDto, req: Request): Promise<{
        accessToken: string;
        brandingConfig: Record<string, string> | null;
        authSettings: import("./auth-policy.constants").AuthPolicy;
        sessionExpiresAt: string | null;
    }>;
    logout(authorization: string | undefined, req: Request): Promise<{
        success: true;
    }>;
    extendSession(authorization: string | undefined): Promise<{
        accessToken: string;
        sessionExpiresAt: string | null;
        authSettings: import("./auth-policy.constants").AuthPolicy;
    }>;
}
