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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantGuard = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const tenant_context_1 = require("../context/tenant.context");
const session_store_service_1 = require("../session/session-store.service");
const tenant_entity_1 = require("../../admin/tenants/entities/tenant.entity");
let TenantGuard = class TenantGuard {
    jwtService;
    sessionStore;
    tenantRepo;
    constructor(jwtService, sessionStore, tenantRepo) {
        this.jwtService = jwtService;
        this.sessionStore = sessionStore;
        this.tenantRepo = tenantRepo;
    }
    async canActivate(context) {
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
        if (!payload.jti) {
            throw new common_1.UnauthorizedException('세션 정보가 없는 토큰입니다.');
        }
        const sessionValid = await this.sessionStore.exists(payload.jti);
        if (!sessionValid) {
            throw new common_1.UnauthorizedException('세션이 만료되었거나 유효하지 않습니다.');
        }
        if (payload.tenantExpiresAt) {
            const expiresAt = new Date(payload.tenantExpiresAt);
            if (!Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() <= Date.now()) {
                throw new common_1.UnauthorizedException('테넌트 사용기한이 만료되었습니다. 관리자에게 문의하세요.');
            }
        }
        if (payload.tenantSlug) {
            const tenant = await this.tenantRepo.findOne({
                where: { slug: payload.tenantSlug, status: 'ACTIVE' },
            });
            if (!tenant) {
                throw new common_1.UnauthorizedException('유효한 테넌트를 찾을 수 없습니다.');
            }
            if (tenant.expiresAt && tenant.expiresAt.getTime() <= Date.now()) {
                throw new common_1.UnauthorizedException('테넌트 사용기한이 만료되었습니다. 관리자에게 문의하세요.');
            }
        }
        req.user = payload;
        tenant_context_1.tenantStorage.enterWith({ tenantId: payload.tenantId, userId: payload.sub, role: payload.role });
        return true;
    }
};
exports.TenantGuard = TenantGuard;
exports.TenantGuard = TenantGuard = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, typeorm_1.InjectRepository)(tenant_entity_1.Tenant)),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        session_store_service_1.SessionStoreService,
        typeorm_2.Repository])
], TenantGuard);
//# sourceMappingURL=tenant.guard.js.map