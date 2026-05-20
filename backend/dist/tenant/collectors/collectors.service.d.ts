import type Redis from 'ioredis';
import { TenantConnectionService } from '../../common/database/tenant-connection.service';
import { Collector } from './entities/collector.entity';
import { CreateCollectorDto } from './dto/create-collector.dto';
export declare class CollectorsService {
    private readonly tenantConn;
    private readonly redis;
    constructor(tenantConn: TenantConnectionService, redis: Redis);
    private getRepo;
    create(dto: CreateCollectorDto): Promise<Collector & {
        plainApiKey: string;
    }>;
    findAll(): Promise<Collector[]>;
    deactivate(id: number): Promise<void>;
    private authKey;
    private collectorApiIndexKey;
    private persistApiKeyMapping;
    private revokeApiKeyMappings;
}
