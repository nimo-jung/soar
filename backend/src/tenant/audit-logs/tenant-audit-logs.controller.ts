import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard, TenantRole } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { GetTenantAuditLogsQueryDto } from './dto/get-tenant-audit-logs-query.dto';
import { TenantAuditLogsService } from './tenant-audit-logs.service';

@ApiTags('Tenant - Audit Logs')
@ApiBearerAuth()
@UseGuards(TenantGuard, RolesGuard)
@Controller('api/audit-logs')
export class TenantAuditLogsController {
  constructor(private readonly tenantAuditLogsService: TenantAuditLogsService) {}

  @Get()
  @Roles(TenantRole.OPERATOR, TenantRole.ANALYST, TenantRole.AUDITOR)
  @ApiOperation({ summary: '테넌트 감사 로그 목록 조회' })
  findAll(
    @CurrentUser() user: { tenantSlug?: string; tenantId?: string },
    @Query() query: GetTenantAuditLogsQueryDto,
  ) {
    const tenantSlug = user.tenantSlug ?? user.tenantId ?? '';
    return this.tenantAuditLogsService.findAll(tenantSlug, query);
  }
}
