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
import { ParsingRulesService } from './parsing-rules.service';
import { CreateParsingRuleDto } from './dto/create-parsing-rule.dto';
import { UpdateParsingRuleDto } from './dto/update-parsing-rule.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuditLogService } from '../../common/audit/audit-log.service';
import { AuditActorType } from '../../common/audit/entities/audit-log.entity';

@ApiTags('Tenant - Parsing Rules')
@ApiBearerAuth()
@UseGuards(TenantGuard, RolesGuard)
@Controller('api/parsing-rules')
export class ParsingRulesController {
  constructor(
    private readonly parsingRulesService: ParsingRulesService,
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
  @ApiOperation({ summary: '파싱 룰 목록 조회' })
  findAll() {
    return this.parsingRulesService.findAll();
  }

  @Post()
  @Roles(TenantRole.OPERATOR)
  @ApiOperation({ summary: '파싱 룰 생성 및 Redis 캐시 반영' })
  async create(
    @Body() dto: CreateParsingRuleDto,
    @CurrentUser() user: { sub: number; tenantId?: string },
    @Req() req: Request,
  ) {
    const created = await this.parsingRulesService.create(dto);
    await this.auditLogService.record({
      ...this.buildAuditContext(user, req),
      action: 'PARSING_RULE_CREATE',
      resourceType: 'PARSING_RULE',
      resourceId: String(created.id),
      message: '파싱 룰 생성',
      metadata: {
        name: created.name,
        priority: created.priority,
        logSourceType: created.logSourceType,
      },
    });
    return created;
  }

  @Patch(':id')
  @Roles(TenantRole.OPERATOR)
  @ApiOperation({ summary: '파싱 룰 수정 및 Redis 캐시 반영' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateParsingRuleDto,
    @CurrentUser() user: { sub: number; tenantId?: string },
    @Req() req: Request,
  ) {
    const updated = await this.parsingRulesService.update(id, dto);
    await this.auditLogService.record({
      ...this.buildAuditContext(user, req),
      action: 'PARSING_RULE_UPDATE',
      resourceType: 'PARSING_RULE',
      resourceId: String(id),
      message: '파싱 룰 수정',
      metadata: {
        name: updated.name,
        priority: updated.priority,
        isActive: updated.isActive,
      },
    });
    return updated;
  }

  @Patch(':id/deactivate')
  @Roles(TenantRole.OPERATOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '파싱 룰 비활성화 및 Redis 캐시 반영' })
  async deactivate(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { sub: number; tenantId?: string },
    @Req() req: Request,
  ) {
    await this.parsingRulesService.deactivate(id);
    await this.auditLogService.record({
      ...this.buildAuditContext(user, req),
      action: 'PARSING_RULE_DEACTIVATE',
      resourceType: 'PARSING_RULE',
      resourceId: String(id),
      message: '파싱 룰 비활성화',
    });
  }
}
