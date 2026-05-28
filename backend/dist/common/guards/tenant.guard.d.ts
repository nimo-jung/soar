import { CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { SessionStoreService } from '../session/session-store.service';
import { Tenant } from '../../admin/tenants/entities/tenant.entity';
export declare class TenantGuard implements CanActivate {
    private readonly jwtService;
    private readonly sessionStore;
    private readonly tenantRepo;
    constructor(jwtService: JwtService, sessionStore: SessionStoreService, tenantRepo: Repository<Tenant>);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
