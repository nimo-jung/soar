import { Body, Controller, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { MasterGuard } from '../../common/guards/master.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { AuditLogService } from '../../common/audit/audit-log.service';
import { AuditActorType } from '../../common/audit/entities/audit-log.entity';
import { SmtpSettingsService } from './smtp-settings.service';
import { UpdateSmtpSettingsDto } from './dto/update-smtp-settings.dto';
import { TestSmtpMailDto } from './dto/test-smtp-mail.dto';

@ApiTags('Admin - SMTP Settings')
@ApiBearerAuth()
@UseGuards(MasterGuard)
@Controller('admin/smtp-settings')
export class SmtpSettingsController {
  constructor(
    private readonly smtpSettingsService: SmtpSettingsService,
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
  @ApiOperation({ summary: 'SMTP 설정 조회' })
  getSettings() {
    return this.smtpSettingsService.getSettings();
  }

  @Patch()
  @ApiOperation({ summary: 'SMTP 설정 수정' })
  async updateSettings(
    @Body() dto: UpdateSmtpSettingsDto,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    const before = await this.smtpSettingsService.getSettings();
    const updated = await this.smtpSettingsService.updateSettings(dto);

    await this.auditLogService.record({
      ...this.buildAuditContext(user, req),
      action: 'MASTER_SMTP_SETTINGS_UPDATE',
      resourceType: 'SMTP_SETTINGS',
      resourceId: 'MASTER',
      message: '마스터 SMTP 설정 수정',
      metadata: {
        changedFields: Object.keys(dto),
        before: {
          ...before,
          hasSmtpPass: before.hasSmtpPass,
        },
        after: {
          ...updated,
          hasSmtpPass: updated.hasSmtpPass,
        },
      },
    });

    return updated;
  }

  @Post('test')
  @ApiOperation({ summary: 'SMTP 테스트 메일 발송' })
  async sendTestMail(
    @Body() dto: TestSmtpMailDto,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    const result = await this.smtpSettingsService.sendTestMail(dto.to);

    await this.auditLogService.record({
      ...this.buildAuditContext(user, req),
      action: 'MASTER_SMTP_TEST_SEND',
      resourceType: 'SMTP_SETTINGS',
      resourceId: 'MASTER',
      message: `SMTP 테스트 메일 발송: mode=${result.mode}, to=${result.to}, host=${result.host}, port=${result.port}, secure=${result.secure ? 'Y' : 'N'}`,
      metadata: result,
    });

    return {
      success: true,
      ...result,
    };
  }
}
