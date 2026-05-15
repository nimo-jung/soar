import { Tenant } from './tenant.entity';
export declare class TenantSettings {
    id: number;
    tenant: Tenant;
    tenantId: number;
    epsLimit: number;
    storageQuotaGb: number;
    retentionDays: number;
    brandingConfig: Record<string, string> | null;
    createdAt: Date;
    updatedAt: Date;
}
