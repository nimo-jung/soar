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
const tenant_bootstrap_token_entity_1 = require("../admin/tenants/entities/tenant-bootstrap-token.entity");
const tenant_password_reset_token_entity_1 = require("../admin/tenants/entities/tenant-password-reset-token.entity");
const tenant_connection_service_1 = require("../common/database/tenant-connection.service");
const tenant_user_entity_1 = require("../tenant/users/entities/tenant-user.entity");
const audit_log_service_1 = require("../common/audit/audit-log.service");
const audit_log_entity_1 = require("../common/audit/entities/audit-log.entity");
const auth_policy_constants_1 = require("./auth-policy.constants");
const master_auth_settings_entity_1 = require("./entities/master-auth-settings.entity");
const auth_user_security_state_entity_1 = require("./entities/auth-user-security-state.entity");
const system_tenant_constants_1 = require("../admin/tenants/constants/system-tenant.constants");
const password_policy_1 = require("../admin/master-users/password-policy");
const product_info_service_1 = require("../admin/product-info/product-info.service");
const session_store_service_1 = require("../common/session/session-store.service");
const roles_guard_1 = require("../common/guards/roles.guard");
let AuthService = class AuthService {
    masterUserRepo;
    tenantRepo;
    tenantSettingsRepo;
    tenantBootstrapTokenRepo;
    tenantPasswordResetTokenRepo;
    masterAuthSettingsRepo;
    securityStateRepo;
    tenantConnectionService;
    jwtService;
    auditLogService;
    productInfoService;
    sessionStore;
    constructor(masterUserRepo, tenantRepo, tenantSettingsRepo, tenantBootstrapTokenRepo, tenantPasswordResetTokenRepo, masterAuthSettingsRepo, securityStateRepo, tenantConnectionService, jwtService, auditLogService, productInfoService, sessionStore) {
        this.masterUserRepo = masterUserRepo;
        this.tenantRepo = tenantRepo;
        this.tenantSettingsRepo = tenantSettingsRepo;
        this.tenantBootstrapTokenRepo = tenantBootstrapTokenRepo;
        this.tenantPasswordResetTokenRepo = tenantPasswordResetTokenRepo;
        this.masterAuthSettingsRepo = masterAuthSettingsRepo;
        this.securityStateRepo = securityStateRepo;
        this.tenantConnectionService = tenantConnectionService;
        this.jwtService = jwtService;
        this.auditLogService = auditLogService;
        this.productInfoService = productInfoService;
        this.sessionStore = sessionStore;
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
            settings = await this.masterAuthSettingsRepo.save(this.masterAuthSettingsRepo.create({
                id: 1,
                ...auth_policy_constants_1.DEFAULT_AUTH_POLICY,
                isMultiTenantEnabled: false,
            }));
        }
        return this.resolvePolicy(settings);
    }
    async isMultiTenantEnabled() {
        const settings = await this.masterAuthSettingsRepo.findOne({ where: { id: 1 } });
        return settings?.isMultiTenantEnabled ?? false;
    }
    async getTenantAuthPolicyByTenantId(tenantId) {
        const settings = await this.tenantSettingsRepo.findOne({ where: { tenantId } });
        return this.resolvePolicy(settings ?? null);
    }
    async getSecurityState(scope, tenantSlug, loginId) {
        let state = await this.findSecurityState(scope, tenantSlug, loginId);
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
    async findSecurityState(scope, tenantSlug, loginId) {
        return this.securityStateRepo.findOne({
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
    }
    lockStatusResponse(state) {
        const now = Date.now();
        const lockedUntil = state?.lockUntil ?? null;
        if (!lockedUntil || lockedUntil.getTime() <= now) {
            return { locked: false, lockedUntil: null };
        }
        return { locked: true, lockedUntil: lockedUntil.toISOString() };
    }
    async getMasterLockStatus(email) {
        const loginId = this.normalizeLoginId(email);
        if (!loginId) {
            return { locked: false, lockedUntil: null };
        }
        const state = await this.findSecurityState(auth_policy_constants_1.AuthScope.MASTER, null, loginId);
        return this.lockStatusResponse(state);
    }
    async getTenantLockStatus(tenantSlug, email) {
        const loginId = this.normalizeLoginId(email);
        if (!loginId) {
            return { locked: false, lockedUntil: null };
        }
        const isMultiTenantEnabled = await this.isMultiTenantEnabled();
        const requestedTenantSlug = tenantSlug?.trim();
        const resolvedTenantSlug = isMultiTenantEnabled
            ? requestedTenantSlug
            : system_tenant_constants_1.SYSTEM_TENANT_SLUG;
        if (!resolvedTenantSlug) {
            return { locked: false, lockedUntil: null };
        }
        const state = await this.findSecurityState(auth_policy_constants_1.AuthScope.TENANT, resolvedTenantSlug, loginId);
        return this.lockStatusResponse(state);
    }
    ensureNotLocked(state) {
        const now = Date.now();
        if (state.lockUntil && state.lockUntil.getTime() > now) {
            throw new common_1.UnauthorizedException({
                statusCode: 401,
                error: 'Unauthorized',
                message: '로그인 실패 횟수를 초과하여 계정이 잠금 상태입니다. 잠시 후 다시 시도해 주세요.',
                lockedUntil: state.lockUntil.toISOString(),
            });
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
    sessionSetKey(identity) {
        if (identity.scope === auth_policy_constants_1.AuthScope.MASTER) {
            return `sessions:master:${identity.accountId}`;
        }
        return `sessions:tenant:${identity.tenantSlug}:${identity.accountId}`;
    }
    async assertConcurrentSessionLimit(identity, policy, forceLogoutExistingSessions = false) {
        const activeCount = await this.sessionStore.pruneAndCount(this.sessionSetKey(identity));
        if (activeCount >= policy.maxConcurrentSessions) {
            if (forceLogoutExistingSessions) {
                await this.sessionStore.revokeAllFromSet(this.sessionSetKey(identity));
                return;
            }
            throw new common_1.UnauthorizedException({
                statusCode: 401,
                error: 'Unauthorized',
                code: 'SESSION_LIMIT_EXCEEDED',
                message: '계정당 동시 로그인 가능 세션 수를 초과했습니다. 기존 세션 종료 후 다시 시도해 주세요.',
                activeSessionCount: activeCount,
                maxConcurrentSessions: policy.maxConcurrentSessions,
            });
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
    async createSessionAndToken(payload, policy, forceLogoutExistingSessions = false) {
        const jti = (0, crypto_1.randomUUID)().replace(/-/g, '');
        const identity = this.buildSessionIdentity({ ...payload, jti });
        const ttl = this.sessionExpiresIn(policy);
        await this.assertConcurrentSessionLimit(identity, policy, forceLogoutExistingSessions);
        await this.sessionStore.set(jti, identity.accountId, ttl);
        await this.sessionStore.addToSet(this.sessionSetKey(identity), jti);
        const accessToken = this.jwtService.sign({ ...payload, jti }, { expiresIn: ttl });
        return {
            accessToken,
            sessionExpiresAt: this.sessionExpiresAt(policy)?.toISOString() ?? null,
        };
    }
    async safeAudit(payload) {
        try {
            await this.auditLogService.record(payload);
        }
        catch {
        }
    }
    async getMasterBootstrapStatus() {
        const masterCount = await this.masterUserRepo.count();
        return { requiresBootstrap: masterCount === 0 };
    }
    async bootstrapMaster(dto, context) {
        const existingCount = await this.masterUserRepo.count();
        if (existingCount > 0) {
            throw new common_1.ConflictException('이미 마스터 관리자 계정이 존재합니다.');
        }
        const normalizedEmail = this.normalizeLoginId(dto.email);
        const passwordError = (0, password_policy_1.getMasterUserPasswordValidationError)(dto.password, normalizedEmail);
        if (passwordError) {
            throw new common_1.BadRequestException(passwordError);
        }
        const passwordHash = await bcrypt.hash(dto.password, 12);
        await this.masterUserRepo.save(this.masterUserRepo.create({
            email: normalizedEmail,
            passwordHash,
            passwordHistory: [],
            isActive: true,
            status: master_user_entity_1.MasterUserStatus.ACTIVE,
            deletedAt: null,
        }));
        await this.productInfoService.ensureDemoLicenseForBootstrap();
        await this.safeAudit({
            actorType: audit_log_entity_1.AuditActorType.SYSTEM,
            actorEmail: normalizedEmail,
            action: 'MASTER_BOOTSTRAP_REGISTER',
            resourceType: 'MASTER_USER',
            message: '최초 마스터 관리자 등록',
            ipAddress: context.ipAddress ?? null,
            userAgent: context.userAgent ?? null,
        });
        await this.safeAudit({
            actorType: audit_log_entity_1.AuditActorType.SYSTEM,
            actorEmail: normalizedEmail,
            action: 'LICENSE_DEMO_AUTO_CREATE',
            resourceType: 'LICENSE',
            message: '최초 관리자 등록 시 데모 라이선스 자동 생성',
            ipAddress: context.ipAddress ?? null,
            userAgent: context.userAgent ?? null,
        });
        return { success: true, demoLicenseCreated: true };
    }
    async getPublicLicenseStatus() {
        const warning = await this.productInfoService.getLicenseWarning();
        if (!warning) {
            return { daysRemaining: null, expiresAt: null };
        }
        return warning;
    }
    computeExpiryWarning(expiresAt) {
        if (!expiresAt) {
            return null;
        }
        const nowMs = Date.now();
        const expiresMs = expiresAt.getTime();
        const diffDays = Math.ceil((expiresMs - nowMs) / (1000 * 60 * 60 * 24));
        if (diffDays > 30) {
            return null;
        }
        return {
            daysRemaining: Math.max(0, diffDays),
            expiresAt: expiresAt.toISOString(),
        };
    }
    isTenantExpired(expiresAt) {
        if (!expiresAt) {
            return false;
        }
        return expiresAt.getTime() <= Date.now();
    }
    assertTenantNotExpired(expiresAt) {
        if (this.isTenantExpired(expiresAt)) {
            throw new common_1.UnauthorizedException('테넌트 사용기한이 만료되었습니다. 관리자에게 문의하세요.');
        }
    }
    assertTenantNotExpiredFromPayload(payload) {
        if (payload.isMaster) {
            return;
        }
        if (!payload.tenantExpiresAt) {
            return;
        }
        const expiresAt = new Date(payload.tenantExpiresAt);
        if (!Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() <= Date.now()) {
            throw new common_1.UnauthorizedException('테넌트 사용기한이 만료되었습니다. 관리자에게 문의하세요.');
        }
    }
    async getPublicTenantExpiryStatus(tenantSlug) {
        const slug = tenantSlug?.trim();
        if (!slug) {
            return { daysRemaining: null, expiresAt: null };
        }
        const tenant = await this.tenantRepo.findOne({
            where: { slug, status: 'ACTIVE' },
        });
        if (!tenant) {
            return { daysRemaining: null, expiresAt: null };
        }
        const warning = this.computeExpiryWarning(tenant.expiresAt);
        if (!warning) {
            return { daysRemaining: null, expiresAt: null };
        }
        return warning;
    }
    async getActiveTenantBySlug(rawTenantSlug) {
        const isMultiTenantEnabled = await this.isMultiTenantEnabled();
        const requestedTenantSlug = rawTenantSlug?.trim();
        const resolvedTenantSlug = isMultiTenantEnabled
            ? requestedTenantSlug
            : system_tenant_constants_1.SYSTEM_TENANT_SLUG;
        if (!resolvedTenantSlug) {
            return null;
        }
        return this.tenantRepo.findOne({
            where: { slug: resolvedTenantSlug, status: 'ACTIVE' },
        });
    }
    async hasAnyActiveTenantUser(tenant) {
        const conn = await this.tenantConnectionService.getConnection(tenant.slug.replace(/-/g, '_'));
        const tenantUserRepo = conn.getRepository(tenant_user_entity_1.TenantUser);
        const count = await tenantUserRepo.count({ where: { isActive: true } });
        return count > 0;
    }
    async getTenantBootstrapStatus(tenantSlug) {
        const tenant = await this.getActiveTenantBySlug(tenantSlug);
        if (!tenant) {
            return { requiresBootstrap: false };
        }
        const hasUsers = await this.hasAnyActiveTenantUser(tenant);
        return { requiresBootstrap: !hasUsers };
    }
    async bootstrapTenant(dto, context) {
        const tenant = await this.getActiveTenantBySlug(dto.tenantSlug);
        if (!tenant) {
            throw new common_1.UnauthorizedException('유효한 테넌트를 찾을 수 없습니다.');
        }
        const hasUsers = await this.hasAnyActiveTenantUser(tenant);
        if (hasUsers) {
            throw new common_1.ConflictException('이미 테넌트 관리자가 등록되어 있습니다.');
        }
        const tokenRecord = await this.tenantBootstrapTokenRepo.findOne({
            where: {
                tenantId: tenant.id,
                usedAt: (0, typeorm_2.IsNull)(),
            },
            order: { createdAt: 'DESC' },
        });
        if (!tokenRecord || tokenRecord.expiresAt.getTime() <= Date.now()) {
            throw new common_1.UnauthorizedException('유효한 최초 관리자 등록 토큰이 없습니다.');
        }
        const tokenMatch = await bcrypt.compare(dto.invitationToken, tokenRecord.tokenHash);
        if (!tokenMatch) {
            await this.safeAudit({
                actorType: audit_log_entity_1.AuditActorType.SYSTEM,
                actorEmail: dto.email.trim().toLowerCase(),
                tenantSlug: tenant.slug,
                action: 'TENANT_BOOTSTRAP_FAILED',
                resourceType: 'TENANT_BOOTSTRAP',
                message: '테넌트 최초 관리자 등록 실패: 토큰 불일치',
                ipAddress: context.ipAddress ?? null,
                userAgent: context.userAgent ?? null,
            });
            throw new common_1.UnauthorizedException('최초 관리자 등록 토큰이 올바르지 않습니다.');
        }
        const normalizedEmail = this.normalizeLoginId(dto.email);
        if (tokenRecord.email && tokenRecord.email.toLowerCase() !== normalizedEmail) {
            throw new common_1.UnauthorizedException('토큰 발급 대상 이메일과 일치하지 않습니다.');
        }
        const conn = await this.tenantConnectionService.getConnection(tenant.slug.replace(/-/g, '_'));
        const tenantUserRepo = conn.getRepository(tenant_user_entity_1.TenantUser);
        const existingUser = await tenantUserRepo.findOne({ where: { email: normalizedEmail } });
        if (existingUser) {
            throw new common_1.ConflictException('이미 존재하는 사용자 이메일입니다.');
        }
        const passwordHash = await bcrypt.hash(dto.password, 12);
        await tenantUserRepo.save(tenantUserRepo.create({
            email: normalizedEmail,
            displayName: dto.displayName,
            role: roles_guard_1.TenantRole.OPERATOR,
            isActive: true,
            passwordHash,
        }));
        tokenRecord.usedAt = new Date();
        await this.tenantBootstrapTokenRepo.save(tokenRecord);
        await this.safeAudit({
            actorType: audit_log_entity_1.AuditActorType.SYSTEM,
            actorEmail: normalizedEmail,
            tenantSlug: tenant.slug,
            action: 'TENANT_BOOTSTRAP_COMPLETED',
            resourceType: 'TENANT_USER',
            message: '테넌트 최초 관리자 등록 완료',
            ipAddress: context.ipAddress ?? null,
            userAgent: context.userAgent ?? null,
            metadata: {
                role: roles_guard_1.TenantRole.OPERATOR,
            },
        });
        return {
            success: true,
            tenantSlug: tenant.slug,
            email: normalizedEmail,
        };
    }
    async resetTenantPassword(dto, context) {
        const tenant = await this.getActiveTenantBySlug(dto.tenantSlug);
        if (!tenant) {
            throw new common_1.UnauthorizedException('유효한 테넌트를 찾을 수 없습니다.');
        }
        this.assertTenantNotExpired(tenant.expiresAt);
        const normalizedEmail = this.normalizeLoginId(dto.email);
        const tokenRecord = await this.tenantPasswordResetTokenRepo.findOne({
            where: {
                tenantId: tenant.id,
                email: normalizedEmail,
                usedAt: (0, typeorm_2.IsNull)(),
            },
            order: { createdAt: 'DESC' },
        });
        if (!tokenRecord || tokenRecord.expiresAt.getTime() <= Date.now()) {
            throw new common_1.UnauthorizedException('유효한 비밀번호 재설정 토큰이 없습니다.');
        }
        const tokenMatch = await bcrypt.compare(dto.resetToken, tokenRecord.tokenHash);
        if (!tokenMatch) {
            await this.safeAudit({
                actorType: audit_log_entity_1.AuditActorType.SYSTEM,
                actorEmail: normalizedEmail,
                tenantSlug: tenant.slug,
                action: 'TENANT_PASSWORD_RESET_FAILED',
                resourceType: 'TENANT_PASSWORD_RESET',
                message: '테넌트 비밀번호 재설정 실패: 토큰 불일치',
                ipAddress: context.ipAddress ?? null,
                userAgent: context.userAgent ?? null,
            });
            throw new common_1.UnauthorizedException('비밀번호 재설정 토큰이 올바르지 않습니다.');
        }
        const conn = await this.tenantConnectionService.getConnection(tenant.slug.replace(/-/g, '_'));
        const tenantUserRepo = conn.getRepository(tenant_user_entity_1.TenantUser);
        const targetUser = await tenantUserRepo.findOne({
            where: {
                email: normalizedEmail,
                isActive: true,
            },
        });
        if (!targetUser) {
            throw new common_1.NotFoundException('재설정 대상 활성 사용자를 찾을 수 없습니다.');
        }
        targetUser.passwordHash = await bcrypt.hash(dto.newPassword, 12);
        await tenantUserRepo.save(targetUser);
        tokenRecord.usedAt = new Date();
        await this.tenantPasswordResetTokenRepo.save(tokenRecord);
        await this.safeAudit({
            actorType: audit_log_entity_1.AuditActorType.SYSTEM,
            actorEmail: normalizedEmail,
            tenantSlug: tenant.slug,
            action: 'TENANT_PASSWORD_RESET_COMPLETED',
            resourceType: 'TENANT_USER',
            message: '테넌트 관리자 비밀번호 재설정 완료',
            ipAddress: context.ipAddress ?? null,
            userAgent: context.userAgent ?? null,
            metadata: {
                userId: targetUser.id,
            },
        });
        return {
            success: true,
            tenantSlug: tenant.slug,
            email: normalizedEmail,
        };
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
        const session = await this.createSessionAndToken(payload, policy, dto.forceLogoutExistingSessions ?? false);
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
            licenseWarning: await this.productInfoService.getLicenseWarning(),
        };
    }
    async loginAsTenant(dto, context) {
        const isMultiTenantEnabled = await this.isMultiTenantEnabled();
        const requestedTenantSlug = dto.tenantSlug?.trim();
        if (isMultiTenantEnabled && !requestedTenantSlug) {
            throw new common_1.UnauthorizedException('멀티테넌트 모드에서는 고객사 코드가 필요합니다.');
        }
        const resolvedTenantSlug = isMultiTenantEnabled
            ? requestedTenantSlug
            : system_tenant_constants_1.SYSTEM_TENANT_SLUG;
        if (!isMultiTenantEnabled && requestedTenantSlug && requestedTenantSlug !== system_tenant_constants_1.SYSTEM_TENANT_SLUG) {
            throw new common_1.UnauthorizedException('멀티테넌트가 비활성화된 상태에서는 system 테넌트만 로그인할 수 있습니다.');
        }
        const loginId = this.normalizeLoginId(dto.email);
        const tenant = await this.tenantRepo.findOne({
            where: { slug: resolvedTenantSlug, status: 'ACTIVE' },
        });
        if (!tenant) {
            await this.safeAudit({
                actorType: audit_log_entity_1.AuditActorType.TENANT,
                actorEmail: loginId,
                tenantSlug: resolvedTenantSlug,
                action: 'TENANT_LOGIN_FAILED',
                resourceType: 'AUTH',
                message: '테넌트 로그인 실패: 테넌트 없음 또는 비활성',
                ipAddress: context.ipAddress ?? null,
                userAgent: context.userAgent ?? null,
            });
            throw new common_1.UnauthorizedException('테넌트를 찾을 수 없거나 비활성 상태입니다.');
        }
        this.assertTenantNotExpired(tenant.expiresAt);
        const requiresBootstrap = !(await this.hasAnyActiveTenantUser(tenant));
        if (requiresBootstrap) {
            await this.safeAudit({
                actorType: audit_log_entity_1.AuditActorType.TENANT,
                actorEmail: loginId,
                tenantSlug: tenant.slug,
                action: 'TENANT_LOGIN_BLOCKED_BOOTSTRAP',
                resourceType: 'AUTH',
                message: '테넌트 로그인 차단: 최초 관리자 등록 필요',
                ipAddress: context.ipAddress ?? null,
                userAgent: context.userAgent ?? null,
            });
            throw new common_1.UnauthorizedException({
                statusCode: 401,
                error: 'Unauthorized',
                code: 'TENANT_BOOTSTRAP_REQUIRED',
                message: '테넌트 최초 관리자 등록이 필요합니다.',
            });
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
            tenantExpiresAt: tenant.expiresAt?.toISOString() ?? null,
            role: user.role,
            isMaster: false,
        };
        const session = await this.createSessionAndToken(payload, policy, dto.forceLogoutExistingSessions ?? false);
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
            tenantWarning: this.computeExpiryWarning(tenant.expiresAt),
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
        if (!payload.jti) {
            throw new common_1.UnauthorizedException('세션 정보가 없는 토큰입니다.');
        }
        this.assertTenantNotExpiredFromPayload(payload);
        const sessionValid = await this.sessionStore.exists(payload.jti);
        if (!sessionValid) {
            throw new common_1.UnauthorizedException('세션이 만료되었거나 유효하지 않습니다.');
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
            this.assertTenantNotExpired(tenant.expiresAt);
            policy = await this.getTenantAuthPolicyByTenantId(tenant.id);
            payload.tenantExpiresAt = tenant.expiresAt?.toISOString() ?? null;
        }
        if (policy.autoLogoutTimeoutMinutes === 0) {
            return {
                accessToken: token,
                sessionExpiresAt: null,
                authSettings: policy,
            };
        }
        const ttl = this.sessionExpiresIn(policy);
        await this.sessionStore.extend(payload.jti, ttl);
        const { iat: _iat, exp: _exp, ...freshPayload } = payload;
        const newAccessToken = this.jwtService.sign(freshPayload, { expiresIn: ttl });
        return {
            accessToken: newAccessToken,
            sessionExpiresAt: new Date(Date.now() + ttl * 1000).toISOString(),
            authSettings: policy,
        };
    }
    async validateSession(authHeader) {
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
        this.assertTenantNotExpiredFromPayload(payload);
        const sessionValid = await this.sessionStore.exists(payload.jti);
        if (!sessionValid) {
            throw new common_1.UnauthorizedException('세션이 만료되었거나 다른 기기에서 종료되었습니다.');
        }
        return { valid: true };
    }
    async logout(authHeader, context) {
        if (!authHeader?.startsWith('Bearer ')) {
            throw new common_1.UnauthorizedException('인증 토큰이 필요합니다.');
        }
        return this.revokeSessionByToken(authHeader.slice(7), context, true);
    }
    async logoutByToken(token, context) {
        if (!token) {
            return { success: true };
        }
        return this.revokeSessionByToken(token, context, false);
    }
    async revokeSessionByToken(token, context, strict) {
        let payload;
        try {
            payload = this.jwtService.verify(token, { ignoreExpiration: true });
        }
        catch {
            if (strict) {
                throw new common_1.UnauthorizedException('유효하지 않은 토큰입니다.');
            }
            return { success: true };
        }
        if (payload.jti) {
            await this.sessionStore.del(payload.jti);
            const setKey = payload.isMaster
                ? `sessions:master:${payload.sub}`
                : `sessions:tenant:${payload.tenantSlug ?? payload.tenantId}:${payload.sub}`;
            await this.sessionStore.removeFromSet(setKey, payload.jti);
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
    __param(3, (0, typeorm_1.InjectRepository)(tenant_bootstrap_token_entity_1.TenantBootstrapToken)),
    __param(4, (0, typeorm_1.InjectRepository)(tenant_password_reset_token_entity_1.TenantPasswordResetToken)),
    __param(5, (0, typeorm_1.InjectRepository)(master_auth_settings_entity_1.MasterAuthSettings)),
    __param(6, (0, typeorm_1.InjectRepository)(auth_user_security_state_entity_1.AuthUserSecurityState)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        tenant_connection_service_1.TenantConnectionService,
        jwt_1.JwtService,
        audit_log_service_1.AuditLogService,
        product_info_service_1.ProductInfoService,
        session_store_service_1.SessionStoreService])
], AuthService);
//# sourceMappingURL=auth.service.js.map