export declare class AlertNotification {
    id: number;
    alertId: number;
    channel: string;
    recipient: string;
    isSuccess: boolean;
    errorMessage: string | null;
    createdAt: Date;
}
