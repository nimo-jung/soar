// networks.controller.ts
import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, UseGuards, Req, HttpCode, HttpStatus, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import type { Request } from 'express';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard, TenantRole } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
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

  private buildAuditContext(user: any, req: Request) {
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
  @ApiOperation({ summary: '해당 테넌트의 토폴로지 전체 데이터(Nodes, Edges) 조회' })
  findAll(@CurrentUser() user: { tenantId: string }) {
    // 테넌트 고유 ID를 전달하여 다른 테넌트의 자원 침범을 원천 격리
    return this.networksService.findAllByTenant(user.tenantId);
  }

  @Post()
  @Roles(TenantRole.OPERATOR)
  @ApiOperation({ summary: '네트워크 노드 생성' })
  async create(
    @Body() dto: CreateNetworkDto,
    @CurrentUser() user: { sub: number; tenantSlug?: string; tenantId: string },
    @Req() req: Request,
  ) {
    const created = await this.networksService.create(user.tenantId, dto);

    await this.auditLogService.record({
      ...this.buildAuditContext(user, req),
      action: 'NETWORK_CREATE',
      resourceType: 'NETWORK',
      resourceId: String((created as any).id),
      message: '네트워크 대역 노드 생성',
      metadata: { ...dto },
    });
    return created;
  }
  
  @Patch('nodes/:id/position/')
  @Roles(TenantRole.OPERATOR)
  @ApiOperation({ summary: '노드 컴포넌트 ReactFlow 배치 좌표 갱신' })
  async updatePosition(
    @Param('id', ParseIntPipe) id: number,
    @Body() positionDto: { x_pos: number; y_pos: number },
    @CurrentUser() user: { tenantId: string },
  ) {
    return this.networksService.updateNodePosition(user.tenantId, id, positionDto.x_pos, positionDto.y_pos);
  }

  @Patch(':id') 
  @Roles(TenantRole.OPERATOR)
  @ApiOperation({ summary: '네트워크 노드 수정' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateNetworkDto,
    @CurrentUser() user: { tenantId: string },
    @Req() req: Request,
  ) {
    const updated = await this.networksService.update(user.tenantId, id, dto);
    if (!updated) {
      throw new NotFoundException('해당 테넌트 범위 내에 존재하지 않는 네트워크 자원입니다.');
    }

    await this.auditLogService.record({
      ...this.buildAuditContext(user, req),
      action: 'NETWORK_UPDATE',
      resourceType: 'NETWORK',
      resourceId: String(id),
      message: '네트워크 대역 노드 수정',
      metadata: { ...dto },
    });
    return updated;
  }

  @Delete(':id')
  @Roles(TenantRole.OPERATOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '네트워크 노드 삭제' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { sub: number; tenantSlug?: string; tenantId: string },
    @Req() req: Request,
  ) {
    const result = await this.networksService.remove(user.tenantId, id);
    if (!result || result.affected === 0) {
      throw new NotFoundException('해당 테넌트 범위 내에 존재하지 않는 네트워크 자원입니다.');
    }

    await this.auditLogService.record({
      ...this.buildAuditContext(user, req),
      action: 'NETWORK_DELETE',
      resourceType: 'NETWORK',
      resourceId: String(id),
      message: '네트워크 노드 삭제',
    });
  }

  @Post('edges')
  @Roles(TenantRole.OPERATOR)
  @ApiOperation({ summary: '네트워크 선(Edge) 연결선 생성' })
  async createEdge(
    @Body() edgeDto: { source_id: number; target_id: number; label?: string; type?: string },
    @CurrentUser() user: { sub: number; tenantId: string },
  ) {
    return this.networksService.createEdge(user.tenantId, edgeDto);
  }

  @Delete('edges/:id')
  @Roles(TenantRole.OPERATOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '네트워크 연결선(Edge) 삭제' })
  async removeEdge(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { tenantId: string },
  ) {
    await this.networksService.removeEdge(user.tenantId, id);
  }
}