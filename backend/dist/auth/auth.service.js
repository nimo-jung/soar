"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bcrypt = __importStar(require("bcrypt"));
const master_user_entity_1 = require("../admin/master-users/entities/master-user.entity");
const tenant_entity_1 = require("../admin/tenants/entities/tenant.entity");
const tenant_settings_entity_1 = require("../admin/tenants/entities/tenant-settings.entity");
const tenant_connection_service_1 = require("../common/database/tenant-connection.service");
const tenant_user_entity_1 = require("../tenant/users/entities/tenant-user.entity");
const audit_log_service_1 = require("../common/audit/audit-log.service");
const audit_log_entity_1 = require("../common/audit/entities/audit-log.entity");
let AuthService = class AuthService {
    masterUserRepo;
    tenantRepo;
    tenantSettingsRepo;
    tenantConnectionService;
    jwtService;
    auditLogService;
    constructor(masterUserRepo, tenantRepo, tenantSettingsRepo, tenantConnectionService, jwtService, auditLogService) {
        this.masterUserRepo = masterUserRepo;
        this.tenantRepo = tenantRepo;
        this.tenantSettingsRepo = tenantSettingsRepo;
        this.tenantConnectionService = tenantConnectionService;
        this.jwtService = jwtService;
        this.auditLogService = auditLogService;
    }
    async safeAudit(payload) {
        try {
            await this.auditLogService.record(payload);
        }
        catch {
        }
    }
    async loginAsMaster(dto, context) {
        const user = await this.masterUserRepo.findOne({
            where: { email: dto.email, isActive: true },
        });
        if (!user) {
            await this.safeAudit({
                actorType: audit_log_entity_1.AuditActorType.MASTER,
                actorEmail: dto.email,
                action: 'MASTER_LOGIN_FAILED',
                resourceType: 'AUTH',
                message: '마스터 로그인 실패: 계정 없음 또는 비활성',
                ipAddress: context.ipAddress ?? null,
                userAgent: context.userAgent ?? null,
            });
            throw new common_1.UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
        }
        const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
        if (!isMatch) {
            await this.safeAudit({
                actorType: audit_log_entity_1.AuditActorType.MASTER,
                actorId: user.id,
                actorEmail: user.email,
                action: 'MASTER_LOGIN_FAILED',
                resourceType: 'AUTH',
                message: '마스터 로그인 실패: 비밀번호 불일치',
                ipAddress: context.ipAddress ?? null,
                userAgent: context.userAgent ?? null,
            });
            throw new common_1.UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
        }
        const payload = { sub: user.id, email: user.email, isMaster: true, role: 'master' };
        await this.safeAudit({
            actorType: audit_log_entity_1.AuditActorType.MASTER,
            actorId: user.id,
            actorEmail: user.email,
            action: 'MASTER_LOGIN',
            resourceType: 'AUTH',
            message: '마스터 로그인 성공',
            ipAddress: context.ipAddress ?? null,
            userAgent: context.userAgent ?? null,
        });
        return { accessToken: this.jwtService.sign(payload) };
    }
    async loginAsTenant(dto, context) {
        const tenant = await this.tenantRepo.findOne({
            where: { slug: dto.tenantSlug, status: 'ACTIVE' },
        });
        if (!tenant) {
            await this.safeAudit({
                actorType: audit_log_entity_1.AuditActorType.TENANT,
                actorEmail: dto.email,
                tenantSlug: dto.tenantSlug,
                action: 'TENANT_LOGIN_FAILED',
                resourceType: 'AUTH',
                message: '테넌트 로그인 실패: 테넌트 없음 또는 비활성',
                ipAddress: context.ipAddress ?? null,
                userAgent: context.userAgent ?? null,
            });
            throw new common_1.UnauthorizedException('테넌트를 찾을 수 없거나 비활성 상태입니다.');
        }
        const conn = await this.tenantConnectionService.getConnection(tenant.slug.replace(/-/g, '_'));
        const tenantUserRepo = conn.getRepository(tenant_user_entity_1.TenantUser);
        const user = await tenantUserRepo.findOne({
            where: { email: dto.email, isActive: true },
        });
        if (!user) {
            await this.safeAudit({
                actorType: audit_log_entity_1.AuditActorType.TENANT,
                actorEmail: dto.email,
                tenantSlug: tenant.slug,
                action: 'TENANT_LOGIN_FAILED',
                resourceType: 'AUTH',
                message: '테넌트 로그인 실패: 사용자 없음 또는 비활성',
                ipAddress: context.ipAddress ?? null,
                userAgent: context.userAgent ?? null,
            });
            throw new common_1.UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
        }
        const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
        if (!isMatch) {
            await this.safeAudit({
                actorType: audit_log_entity_1.AuditActorType.TENANT,
                actorId: user.id,
                actorEmail: user.email,
                tenantSlug: tenant.slug,
                action: 'TENANT_LOGIN_FAILED',
                resourceType: 'AUTH',
                message: '테넌트 로그인 실패: 비밀번호 불일치',
                ipAddress: context.ipAddress ?? null,
                userAgent: context.userAgent ?? null,
            });
            throw new common_1.UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
        }
        const settings = await this.tenantSettingsRepo.findOne({
            where: { tenantId: tenant.id },
        });
        const payload = {
            sub: user.id,
            email: user.email,
            tenantId: tenant.slug.replace(/-/g, '_'),
            role: user.role,
            isMaster: false,
        };
        await this.safeAudit({
            actorType: audit_log_entity_1.AuditActorType.TENANT,
            actorId: user.id,
            actorEmail: user.email,
            tenantSlug: tenant.slug,
            action: 'TENANT_LOGIN',
            resourceType: 'AUTH',
            message: '테넌트 로그인 성공',
            ipAddress: context.ipAddress ?? null,
            userAgent: context.userAgent ?? null,
            metadata: { role: user.role },
        });
        return {
            accessToken: this.jwtService.sign(payload),
            brandingConfig: settings?.brandingConfig ?? null,
        };
    }
    async logout(authHeader, context) {
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
        await this.safeAudit({
            actorType: payload.isMaster ? audit_log_entity_1.AuditActorType.MASTER : audit_log_entity_1.AuditActorType.TENANT,
            actorId: payload.sub,
            actorEmail: payload.email ?? null,
            tenantSlug: payload.tenantId ?? null,
            action: payload.isMaster ? 'MASTER_LOGOUT' : 'TENANT_LOGOUT',
            resourceType: 'AUTH',
            message: payload.isMaster ? '마스터 로그아웃' : '테넌트 로그아웃',
            ipAddress: context.ipAddress ?? null,
            userAgent: context.userAgent ?? null,
            metadata: payload.isMaster ? null : { role: payload.role ?? null },
        });
        return { success: true };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(master_user_entity_1.MasterUser)),
    __param(1, (0, typeorm_1.InjectRepository)(tenant_entity_1.Tenant)),
    __param(2, (0, typeorm_1.InjectRepository)(tenant_settings_entity_1.TenantSettings)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        tenant_connection_service_1.TenantConnectionService,
        jwt_1.JwtService,
        audit_log_service_1.AuditLogService])
], AuthService);
//# sourceMappingURL=auth.service.js.map