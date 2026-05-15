import { ThreatIntelService } from './threat-intel.service';
import { CreateThreatIntelDto } from './dto/create-threat-intel.dto';
export declare class ThreatIntelController {
    private readonly threatIntelService;
    constructor(threatIntelService: ThreatIntelService);
    create(dto: CreateThreatIntelDto): Promise<import("./entities/threat-intel-feed.entity").ThreatIntelFeed>;
    findAll(): Promise<import("./entities/threat-intel-feed.entity").ThreatIntelFeed[]>;
    deactivate(id: number): Promise<void>;
}
