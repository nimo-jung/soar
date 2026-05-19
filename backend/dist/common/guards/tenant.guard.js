"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantGuard = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const typeorm_1 = require("typeorm");
const tenant_context_1 = require("../context/tenant.context");
const auth_session_entity_1 = require("../../auth/entities/auth-session.entity");
const auth_policy_constants_1 = require("../../auth/auth-policy.constants");
let TenantGuard = class TenantGuard {
    jwtService;
    dataSource;
    constructor(jwtService, dataSource) {
        this.jwtService = jwtService;
        this.dataSource = dataSource;
    }
    async assertActiveSession(payload) {
        if (!payload.jti) {
            throw new common_1.UnauthorizedException('세션 정보가 없는 토큰입니다.');
        }
        if (!payload.tenantSlug) {
            throw new common_1.UnauthorizedException('테넌트 세션 정보가 올바르지 않습니다.');
        }
        const sessionRepo = this.dataSource.getRepository(auth_session_entity_1.AuthSession);
        const session = await sessionRepo
            .createQueryBuilder('session')
            .where('session.jti = :jti', { jti: payload.jti })
            .andWhere('session.scope = :scope', { scope: auth_policy_constants_1.AuthScope.TENANT })
            .andWhere('session.account_id = :accountId', { accountId: String(payload.sub) })
            .andWhere('session.tenant_slug = :tenantSlug', { tenantSlug: payload.tenantSlug })
            .andWhere('session.is_revoked = :isRevoked', { isRevoked: false })
            .getOne();
        if (!session) {
            throw new common_1.UnauthorizedException('세션이 만료되었거나 유효하지 않습니다.');
        }
        if (session.expiresAt && session.expiresAt.getTime() <= Date.now()) {
            await sessionRepo
                .createQueryBuilder()
                .update(auth_session_entity_1.AuthSession)
                .set({ isRevoked: true })
                .where('id = :id', { id: session.id })
                .execute();
            throw new common_1.UnauthorizedException('세션이 만료되었습니다. 다시 로그인해 주세요.');
        }
    }
    canActivate(context) {
        const req = context.switchToHttp().getRequest();
        const authHeader = req.headers['authorization'];
        if (!authHeader?.startsWith('Bearer ')) {
            throw new common_1.UnauthorizedException('인증 토큰이 필요합니다.');
        }
        const token = authHeader.slice(7);
        let payload;
        try {
            payload = this.jwtService.verify(token);
        }
        catch {
            throw new common_1.UnauthorizedException('유효하지 않은 토큰입니다.');
        }
        return this.assertActiveSession(payload).then(() => new Promise((resolve) => {
            req.user = payload;
            tenant_context_1.tenantStorage.run({ tenantId: payload.tenantId, userId: payload.sub, role: payload.role }, () => resolve(true));
        }));
    }
};
exports.TenantGuard = TenantGuard;
exports.TenantGuard = TenantGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        typeorm_1.DataSource])
], TenantGuard);
//# sourceMappingURL=tenant.guard.js.map