export interface CurrentUserPayload {
    sub: number;
    tenantId?: string;
    tenantSlug?: string;
    role?: string;
    isMaster?: boolean;
    email?: string;
}
export declare const CurrentUser: (...dataOrPipes: unknown[]) => ParameterDecorator;
