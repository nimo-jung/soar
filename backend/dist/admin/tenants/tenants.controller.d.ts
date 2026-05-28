import type { Request } from 'express';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { CreateTenantTierDto } from './dto/create-tenant-tier.dto';
import { UpdateTenantTierDto } from './dto/update-tenant-tier.dto';
import { IssueTenantBootstrapTokenDto } from './dto/issue-tenant-bootstrap-token.dto';
import { IssueTenantPasswordResetTokenDto } from './dto/issue-tenant-password-reset-token.dto';
import { GetTenantBootstrapTokensQueryDto } from './dto/get-tenant-bootstrap-tokens-query.dto';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { AuditLogService } from '../../common/audit/audit-log.service';
export declare class TenantsController {
    private readonly tenantsService;
    private readonly auditLogService;
    constructor(tenantsService: TenantsService, auditLogService: AuditLogService);
    private buildAuditContext;
    private safe;
    create(dto: CreateTenantDto, user: CurrentUserPayload, req: Request): Promise<import("./entities/tenant.entity").Tenant>;
    findAll(): Promise<import("./entities/tenant.entity").Tenant[]>;
    getTiers(): Promise<import("./entities/tenant-tier.entity").TenantTier[]>;
    createTier(dto: CreateTenantTierDto, user: CurrentUserPayload, req: Request): Promise<import("./entities/tenant-tier.entity").TenantTier>;
    updateTier(id: number, dto: UpdateTenantTierDto, user: CurrentUserPayload, req: Request): Promise<import("./entities/tenant-tier.entity").TenantTier>;
    checkTierDeletion(id: number): Promise<import("./tenants.service").TierDeletionStatus>;
    removeTier(id: number, user: CurrentUserPayload, req: Request): Promise<void>;
    findOne(id: number): Promise<import("./entities/tenant.entity").Tenant>;
    update(id: number, dto: UpdateTenantDto, user: CurrentUserPayload, req: Request): Promise<import("./entities/tenant.entity").Tenant>;
    remove(id: number, user: CurrentUserPayload, req: Request): Promise<void>;
    getSettings(id: number): Promise<import("./entities/tenant-settings.entity").TenantSettings>;
    issueBootstrapToken(id: number, dto: IssueTenantBootstrapTokenDto, user: CurrentUserPayload, req: Request): Promise<{
        tenantId: number;
        tenantSlug: string;
        email: string | null;
        token: string;
        expiresAt: string;
        deliveredToEmail: boolean;
        mailDeliveryError: string | null;
    }>;
    getBootstrapTokenHistory(id: number, query: GetTenantBootstrapTokensQueryDto): Promise<{
        items: Array<{
            id: number;
            email: string | null;
            expiresAt: string;
            usedAt: string | null;
            issuedByMasterUserId: number | null;
            createdAt: string;
        }>;
        page: number;
        limit: number;
        total: number;
    }>;
    issuePasswordResetToken(id: number, dto: IssueTenantPasswordResetTokenDto, user: CurrentUserPayload, req: Request): Promise<{
        tenantId: number;
        tenantSlug: string;
        email: string;
        token: string;
        expiresAt: string;
        deliveredToEmail: boolean;
        mailDeliveryError: string | null;
    }>;
}
