import { Controller, Get, Post, Body, Param, ParseIntPipe, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import type { Request } from 'express';
import { PlaybooksService } from './playbooks.service';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard, TenantRole } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AuditLogService } from '../../common/audit/audit-log.service';
import { AuditActorType } from '../../common/audit/entities/audit-log.entity';

class CreatePlaybookDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: '워크플로우 정의 JSON' })
  definition: Record<string, unknown>;
}

@ApiTags('Tenant - Playbooks')
@ApiBearerAuth()
@UseGuards(TenantGuard, RolesGuard)
@Controller('api/playbooks')
export class PlaybooksController {
  constructor(
    private readonly playbooksService: PlaybooksService,
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

  @Get()
  @Roles(TenantRole.OPERATOR, TenantRole.ANALYST, TenantRole.AUDITOR)
  @ApiOperation({ summary: '플레이북 목록 조회' })
  findAll() {
    return this.playbooksService.findAll();
  }

  @Post()
  @Roles(TenantRole.OPERATOR)
  @ApiOperation({ summary: '플레이북 생성' })
  async create(
    @Body() dto: CreatePlaybookDto,
    @CurrentUser() user: { sub: number; tenantId?: string },
    @Req() req: Request,
  ) {
    const created = await this.playbooksService.create(dto.name, dto.definition, user.sub, dto.description);
    await this.auditLogService.record({
      ...this.buildAuditContext(user, req),
      action: 'PLAYBOOK_CREATE',
      resourceType: 'PLAYBOOK',
      resourceId: String(created.id),
      message: '플레이북 생성',
      metadata: {
        name: created.name,
        status: created.status,
      },
    });

    return created;
  }

  @Post(':id/execute')
  @Roles(TenantRole.OPERATOR, TenantRole.ANALYST)
  @ApiOperation({ summary: '플레이북 즉시 실행 (정의 동적 로드)' })
  async execute(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { sub: number; tenantId?: string },
    @Req() req: Request,
  ) {
    const result = await this.playbooksService.execute(id);
    await this.auditLogService.record({
      ...this.buildAuditContext(user, req),
      action: 'PLAYBOOK_EXECUTE',
      resourceType: 'PLAYBOOK',
      resourceId: String(id),
      message: '플레이북 실행',
      metadata: {
        runId: result?.id ?? null,
        status: result?.status ?? null,
      },
    });

    return result;
  }
}
