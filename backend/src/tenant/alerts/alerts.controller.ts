import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard, TenantRole } from '../../common/guards/roles.guard';
import { AlertsService } from './alerts.service';
import { CreateAlertDto } from './dto/create-alert.dto';
import { UpdateAlertStatusDto } from './dto/update-alert-status.dto';
import { UpdateAlertNotificationPolicyDto } from './dto/update-alert-notification-policy.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuditLogService } from '../../common/audit/audit-log.service';
import { AuditActorType } from '../../common/audit/entities/audit-log.entity';

@ApiTags('Tenant - Alerts')
@ApiBearerAuth()
@UseGuards(TenantGuard, RolesGuard)
@Controller('api/alerts')
export class AlertsController {
  constructor(
    private readonly alertsService: AlertsService,
    private readonly auditLogService: AuditLogService,
  ) {}

  private buildAuditContext(user: { sub: number; tenantId?: string }, req: Request) {
    return {
      actorType: AuditActorType.TENANT,
      actorId: user.sub,
      tenantSlug: user.tenantId ?? null,
      ipAddress: req.ip ?? null,
      userAgent: (req.headers['user-agent'] as string | undefined) ?? null,
    };
  }

  @Get()
  @Roles(TenantRole.OPERATOR, TenantRole.ANALYST, TenantRole.AUDITOR)
  @ApiOperation({ summary: '알림 목록 조회' })
  findAll() {
    return this.alertsService.findAll();
  }

  @Post()
  @Roles(TenantRole.OPERATOR, TenantRole.ANALYST)
  @ApiOperation({ summary: '알림 생성 및 알림 채널 전송 이력 기록' })
  async create(
    @Body() dto: CreateAlertDto,
    @CurrentUser() user: { sub: number; tenantId?: string },
    @Req() req: Request,
  ) {
    const created = await this.alertsService.create(dto);
    await this.auditLogService.record({
      ...this.buildAuditContext(user, req),
      action: 'ALERT_CREATE',
      resourceType: 'ALERT',
      resourceId: String(created.id),
      message: '알림 생성',
      metadata: {
        title: created.title,
        severity: created.severity,
        status: created.status,
      },
    });
    return created;
  }

  @Patch(':id/status')
  @Roles(TenantRole.OPERATOR, TenantRole.ANALYST)
  @ApiOperation({ summary: '알림 상태 변경' })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAlertStatusDto,
    @CurrentUser() user: { sub: number; tenantId?: string },
    @Req() req: Request,
  ) {
    const updated = await this.alertsService.updateStatus(id, dto);
    await this.auditLogService.record({
      ...this.buildAuditContext(user, req),
      action: 'ALERT_STATUS_UPDATE',
      resourceType: 'ALERT',
      resourceId: String(id),
      message: '알림 상태 변경',
      metadata: { status: updated.status },
    });
    return updated;
  }

  @Get('notifications/policy')
  @Roles(TenantRole.OPERATOR, TenantRole.ANALYST, TenantRole.AUDITOR)
  @ApiOperation({ summary: '알림 채널/수신자 정책 조회' })
  getNotificationPolicy() {
    return this.alertsService.getNotificationPolicy();
  }

  @Patch('notifications/policy')
  @Roles(TenantRole.OPERATOR)
  @ApiOperation({ summary: '알림 채널/수신자 정책 수정' })
  async updateNotificationPolicy(
    @Body() dto: UpdateAlertNotificationPolicyDto,
    @CurrentUser() user: { sub: number; tenantId?: string },
    @Req() req: Request,
  ) {
    const updated = await this.alertsService.updateNotificationPolicy(dto);
    await this.auditLogService.record({
      ...this.buildAuditContext(user, req),
      action: 'ALERT_NOTIFICATION_POLICY_UPDATE',
      resourceType: 'ALERT_NOTIFICATION_POLICY',
      resourceId: String(updated.id),
      message: '알림 채널/수신자 정책 수정',
      metadata: {
        channels: updated.channels,
        recipientsCount: updated.recipients?.length ?? 0,
      },
    });
    return updated;
  }

  @Get('notifications/history')
  @Roles(TenantRole.OPERATOR, TenantRole.ANALYST, TenantRole.AUDITOR)
  @ApiOperation({ summary: '알림 발송 이력 조회' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getNotificationHistory(@Query('limit') limit?: string) {
    return this.alertsService.getNotificationHistory(Number(limit ?? 100));
  }
}
