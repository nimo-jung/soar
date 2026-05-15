export declare enum PlaybookStatus {
    DRAFT = "DRAFT",
    ACTIVE = "ACTIVE",
    ARCHIVED = "ARCHIVED"
}
export declare class Playbook {
    id: number;
    name: string;
    description: string;
    definition: Record<string, unknown>;
    status: PlaybookStatus;
    createdBy: number;
    createdAt: Date;
    updatedAt: Date;
}
