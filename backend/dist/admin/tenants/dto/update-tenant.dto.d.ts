import { TenantStatus } from '../entities/tenant.entity';
import { TenantTierCode } from '../entities/tenant-tier.entity';
export declare class UpdateTenantDto {
    name?: string;
    status?: TenantStatus;
    contactEmail?: string;
    tierCode?: TenantTierCode;
    expiresAt?: string;
    ipCidr?: string;
}
