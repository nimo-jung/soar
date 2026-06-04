import { Body, Controller, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { MasterGuard } from '../../common/guards/master.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { AuditLogService } from '../../common/audit/audit-log.service';
import { AuditActorType } from '../../common/audit/entities/audit-log.entity';
import { UpdateVectorSettingsDto } from './dto/update-vector-settings.dto';
import { VectorSettingsService } from './vector-settings.service';

@ApiTags('Admin - Vector Settings')
@ApiBearerAuth()
@UseGuards(MasterGuard)
@Controller('admin/vector-settings')
export class VectorSettingsController {
  constructor(
    private readonly vectorSettingsService: VectorSettingsService,
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
  @ApiOperation({ summary: 'Vector 파이프라인 설정 조회' })
  getSettings() {
    return this.vectorSettingsService.getSettings();
  }

  @Patch()
  @ApiOperation({ summary: 'Vector 파이프라인 설정 수정' })
  async updateSettings(
    @Body() dto: UpdateVectorSettingsDto,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    const before = await this.vectorSettingsService.getSettings();
    const updated = await this.vectorSettingsService.updateSettings(dto);

    await this.auditLogService.record({
      ...this.buildAuditContext(user, req),
      action: 'MASTER_VECTOR_SETTINGS_UPDATE',
      resourceType: 'VECTOR_SETTINGS',
      resourceId: 'MASTER',
      message: 'Vector 파이프라인 설정 수정',
      metadata: {
        changedFields: Object.keys(dto),
        beforeVersion: before.configVersion,
        afterVersion: updated.configVersion,
      },
    });

    return updated;
  }

  @Post('apply')
  @ApiOperation({ summary: 'Vector 설정 파일 렌더링 및 적용 시도' })
  async applySettings(
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    const current = await this.vectorSettingsService.getSettings();
    const result = await this.vectorSettingsService.applySettings();

    await this.auditLogService.record({
      ...this.buildAuditContext(user, req),
      action: 'MASTER_VECTOR_SETTINGS_APPLY',
      resourceType: 'VECTOR_SETTINGS',
      resourceId: 'MASTER',
      message: `Vector 설정 적용 시도 | status=${result.applyStatus}`,
      metadata: {
        configVersion: current.configVersion,
        applyStatus: result.applyStatus,
        configPath: result.configPath,
        reloadAttempted: result.reloadAttempted,
        reloadSucceeded: result.reloadSucceeded,
      },
    });

    return result;
  }

  @Post('dry-run')
  @ApiOperation({ summary: 'Vector 설정 렌더링 사전 검증(dry-run)' })
  dryRunSettings() {
    return this.vectorSettingsService.dryRunSettings();
  }

  @Get('apply-history')
  @ApiOperation({ summary: 'Vector 설정 적용 이력 조회' })
  getApplyHistory() {
    return this.vectorSettingsService.getApplyHistory();
  }
}
