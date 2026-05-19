import { Controller, Get, Post, Patch, Body, Param, ParseIntPipe, UseGuards, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import type { Request } from 'express';
import { ThreatIntelService } from './threat-intel.service';
import { CreateThreatIntelDto } from './dto/create-threat-intel.dto';
import { MasterGuard } from '../../common/guards/master.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { AuditLogService } from '../../common/audit/audit-log.service';
import { AuditActorType } from '../../common/audit/entities/audit-log.entity';

@ApiTags('Admin - Threat Intel')
@ApiBearerAuth()
@UseGuards(MasterGuard)
@Controller('admin/threat-intel')
export class ThreatIntelController {
  constructor(
    private readonly threatIntelService: ThreatIntelService,
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

  @Post()
  @ApiOperation({ summary: '글로벌 TI 피드 등록 및 RedPanda 전파' })
  async create(
    @Body() dto: CreateThreatIntelDto,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    const created = await this.threatIntelService.create(dto);
    await this.auditLogService.record({
      ...this.buildAuditContext(user, req),
      action: 'THREAT_INTEL_CREATE',
      resourceType: 'THREAT_INTEL',
      resourceId: String(created.id),
      message: '글로벌 TI 피드 등록',
      metadata: {
        feedType: created.feedType,
        indicator: created.indicator,
        severity: created.severity,
        source: created.source,
      },
    });

    return created;
  }

  @Get()
  @ApiOperation({ summary: '활성 TI 피드 목록 조회' })
  findAll() {
    return this.threatIntelService.findAll();
  }

  @Patch(':id/deactivate')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'TI 피드 비활성화' })
  async deactivate(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    await this.threatIntelService.deactivate(id);
    await this.auditLogService.record({
      ...this.buildAuditContext(user, req),
      action: 'THREAT_INTEL_DEACTIVATE',
      resourceType: 'THREAT_INTEL',
      resourceId: String(id),
      message: '글로벌 TI 피드 비활성화',
    });
  }
}
