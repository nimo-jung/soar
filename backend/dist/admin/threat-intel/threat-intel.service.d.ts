import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { ThreatIntelFeed } from './entities/threat-intel-feed.entity';
import { CreateThreatIntelDto } from './dto/create-threat-intel.dto';
import { KafkaProducerService } from '../../common/messaging/kafka-producer.service';
export declare class ThreatIntelService {
    private readonly feedRepo;
    private readonly kafkaProducerService;
    private readonly configService;
    private readonly topic;
    constructor(feedRepo: Repository<ThreatIntelFeed>, kafkaProducerService: KafkaProducerService, configService: ConfigService);
    create(dto: CreateThreatIntelDto): Promise<ThreatIntelFeed>;
    findAll(): Promise<ThreatIntelFeed[]>;
    deactivate(id: number): Promise<void>;
    dispatchFeed(id: number): Promise<ThreatIntelFeed>;
}
