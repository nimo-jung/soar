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
import { IssueTenantPasswordResetTokenDto } from './dto/issue-tenant-password-reset-token.dto';
import { TenantConnectionService } from '../../common/database/tenant-connection.service';
import { TenantPasswordResetToken } from './entities/tenant-password-reset-token.entity';
import { BootstrapTokenMailService } from './bootstrap-token-mail.service';
import { MasterAuthSettings } from '../../auth/entities/master-auth-settings.entity';
export interface TierDeletionStatus {
    canDelete: boolean;
    tier: TenantTier;
    usageCount: number;
    reason: string | null;
}
export interface TenantDatabaseStatus {
    tenantId: number;
    tenantSlug: string;
    exists: boolean;
    missingTables: string[];
    isReady: boolean;
}
export declare class TenantsService {
    private readonly tenantRepo;
    private readonly settingsRepo;
    private readonly tierRepo;
    private readonly tenantBootstrapTokenRepo;
    private readonly tenantPasswordResetTokenRepo;
    private readonly masterAuthSettingsRepo;
    private readonly dataSource;
    private readonly tenantConnectionService;
    private readonly bootstrapTokenMailService;
    private readonly logger;
    private readonly requiredTenantTables;
    constructor(tenantRepo: Repository<Tenant>, settingsRepo: Repository<TenantSettings>, tierRepo: Repository<TenantTier>, tenantBootstrapTokenRepo: Repository<TenantBootstrapToken>, tenantPasswordResetTokenRepo: Repository<TenantPasswordResetToken>, masterAuthSettingsRepo: Repository<MasterAuthSettings>, dataSource: DataSource, tenantConnectionService: TenantConnectionService, bootstrapTokenMailService: BootstrapTokenMailService);
    private isMultiTenantEnabled;
    private getTenantUserRepoBySlug;
    private hasAnyActiveTenantUser;
    private findTierForTenantById;
    private findDefaultTierForTenant;
    private isValidIpv4;
    private isValidIpv4OrCidr;
    private normalizeIpCidrList;
    private ensureIpCidrPolicy;
    private normalizeAndValidateIpCidrList;
    private isTenantDbAccessDenied;
    private buildTenantDatabaseName;
    private tenantDatabaseExists;
    private createTenantDatabase;
    private dropTenantDatabase;
    private getMissingTenantTables;
    getTenantDatabaseStatus(tenantId: number): Promise<TenantDatabaseStatus>;
    recoverTenantDatabase(tenantId: number): Promise<TenantDatabaseStatus>;
    resetTenantDatabase(tenantId: number): Promise<TenantDatabaseStatus>;
    create(dto: CreateTenantDto): Promise<Tenant>;
    findAll(): Promise<Tenant[]>;
    findOne(id: number): Promise<Tenant>;
    update(id: number, dto: UpdateTenantDto): Promise<Tenant>;
    softDelete(id: number): Promise<void>;
    getSettings(tenantId: number): Promise<TenantSettings>;
    getBootstrapStatus(tenantId: number): Promise<{
        requiresBootstrap: boolean;
    }>;
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
        registrationUrl: string | null;
        expiresAt: string;
        deliveredToEmail: boolean;
        mailDeliveryError: string | null;
    }>;
    issuePasswordResetToken(tenantId: number, dto: IssueTenantPasswordResetTokenDto, issuedByMasterUserId: number): Promise<{
        tenantId: number;
        tenantSlug: string;
        email: string;
        token: string;
        expiresAt: string;
        deliveredToEmail: boolean;
        mailDeliveryError: string | null;
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
