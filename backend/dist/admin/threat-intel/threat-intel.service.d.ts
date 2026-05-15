import { Repository } from 'typeorm';
import { ThreatIntelFeed } from './entities/threat-intel-feed.entity';
import { CreateThreatIntelDto } from './dto/create-threat-intel.dto';
export declare class ThreatIntelService {
    private readonly feedRepo;
    constructor(feedRepo: Repository<ThreatIntelFeed>);
    create(dto: CreateThreatIntelDto): Promise<ThreatIntelFeed>;
    findAll(): Promise<ThreatIntelFeed[]>;
    deactivate(id: number): Promise<void>;
}
