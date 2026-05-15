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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const tenant_entity_1 = require("./entities/tenant.entity");
const tenant_settings_entity_1 = require("./entities/tenant-settings.entity");
let TenantsService = class TenantsService {
    tenantRepo;
    settingsRepo;
    dataSource;
    constructor(tenantRepo, settingsRepo, dataSource) {
        this.tenantRepo = tenantRepo;
        this.settingsRepo = settingsRepo;
        this.dataSource = dataSource;
    }
    async create(dto) {
        const existing = await this.tenantRepo.findOne({ where: { slug: dto.slug } });
        if (existing) {
            throw new common_1.ConflictException(`슬러그 '${dto.slug}'는 이미 사용 중입니다.`);
        }
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const tenant = this.tenantRepo.create(dto);
            const saved = await queryRunner.manager.save(tenant);
            const settings = this.settingsRepo.create({ tenantId: saved.id });
            await queryRunner.manager.save(settings);
            const dbName = `tenant_db_${dto.slug.replace(/-/g, '_')}`;
            await queryRunner.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
            await queryRunner.commitTransaction();
            return saved;
        }
        catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        }
        finally {
            await queryRunner.release();
        }
    }
    async findAll() {
        return this.tenantRepo.find({ order: { createdAt: 'DESC' } });
    }
    async findOne(id) {
        const tenant = await this.tenantRepo.findOne({ where: { id } });
        if (!tenant) {
            throw new common_1.NotFoundException(`테넌트 ID ${id}를 찾을 수 없습니다.`);
        }
        return tenant;
    }
    async update(id, dto) {
        const tenant = await this.findOne(id);
        Object.assign(tenant, dto);
        return this.tenantRepo.save(tenant);
    }
    async softDelete(id) {
        const tenant = await this.findOne(id);
        tenant.status = tenant_entity_1.TenantStatus.DELETED;
        await this.tenantRepo.save(tenant);
    }
    async getSettings(tenantId) {
        const settings = await this.settingsRepo.findOne({ where: { tenantId } });
        if (!settings) {
            throw new common_1.NotFoundException(`테넌트 ID ${tenantId}의 설정을 찾을 수 없습니다.`);
        }
        return settings;
    }
    async updateSettings(tenantId, updates) {
        const settings = await this.getSettings(tenantId);
        Object.assign(settings, updates);
        return this.settingsRepo.save(settings);
    }
};
exports.TenantsService = TenantsService;
exports.TenantsService = TenantsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(tenant_entity_1.Tenant)),
    __param(1, (0, typeorm_1.InjectRepository)(tenant_settings_entity_1.TenantSettings)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource])
], TenantsService);
//# sourceMappingURL=tenants.service.js.map