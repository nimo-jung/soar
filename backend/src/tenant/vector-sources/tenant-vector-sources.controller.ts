import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard, TenantRole } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuditLogService } from '../../common/audit/audit-log.service';
import { AuditActorType } from '../../common/audit/entities/audit-log.entity';
import { UpdateTenantVectorSourcesDto } from './dto/update-tenant-vector-sources.dto';
import { TenantVectorSourcesService } from './tenant-vector-sources.service';

@ApiTags('Tenant - Vector Sources')
@ApiBearerAuth()
@UseGuards(TenantGuard, RolesGuard)
@Controller('api/vector-sources')
export class TenantVectorSourcesController {
  constructor(
    private readonly tenantVectorSourcesService: TenantVectorSourcesService,
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
  @ApiOperation({ summary: '테넌트 Vector source 인스턴스 설정 조회' })
  getSources() {
    return this.tenantVectorSourcesService.getSources();
  }

  @Patch()
  @Roles(TenantRole.OPERATOR)
  @ApiOperation({ summary: '테넌트 Vector source 인스턴스 설정 수정' })
  async updateSources(
    @Body() dto: UpdateTenantVectorSourcesDto,
    @CurrentUser() user: { sub: number; tenantSlug?: string; tenantId?: string },
    @Req() req: Request,
  ) {
    const before = await this.tenantVectorSourcesService.getSources();
    const updated = await this.tenantVectorSourcesService.updateSources(dto);

    await this.auditLogService.record({
      ...this.buildAuditContext(user, req),
      action: 'TENANT_VECTOR_SOURCES_UPDATE',
      resourceType: 'VECTOR_SOURCES',
      resourceId: user.tenantSlug ?? user.tenantId ?? 'UNKNOWN_TENANT',
      message: '테넌트 Vector source 인스턴스 설정 수정',
      metadata: {
        beforeCount: before.items.length,
        afterCount: updated.items.length,
      },
    });

    return updated;
  }
}
