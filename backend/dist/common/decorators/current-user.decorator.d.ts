export interface CurrentUserPayload {
    sub: number;
    tenantId?: string;
    role?: string;
    isMaster?: boolean;
    email?: string;
}
export declare const CurrentUser: (...dataOrPipes: unknown[]) => ParameterDecorator;
