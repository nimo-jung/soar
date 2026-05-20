import {
  Controller, Get, Post, Param, ParseIntPipe,
  Query, UseGuards, HttpCode, HttpStatus, Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import type { Request } from 'express';
import { SystemStatusService } from './system-status.service';
import { MasterGuard } from '../../common/guards/master.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { AuditLogService } from '../../common/audit/audit-log.service';
import { AuditActorType } from '../../common/audit/entities/audit-log.entity';

@ApiTags('Admin - System Status')
@ApiBearerAuth()
@UseGuards(MasterGuard)
@Controller('admin/system-status')
export class SystemStatusController {
  constructor(
    private readonly svc: SystemStatusService,
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

  @Get('current')
  @ApiOperation({ summary: '현재 시스템 상태 즉시 점검' })
  getCurrent() {
    return this.svc.checkCurrentStatus();
  }

  @Get('history')
  @ApiOperation({ summary: '시스템 상태 이력 조회' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getHistory(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.getHistory(Number(page ?? 1), Number(limit ?? 30));
  }

  @Get('alerts')
  @ApiOperation({ summary: '시스템 알림 이벤트 조회' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'onlyActive', required: false, type: Boolean })
  getAlerts(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('onlyActive') onlyActive?: string,
  ) {
    return this.svc.getAlerts(Number(page ?? 1), Number(limit ?? 30), onlyActive === 'true');
  }

  @Post('check')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '즉시 헬스 체크 + DB 저장 트리거' })
  async triggerCheck() {
    await this.svc.runPeriodicCheck();
    return { ok: true };
  }

  @Post('alerts/:id/resolve')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '알림 이벤트 해결 처리' })
  async resolveAlert(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    await this.svc.resolveAlert(id);
    await this.auditLogService.record({
      ...this.buildAuditContext(user, req),
      action: 'SYSTEM_ALERT_RESOLVE',
      resourceType: 'SYSTEM_ALERT',
      resourceId: String(id),
      message: `시스템 알림 해결 처리 | alertId=${id}`,
    });
  }
}
