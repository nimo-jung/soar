import { Repository, DataSource } from 'typeorm';
import { Tenant } from './entities/tenant.entity';
import { TenantSettings } from './entities/tenant-settings.entity';
import { TenantTier } from './entities/tenant-tier.entity';
import { TenantBootstrapToken } from './entities/tenant-bootstrap-token.entity';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { CreateTenantTierDto } from './dto/create-tenant-tier.dto';
import { UpdateTenantTierDto } from './dto/update-tenant-tier.dto';
import { IssueTenantBootstrapTokenDto } from './dto/issue-tenant-bootstrap-token.dto';
import { GetTenantBootstrapTokensQueryDto } from './dto/get-tenant-bootstrap-tokens-query.dto';
export interface TierDeletionStatus {
    canDelete: boolean;
    tier: TenantTier;
    usageCount: number;
    reason: string | null;
}
export declare class TenantsService {
    private readonly tenantRepo;
    private readonly settingsRepo;
    private readonly tierRepo;
    private readonly tenantBootstrapTokenRepo;
    private readonly dataSource;
    constructor(tenantRepo: Repository<Tenant>, settingsRepo: Repository<TenantSettings>, tierRepo: Repository<TenantTier>, tenantBootstrapTokenRepo: Repository<TenantBootstrapToken>, dataSource: DataSource);
    private findTierForTenantById;
    private findDefaultTierForTenant;
    private isValidIpv4;
    private isValidIpv4OrCidr;
    private normalizeIpCidrList;
    create(dto: CreateTenantDto): Promise<Tenant>;
    findAll(): Promise<Tenant[]>;
    findOne(id: number): Promise<Tenant>;
    update(id: number, dto: UpdateTenantDto): Promise<Tenant>;
    softDelete(id: number): Promise<void>;
    getSettings(tenantId: number): Promise<TenantSettings>;
    updateSettings(tenantId: number, updates: Partial<TenantSettings>): Promise<TenantSettings>;
    getTiers(): Promise<TenantTier[]>;
    private validateTierDuplicateRules;
    createTier(dto: CreateTenantTierDto): Promise<TenantTier>;
    updateTier(id: number, dto: UpdateTenantTierDto): Promise<TenantTier>;
    getTierDeletionStatus(id: number): Promise<TierDeletionStatus>;
    deleteTier(id: number): Promise<TenantTier>;
    issueBootstrapToken(tenantId: number, dto: IssueTenantBootstrapTokenDto, issuedByMasterUserId: number): Promise<{
        tenantId: number;
        tenantSlug: string;
        email: string | null;
        token: string;
        expiresAt: string;
    }>;
    getBootstrapTokenHistory(tenantId: number, query: GetTenantBootstrapTokensQueryDto): Promise<{
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
}
