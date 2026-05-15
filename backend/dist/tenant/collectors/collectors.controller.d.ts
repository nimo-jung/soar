import { CollectorsService } from './collectors.service';
import { CreateCollectorDto } from './dto/create-collector.dto';
export declare class CollectorsController {
    private readonly collectorsService;
    constructor(collectorsService: CollectorsService);
    create(dto: CreateCollectorDto): Promise<import("./entities/collector.entity").Collector & {
        plainApiKey: string;
    }>;
    findAll(): Promise<import("./entities/collector.entity").Collector[]>;
    deactivate(id: number): Promise<void>;
}
