import { TenantRole } from '../../../common/guards/roles.guard';
export declare class TenantUser {
    id: number;
    email: string;
    passwordHash: string;
    displayName: string;
    role: TenantRole;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
