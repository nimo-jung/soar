import { PlaybooksService } from './playbooks.service';
declare class CreatePlaybookDto {
    name: string;
    description?: string;
    definition: Record<string, unknown>;
}
export declare class PlaybooksController {
    private readonly playbooksService;
    constructor(playbooksService: PlaybooksService);
    findAll(): Promise<import("./entities/playbook.entity").Playbook[]>;
    create(dto: CreatePlaybookDto, user: {
        sub: number;
    }): Promise<import("./entities/playbook.entity").Playbook>;
    execute(id: number): Promise<import("./entities/playbook-run.entity").PlaybookRun>;
}
export {};
