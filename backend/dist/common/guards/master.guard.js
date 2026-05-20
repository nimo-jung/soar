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
exports.MasterGuard = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const session_store_service_1 = require("../session/session-store.service");
let MasterGuard = class MasterGuard {
    jwtService;
    sessionStore;
    constructor(jwtService, sessionStore) {
        this.jwtService = jwtService;
        this.sessionStore = sessionStore;
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
        catch (err) {
            throw new common_1.UnauthorizedException('유효하지 않은 토큰입니다.');
        }
        if (!payload.isMaster) {
            throw new common_1.ForbiddenException('마스터 관리자 권한이 필요합니다.');
        }
        if (!payload.jti) {
            throw new common_1.UnauthorizedException('세션 정보가 없는 토큰입니다.');
        }
        const sessionValid = await this.sessionStore.exists(payload.jti);
        if (!sessionValid) {
            throw new common_1.UnauthorizedException('세션이 만료되었거나 유효하지 않습니다.');
        }
        req.user = {
            ...payload,
            email: payload.email ?? null,
        };
        return true;
    }
};
exports.MasterGuard = MasterGuard;
exports.MasterGuard = MasterGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        session_store_service_1.SessionStoreService])
], MasterGuard);
//# sourceMappingURL=master.guard.js.map