export declare enum MasterUserStatus {
    ACTIVE = "ACTIVE",
    DELETED = "DELETED"
}
export declare class MasterUser {
    id: number;
    email: string;
    passwordHash: string;
    status: MasterUserStatus;
    isActive: boolean;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
