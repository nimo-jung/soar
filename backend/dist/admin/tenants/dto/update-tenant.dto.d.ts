import { TenantStatus } from '../entities/tenant.entity';
export declare class UpdateTenantDto {
    name?: string;
    status?: TenantStatus;
    contactEmail?: string;
    tierId?: number;
    epsLimit?: number;
    storageQuotaGb?: number;
    retentionDays?: number;
    expiresAt?: string;
    ipCidr?: string;
}
