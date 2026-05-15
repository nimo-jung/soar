export declare enum AlertSeverity {
    LOW = "LOW",
    MEDIUM = "MEDIUM",
    HIGH = "HIGH",
    CRITICAL = "CRITICAL"
}
export declare enum AlertStatus {
    OPEN = "OPEN",
    IN_PROGRESS = "IN_PROGRESS",
    RESOLVED = "RESOLVED",
    FALSE_POSITIVE = "FALSE_POSITIVE"
}
export declare class Alert {
    id: number;
    title: string;
    description: string;
    severity: AlertSeverity;
    status: AlertStatus;
    ruleId: string;
    sourceIp: string;
    assignedTo: number;
    createdAt: Date;
    updatedAt: Date;
}
