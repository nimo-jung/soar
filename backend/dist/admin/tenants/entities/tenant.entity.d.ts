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
    createdAt: Date;
    updatedAt: Date;
}
