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
    }>;
    tenantLogin(dto: TenantLoginDto, req: Request): Promise<{
        accessToken: string;
        brandingConfig: Record<string, string> | null;
    }>;
    logout(authorization: string | undefined, req: Request): Promise<{
        success: true;
    }>;
}
