import type { Request } from 'express';
import { CollectorsService } from './collectors.service';
import { CreateCollectorDto } from './dto/create-collector.dto';
import { AuditLogService } from '../../common/audit/audit-log.service';
export declare class CollectorsController {
    private readonly collectorsService;
    private readonly auditLogService;
    constructor(collectorsService: CollectorsService, auditLogService: AuditLogService);
    private buildAuditContext;
    create(dto: CreateCollectorDto, user: {
        sub: number;
        tenantId?: string;
    }, req: Request): Promise<import("./entities/collector.entity").Collector & {
        plainApiKey: string;
    }>;
    findAll(): Promise<import("./entities/collector.entity").Collector[]>;
    deactivate(id: number, user: {
        sub: number;
        tenantId?: string;
    }, req: Request): Promise<void>;
}
