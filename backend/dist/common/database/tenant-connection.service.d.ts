import { OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
export declare class TenantConnectionService implements OnModuleDestroy {
    private readonly config;
    private readonly connections;
    constructor(config: ConfigService);
    getConnection(tenantId: string): Promise<DataSource>;
    closeConnection(tenantId: string): Promise<void>;
    onModuleDestroy(): Promise<void>;
}
