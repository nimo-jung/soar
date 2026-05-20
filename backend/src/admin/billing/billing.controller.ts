import { Controller, Get, Query, UseGuards, Req, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { MasterGuard } from '../../common/guards/master.guard';
import { BillingService } from './billing.service';
import { GetUsageQueryDto } from './dto/get-usage-query.dto';
import { GetInvoicePreviewQueryDto } from './dto/get-invoice-preview-query.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { AuditLogService } from '../../common/audit/audit-log.service';
import { AuditActorType } from '../../common/audit/entities/audit-log.entity';

@ApiTags('Admin - Billing')
@ApiBearerAuth()
@UseGuards(MasterGuard)
@Controller('admin/billing')
export class BillingController {
  constructor(
    private readonly billingService: BillingService,
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

  @Get('usage')
  @ApiOperation({ summary: '사용량 스냅샷 목록 조회 (MVP 스켈레톤)' })
  getUsage(@Query() query: GetUsageQueryDto) {
    return this.billingService.getUsage(query);
  }

  @Get('usage/export')
  @ApiOperation({ summary: '사용량 스냅샷 CSV 내보내기' })
  async exportUsage(
    @Query() query: GetUsageQueryDto,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const csv = await this.billingService.exportUsageCsv(query);
    const dateSuffix = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="billing-usage-${dateSuffix}.csv"`);

    await this.auditLogService.record({
      ...this.buildAuditContext(user, req),
      action: 'BILLING_USAGE_EXPORT',
      resourceType: 'BILLING_USAGE',
      resourceId: null,
      message: '빌링 사용량 CSV 내보내기',
      metadata: {
        query,
      },
    });

    return csv;
  }

  @Get('invoices/preview')
  @ApiOperation({ summary: '월별 청구 미리보기 조회 (MVP 스켈레톤)' })
  getInvoicePreview(@Query() query: GetInvoicePreviewQueryDto) {
    return this.billingService.getInvoicePreview(query);
  }
}
