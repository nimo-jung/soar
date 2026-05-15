export declare enum PlaybookRunStatus {
    RUNNING = "RUNNING",
    COMPLETED = "COMPLETED",
    FAILED = "FAILED"
}
export declare class PlaybookRun {
    id: number;
    playbookId: number;
    alertId: number | null;
    status: PlaybookRunStatus;
    resultSummary: Record<string, unknown> | null;
    startedAt: Date;
    finishedAt: Date | null;
    createdAt: Date;
}
