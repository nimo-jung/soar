import { AsyncLocalStorage } from 'async_hooks';

export interface TenantContextData {
  tenantId: string;
  userId?: number;
  role?: string;
}

export const tenantStorage = new AsyncLocalStorage<TenantContextData>();

export class TenantContext {
  static get(): TenantContextData {
    const store = tenantStorage.getStore();
    if (!store) {
      throw new Error('테넌트 컨텍스트가 설정되지 않았습니다. 요청 컨텍스트 외부에서 호출되었습니다.');
    }
    return store;
  }

  static getTenantId(): string {
    return TenantContext.get().tenantId;
  }

  static run<T>(data: TenantContextData, fn: () => T): T {
    return tenantStorage.run(data, fn) as T;
  }

  static has(): boolean {
    return tenantStorage.getStore() !== undefined;
  }
}
