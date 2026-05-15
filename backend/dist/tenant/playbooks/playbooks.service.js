"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlaybooksService = void 0;
const common_1 = require("@nestjs/common");
const tenant_connection_service_1 = require("../../common/database/tenant-connection.service");
const playbook_entity_1 = require("./entities/playbook.entity");
const playbook_run_entity_1 = require("./entities/playbook-run.entity");
const tenant_context_1 = require("../../common/context/tenant.context");
let PlaybooksService = class PlaybooksService {
    tenantConn;
    constructor(tenantConn) {
        this.tenantConn = tenantConn;
    }
    async getRepos(tenantId) {
        const conn = await this.tenantConn.getConnection(tenantId);
        return {
            playbookRepo: conn.getRepository(playbook_entity_1.Playbook),
            runRepo: conn.getRepository(playbook_run_entity_1.PlaybookRun),
        };
    }
    async findAll() {
        const { playbookRepo } = await this.getRepos(tenant_context_1.TenantContext.getTenantId());
        return playbookRepo.find({ order: { createdAt: 'DESC' } });
    }
    async findOne(id) {
        const { playbookRepo } = await this.getRepos(tenant_context_1.TenantContext.getTenantId());
        return playbookRepo.findOne({ where: { id } });
    }
    async create(name, definition, createdBy, description) {
        const { playbookRepo } = await this.getRepos(tenant_context_1.TenantContext.getTenantId());
        const playbook = playbookRepo.create({ name, definition, createdBy, description });
        return playbookRepo.save(playbook);
    }
    async execute(id, alertId) {
        const tenantId = tenant_context_1.TenantContext.getTenantId();
        const { playbookRepo, runRepo } = await this.getRepos(tenantId);
        const playbook = await playbookRepo.findOneOrFail({ where: { id } });
        const run = runRepo.create({
            playbookId: playbook.id,
            alertId: alertId ?? null,
            status: playbook_run_entity_1.PlaybookRunStatus.RUNNING,
            startedAt: new Date(),
        });
        const savedRun = await runRepo.save(run);
        this.runWorkflow(savedRun.id, playbook.definition, runRepo).catch(() => null);
        return savedRun;
    }
    async runWorkflow(runId, definition, runRepo) {
        try {
            const steps = definition.steps ?? [];
            const results = [];
            for (const step of steps) {
                results.push({ step: step.name, status: 'executed' });
            }
            await runRepo.update(runId, {
                status: playbook_run_entity_1.PlaybookRunStatus.COMPLETED,
                resultSummary: { results },
                finishedAt: new Date(),
            });
        }
        catch (err) {
            await runRepo.update(runId, {
                status: playbook_run_entity_1.PlaybookRunStatus.FAILED,
                resultSummary: { error: err?.message },
                finishedAt: new Date(),
            });
        }
    }
};
exports.PlaybooksService = PlaybooksService;
exports.PlaybooksService = PlaybooksService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [tenant_connection_service_1.TenantConnectionService])
], PlaybooksService);
//# sourceMappingURL=playbooks.service.js.map