"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantContext = exports.tenantStorage = void 0;
const async_hooks_1 = require("async_hooks");
exports.tenantStorage = new async_hooks_1.AsyncLocalStorage();
class TenantContext {
    static get() {
        const store = exports.tenantStorage.getStore();
        if (!store) {
            throw new Error('테넌트 컨텍스트가 설정되지 않았습니다. 요청 컨텍스트 외부에서 호출되었습니다.');
        }
        return store;
    }
    static getTenantId() {
        return TenantContext.get().tenantId;
    }
    static run(data, fn) {
        return exports.tenantStorage.run(data, fn);
    }
    static has() {
        return exports.tenantStorage.getStore() !== undefined;
    }
}
exports.TenantContext = TenantContext;
//# sourceMappingURL=tenant.context.js.map