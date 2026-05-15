"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrentTenant = void 0;
const common_1 = require("@nestjs/common");
exports.CurrentTenant = (0, common_1.createParamDecorator)((_data, ctx) => {
    const req = ctx.switchToHttp().getRequest();
    return req.user?.tenantId;
});
//# sourceMappingURL=current-tenant.decorator.js.map