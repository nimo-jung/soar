import type { Request } from 'express';
import { PlaybooksService } from './playbooks.service';
import { AuditLogService } from '../../common/audit/audit-log.service';
declare class CreatePlaybookDto {
    name: string;
    description?: string;
    definition: Record<string, unknown>;
}
export declare class PlaybooksController {
    private readonly playbooksService;
    private readonly auditLogService;
    constructor(playbooksService: PlaybooksService, auditLogService: AuditLogService);
    private buildAuditContext;
    findAll(): Promise<import("./entities/playbook.entity").Playbook[]>;
    create(dto: CreatePlaybookDto, user: {
        sub: number;
        tenantId?: string;
    }, req: Request): Promise<import("./entities/playbook.entity").Playbook>;
    execute(id: number, user: {
        sub: number;
        tenantId?: string;
    }, req: Request): Promise<import("./entities/playbook-run.entity").PlaybookRun>;
}
export {};
