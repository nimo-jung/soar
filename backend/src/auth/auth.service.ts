import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import { MasterUser, MasterUserStatus } from '../admin/master-users/entities/master-user.entity';
import { Tenant } from '../admin/tenants/entities/tenant.entity';
import { TenantSettings } from '../admin/tenants/entities/tenant-settings.entity';
import { TenantConnectionService } from '../common/database/tenant-connection.service';
import { TenantUser } from '../tenant/users/entities/tenant-user.entity';
import { LoginDto } from './dto/login.dto';
import { TenantLoginDto } from './dto/tenant-login.dto';
import { AuditLogService } from '../common/audit/audit-log.service';
import { AuditActorType } from '../common/audit/entities/audit-log.entity';
import {
  AuthPolicy,
  AuthScope,
  DEFAULT_AUTH_POLICY,
  LONG_LIVED_SESSION_DAYS,
} from './auth-policy.constants';
import { MasterAuthSettings } from './entities/master-auth-settings.entity';
import { AuthUserSecurityState } from './entities/auth-user-security-state.entity';
import { SYSTEM_TENANT_SLUG } from '../admin/tenants/constants/system-tenant.constants';
import { BootstrapMasterDto } from './dto/bootstrap-master.dto';
import { getMasterUserPasswordValidationError } from '../admin/master-users/password-policy';
import { ProductInfoService } from '../admin/product-info/product-info.service';
import { SessionStoreService } from '../common/session/session-store.service';

interface AuthAuditContext {
  ipAddress?: string | null;
  userAgent?: string | null;
}

interface SessionTokenPayload {
  sub: number;
  email?: string;
  role: string;
  isMaster: boolean;
  tenantId?: string;
  tenantSlug?: string;
  jti: string;
}

interface SessionIssueResult {
  accessToken: string;
  sessionExpiresAt: string | null;
}

interface ScopeIdentity {
  scope: AuthScope;
  tenantSlug: string | null;
  accountId: string;
}

interface LogoutTokenPayload {
  sub: number;
  email?: string;
  role: string;
  isMaster: boolean;
  tenantId?: string;
  tenantSlug?: string;
  jti?: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(MasterUser)
    private readonly masterUserRepo: Repository<MasterUser>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(TenantSettings)
    private readonly tenantSettingsRepo: Repository<TenantSettings>,
    @InjectRepository(MasterAuthSettings)
    private readonly masterAuthSettingsRepo: Repository<MasterAuthSettings>,
    @InjectRepository(AuthUserSecurityState)
    private readonly securityStateRepo: Repository<AuthUserSecurityState>,
    private readonly tenantConnectionService: TenantConnectionService,
    private readonly jwtService: JwtService,
    private readonly auditLogService: AuditLogService,
    private readonly productInfoService: ProductInfoService,
    private readonly sessionStore: SessionStoreService,
  ) {}

  private normalizeLoginId(email: string): string {
    return email.trim().toLowerCase();
  }

  private resolvePolicy(raw: Partial<AuthPolicy> | null | undefined): AuthPolicy {
    return {
      maxLoginFailures: raw?.maxLoginFailures ?? DEFAULT_AUTH_POLICY.maxLoginFailures,
      lockMinutes: raw?.lockMinutes ?? DEFAULT_AUTH_POLICY.lockMinutes,
      maxConcurrentSessions: raw?.maxConcurrentSessions ?? DEFAULT_AUTH_POLICY.maxConcurrentSessions,
      autoLogoutTimeoutMinutes:
        raw?.autoLogoutTimeoutMinutes ?? DEFAULT_AUTH_POLICY.autoLogoutTimeoutMinutes,
    };
  }

  private async getMasterAuthPolicy(): Promise<AuthPolicy> {
    let settings = await this.masterAuthSettingsRepo.findOne({ where: { id: 1 } });

    if (!settings) {
      settings = await this.masterAuthSettingsRepo.save(
        this.masterAuthSettingsRepo.create({
          id: 1,
          ...DEFAULT_AUTH_POLICY,
          isMultiTenantEnabled: false,
        }),
      );
    }

    return this.resolvePolicy(settings);
  }

  private async isMultiTenantEnabled(): Promise<boolean> {
    const settings = await this.masterAuthSettingsRepo.findOne({ where: { id: 1 } });
    return settings?.isMultiTenantEnabled ?? false;
  }

  private async getTenantAuthPolicyByTenantId(tenantId: number): Promise<AuthPolicy> {
    const settings = await this.tenantSettingsRepo.findOne({ where: { tenantId } });
    return this.resolvePolicy(settings ?? null);
  }

  private async getSecurityState(
    scope: AuthScope,
    tenantSlug: string | null,
    loginId: string,
  ): Promise<AuthUserSecurityState> {
    let state = await this.securityStateRepo.findOne({
      where: tenantSlug
        ? {
            scope,
            tenantSlug,
            loginId,
          }
        : {
            scope,
            tenantSlug: IsNull(),
            loginId,
          },
    });

    if (!state) {
      state = await this.securityStateRepo.save(
        this.securityStateRepo.create({
          scope,
          tenantSlug,
          loginId,
          failedAttempts: 0,
          lockUntil: null,
        }),
      );
    }

    return state;
  }

  private ensureNotLocked(state: AuthUserSecurityState): void {
    const now = Date.now();
    if (state.lockUntil && state.lockUntil.getTime() > now) {
      throw new UnauthorizedException('로그인 실패 횟수를 초과하여 계정이 잠금 상태입니다. 잠시 후 다시 시도해 주세요.');
    }
  }

  private async recordFailedAttempt(
    state: AuthUserSecurityState,
    policy: AuthPolicy,
  ): Promise<void> {
    const nextFailureCount = state.failedAttempts + 1;

    if (nextFailureCount >= policy.maxLoginFailures) {
      state.failedAttempts = 0;
      state.lockUntil = new Date(Date.now() + policy.lockMinutes * 60_000);
    } else {
      state.failedAttempts = nextFailureCount;
      state.lockUntil = null;
    }

    await this.securityStateRepo.save(state);
  }

  private async resetSecurityState(state: AuthUserSecurityState): Promise<void> {
    if (state.failedAttempts === 0 && !state.lockUntil) {
      return;
    }

    state.failedAttempts = 0;
    state.lockUntil = null;
    await this.securityStateRepo.save(state);
  }

  private buildSessionIdentity(payload: SessionTokenPayload): ScopeIdentity {
    if (payload.isMaster) {
      return {
        scope: AuthScope.MASTER,
        tenantSlug: null,
        accountId: String(payload.sub),
      };
    }

    return {
      scope: AuthScope.TENANT,
      tenantSlug: payload.tenantSlug ?? null,
      accountId: String(payload.sub),
    };
  }

  private sessionSetKey(identity: ScopeIdentity): string {
    if (identity.scope === AuthScope.MASTER) {
      return `sessions:master:${identity.accountId}`;
    }
    return `sessions:tenant:${identity.tenantSlug}:${identity.accountId}`;
  }

  private async assertConcurrentSessionLimit(identity: ScopeIdentity, policy: AuthPolicy): Promise<void> {
    const activeCount = await this.sessionStore.pruneAndCount(this.sessionSetKey(identity));
    if (activeCount >= policy.maxConcurrentSessions) {
      throw new UnauthorizedException('계정당 동시 로그인 가능 세션 수를 초과했습니다. 기존 세션 종료 후 다시 시도해 주세요.');
    }
  }

  private sessionExpiresAt(policy: AuthPolicy): Date | null {
    if (policy.autoLogoutTimeoutMinutes === 0) {
      return null;
    }

    return new Date(Date.now() + policy.autoLogoutTimeoutMinutes * 60_000);
  }

  private sessionExpiresIn(policy: AuthPolicy): number {
    if (policy.autoLogoutTimeoutMinutes === 0) {
      return LONG_LIVED_SESSION_DAYS * 24 * 60 * 60;
    }

    return policy.autoLogoutTimeoutMinutes * 60;
  }

  private async createSessionAndToken(
    payload: Omit<SessionTokenPayload, 'jti'>,
    policy: AuthPolicy,
  ): Promise<SessionIssueResult> {
    const jti = randomUUID().replace(/-/g, '');
    const identity = this.buildSessionIdentity({ ...payload, jti });
    const ttl = this.sessionExpiresIn(policy);

    await this.assertConcurrentSessionLimit(identity, policy);

    await this.sessionStore.set(jti, identity.accountId, ttl);
    await this.sessionStore.addToSet(this.sessionSetKey(identity), jti);

    const accessToken = this.jwtService.sign({ ...payload, jti }, { expiresIn: ttl });

    return {
      accessToken,
      sessionExpiresAt: this.sessionExpiresAt(policy)?.toISOString() ?? null,
    };
  }

  private async safeAudit(payload: Parameters<AuditLogService['record']>[0]): Promise<void> {
    try {
      await this.auditLogService.record(payload);
    } catch {
      // 감사 로그 저장 실패가 인증 플로우를 막지 않도록 무시한다.
    }
  }

  async getMasterBootstrapStatus(): Promise<{ requiresBootstrap: boolean }> {
    const masterCount = await this.masterUserRepo.count();
    return { requiresBootstrap: masterCount === 0 };
  }

  async bootstrapMaster(
    dto: BootstrapMasterDto,
    context: AuthAuditContext,
  ): Promise<{ success: true; demoLicenseCreated: boolean }> {
    const existingCount = await this.masterUserRepo.count();
    if (existingCount > 0) {
      throw new ConflictException('이미 마스터 관리자 계정이 존재합니다.');
    }

    const normalizedEmail = this.normalizeLoginId(dto.email);
    const passwordError = getMasterUserPasswordValidationError(dto.password, normalizedEmail);
    if (passwordError) {
      throw new BadRequestException(passwordError);
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    await this.masterUserRepo.save(
      this.masterUserRepo.create({
        email: normalizedEmail,
        passwordHash,
        passwordHistory: [],
        isActive: true,
        status: MasterUserStatus.ACTIVE,
        deletedAt: null,
      }),
    );

    await this.productInfoService.ensureDemoLicenseForBootstrap();

    await this.safeAudit({
      actorType: AuditActorType.SYSTEM,
      actorEmail: normalizedEmail,
      action: 'MASTER_BOOTSTRAP_REGISTER',
      resourceType: 'MASTER_USER',
      message: '최초 마스터 관리자 등록',
      ipAddress: context.ipAddress ?? null,
      userAgent: context.userAgent ?? null,
    });

    await this.safeAudit({
      actorType: AuditActorType.SYSTEM,
      actorEmail: normalizedEmail,
      action: 'LICENSE_DEMO_AUTO_CREATE',
      resourceType: 'LICENSE',
      message: '최초 관리자 등록 시 데모 라이선스 자동 생성',
      ipAddress: context.ipAddress ?? null,
      userAgent: context.userAgent ?? null,
    });

    return { success: true, demoLicenseCreated: true };
  }

  async getPublicLicenseStatus(): Promise<{ daysRemaining: number | null; expiresAt: string | null }> {
    const warning = await this.productInfoService.getLicenseWarning();
    if (!warning) {
      return { daysRemaining: null, expiresAt: null };
    }

    return warning;
  }

  private computeExpiryWarning(expiresAt: Date | null): { daysRemaining: number; expiresAt: string } | null {
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

  async getPublicTenantExpiryStatus(
    tenantSlug: string,
  ): Promise<{ daysRemaining: number | null; expiresAt: string | null }> {
    const slug = tenantSlug?.trim();
    if (!slug) {
      return { daysRemaining: null, expiresAt: null };
    }

    const tenant = await this.tenantRepo.findOne({
      where: { slug, status: 'ACTIVE' as any },
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

  async loginAsMaster(
    dto: LoginDto,
    context: AuthAuditContext,
  ): Promise<{
      accessToken: string;
      authSettings: AuthPolicy;
      sessionExpiresAt: string | null;
      licenseWarning: { daysRemaining: number; expiresAt: string } | null;
    }> {
    const policy = await this.getMasterAuthPolicy();
    const loginId = this.normalizeLoginId(dto.email);
    const state = await this.getSecurityState(AuthScope.MASTER, null, loginId);
    this.ensureNotLocked(state);

    const user = await this.masterUserRepo.findOne({
      where: { email: loginId, isActive: true, status: MasterUserStatus.ACTIVE },
    });

    if (!user) {
      await this.recordFailedAttempt(state, policy);
      await this.safeAudit({
        actorType: AuditActorType.MASTER,
        actorEmail: loginId,
        action: 'MASTER_LOGIN_FAILED',
        resourceType: 'AUTH',
        message: '마스터 로그인 실패: 계정 없음 또는 비활성',
        ipAddress: context.ipAddress ?? null,
        userAgent: context.userAgent ?? null,
      });
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      await this.recordFailedAttempt(state, policy);
      await this.safeAudit({
        actorType: AuditActorType.MASTER,
        actorId: user.id,
        actorEmail: user.email,
        action: 'MASTER_LOGIN_FAILED',
        resourceType: 'AUTH',
        message: '마스터 로그인 실패: 비밀번호 불일치',
        ipAddress: context.ipAddress ?? null,
        userAgent: context.userAgent ?? null,
      });
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    await this.resetSecurityState(state);

    const payload = { sub: user.id, email: user.email, isMaster: true, role: 'master' };
    const session = await this.createSessionAndToken(payload, policy);

    await this.safeAudit({
      actorType: AuditActorType.MASTER,
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

  async loginAsTenant(
    dto: TenantLoginDto,
    context: AuthAuditContext,
  ): Promise<{
      accessToken: string;
      brandingConfig: Record<string, string> | null;
      authSettings: AuthPolicy;
      sessionExpiresAt: string | null;
      tenantWarning: { daysRemaining: number; expiresAt: string } | null;
    }> {
    const isMultiTenantEnabled = await this.isMultiTenantEnabled();
    const requestedTenantSlug = dto.tenantSlug?.trim();

    if (isMultiTenantEnabled && !requestedTenantSlug) {
      throw new UnauthorizedException('멀티테넌트 모드에서는 tenantSlug가 필요합니다.');
    }

    const resolvedTenantSlug = isMultiTenantEnabled
      ? (requestedTenantSlug as string)
      : SYSTEM_TENANT_SLUG;

    if (!isMultiTenantEnabled && requestedTenantSlug && requestedTenantSlug !== SYSTEM_TENANT_SLUG) {
      throw new UnauthorizedException('멀티테넌트가 비활성화된 상태에서는 system 테넌트만 로그인할 수 있습니다.');
    }

    const loginId = this.normalizeLoginId(dto.email);
    const tenant = await this.tenantRepo.findOne({
      where: { slug: resolvedTenantSlug, status: 'ACTIVE' as any },
    });

    if (!tenant) {
      await this.safeAudit({
        actorType: AuditActorType.TENANT,
        actorEmail: loginId,
        tenantSlug: resolvedTenantSlug,
        action: 'TENANT_LOGIN_FAILED',
        resourceType: 'AUTH',
        message: '테넌트 로그인 실패: 테넌트 없음 또는 비활성',
        ipAddress: context.ipAddress ?? null,
        userAgent: context.userAgent ?? null,
      });
      throw new UnauthorizedException('테넌트를 찾을 수 없거나 비활성 상태입니다.');
    }

    const policy = await this.getTenantAuthPolicyByTenantId(tenant.id);
    const state = await this.getSecurityState(AuthScope.TENANT, tenant.slug, loginId);
    this.ensureNotLocked(state);

    const conn = await this.tenantConnectionService.getConnection(
      tenant.slug.replace(/-/g, '_'),
    );
    const tenantUserRepo = conn.getRepository(TenantUser);

    const user = await tenantUserRepo.findOne({
      where: { email: loginId, isActive: true },
    });

    if (!user) {
      await this.recordFailedAttempt(state, policy);
      await this.safeAudit({
        actorType: AuditActorType.TENANT,
        actorEmail: loginId,
        tenantSlug: tenant.slug,
        action: 'TENANT_LOGIN_FAILED',
        resourceType: 'AUTH',
        message: '테넌트 로그인 실패: 사용자 없음 또는 비활성',
        ipAddress: context.ipAddress ?? null,
        userAgent: context.userAgent ?? null,
      });
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      await this.recordFailedAttempt(state, policy);
      await this.safeAudit({
        actorType: AuditActorType.TENANT,
        actorId: user.id,
        actorEmail: user.email,
        tenantSlug: tenant.slug,
        action: 'TENANT_LOGIN_FAILED',
        resourceType: 'AUTH',
        message: '테넌트 로그인 실패: 비밀번호 불일치',
        ipAddress: context.ipAddress ?? null,
        userAgent: context.userAgent ?? null,
      });
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
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
      actorType: AuditActorType.TENANT,
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

  async extendSession(authHeader: string | undefined): Promise<{
      accessToken: string;
      sessionExpiresAt: string | null;
      authSettings: AuthPolicy;
    }> {
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('인증 토큰이 필요합니다.');
    }

    const token = authHeader.slice(7);

    let payload: SessionTokenPayload;
    try {
      payload = this.jwtService.verify<SessionTokenPayload>(token);
    } catch {
      throw new UnauthorizedException('유효하지 않은 토큰입니다.');
    }

    if (!payload.jti) {
      throw new UnauthorizedException('세션 정보가 없는 토큰입니다.');
    }

    const sessionValid = await this.sessionStore.exists(payload.jti);
    if (!sessionValid) {
      throw new UnauthorizedException('세션이 만료되었거나 유효하지 않습니다.');
    }

    let policy: AuthPolicy;
    if (payload.isMaster) {
      policy = await this.getMasterAuthPolicy();
    } else {
      if (!payload.tenantSlug) {
        throw new UnauthorizedException('테넌트 세션 정보가 올바르지 않습니다.');
      }

      const tenant = await this.tenantRepo.findOne({ where: { slug: payload.tenantSlug } });
      if (!tenant) {
        throw new NotFoundException('테넌트를 찾을 수 없습니다.');
      }

      policy = await this.getTenantAuthPolicyByTenantId(tenant.id);
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

    // verify()로 얻은 payload에는 iat·exp가 포함되어 있으므로 제거 후 재서명
    const { iat: _iat, exp: _exp, ...freshPayload } = payload as SessionTokenPayload & { iat?: number; exp?: number };
    const newAccessToken = this.jwtService.sign(freshPayload, { expiresIn: ttl });

    return {
      accessToken: newAccessToken,
      sessionExpiresAt: new Date(Date.now() + ttl * 1000).toISOString(),
      authSettings: policy,
    };
  }

  async logout(authHeader: string | undefined, context: AuthAuditContext): Promise<{ success: true }> {
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('인증 토큰이 필요합니다.');
    }

    return this.revokeSessionByToken(authHeader.slice(7), context, true);
  }

  async logoutByToken(token: string | undefined, context: AuthAuditContext): Promise<{ success: true }> {
    if (!token) {
      return { success: true };
    }

    return this.revokeSessionByToken(token, context, false);
  }

  private async revokeSessionByToken(
    token: string,
    context: AuthAuditContext,
    strict: boolean,
  ): Promise<{ success: true }> {
    let payload: LogoutTokenPayload;

    try {
      payload = this.jwtService.verify(token, { ignoreExpiration: true });
    } catch {
      if (strict) {
        throw new UnauthorizedException('유효하지 않은 토큰입니다.');
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
      actorType: payload.isMaster ? AuditActorType.MASTER : AuditActorType.TENANT,
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
}
