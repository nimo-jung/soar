import { TenantConnectionService } from '../../common/database/tenant-connection.service';
import { Playbook } from './entities/playbook.entity';
import { PlaybookRun } from './entities/playbook-run.entity';
export declare class PlaybooksService {
    private readonly tenantConn;
    constructor(tenantConn: TenantConnectionService);
    private getRepos;
    findAll(): Promise<Playbook[]>;
    findOne(id: number): Promise<Playbook | null>;
    create(name: string, definition: Record<string, unknown>, createdBy: number, description?: string): Promise<Playbook>;
    execute(id: number, alertId?: number): Promise<PlaybookRun>;
    private runWorkflow;
}
