import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { MasterUser } from '../admin/master-users/entities/master-user.entity';
import { Tenant } from '../admin/tenants/entities/tenant.entity';
import { TenantSettings } from '../admin/tenants/entities/tenant-settings.entity';
import { TenantConnectionService } from '../common/database/tenant-connection.service';
import { TenantUser } from '../tenant/users/entities/tenant-user.entity';
import { LoginDto } from './dto/login.dto';
import { TenantLoginDto } from './dto/tenant-login.dto';
import { AuditLogService } from '../common/audit/audit-log.service';
import { AuditActorType } from '../common/audit/entities/audit-log.entity';

interface AuthAuditContext {
  ipAddress?: string | null;
  userAgent?: string | null;
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
    private readonly tenantConnectionService: TenantConnectionService,
    private readonly jwtService: JwtService,
    private readonly auditLogService: AuditLogService,
  ) {}

  private async safeAudit(payload: Parameters<AuditLogService['record']>[0]): Promise<void> {
    try {
      await this.auditLogService.record(payload);
    } catch {
      // 감사 로그 저장 실패가 인증 플로우를 막지 않도록 무시한다.
    }
  }

  async loginAsMaster(dto: LoginDto, context: AuthAuditContext): Promise<{ accessToken: string }> {
    const user = await this.masterUserRepo.findOne({
      where: { email: dto.email, isActive: true },
    });

    if (!user) {
      await this.safeAudit({
        actorType: AuditActorType.MASTER,
        actorEmail: dto.email,
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

    const payload = { sub: user.id, email: user.email, isMaster: true, role: 'master' };
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
    return { accessToken: this.jwtService.sign(payload) };
  }

  async loginAsTenant(
    dto: TenantLoginDto,
    context: AuthAuditContext,
  ): Promise<{ accessToken: string; brandingConfig: Record<string, string> | null }> {
    const tenant = await this.tenantRepo.findOne({
      where: { slug: dto.tenantSlug, status: 'ACTIVE' as any },
    });

    if (!tenant) {
      await this.safeAudit({
        actorType: AuditActorType.TENANT,
        actorEmail: dto.email,
        tenantSlug: dto.tenantSlug,
        action: 'TENANT_LOGIN_FAILED',
        resourceType: 'AUTH',
        message: '테넌트 로그인 실패: 테넌트 없음 또는 비활성',
        ipAddress: context.ipAddress ?? null,
        userAgent: context.userAgent ?? null,
      });
      throw new UnauthorizedException('테넌트를 찾을 수 없거나 비활성 상태입니다.');
    }

    const conn = await this.tenantConnectionService.getConnection(
      tenant.slug.replace(/-/g, '_'),
    );
    const tenantUserRepo = conn.getRepository(TenantUser);

    const user = await tenantUserRepo.findOne({
      where: { email: dto.email, isActive: true },
    });

    if (!user) {
      await this.safeAudit({
        actorType: AuditActorType.TENANT,
        actorEmail: dto.email,
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
      accessToken: this.jwtService.sign(payload),
      brandingConfig: settings?.brandingConfig ?? null,
    };
  }

  async logout(authHeader: string | undefined, context: AuthAuditContext): Promise<{ success: true }> {
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('인증 토큰이 필요합니다.');
    }

    const token = authHeader.slice(7);
    let payload: {
      sub: number;
      email?: string;
      tenantId?: string;
      role?: string;
      isMaster?: boolean;
    };

    try {
      payload = this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('유효하지 않은 토큰입니다.');
    }

    await this.safeAudit({
      actorType: payload.isMaster ? AuditActorType.MASTER : AuditActorType.TENANT,
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
}
