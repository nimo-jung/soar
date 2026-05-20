import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { DataIsolationService } from './data-isolation.service';
import { MasterGuard } from '../../common/guards/master.guard';

@ApiTags('Admin - Data Isolation')
@ApiBearerAuth()
@UseGuards(MasterGuard)
@Controller('admin/data-isolation')
export class DataIsolationController {
  constructor(private readonly dataIsolationService: DataIsolationService) {}

  @Get('stats')
  @ApiOperation({ summary: '테넌트 데이터 격리 지표 조회' })
  getStats() {
    return this.dataIsolationService.getStats();
  }

  @Get('audit-gaps')
  @ApiOperation({ summary: '특정 테넌트 감사로그 컨텍스트 누락 분석' })
  @ApiQuery({ name: 'tenantSlug', required: true })
  getAuditGaps(@Query('tenantSlug') tenantSlug: string) {
    return this.dataIsolationService.getTenantAuditGaps(tenantSlug);
  }
}
