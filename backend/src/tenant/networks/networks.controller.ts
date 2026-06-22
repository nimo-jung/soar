import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import type { Request } from 'express';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard, TenantRole } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { NetworksService } from './networks.service';
import { CreateNetworkDto } from './dto/create-network.dto';
import { UpdateNetworkDto } from './dto/update-network.dto';
import { AuditLogService } from '../../common/audit/audit-log.service';
import { AuditActorType } from '../../common/audit/entities/audit-log.entity';

@ApiTags('Tenant - Networks')
@ApiBearerAuth()
@UseGuards(TenantGuard, RolesGuard)
@Controller('api/networks')
export class NetworksController {
  constructor(
    private readonly networksService: NetworksService,
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
  @Roles(TenantRole.OPERATOR)
  @ApiOperation({ summary: '네트워크 목록 조회' })
  findAll() {
    return this.networksService.findAll();
  }

  @Post()
  @Roles(TenantRole.OPERATOR)
  @ApiOperation({ summary: '네트워크 생성' })
  async create(@Body() dto: CreateNetworkDto) {
    return this.networksService.create(dto);
  }

  @Patch(':id')
  @Roles(TenantRole.OPERATOR)
  @ApiOperation({ summary: '네트워크 정보 수정' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateNetworkDto
  ) {
    return this.networksService.update(id, dto);
  }

  @Delete(':id')
  @Roles(TenantRole.OPERATOR)
  @ApiOperation({ summary: '네트워크 삭제' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.networksService.remove(id);
  }
}
