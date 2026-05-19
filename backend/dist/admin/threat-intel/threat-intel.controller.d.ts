import type { Request } from 'express';
import { ThreatIntelService } from './threat-intel.service';
import { CreateThreatIntelDto } from './dto/create-threat-intel.dto';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { AuditLogService } from '../../common/audit/audit-log.service';
export declare class ThreatIntelController {
    private readonly threatIntelService;
    private readonly auditLogService;
    constructor(threatIntelService: ThreatIntelService, auditLogService: AuditLogService);
    private buildAuditContext;
    create(dto: CreateThreatIntelDto, user: CurrentUserPayload, req: Request): Promise<import("./entities/threat-intel-feed.entity").ThreatIntelFeed>;
    findAll(): Promise<import("./entities/threat-intel-feed.entity").ThreatIntelFeed[]>;
    deactivate(id: number, user: CurrentUserPayload, req: Request): Promise<void>;
}
