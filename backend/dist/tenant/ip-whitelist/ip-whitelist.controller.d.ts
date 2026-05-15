import { IpWhitelistService } from './ip-whitelist.service';
declare class CreateIpWhitelistDto {
    ipAddress: string;
    description?: string;
}
export declare class IpWhitelistController {
    private readonly ipWhitelistService;
    constructor(ipWhitelistService: IpWhitelistService);
    findAll(): Promise<import("./entities/ip-whitelist.entity").IpWhitelist[]>;
    create(dto: CreateIpWhitelistDto): Promise<import("./entities/ip-whitelist.entity").IpWhitelist>;
    remove(id: number): Promise<void>;
}
export {};
