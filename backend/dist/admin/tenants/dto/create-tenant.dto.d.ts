import { TenantTierCode } from '../entities/tenant-tier.entity';
export declare class CreateTenantDto {
    slug: string;
    name: string;
    contactEmail?: string;
    tierCode?: TenantTierCode;
    expiresAt?: string;
    ipCidr?: string;
}
