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
const crypto_1 = require("crypto");
const bcrypt = __importStar(require("bcrypt"));
const master_user_entity_1 = require("../admin/master-users/entities/master-user.entity");
const tenant_entity_1 = require("../admin/tenants/entities/tenant.entity");
const tenant_settings_entity_1 = require("../admin/tenants/entities/tenant-settings.entity");
const tenant_connection_service_1 = require("../common/database/tenant-connection.service");
const tenant_user_entity_1 = require("../tenant/users/entities/tenant-user.entity");
const audit_log_service_1 = require("../common/audit/audit-log.service");
const audit_log_entity_1 = require("../common/audit/entities/audit-log.entity");
const auth_policy_constants_1 = require("./auth-policy.constants");
const master_auth_settings_entity_1 = require("./entities/master-auth-settings.entity");
const auth_user_security_state_entity_1 = require("./entities/auth-user-security-state.entity");
const auth_session_entity_1 = require("./entities/auth-session.entity");
let AuthService = class AuthService {
    masterUserRepo;
    tenantRepo;
    tenantSettingsRepo;
    masterAuthSettingsRepo;
    securityStateRepo;
    sessionRepo;
    tenantConnectionService;
    jwtService;
    auditLogService;
    constructor(masterUserRepo, tenantRepo, tenantSettingsRepo, masterAuthSettingsRepo, securityStateRepo, sessionRepo, tenantConnectionService, jwtService, auditLogService) {
        this.masterUserRepo = masterUserRepo;
        this.tenantRepo = tenantRepo;
        this.tenantSettingsRepo = tenantSettingsRepo;
        this.masterAuthSettingsRepo = masterAuthSettingsRepo;
        this.securityStateRepo = securityStateRepo;
        this.sessionRepo = sessionRepo;
        this.tenantConnectionService = tenantConnectionService;
        this.jwtService = jwtService;
        this.auditLogService = auditLogService;
    }
    normalizeLoginId(email) {
        return email.trim().toLowerCase();
    }
    resolvePolicy(raw) {
        return {
            maxLoginFailures: raw?.maxLoginFailures ?? auth_policy_constants_1.DEFAULT_AUTH_POLICY.maxLoginFailures,
            lockMinutes: raw?.lockMinutes ?? auth_policy_constants_1.DEFAULT_AUTH_POLICY.lockMinutes,
            maxConcurrentSessions: raw?.maxConcurrentSessions ?? auth_policy_constants_1.DEFAULT_AUTH_POLICY.maxConcurrentSessions,
            autoLogoutTimeoutMinutes: raw?.autoLogoutTimeoutMinutes ?? auth_policy_constants_1.DEFAULT_AUTH_POLICY.autoLogoutTimeoutMinutes,
        };
    }
    async getMasterAuthPolicy() {
        let settings = await this.masterAuthSettingsRepo.findOne({ where: { id: 1 } });
        if (!settings) {
            settings = await this.masterAuthSettingsRepo.save(this.masterAuthSettingsRepo.create({ id: 1, ...auth_policy_constants_1.DEFAULT_AUTH_POLICY }));
        }
        return this.resolvePolicy(settings);
    }
    async getTenantAuthPolicyByTenantId(tenantId) {
        const settings = await this.tenantSettingsRepo.findOne({ where: { tenantId } });
        return this.resolvePolicy(settings ?? null);
    }
    async getSecurityState(scope, tenantSlug, loginId) {
        let state = await this.securityStateRepo.findOne({
            where: tenantSlug
                ? {
                    scope,
                    tenantSlug,
                    loginId,
                }
                : {
                    scope,
                    tenantSlug: (0, typeorm_2.IsNull)(),
                    loginId,
                },
        });
        if (!state) {
            state = await this.securityStateRepo.save(this.securityStateRepo.create({
                scope,
                tenantSlug,
                loginId,
                failedAttempts: 0,
                lockUntil: null,
            }));
        }
        return state;
    }
    ensureNotLocked(state) {
        const now = Date.now();
        if (state.lockUntil && state.lockUntil.getTime() > now) {
            throw new common_1.UnauthorizedException('로그인 실패 횟수를 초과하여 계정이 잠금 상태입니다. 잠시 후 다시 시도해 주세요.');
        }
    }
    async recordFailedAttempt(state, policy) {
        const nextFailureCount = state.failedAttempts + 1;
        if (nextFailureCount >= policy.maxLoginFailures) {
            state.failedAttempts = 0;
            state.lockUntil = new Date(Date.now() + policy.lockMinutes * 60_000);
        }
        else {
            state.failedAttempts = nextFailureCount;
            state.lockUntil = null;
        }
        await this.securityStateRepo.save(state);
    }
    async resetSecurityState(state) {
        if (state.failedAttempts === 0 && !state.lockUntil) {
            return;
        }
        state.failedAttempts = 0;
        state.lockUntil = null;
        await this.securityStateRepo.save(state);
    }
    buildSessionIdentity(payload) {
        if (payload.isMaster) {
            return {
                scope: auth_policy_constants_1.AuthScope.MASTER,
                tenantSlug: null,
                accountId: String(payload.sub),
            };
        }
        return {
            scope: auth_policy_constants_1.AuthScope.TENANT,
            tenantSlug: payload.tenantSlug ?? null,
            accountId: String(payload.sub),
        };
    }
    async assertConcurrentSessionLimit(identity, policy) {
        const now = new Date();
        const qb = this.sessionRepo
            .createQueryBuilder('session')
            .where('session.scope = :scope', { scope: identity.scope })
            .andWhere('session.account_id = :accountId', { accountId: identity.accountId })
            .andWhere('session.is_revoked = :isRevoked', { isRevoked: false })
            .andWhere('(session.expires_at IS NULL OR session.expires_at > :now)', { now });
        if (identity.tenantSlug) {
            qb.andWhere('session.tenant_slug = :tenantSlug', { tenantSlug: identity.tenantSlug });
        }
        else {
            qb.andWhere('session.tenant_slug IS NULL');
        }
        const activeCount = await qb.getCount();
        if (activeCount >= policy.maxConcurrentSessions) {
            throw new common_1.UnauthorizedException('계정당 동시 로그인 가능 세션 수를 초과했습니다. 기존 세션 종료 후 다시 시도해 주세요.');
        }
    }
    sessionExpiresAt(policy) {
        if (policy.autoLogoutTimeoutMinutes === 0) {
            return null;
        }
        return new Date(Date.now() + policy.autoLogoutTimeoutMinutes * 60_000);
    }
    sessionExpiresIn(policy) {
        if (policy.autoLogoutTimeoutMinutes === 0) {
            return auth_policy_constants_1.LONG_LIVED_SESSION_DAYS * 24 * 60 * 60;
        }
        return policy.autoLogoutTimeoutMinutes * 60;
    }
    async createSessionAndToken(payload, policy) {
        const jti = (0, crypto_1.randomUUID)().replace(/-/g, '');
        const expiresAt = this.sessionExpiresAt(policy);
        const identity = this.buildSessionIdentity({ ...payload, jti });
        await this.assertConcurrentSessionLimit(identity, policy);
        await this.sessionRepo.save(this.sessionRepo.create({
            scope: identity.scope,
            tenantSlug: identity.tenantSlug,
            accountId: identity.accountId,
            jti,
            isRevoked: false,
            expiresAt,
            lastActivityAt: new Date(),
        }));
        const accessToken = this.jwtService.sign({ ...payload, jti }, { expiresIn: this.sessionExpiresIn(policy) });
        return {
            accessToken,
            sessionExpiresAt: expiresAt ? expiresAt.toISOString() : null,
        };
    }
    async safeAudit(payload) {
        try {
            await this.auditLogService.record(payload);
        }
        catch {
        }
    }
    async loginAsMaster(dto, context) {
        const policy = await this.getMasterAuthPolicy();
        const loginId = this.normalizeLoginId(dto.email);
        const state = await this.getSecurityState(auth_policy_constants_1.AuthScope.MASTER, null, loginId);
        this.ensureNotLocked(state);
        const user = await this.masterUserRepo.findOne({
            where: { email: loginId, isActive: true, status: master_user_entity_1.MasterUserStatus.ACTIVE },
        });
        if (!user) {
            await this.recordFailedAttempt(state, policy);
            await this.safeAudit({
                actorType: audit_log_entity_1.AuditActorType.MASTER,
                actorEmail: loginId,
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
            await this.recordFailedAttempt(state, policy);
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
        await this.resetSecurityState(state);
        const payload = { sub: user.id, email: user.email, isMaster: true, role: 'master' };
        const session = await this.createSessionAndToken(payload, policy);
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
        return {
            accessToken: session.accessToken,
            authSettings: policy,
            sessionExpiresAt: session.sessionExpiresAt,
        };
    }
    async loginAsTenant(dto, context) {
        const loginId = this.normalizeLoginId(dto.email);
        const tenant = await this.tenantRepo.findOne({
            where: { slug: dto.tenantSlug, status: 'ACTIVE' },
        });
        if (!tenant) {
            await this.safeAudit({
                actorType: audit_log_entity_1.AuditActorType.TENANT,
                actorEmail: loginId,
                tenantSlug: dto.tenantSlug,
                action: 'TENANT_LOGIN_FAILED',
                resourceType: 'AUTH',
                message: '테넌트 로그인 실패: 테넌트 없음 또는 비활성',
                ipAddress: context.ipAddress ?? null,
                userAgent: context.userAgent ?? null,
            });
            throw new common_1.UnauthorizedException('테넌트를 찾을 수 없거나 비활성 상태입니다.');
        }
        const policy = await this.getTenantAuthPolicyByTenantId(tenant.id);
        const state = await this.getSecurityState(auth_policy_constants_1.AuthScope.TENANT, tenant.slug, loginId);
        this.ensureNotLocked(state);
        const conn = await this.tenantConnectionService.getConnection(tenant.slug.replace(/-/g, '_'));
        const tenantUserRepo = conn.getRepository(tenant_user_entity_1.TenantUser);
        const user = await tenantUserRepo.findOne({
            where: { email: loginId, isActive: true },
        });
        if (!user) {
            await this.recordFailedAttempt(state, policy);
            await this.safeAudit({
                actorType: audit_log_entity_1.AuditActorType.TENANT,
                actorEmail: loginId,
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
            await this.recordFailedAttempt(state, policy);
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
        await this.resetSecurityState(state);
        const settings = await this.tenantSettingsRepo.findOne({
            where: { tenantId: tenant.id },
        });
        const payload = {
            sub: user.id,
            email: user.email,
            tenantId: tenant.slug.replace(/-/g, '_'),
            tenantSlug: tenant.slug,
            role: user.role,
            isMaster: false,
        };
        const session = await this.createSessionAndToken(payload, policy);
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
            accessToken: session.accessToken,
            brandingConfig: settings?.brandingConfig ?? null,
            authSettings: policy,
            sessionExpiresAt: session.sessionExpiresAt,
        };
    }
    async extendSession(authHeader) {
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
        const identity = this.buildSessionIdentity(payload);
        if (!payload.jti) {
            throw new common_1.UnauthorizedException('세션 정보가 없는 토큰입니다.');
        }
        const qb = this.sessionRepo
            .createQueryBuilder('session')
            .where('session.jti = :jti', { jti: payload.jti })
            .andWhere('session.scope = :scope', { scope: identity.scope })
            .andWhere('session.account_id = :accountId', { accountId: identity.accountId })
            .andWhere('session.is_revoked = :isRevoked', { isRevoked: false });
        if (identity.tenantSlug) {
            qb.andWhere('session.tenant_slug = :tenantSlug', { tenantSlug: identity.tenantSlug });
        }
        else {
            qb.andWhere('session.tenant_slug IS NULL');
        }
        const session = await qb.getOne();
        if (!session) {
            throw new common_1.UnauthorizedException('세션이 만료되었거나 유효하지 않습니다.');
        }
        if (session.expiresAt && session.expiresAt.getTime() <= Date.now()) {
            session.isRevoked = true;
            await this.sessionRepo.save(session);
            throw new common_1.UnauthorizedException('세션이 만료되었습니다. 다시 로그인해 주세요.');
        }
        let policy;
        if (payload.isMaster) {
            policy = await this.getMasterAuthPolicy();
        }
        else {
            if (!payload.tenantSlug) {
                throw new common_1.UnauthorizedException('테넌트 세션 정보가 올바르지 않습니다.');
            }
            const tenant = await this.tenantRepo.findOne({ where: { slug: payload.tenantSlug } });
            if (!tenant) {
                throw new common_1.NotFoundException('테넌트를 찾을 수 없습니다.');
            }
            policy = await this.getTenantAuthPolicyByTenantId(tenant.id);
        }
        const now = new Date();
        session.lastActivityAt = now;
        if (policy.autoLogoutTimeoutMinutes === 0) {
            await this.sessionRepo.save(session);
            return {
                accessToken: token,
                sessionExpiresAt: null,
                authSettings: policy,
            };
        }
        const expiresAt = new Date(now.getTime() + policy.autoLogoutTimeoutMinutes * 60_000);
        session.expiresAt = expiresAt;
        await this.sessionRepo.save(session);
        const newAccessToken = this.jwtService.sign(payload, {
            expiresIn: this.sessionExpiresIn(policy),
        });
        return {
            accessToken: newAccessToken,
            sessionExpiresAt: expiresAt.toISOString(),
            authSettings: policy,
        };
    }
    async logout(authHeader, context) {
        if (!authHeader?.startsWith('Bearer ')) {
            throw new common_1.UnauthorizedException('인증 토큰이 필요합니다.');
        }
        const token = authHeader.slice(7);
        let payload;
        try {
            payload = this.jwtService.verify(token, { ignoreExpiration: true });
        }
        catch {
            throw new common_1.UnauthorizedException('유효하지 않은 토큰입니다.');
        }
        if (payload.jti) {
            await this.sessionRepo
                .createQueryBuilder()
                .update(auth_session_entity_1.AuthSession)
                .set({ isRevoked: true })
                .where('jti = :jti', { jti: payload.jti })
                .execute();
        }
        await this.safeAudit({
            actorType: payload.isMaster ? audit_log_entity_1.AuditActorType.MASTER : audit_log_entity_1.AuditActorType.TENANT,
            actorId: payload.sub,
            actorEmail: payload.email ?? null,
            tenantSlug: payload.tenantSlug ?? payload.tenantId ?? null,
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
    __param(3, (0, typeorm_1.InjectRepository)(master_auth_settings_entity_1.MasterAuthSettings)),
    __param(4, (0, typeorm_1.InjectRepository)(auth_user_security_state_entity_1.AuthUserSecurityState)),
    __param(5, (0, typeorm_1.InjectRepository)(auth_session_entity_1.AuthSession)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        tenant_connection_service_1.TenantConnectionService,
        jwt_1.JwtService,
        audit_log_service_1.AuditLogService])
], AuthService);
//# sourceMappingURL=auth.service.js.map