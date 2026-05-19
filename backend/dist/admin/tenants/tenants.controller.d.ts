import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { CreateTenantTierDto } from './dto/create-tenant-tier.dto';
import { UpdateTenantTierDto } from './dto/update-tenant-tier.dto';
export declare class TenantsController {
    private readonly tenantsService;
    constructor(tenantsService: TenantsService);
    create(dto: CreateTenantDto): Promise<import("./entities/tenant.entity").Tenant>;
    findAll(): Promise<import("./entities/tenant.entity").Tenant[]>;
    getTiers(): Promise<import("./entities/tenant-tier.entity").TenantTier[]>;
    createTier(dto: CreateTenantTierDto): Promise<import("./entities/tenant-tier.entity").TenantTier>;
    updateTier(id: number, dto: UpdateTenantTierDto): Promise<import("./entities/tenant-tier.entity").TenantTier>;
    findOne(id: number): Promise<import("./entities/tenant.entity").Tenant>;
    update(id: number, dto: UpdateTenantDto): Promise<import("./entities/tenant.entity").Tenant>;
    remove(id: number): Promise<void>;
    getSettings(id: number): Promise<import("./entities/tenant-settings.entity").TenantSettings>;
}
