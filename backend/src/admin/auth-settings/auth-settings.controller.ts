import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { MasterGuard } from '../../common/guards/master.guard';
import { AdminAuthSettingsService } from './auth-settings.service';
import { UpdateAuthPolicyDto } from '../../auth/dto/update-auth-policy.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { AuditLogService } from '../../common/audit/audit-log.service';
import { AuditActorType } from '../../common/audit/entities/audit-log.entity';

@ApiTags('Admin - Auth Settings')
@ApiBearerAuth()
@UseGuards(MasterGuard)
@Controller('admin/auth-settings')
export class AdminAuthSettingsController {
  constructor(
    private readonly adminAuthSettingsService: AdminAuthSettingsService,
    private readonly auditLogService: AuditLogService,
  ) {}

  private buildAuditContext(user: CurrentUserPayload, req: Request) {
    return {
      actorType: user.isMaster ? AuditActorType.MASTER : AuditActorType.TENANT,
      actorId: user.sub,
      actorEmail: user.email ?? null,
      tenantSlug: user.tenantId ?? null,
      ipAddress: req.ip ?? null,
      userAgent: (req.headers['user-agent'] as string | undefined) ?? null,
    };
  }

  @Get()
  @ApiOperation({ summary: '마스터 인증 설정 조회' })
  getSettings() {
    return this.adminAuthSettingsService.getSettings();
  }

  @Patch()
  @ApiOperation({ summary: '마스터 인증 설정 수정' })
  async updateSettings(
    @Body() dto: UpdateAuthPolicyDto,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    const before = await this.adminAuthSettingsService.getSettings();
    const updated = await this.adminAuthSettingsService.updateSettings(dto);

    await this.auditLogService.record({
      ...this.buildAuditContext(user, req),
      action: 'MASTER_AUTH_SETTINGS_UPDATE',
      resourceType: 'AUTH_SETTINGS',
      resourceId: 'MASTER',
      message: '마스터 인증 설정 수정',
      metadata: {
        changedFields: Object.keys(dto),
        before,
        after: updated,
      },
    });

    return updated;
  }
}
