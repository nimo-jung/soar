import { Controller, Get, Patch, Body, Param, ParseIntPipe, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import type { Request } from 'express';
import { QuotasService } from './quotas.service';
import { UpdateQuotaDto } from './dto/update-quota.dto';
import { MasterGuard } from '../../common/guards/master.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { AuditLogService } from '../../common/audit/audit-log.service';
import { AuditActorType } from '../../common/audit/entities/audit-log.entity';

@ApiTags('Admin - Quotas')
@ApiBearerAuth()
@UseGuards(MasterGuard)
@Controller('admin/quotas')
export class QuotasController {
  constructor(
    private readonly quotasService: QuotasService,
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
  @ApiOperation({ summary: '전체 테넌트 쿼타 정책 목록 조회' })
  findAll() {
    return this.quotasService.findAll();
  }

  @Get(':tenantId')
  @ApiOperation({ summary: '특정 테넌트 쿼타 정책 조회' })
  findOne(@Param('tenantId', ParseIntPipe) tenantId: number) {
    return this.quotasService.findOne(tenantId);
  }

  @Patch(':tenantId')
  @ApiOperation({ summary: '테넌트 쿼타 정책 수정 (eps_limit, storage_quota_gb, retention_days)' })
  async update(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @Body() dto: UpdateQuotaDto,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    const updated = await this.quotasService.update(tenantId, dto);
    await this.auditLogService.record({
      ...this.buildAuditContext(user, req),
      action: 'QUOTA_UPDATE',
      resourceType: 'TENANT_SETTINGS',
      resourceId: String(tenantId),
      message: `쿼타 정책 수정 | tenant=${updated.tenantSlug} | epsLimit=${updated.epsLimit} | storageQuotaGb=${updated.storageQuotaGb} | retentionDays=${updated.retentionDays}`,
      metadata: {
        tenantSlug: updated.tenantSlug,
        epsLimit: updated.epsLimit,
        storageQuotaGb: updated.storageQuotaGb,
        retentionDays: updated.retentionDays,
      },
    });
    return updated;
  }
}
