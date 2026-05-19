import { Controller, Get, Post, Patch, Body, Param, ParseIntPipe, UseGuards, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import type { Request } from 'express';
import { CollectorsService } from './collectors.service';
import { CreateCollectorDto } from './dto/create-collector.dto';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantRole } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuditLogService } from '../../common/audit/audit-log.service';
import { AuditActorType } from '../../common/audit/entities/audit-log.entity';

@ApiTags('Tenant - Collectors')
@ApiBearerAuth()
@UseGuards(TenantGuard, RolesGuard)
@Controller('api/collectors')
export class CollectorsController {
  constructor(
    private readonly collectorsService: CollectorsService,
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

  @Post()
  @Roles(TenantRole.OPERATOR)
  @ApiOperation({ summary: 'Collector 등록 및 API Key 발급 (plain key 단 1회 반환)' })
  async create(
    @Body() dto: CreateCollectorDto,
    @CurrentUser() user: { sub: number; tenantId?: string },
    @Req() req: Request,
  ) {
    const created = await this.collectorsService.create(dto);
    await this.auditLogService.record({
      ...this.buildAuditContext(user, req),
      action: 'COLLECTOR_CREATE',
      resourceType: 'COLLECTOR',
      resourceId: String(created.id),
      message: 'Collector 생성',
      metadata: {
        name: created.name,
        isActive: created.isActive,
      },
    });

    return created;
  }

  @Get()
  @Roles(TenantRole.OPERATOR, TenantRole.ANALYST)
  @ApiOperation({ summary: 'Collector 목록 조회' })
  findAll() {
    return this.collectorsService.findAll();
  }

  @Patch(':id/deactivate')
  @Roles(TenantRole.OPERATOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Collector 비활성화' })
  async deactivate(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { sub: number; tenantId?: string },
    @Req() req: Request,
  ) {
    await this.collectorsService.deactivate(id);
    await this.auditLogService.record({
      ...this.buildAuditContext(user, req),
      action: 'COLLECTOR_DEACTIVATE',
      resourceType: 'COLLECTOR',
      resourceId: String(id),
      message: 'Collector 비활성화',
    });
  }
}
