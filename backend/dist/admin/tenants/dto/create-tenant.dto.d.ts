export declare class CreateTenantDto {
    slug: string;
    name: string;
    contactEmail?: string;
    tierId?: number;
    epsLimit?: number;
    storageQuotaGb?: number;
    retentionDays?: number;
    expiresAt?: string | null;
    ipCidr: string;
}
