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
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import type { Request } from 'express';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { CreateTenantTierDto } from './dto/create-tenant-tier.dto';
import { UpdateTenantTierDto } from './dto/update-tenant-tier.dto';
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

  @Post()
  @ApiOperation({ summary: '테넌트 생성 및 전용 DB 프로비저닝' })
  async create(@Body() dto: CreateTenantDto, @CurrentUser() user: CurrentUserPayload, @Req() req: Request) {
    const created = await this.tenantsService.create(dto);
    await this.auditLogService.record({
      ...this.buildAuditContext(user, req),
      action: 'TENANT_CREATE',
      resourceType: 'TENANT',
      resourceId: String(created.id),
      message: `테넌트 ${created.name}(${created.slug}) 생성`,
      metadata: {
        name: created.name,
        slug: created.slug,
        tierId: created.tierId,
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
      message: `등급 ${created.name}(${created.code}) 생성`,
      metadata: {
        code: created.code,
        name: created.name,
        dailyLogQuotaGb: created.dailyLogQuotaGb,
        maxUsers: created.maxUsers,
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
    const updated = await this.tenantsService.updateTier(id, dto);
    await this.auditLogService.record({
      ...this.buildAuditContext(user, req),
      action: 'TENANT_TIER_UPDATE',
      resourceType: 'TENANT_TIER',
      resourceId: String(updated.id),
      message: `등급 ${updated.name}(${updated.code}) 수정`,
      metadata: {
        changedFields: Object.keys(dto),
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
      message: `등급 ${deletedTier.name}(${deletedTier.code}) 삭제`,
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
    const updated = await this.tenantsService.update(id, dto);
    const isDeleteAction = dto.status === 'DELETED';
    await this.auditLogService.record({
      ...this.buildAuditContext(user, req),
      action: isDeleteAction ? 'TENANT_DELETE' : 'TENANT_UPDATE',
      resourceType: 'TENANT',
      resourceId: String(updated.id),
      message: isDeleteAction
        ? `테넌트 ${updated.name}(${updated.slug}) 삭제(상태 전환)`
        : `테넌트 ${updated.name}(${updated.slug}) 수정`,
      metadata: {
        changedFields: Object.keys(dto),
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
    await this.tenantsService.softDelete(id);
    await this.auditLogService.record({
      ...this.buildAuditContext(user, req),
      action: 'TENANT_DELETE',
      resourceType: 'TENANT',
      resourceId: String(id),
      message: `테넌트 ID ${id} 삭제(소프트)`,
    });
  }

  @Get(':id/settings')
  @ApiOperation({ summary: '테넌트 설정 조회 (EPS·스토리지·보관 주기)' })
  getSettings(@Param('id', ParseIntPipe) id: number) {
    return this.tenantsService.getSettings(id);
  }
}
