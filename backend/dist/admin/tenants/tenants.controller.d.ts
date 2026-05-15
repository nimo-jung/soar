import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
export declare class TenantsController {
    private readonly tenantsService;
    constructor(tenantsService: TenantsService);
    create(dto: CreateTenantDto): Promise<import("./entities/tenant.entity").Tenant>;
    findAll(): Promise<import("./entities/tenant.entity").Tenant[]>;
    findOne(id: number): Promise<import("./entities/tenant.entity").Tenant>;
    update(id: number, dto: UpdateTenantDto): Promise<import("./entities/tenant.entity").Tenant>;
    remove(id: number): Promise<void>;
    getSettings(id: number): Promise<import("./entities/tenant-settings.entity").TenantSettings>;
}
