import { Repository, DataSource } from 'typeorm';
import { Tenant } from './entities/tenant.entity';
import { TenantSettings } from './entities/tenant-settings.entity';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
export declare class TenantsService {
    private readonly tenantRepo;
    private readonly settingsRepo;
    private readonly dataSource;
    constructor(tenantRepo: Repository<Tenant>, settingsRepo: Repository<TenantSettings>, dataSource: DataSource);
    create(dto: CreateTenantDto): Promise<Tenant>;
    findAll(): Promise<Tenant[]>;
    findOne(id: number): Promise<Tenant>;
    update(id: number, dto: UpdateTenantDto): Promise<Tenant>;
    softDelete(id: number): Promise<void>;
    getSettings(tenantId: number): Promise<TenantSettings>;
    updateSettings(tenantId: number, updates: Partial<TenantSettings>): Promise<TenantSettings>;
}
