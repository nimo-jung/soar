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
const tenant_tier_entity_1 = require("./entities/tenant-tier.entity");
let TenantsService = class TenantsService {
    tenantRepo;
    settingsRepo;
    tierRepo;
    dataSource;
    constructor(tenantRepo, settingsRepo, tierRepo, dataSource) {
        this.tenantRepo = tenantRepo;
        this.settingsRepo = settingsRepo;
        this.tierRepo = tierRepo;
        this.dataSource = dataSource;
    }
    async findTierForTenantByCode(code) {
        const activeTier = await this.tierRepo
            .createQueryBuilder('tier')
            .where('tier.code = :code', { code })
            .andWhere('tier.is_active = :isActive', { isActive: true })
            .orderBy('tier.id', 'ASC')
            .getOne();
        if (activeTier) {
            return activeTier;
        }
        return this.tierRepo
            .createQueryBuilder('tier')
            .where('tier.code = :code', { code })
            .orderBy('tier.id', 'ASC')
            .getOne();
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
            const tierCode = dto.tierCode ?? tenant_tier_entity_1.TenantTierCode.LITE;
            const tier = await this.findTierForTenantByCode(tierCode);
            if (!tier) {
                throw new common_1.NotFoundException(`등급 코드 ${tierCode}를 찾을 수 없습니다.`);
            }
            const tenant = this.tenantRepo.create({
                slug: dto.slug,
                name: dto.name,
                contactEmail: dto.contactEmail,
                tierCode,
                ipCidr: dto.ipCidr ?? null,
                expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
            });
            const saved = await queryRunner.manager.save(tenant);
            const settings = this.settingsRepo.create({
                tenantId: saved.id,
                storageQuotaGb: tier.dailyLogQuotaGb,
            });
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
        return this.tenantRepo.find({ relations: ['tier'], order: { createdAt: 'DESC' } });
    }
    async findOne(id) {
        const tenant = await this.tenantRepo.findOne({ where: { id }, relations: ['tier'] });
        if (!tenant) {
            throw new common_1.NotFoundException(`테넌트 ID ${id}를 찾을 수 없습니다.`);
        }
        return tenant;
    }
    async update(id, dto) {
        const tenant = await this.findOne(id);
        if (dto.tierCode) {
            const tier = await this.findTierForTenantByCode(dto.tierCode);
            if (!tier) {
                throw new common_1.NotFoundException(`등급 코드 ${dto.tierCode}를 찾을 수 없습니다.`);
            }
            const settings = await this.settingsRepo.findOne({ where: { tenantId: id } });
            if (settings) {
                settings.storageQuotaGb = tier.dailyLogQuotaGb;
                await this.settingsRepo.save(settings);
            }
        }
        const normalized = {
            ...dto,
            expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : tenant.expiresAt,
        };
        Object.assign(tenant, normalized);
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
    async getTiers() {
        return this.tierRepo.find({ order: { id: 'ASC' } });
    }
    async validateTierDuplicateRules(name, dailyLogQuotaGb, maxUsers, excludeId) {
        const trimmedName = name.trim();
        const nameQuery = this.tierRepo
            .createQueryBuilder('tier')
            .where('LOWER(tier.name) = LOWER(:name)', { name: trimmedName });
        if (excludeId) {
            nameQuery.andWhere('tier.id != :excludeId', { excludeId });
        }
        const duplicatedName = await nameQuery.getOne();
        if (duplicatedName) {
            throw new common_1.ConflictException(`등급명 '${trimmedName}'은(는) 이미 존재합니다.`);
        }
        const comboQuery = this.tierRepo
            .createQueryBuilder('tier')
            .where('tier.daily_log_quota_gb = :dailyLogQuotaGb', { dailyLogQuotaGb })
            .andWhere('tier.max_users = :maxUsers', { maxUsers });
        if (excludeId) {
            comboQuery.andWhere('tier.id != :excludeId', { excludeId });
        }
        const duplicatedCombo = await comboQuery.getOne();
        if (duplicatedCombo) {
            throw new common_1.ConflictException(`일일 로그 용량 ${dailyLogQuotaGb}GB + 사용자 수 ${maxUsers}명 조합은 이미 존재합니다.`);
        }
    }
    async createTier(dto) {
        await this.validateTierDuplicateRules(dto.name, dto.dailyLogQuotaGb, dto.maxUsers);
        const tier = this.tierRepo.create({
            ...dto,
            name: dto.name.trim(),
            description: dto.description?.trim() ?? null,
        });
        return this.tierRepo.save(tier);
    }
    async updateTier(id, dto) {
        const tier = await this.tierRepo.findOne({ where: { id } });
        if (!tier) {
            throw new common_1.NotFoundException(`등급 ID ${id}를 찾을 수 없습니다.`);
        }
        const nextName = dto.name ?? tier.name;
        const nextDailyLogQuotaGb = dto.dailyLogQuotaGb ?? tier.dailyLogQuotaGb;
        const nextMaxUsers = dto.maxUsers ?? tier.maxUsers;
        await this.validateTierDuplicateRules(nextName, nextDailyLogQuotaGb, nextMaxUsers, id);
        const normalizedDto = {
            ...dto,
            name: dto.name?.trim(),
            description: dto.description?.trim(),
        };
        Object.assign(tier, normalizedDto);
        const savedTier = await this.tierRepo.save(tier);
        if (dto.dailyLogQuotaGb) {
            const tenants = await this.tenantRepo.find({ where: { tierCode: tier.code } });
            if (tenants.length > 0) {
                const tenantIds = tenants.map((tenant) => tenant.id);
                const settings = await this.settingsRepo
                    .createQueryBuilder('settings')
                    .where('settings.tenant_id IN (:...tenantIds)', { tenantIds })
                    .getMany();
                settings.forEach((item) => {
                    item.storageQuotaGb = dto.dailyLogQuotaGb;
                });
                await this.settingsRepo.save(settings);
            }
        }
        return savedTier;
    }
};
exports.TenantsService = TenantsService;
exports.TenantsService = TenantsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(tenant_entity_1.Tenant)),
    __param(1, (0, typeorm_1.InjectRepository)(tenant_settings_entity_1.TenantSettings)),
    __param(2, (0, typeorm_1.InjectRepository)(tenant_tier_entity_1.TenantTier)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource])
], TenantsService);
//# sourceMappingURL=tenants.service.js.map