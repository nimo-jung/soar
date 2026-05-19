import { TenantTier, TenantTierCode } from './tenant-tier.entity';
export declare enum TenantStatus {
    ACTIVE = "ACTIVE",
    SUSPENDED = "SUSPENDED",
    DELETED = "DELETED"
}
export declare class Tenant {
    id: number;
    slug: string;
    name: string;
    status: TenantStatus;
    contactEmail: string;
    expiresAt: Date | null;
    ipCidr: string | null;
    tier: TenantTier;
    tierCode: TenantTierCode;
    createdAt: Date;
    updatedAt: Date;
}
