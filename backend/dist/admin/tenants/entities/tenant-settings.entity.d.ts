import { Tenant } from './tenant.entity';
export declare class TenantSettings {
    id: number;
    tenant: Tenant;
    tenantId: number;
    epsLimit: number;
    storageQuotaGb: number;
    retentionDays: number;
    brandingConfig: Record<string, string> | null;
    vectorSourcesConfig: Array<Record<string, unknown>> | null;
    maxLoginFailures: number;
    lockMinutes: number;
    maxConcurrentSessions: number;
    autoLogoutTimeoutMinutes: number;
    createdAt: Date;
    updatedAt: Date;
}
