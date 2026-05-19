import type { Request } from 'express';
import { IpWhitelistService } from './ip-whitelist.service';
import { AuditLogService } from '../../common/audit/audit-log.service';
declare class CreateIpWhitelistDto {
    ipAddress: string;
    description?: string;
}
export declare class IpWhitelistController {
    private readonly ipWhitelistService;
    private readonly auditLogService;
    constructor(ipWhitelistService: IpWhitelistService, auditLogService: AuditLogService);
    private buildAuditContext;
    findAll(): Promise<import("./entities/ip-whitelist.entity").IpWhitelist[]>;
    create(dto: CreateIpWhitelistDto, user: {
        sub: number;
        tenantId?: string;
    }, req: Request): Promise<import("./entities/ip-whitelist.entity").IpWhitelist>;
    remove(id: number, user: {
        sub: number;
        tenantId?: string;
    }, req: Request): Promise<void>;
}
export {};
