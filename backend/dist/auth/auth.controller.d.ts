import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { TenantLoginDto } from './dto/tenant-login.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    masterLogin(dto: LoginDto): Promise<{
        accessToken: string;
    }>;
    tenantLogin(dto: TenantLoginDto): Promise<{
        accessToken: string;
        brandingConfig: Record<string, string> | null;
    }>;
}
