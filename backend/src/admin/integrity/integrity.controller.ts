import {
  Controller, Get, Post, Delete, Body, Param,
  ParseIntPipe, UseGuards, HttpCode, HttpStatus, Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import type { Request } from 'express';
import { IntegrityService } from './integrity.service';
import { RegisterIntegrityDto } from './dto/register-integrity.dto';
import { MasterGuard } from '../../common/guards/master.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { AuditLogService } from '../../common/audit/audit-log.service';
import { AuditActorType } from '../../common/audit/entities/audit-log.entity';

@ApiTags('Admin - Integrity')
@ApiBearerAuth()
@UseGuards(MasterGuard)
@Controller('admin/integrity')
export class IntegrityController {
  constructor(
    private readonly integritySvc: IntegrityService,
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
  @ApiOperation({ summary: '무결성 기준 파일 목록 조회' })
  findAll() {
    return this.integritySvc.findAll();
  }

  @Post('check')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '전체 파일 무결성 점검 실행' })
  async checkAll(
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    const result = await this.integritySvc.checkAll();
    const totalChecked = result.length;
    const mismatchedCount = result.filter((item) => item.status === 'CHANGED').length;
    await this.auditLogService.record({
      ...this.buildAuditContext(user, req),
      action: 'INTEGRITY_CHECK_ALL',
      resourceType: 'INTEGRITY_BASELINE',
      message: `무결성 전체 점검 실행 | checked=${totalChecked} | mismatched=${mismatchedCount}`,
      metadata: {
        totalChecked,
        mismatchedCount,
      },
    });
    return result;
  }

  @Post(':id/sync')
  @ApiOperation({ summary: '특정 파일 기준 해시 동기화 (현재 상태를 baseline으로 설정)' })
  async sync(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    const result = await this.integritySvc.sync(id);
    await this.auditLogService.record({
      ...this.buildAuditContext(user, req),
      action: 'INTEGRITY_SYNC',
      resourceType: 'INTEGRITY_BASELINE',
      resourceId: String(id),
      message: `무결성 기준 동기화 | filePath=${result.filePath} | hash=${result.expectedHash?.substring(0, 16) ?? ''}...`,
      metadata: { filePath: result.filePath, expectedHash: result.expectedHash },
    });
    return result;
  }

  @Post('register')
  @ApiOperation({ summary: '무결성 점검 파일 등록' })
  async register(
    @Body() dto: RegisterIntegrityDto,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    const result = await this.integritySvc.register(dto);
    await this.auditLogService.record({
      ...this.buildAuditContext(user, req),
      action: 'INTEGRITY_REGISTER',
      resourceType: 'INTEGRITY_BASELINE',
      resourceId: String(result.id),
      message: `무결성 점검 파일 등록 | filePath=${dto.filePath}`,
      metadata: { filePath: dto.filePath, fileLabel: dto.fileLabel },
    });
    return result;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '무결성 점검 파일 추적 삭제' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    await this.integritySvc.remove(id);
    await this.auditLogService.record({
      ...this.buildAuditContext(user, req),
      action: 'INTEGRITY_REMOVE',
      resourceType: 'INTEGRITY_BASELINE',
      resourceId: String(id),
      message: `무결성 점검 파일 추적 삭제 | id=${id}`,
    });
  }
}
