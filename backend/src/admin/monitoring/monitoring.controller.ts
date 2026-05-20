import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MasterGuard } from '../../common/guards/master.guard';
import { MonitoringService } from './monitoring.service';
import { GetMonitoringOverviewQueryDto } from './dto/get-monitoring-overview-query.dto';
import { GetMonitoringEventsQueryDto } from './dto/get-monitoring-events-query.dto';

@ApiTags('Admin - Monitoring')
@ApiBearerAuth()
@UseGuards(MasterGuard)
@Controller('admin/monitoring')
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  @Get('overview')
  @ApiOperation({ summary: '플랫폼 모니터링 개요 조회 (MVP 스켈레톤)' })
  getOverview(@Query() query: GetMonitoringOverviewQueryDto) {
    return this.monitoringService.getOverview(query);
  }

  @Get('events')
  @ApiOperation({ summary: '플랫폼 모니터링 이벤트 목록 조회 (MVP 스켈레톤)' })
  getEvents(@Query() query: GetMonitoringEventsQueryDto) {
    return this.monitoringService.getEvents(query);
  }
}
