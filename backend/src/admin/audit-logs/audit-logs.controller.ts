import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MasterGuard } from '../../common/guards/master.guard';
import { AuditLogsService } from './audit-logs.service';
import { GetAuditLogsQueryDto } from './dto/get-audit-logs-query.dto';

@ApiTags('Admin - Audit Logs')
@ApiBearerAuth()
@UseGuards(MasterGuard)
@Controller('admin/audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @ApiOperation({ summary: '감사 로그 목록 조회' })
  findAll(@Query() query: GetAuditLogsQueryDto) {
    return this.auditLogsService.findAll(query);
  }
}
