import { AsyncLocalStorage } from 'async_hooks';
export interface TenantContextData {
    tenantId: string;
    userId?: number;
    role?: string;
}
export declare const tenantStorage: AsyncLocalStorage<TenantContextData>;
export declare class TenantContext {
    static get(): TenantContextData;
    static getTenantId(): string;
    static run<T>(data: TenantContextData, fn: () => T): T;
    static has(): boolean;
}
