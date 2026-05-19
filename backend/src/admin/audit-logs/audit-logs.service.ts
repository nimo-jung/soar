import { Injectable } from '@nestjs/common';
import { AuditLogService } from '../../common/audit/audit-log.service';
import { GetAuditLogsQueryDto } from './dto/get-audit-logs-query.dto';

@Injectable()
export class AuditLogsService {
  constructor(private readonly auditLogService: AuditLogService) {}

  findAll(query: GetAuditLogsQueryDto) {
    return this.auditLogService.findAll(query);
  }
}
