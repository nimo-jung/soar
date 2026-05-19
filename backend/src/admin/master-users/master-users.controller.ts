import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuditLogService } from '../../common/audit/audit-log.service';
import { AuditActorType } from '../../common/audit/entities/audit-log.entity';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { MasterGuard } from '../../common/guards/master.guard';
import { CreateMasterUserDto } from './dto/create-master-user.dto';
import { UpdateMasterUserDto } from './dto/update-master-user.dto';
import { MasterUsersService } from './master-users.service';

@ApiTags('Admin - Master Users')
@ApiBearerAuth()
@UseGuards(MasterGuard)
@Controller('admin/master-users')
export class MasterUsersController {
  constructor(
    private readonly masterUsersService: MasterUsersService,
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

  @Get()
  @ApiOperation({ summary: '마스터 관리자 목록 조회 (삭제 포함)' })
  findAll() {
    return this.masterUsersService.findAll();
  }

  @Post()
  @ApiOperation({ summary: '마스터 관리자 생성' })
  async create(@Body() dto: CreateMasterUserDto, @CurrentUser() user: CurrentUserPayload, @Req() req: Request) {
    const created = await this.masterUsersService.create(dto);
    await this.auditLogService.record({
      ...this.buildAuditContext(user, req),
      action: 'MASTER_USER_CREATE',
      resourceType: 'MASTER_USER',
      resourceId: String(created.id),
      message: [
        '마스터 관리자 생성',
        `email=${this.safe(created.email)}`,
        `isActive=${this.safe(created.isActive)}`,
        `status=${this.safe(created.status)}`,
      ].join(' | '),
      metadata: {
        email: created.email,
        isActive: created.isActive,
        status: created.status,
      },
    });
    return created;
  }

  @Patch(':id')
  @ApiOperation({ summary: '마스터 관리자 수정' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMasterUserDto,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    const before = await this.masterUsersService.findOne(id);
    const updated = await this.masterUsersService.update(id, dto);
    await this.auditLogService.record({
      ...this.buildAuditContext(user, req),
      action: 'MASTER_USER_UPDATE',
      resourceType: 'MASTER_USER',
      resourceId: String(updated.id),
      message: [
        '마스터 관리자 수정',
        `email=${this.safe(before.email)} -> ${this.safe(updated.email)}`,
        `isActive=${this.safe(before.isActive)} -> ${this.safe(updated.isActive)}`,
        `status=${this.safe(before.status)} -> ${this.safe(updated.status)}`,
      ].join(' | '),
      metadata: {
        changedFields: Object.keys(dto),
        before,
        after: updated,
      },
    });
    return updated;
  }

  @Patch(':id/delete')
  @ApiOperation({ summary: '마스터 관리자 소프트 삭제' })
  async softDelete(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    const before = await this.masterUsersService.findOne(id);
    const deleted = await this.masterUsersService.softDelete(id);
    await this.auditLogService.record({
      ...this.buildAuditContext(user, req),
      action: 'MASTER_USER_DELETE',
      resourceType: 'MASTER_USER',
      resourceId: String(id),
      message: [
        '마스터 관리자 삭제(소프트)',
        `email=${this.safe(before.email)}`,
        `status=${this.safe(before.status)} -> ${this.safe(deleted.status)}`,
      ].join(' | '),
      metadata: {
        before,
        after: deleted,
      },
    });
    return deleted;
  }

  @Patch(':id/restore')
  @ApiOperation({ summary: '마스터 관리자 복구' })
  async restore(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    const before = await this.masterUsersService.findOne(id);
    const restored = await this.masterUsersService.restore(id);
    await this.auditLogService.record({
      ...this.buildAuditContext(user, req),
      action: 'MASTER_USER_RESTORE',
      resourceType: 'MASTER_USER',
      resourceId: String(id),
      message: [
        '마스터 관리자 복구',
        `email=${this.safe(before.email)}`,
        `status=${this.safe(before.status)} -> ${this.safe(restored.status)}`,
      ].join(' | '),
      metadata: {
        before,
        after: restored,
      },
    });
    return restored;
  }
}
