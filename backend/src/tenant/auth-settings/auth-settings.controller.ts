import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { UpdateAuthPolicyDto } from '../../auth/dto/update-auth-policy.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard, TenantRole } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { TenantAuthSettingsService } from './auth-settings.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuditLogService } from '../../common/audit/audit-log.service';
import { AuditActorType } from '../../common/audit/entities/audit-log.entity';

@ApiTags('Tenant - Auth Settings')
@ApiBearerAuth()
@UseGuards(TenantGuard, RolesGuard)
@Controller('api/auth-settings')
export class TenantAuthSettingsController {
  constructor(
    private readonly tenantAuthSettingsService: TenantAuthSettingsService,
    private readonly auditLogService: AuditLogService,
  ) {}

  private buildAuditContext(user: { sub: number; tenantSlug?: string; tenantId?: string }, req: Request) {
    return {
      actorType: AuditActorType.TENANT,
      actorId: user.sub,
      tenantSlug: user.tenantSlug ?? user.tenantId ?? null,
      ipAddress: req.ip ?? null,
      userAgent: (req.headers['user-agent'] as string | undefined) ?? null,
    };
  }

  @Get()
  @Roles(TenantRole.OPERATOR, TenantRole.ANALYST, TenantRole.AUDITOR)
  @ApiOperation({ summary: '테넌트 인증 설정 조회' })
  getSettings() {
    return this.tenantAuthSettingsService.getSettings();
  }

  @Patch()
  @Roles(TenantRole.OPERATOR)
  @ApiOperation({ summary: '테넌트 인증 설정 수정' })
  async updateSettings(
    @Body() dto: UpdateAuthPolicyDto,
    @CurrentUser() user: { sub: number; tenantSlug?: string; tenantId?: string },
    @Req() req: Request,
  ) {
    const before = await this.tenantAuthSettingsService.getSettings();
    const updated = await this.tenantAuthSettingsService.updateSettings(dto);

    await this.auditLogService.record({
      ...this.buildAuditContext(user, req),
      action: 'TENANT_AUTH_SETTINGS_UPDATE',
      resourceType: 'AUTH_SETTINGS',
      resourceId: user.tenantSlug ?? user.tenantId ?? 'UNKNOWN_TENANT',
      message: '테넌트 인증 설정 수정',
      metadata: {
        changedFields: Object.keys(dto),
        before,
        after: updated,
      },
    });

    return updated;
  }
}
