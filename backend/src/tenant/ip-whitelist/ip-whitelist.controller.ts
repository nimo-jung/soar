import { Controller, Get, Post, Delete, Body, Param, ParseIntPipe, UseGuards, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import type { Request } from 'express';
import { IpWhitelistService } from './ip-whitelist.service';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard, TenantRole } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuditLogService } from '../../common/audit/audit-log.service';
import { AuditActorType } from '../../common/audit/entities/audit-log.entity';

class CreateIpWhitelistDto {
  @ApiProperty({ example: '192.168.1.0/24' })
  @IsString()
  ipAddress: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;
}

@ApiTags('Tenant - IP Whitelist')
@ApiBearerAuth()
@UseGuards(TenantGuard, RolesGuard)
@Controller('api/ip-whitelist')
export class IpWhitelistController {
  constructor(
    private readonly ipWhitelistService: IpWhitelistService,
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
  @ApiOperation({ summary: 'IP 화이트리스트 조회' })
  findAll() {
    return this.ipWhitelistService.findAll();
  }

  @Post()
  @Roles(TenantRole.OPERATOR)
  @ApiOperation({ summary: 'IP 화이트리스트 항목 추가' })
  async create(
    @Body() dto: CreateIpWhitelistDto,
    @CurrentUser() user: { sub: number; tenantId?: string },
    @Req() req: Request,
  ) {
    const created = await this.ipWhitelistService.create(dto.ipAddress, dto.description);
    await this.auditLogService.record({
      ...this.buildAuditContext(user, req),
      action: 'IP_WHITELIST_CREATE',
      resourceType: 'IP_WHITELIST',
      resourceId: String(created.id),
      message: 'IP 화이트리스트 항목 추가',
      metadata: {
        ipAddress: created.ipAddress,
        description: created.description,
      },
    });

    return created;
  }

  @Delete(':id')
  @Roles(TenantRole.OPERATOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'IP 화이트리스트 항목 비활성화' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { sub: number; tenantId?: string },
    @Req() req: Request,
  ) {
    await this.ipWhitelistService.remove(id);
    await this.auditLogService.record({
      ...this.buildAuditContext(user, req),
      action: 'IP_WHITELIST_DELETE',
      resourceType: 'IP_WHITELIST',
      resourceId: String(id),
      message: 'IP 화이트리스트 항목 비활성화',
    });
  }
}
