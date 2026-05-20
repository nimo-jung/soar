import { Body, Controller, Get, Patch, Post, Query, UseGuards, Req, Res } from '@nestjs/common';
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
import { UsageSnapshotBatchService } from './usage-snapshot-batch.service';
import { UpsertBillingPricingPoliciesDto } from './dto/pricing-policy.dto';

@ApiTags('Admin - Billing')
@ApiBearerAuth()
@UseGuards(MasterGuard)
@Controller('admin/billing')
export class BillingController {
  constructor(
    private readonly billingService: BillingService,
    private readonly usageSnapshotBatchService: UsageSnapshotBatchService,
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
  @ApiOperation({ summary: '사용량 스냅샷 목록 조회' })
  getUsage(@Query() query: GetUsageQueryDto) {
    return this.billingService.getUsage(query);
  }

  @Post('usage/collect')
  @ApiOperation({ summary: '사용량 스냅샷 즉시 배치 집계 실행' })
  async collectUsageSnapshot(
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    const result = await this.usageSnapshotBatchService.collectNow();

    await this.auditLogService.record({
      ...this.buildAuditContext(user, req),
      action: 'BILLING_USAGE_COLLECT',
      resourceType: 'BILLING_USAGE',
      resourceId: null,
      message: '빌링 사용량 스냅샷 수동 집계 실행',
      metadata: result,
    });

    return result;
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
  @ApiOperation({ summary: '월별 청구 미리보기 조회' })
  getInvoicePreview(@Query() query: GetInvoicePreviewQueryDto) {
    return this.billingService.getInvoicePreview(query);
  }

  @Get('pricing-policies')
  @ApiOperation({ summary: '빌링 단가 정책 조회' })
  getPricingPolicies() {
    return this.billingService.getPricingPolicies();
  }

  @Patch('pricing-policies')
  @ApiOperation({ summary: '빌링 단가 정책 저장' })
  async upsertPricingPolicies(
    @Body() dto: UpsertBillingPricingPoliciesDto,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    const result = await this.billingService.upsertPricingPolicies(dto);

    await this.auditLogService.record({
      ...this.buildAuditContext(user, req),
      action: 'BILLING_PRICING_UPDATE',
      resourceType: 'BILLING_PRICING_POLICY',
      resourceId: null,
      message: '빌링 단가 정책 수정',
      metadata: {
        updatedCount: dto.items.length,
        tierCodes: dto.items.map((item) => item.tierCode),
      },
    });

    return result;
  }
}
