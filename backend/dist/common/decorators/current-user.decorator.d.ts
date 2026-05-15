export interface CurrentUserPayload {
    sub: number;
    tenantId: string;
    role: string;
    isMaster?: boolean;
}
export declare const CurrentUser: (...dataOrPipes: unknown[]) => ParameterDecorator;
