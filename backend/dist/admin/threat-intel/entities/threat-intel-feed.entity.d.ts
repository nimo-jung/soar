export declare enum TiDispatchStatus {
    PENDING = "PENDING",
    DISPATCHED = "DISPATCHED",
    FAILED = "FAILED"
}
export declare class ThreatIntelFeed {
    id: number;
    feedType: string;
    indicator: string;
    severity: string;
    description: string;
    source: string;
    isActive: boolean;
    dispatchStatus: TiDispatchStatus;
    dispatchedAt: Date | null;
    dispatchError: string | null;
    dispatchAttempts: number;
    expiresAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
