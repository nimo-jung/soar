import { Repository, DataSource } from 'typeorm';
import { Tenant } from './entities/tenant.entity';
import { TenantSettings } from './entities/tenant-settings.entity';
import { TenantTier } from './entities/tenant-tier.entity';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { CreateTenantTierDto } from './dto/create-tenant-tier.dto';
import { UpdateTenantTierDto } from './dto/update-tenant-tier.dto';
export declare class TenantsService {
    private readonly tenantRepo;
    private readonly settingsRepo;
    private readonly tierRepo;
    private readonly dataSource;
    constructor(tenantRepo: Repository<Tenant>, settingsRepo: Repository<TenantSettings>, tierRepo: Repository<TenantTier>, dataSource: DataSource);
    private findTierForTenantByCode;
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
}
