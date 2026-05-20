import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard, TenantRole } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuditLogService } from '../../common/audit/audit-log.service';
import { AuditActorType } from '../../common/audit/entities/audit-log.entity';
import { UsersService } from './users.service';
import { CreateTenantUserDto } from './dto/create-tenant-user.dto';
import { UpdateTenantUserDto } from './dto/update-tenant-user.dto';

@ApiTags('Tenant - Users')
@ApiBearerAuth()
@UseGuards(TenantGuard, RolesGuard)
@Controller('api/users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
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
  @Roles(TenantRole.OPERATOR, TenantRole.AUDITOR)
  @ApiOperation({ summary: '테넌트 사용자 목록 조회' })
  findAll() {
    return this.usersService.findAll();
  }

  @Post()
  @Roles(TenantRole.OPERATOR)
  @ApiOperation({ summary: '테넌트 사용자 생성' })
  async create(
    @Body() dto: CreateTenantUserDto,
    @CurrentUser() user: { sub: number; tenantId?: string },
    @Req() req: Request,
  ) {
    const created = await this.usersService.create(dto);
    await this.auditLogService.record({
      ...this.buildAuditContext(user, req),
      action: 'TENANT_USER_CREATE',
      resourceType: 'TENANT_USER',
      resourceId: String(created.id),
      message: '테넌트 사용자 생성',
      metadata: {
        email: created.email,
        role: created.role,
        isActive: created.isActive,
      },
    });
    return created;
  }

  @Patch(':id')
  @Roles(TenantRole.OPERATOR)
  @ApiOperation({ summary: '테넌트 사용자 정보 수정' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTenantUserDto,
    @CurrentUser() user: { sub: number; tenantId?: string },
    @Req() req: Request,
  ) {
    const updated = await this.usersService.update(id, dto);
    await this.auditLogService.record({
      ...this.buildAuditContext(user, req),
      action: 'TENANT_USER_UPDATE',
      resourceType: 'TENANT_USER',
      resourceId: String(id),
      message: '테넌트 사용자 정보 수정',
      metadata: {
        displayName: updated.displayName,
        role: updated.role,
        isActive: updated.isActive,
        passwordChanged: dto.password !== undefined,
      },
    });
    return updated;
  }

  @Patch(':id/deactivate')
  @Roles(TenantRole.OPERATOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '테넌트 사용자 비활성화' })
  async deactivate(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { sub: number; tenantId?: string },
    @Req() req: Request,
  ) {
    await this.usersService.deactivate(id);
    await this.auditLogService.record({
      ...this.buildAuditContext(user, req),
      action: 'TENANT_USER_DEACTIVATE',
      resourceType: 'TENANT_USER',
      resourceId: String(id),
      message: '테넌트 사용자 비활성화',
    });
  }
}
