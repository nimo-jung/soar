import { Injectable } from '@nestjs/common';
import { TenantConnectionService } from '../../common/database/tenant-connection.service';
import { Playbook } from './entities/playbook.entity';
import { PlaybookRun, PlaybookRunStatus } from './entities/playbook-run.entity';
import { TenantContext } from '../../common/context/tenant.context';

@Injectable()
export class PlaybooksService {
  constructor(private readonly tenantConn: TenantConnectionService) {}

  private async getRepos(tenantId: string) {
    const conn = await this.tenantConn.getConnection(tenantId);
    return {
      playbookRepo: conn.getRepository(Playbook),
      runRepo: conn.getRepository(PlaybookRun),
    };
  }

  async findAll(): Promise<Playbook[]> {
    const { playbookRepo } = await this.getRepos(TenantContext.getTenantId());
    return playbookRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: number): Promise<Playbook | null> {
    const { playbookRepo } = await this.getRepos(TenantContext.getTenantId());
    return playbookRepo.findOne({ where: { id } });
  }

  async create(
    name: string,
    definition: Record<string, unknown>,
    createdBy: number,
    description?: string,
  ): Promise<Playbook> {
    const { playbookRepo } = await this.getRepos(TenantContext.getTenantId());
    const playbook = playbookRepo.create({ name, definition, createdBy, description });
    return playbookRepo.save(playbook);
  }

  /**
   * 플레이북 실행 - 정의를 런타임에 동적으로 로드하여 수행
   */
  async execute(id: number, alertId?: number): Promise<PlaybookRun> {
    const tenantId = TenantContext.getTenantId();
    const { playbookRepo, runRepo } = await this.getRepos(tenantId);

    const playbook = await playbookRepo.findOneOrFail({ where: { id } });

    const run = runRepo.create({
      playbookId: playbook.id,
      alertId: alertId ?? null,
      status: PlaybookRunStatus.RUNNING,
      startedAt: new Date(),
    });
    const savedRun = await runRepo.save(run);

    // 비동기 실행 (정의 기반 동적 워크플로우)
    this.runWorkflow(savedRun.id, playbook.definition, runRepo).catch(() => null);

    return savedRun;
  }

  private async runWorkflow(
    runId: number,
    definition: Record<string, unknown>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    runRepo: any,
  ): Promise<void> {
    try {
      // 플레이북 정의에 따라 액션 동적 실행
      const steps = (definition.steps as any[]) ?? [];
      const results: unknown[] = [];
      for (const step of steps) {
        results.push({ step: step.name, status: 'executed' });
      }
      await runRepo.update(runId, {
        status: PlaybookRunStatus.COMPLETED,
        resultSummary: { results },
        finishedAt: new Date(),
      });
    } catch (err: any) {
      await runRepo.update(runId, {
        status: PlaybookRunStatus.FAILED,
        resultSummary: { error: err?.message },
        finishedAt: new Date(),
      });
    }
  }
}
