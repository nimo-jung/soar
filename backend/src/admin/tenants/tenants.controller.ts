import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import type { Request } from 'express';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { CreateTenantTierDto } from './dto/create-tenant-tier.dto';
import { UpdateTenantTierDto } from './dto/update-tenant-tier.dto';
import { IssueTenantBootstrapTokenDto } from './dto/issue-tenant-bootstrap-token.dto';
import { IssueTenantPasswordResetTokenDto } from './dto/issue-tenant-password-reset-token.dto';
import { GetTenantBootstrapTokensQueryDto } from './dto/get-tenant-bootstrap-tokens-query.dto';
import { MasterGuard } from '../../common/guards/master.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { AuditLogService } from '../../common/audit/audit-log.service';
import { AuditActorType } from '../../common/audit/entities/audit-log.entity';

@ApiTags('Admin - Tenants')
@ApiBearerAuth()
@UseGuards(MasterGuard)
@Controller('admin/tenants')
export class TenantsController {
  constructor(
    private readonly tenantsService: TenantsService,
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

  private safe(value: unknown): string {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'string' && value.trim().length === 0) return '-';
    return String(value);
  }

  @Post()
  @ApiOperation({ summary: '테넌트 생성 및 전용 DB 프로비저닝' })
  async create(@Body() dto: CreateTenantDto, @CurrentUser() user: CurrentUserPayload, @Req() req: Request) {
    const created = await this.tenantsService.create(dto);
    const settings = await this.tenantsService.getSettings(created.id);
    await this.auditLogService.record({
      ...this.buildAuditContext(user, req),
      action: 'TENANT_CREATE',
      resourceType: 'TENANT',
      resourceId: String(created.id),
      message: [
        `테넌트 생성`,
        `name=${this.safe(created.name)}`,
        `slug=${this.safe(created.slug)}`,
        `tierId=${this.safe(created.tierId)}`,
        `epsLimit=${this.safe(settings.epsLimit)}`,
        `storageQuotaGb=${this.safe(settings.storageQuotaGb)}`,
        `retentionDays=${this.safe(settings.retentionDays)}`,
        `status=${this.safe(created.status)}`,
        `expiresAt=${this.safe(created.expiresAt)}`,
        `ipCidr=${this.safe(created.ipCidr)}`,
      ].join(' | '),
      metadata: {
        name: created.name,
        slug: created.slug,
        tierId: created.tierId,
        epsLimit: settings.epsLimit,
        storageQuotaGb: settings.storageQuotaGb,
        retentionDays: settings.retentionDays,
        status: created.status,
        expiresAt: created.expiresAt,
        ipCidr: created.ipCidr,
      },
    });
    return created;
  }

  @Get()
  @ApiOperation({ summary: '전체 테넌트 목록 조회' })
  findAll() {
    return this.tenantsService.findAll();
  }

  @Get('tiers')
  @ApiOperation({ summary: '테넌트 등급(티어) 목록 조회' })
  getTiers() {
    return this.tenantsService.getTiers();
  }

  @Post('tiers')
  @ApiOperation({ summary: '테넌트 등급(티어) 생성' })
  async createTier(@Body() dto: CreateTenantTierDto, @CurrentUser() user: CurrentUserPayload, @Req() req: Request) {
    const created = await this.tenantsService.createTier(dto);
    await this.auditLogService.record({
      ...this.buildAuditContext(user, req),
      action: 'TENANT_TIER_CREATE',
      resourceType: 'TENANT_TIER',
      resourceId: String(created.id),
      message: [
        '테넌트 등급 생성',
        `code=${this.safe(created.code)}`,
        `name=${this.safe(created.name)}`,
        `dailyLogQuotaGb=${this.safe(created.dailyLogQuotaGb)}`,
        `maxUsers=${this.safe(created.maxUsers)}`,
        `isActive=${this.safe(created.isActive)}`,
      ].join(' | '),
      metadata: {
        code: created.code,
        name: created.name,
        dailyLogQuotaGb: created.dailyLogQuotaGb,
        maxUsers: created.maxUsers,
        isActive: created.isActive,
      },
    });
    return created;
  }

  @Patch('tiers/:id')
  @ApiOperation({ summary: '테넌트 등급(티어) 수정' })
  async updateTier(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTenantTierDto,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    const before = await this.tenantsService.getTiers().then((tiers) => tiers.find((tier) => tier.id === id) ?? null);
    const updated = await this.tenantsService.updateTier(id, dto);
    await this.auditLogService.record({
      ...this.buildAuditContext(user, req),
      action: 'TENANT_TIER_UPDATE',
      resourceType: 'TENANT_TIER',
      resourceId: String(updated.id),
      message: [
        '테넌트 등급 수정',
        `code=${this.safe(updated.code)}`,
        `name=${this.safe(before?.name)} -> ${this.safe(updated.name)}`,
        `dailyLogQuotaGb=${this.safe(before?.dailyLogQuotaGb)} -> ${this.safe(updated.dailyLogQuotaGb)}`,
        `maxUsers=${this.safe(before?.maxUsers)} -> ${this.safe(updated.maxUsers)}`,
        `isActive=${this.safe(before?.isActive)} -> ${this.safe(updated.isActive)}`,
      ].join(' | '),
      metadata: {
        changedFields: Object.keys(dto),
        before,
        after: updated,
      },
    });
    return updated;
  }

  @Get('tiers/:id/deletion-check')
  @ApiOperation({ summary: '테넌트 등급(티어) 삭제 가능 여부 확인' })
  checkTierDeletion(@Param('id', ParseIntPipe) id: number) {
    return this.tenantsService.getTierDeletionStatus(id);
  }

  @Delete('tiers/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '테넌트 등급(티어) 삭제' })
  async removeTier(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    const deletedTier = await this.tenantsService.deleteTier(id);
    await this.auditLogService.record({
      ...this.buildAuditContext(user, req),
      action: 'TENANT_TIER_DELETE',
      resourceType: 'TENANT_TIER',
      resourceId: String(deletedTier.id),
      message: [
        '테넌트 등급 삭제',
        `code=${this.safe(deletedTier.code)}`,
        `name=${this.safe(deletedTier.name)}`,
      ].join(' | '),
      metadata: {
        code: deletedTier.code,
        name: deletedTier.name,
      },
    });
  }

  @Get(':id')
  @ApiOperation({ summary: '테넌트 상세 조회' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tenantsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '테넌트 정보 수정 (상태 변경 포함)' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTenantDto,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    const before = await this.tenantsService.findOne(id);
    const beforeSettings = await this.tenantsService.getSettings(id).catch(() => null);
    const updated = await this.tenantsService.update(id, dto);
    const updatedSettings = await this.tenantsService.getSettings(id).catch(() => null);
    const isDeleteAction = dto.status === 'DELETED';
    const isStatusChange = dto.status !== undefined && dto.status !== before.status;
    await this.auditLogService.record({
      ...this.buildAuditContext(user, req),
      action: isDeleteAction ? 'TENANT_DELETE' : isStatusChange ? 'TENANT_STATUS_CHANGE' : 'TENANT_UPDATE',
      resourceType: 'TENANT',
      resourceId: String(updated.id),
      message: [
        isDeleteAction ? '테넌트 삭제(상태 전환)' : isStatusChange ? '테넌트 상태 변경' : '테넌트 수정',
        `name=${this.safe(updated.name)}`,
        `slug=${this.safe(updated.slug)}`,
        `status=${this.safe(before.status)} -> ${this.safe(updated.status)}`,
        `tierId=${this.safe(before.tierId)} -> ${this.safe(updated.tierId)}`,
        `epsLimit=${this.safe(beforeSettings?.epsLimit)} -> ${this.safe(updatedSettings?.epsLimit)}`,
        `storageQuotaGb=${this.safe(beforeSettings?.storageQuotaGb)} -> ${this.safe(updatedSettings?.storageQuotaGb)}`,
        `retentionDays=${this.safe(beforeSettings?.retentionDays)} -> ${this.safe(updatedSettings?.retentionDays)}`,
        `expiresAt=${this.safe(before.expiresAt)} -> ${this.safe(updated.expiresAt)}`,
        `ipCidr=${this.safe(before.ipCidr)} -> ${this.safe(updated.ipCidr)}`,
      ].join(' | '),
      metadata: {
        changedFields: Object.keys(dto),
        before,
        after: updated,
        beforeSettings,
        afterSettings: updatedSettings,
      },
    });
    return updated;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '테넌트 소프트 삭제 (상태 → DELETED)' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    const before = await this.tenantsService.findOne(id);
    await this.tenantsService.softDelete(id);
    await this.auditLogService.record({
      ...this.buildAuditContext(user, req),
      action: 'TENANT_DELETE',
      resourceType: 'TENANT',
      resourceId: String(id),
      message: [
        '테넌트 삭제(소프트)',
        `id=${id}`,
        `name=${this.safe(before.name)}`,
        `slug=${this.safe(before.slug)}`,
        `status=${this.safe(before.status)} -> DELETED`,
      ].join(' | '),
      metadata: {
        before,
      },
    });
  }

  @Get(':id/settings')
  @ApiOperation({ summary: '테넌트 설정 조회 (EPS·스토리지·보관 주기)' })
  getSettings(@Param('id', ParseIntPipe) id: number) {
    return this.tenantsService.getSettings(id);
  }

  @Get(':id/bootstrap-status')
  @ApiOperation({ summary: '테넌트 최초 관리자 등록 필요 여부 조회 (Admin 전용)' })
  getBootstrapStatus(@Param('id', ParseIntPipe) id: number) {
    return this.tenantsService.getBootstrapStatus(id);
  }

  @Get(':id/database-status')
  @ApiOperation({ summary: '테넌트 DB 준비 상태 조회 (DB 존재/필수 테이블 누락 여부)' })
  getDatabaseStatus(@Param('id', ParseIntPipe) id: number) {
    return this.tenantsService.getTenantDatabaseStatus(id);
  }

  @Post(':id/database-recover')
  @ApiOperation({ summary: '테넌트 DB 복구/재생성 (DB 생성 + 테넌트 마이그레이션 실행)' })
  async recoverDatabase(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    const recovered = await this.tenantsService.recoverTenantDatabase(id);
    await this.auditLogService.record({
      ...this.buildAuditContext(user, req),
      action: 'TENANT_DB_RECOVER',
      resourceType: 'TENANT_DATABASE',
      resourceId: String(id),
      message: [
        '테넌트 DB 복구/재생성',
        `tenantId=${recovered.tenantId}`,
        `tenantSlug=${this.safe(recovered.tenantSlug)}`,
        `exists=${recovered.exists ? 'Y' : 'N'}`,
        `isReady=${recovered.isReady ? 'Y' : 'N'}`,
        `missingTables=${recovered.missingTables.join(',') || '-'}`,
      ].join(' | '),
      metadata: { ...recovered },
    });
    return recovered;
  }

  @Post(':id/bootstrap-token')
  @ApiOperation({ summary: '테넌트 최초 관리자 등록용 토큰 발급' })
  async issueBootstrapToken(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: IssueTenantBootstrapTokenDto,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    const issued = await this.tenantsService.issueBootstrapToken(id, dto, user.sub);

    await this.auditLogService.record({
      ...this.buildAuditContext(user, req),
      action: 'TENANT_BOOTSTRAP_TOKEN_ISSUE',
      resourceType: 'TENANT_BOOTSTRAP_TOKEN',
      resourceId: String(id),
      message: [
        '테넌트 최초 관리자 등록 토큰 발급',
        `tenantId=${issued.tenantId}`,
        `tenantSlug=${this.safe(issued.tenantSlug)}`,
        `email=${this.safe(issued.email)}`,
        `deliveredToEmail=${issued.deliveredToEmail ? 'Y' : 'N'}`,
        `mailDeliveryError=${this.safe(issued.mailDeliveryError)}`,
        `expiresAt=${this.safe(issued.expiresAt)}`,
      ].join(' | '),
      metadata: {
        tenantId: issued.tenantId,
        tenantSlug: issued.tenantSlug,
        email: issued.email,
        deliveredToEmail: issued.deliveredToEmail,
        mailDeliveryError: issued.mailDeliveryError,
        expiresAt: issued.expiresAt,
      },
    });

    return issued;
  }

  @Get(':id/bootstrap-tokens')
  @ApiOperation({ summary: '테넌트 최초 관리자 등록 토큰 발급 이력 조회' })
  getBootstrapTokenHistory(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: GetTenantBootstrapTokensQueryDto,
  ) {
    return this.tenantsService.getBootstrapTokenHistory(id, query);
  }

  @Post(':id/password-reset-token')
  @ApiOperation({ summary: '테넌트 관리자 비밀번호 재설정 토큰 발급' })
  async issuePasswordResetToken(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: IssueTenantPasswordResetTokenDto,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    const issued = await this.tenantsService.issuePasswordResetToken(id, dto, user.sub);

    await this.auditLogService.record({
      ...this.buildAuditContext(user, req),
      action: 'TENANT_PASSWORD_RESET_TOKEN_ISSUE',
      resourceType: 'TENANT_PASSWORD_RESET_TOKEN',
      resourceId: String(id),
      message: [
        '테넌트 관리자 비밀번호 재설정 토큰 발급',
        `tenantId=${issued.tenantId}`,
        `tenantSlug=${this.safe(issued.tenantSlug)}`,
        `email=${this.safe(issued.email)}`,
        `deliveredToEmail=${issued.deliveredToEmail ? 'Y' : 'N'}`,
        `mailDeliveryError=${this.safe(issued.mailDeliveryError)}`,
        `expiresAt=${this.safe(issued.expiresAt)}`,
      ].join(' | '),
      metadata: {
        tenantId: issued.tenantId,
        tenantSlug: issued.tenantSlug,
        email: issued.email,
        deliveredToEmail: issued.deliveredToEmail,
        mailDeliveryError: issued.mailDeliveryError,
        expiresAt: issued.expiresAt,
      },
    });

    return issued;
  }
}
