"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const crypto_1 = require("crypto");
const bcrypt = __importStar(require("bcrypt"));
const tenant_entity_1 = require("./entities/tenant.entity");
const tenant_settings_entity_1 = require("./entities/tenant-settings.entity");
const tenant_tier_entity_1 = require("./entities/tenant-tier.entity");
const tenant_bootstrap_token_entity_1 = require("./entities/tenant-bootstrap-token.entity");
const system_tenant_constants_1 = require("./constants/system-tenant.constants");
let TenantsService = class TenantsService {
    tenantRepo;
    settingsRepo;
    tierRepo;
    tenantBootstrapTokenRepo;
    dataSource;
    constructor(tenantRepo, settingsRepo, tierRepo, tenantBootstrapTokenRepo, dataSource) {
        this.tenantRepo = tenantRepo;
        this.settingsRepo = settingsRepo;
        this.tierRepo = tierRepo;
        this.tenantBootstrapTokenRepo = tenantBootstrapTokenRepo;
        this.dataSource = dataSource;
    }
    async findTierForTenantById(id) {
        return this.tierRepo.findOne({ where: { id } });
    }
    async findDefaultTierForTenant() {
        const activeTier = await this.tierRepo
            .createQueryBuilder('tier')
            .where('tier.is_active = :isActive', { isActive: true })
            .orderBy('tier.id', 'ASC')
            .getOne();
        if (activeTier) {
            return activeTier;
        }
        return this.tierRepo
            .createQueryBuilder('tier')
            .orderBy('tier.id', 'ASC')
            .getOne();
    }
    isValidIpv4(ip) {
        const parts = ip.split('.');
        if (parts.length !== 4) {
            return false;
        }
        return parts.every((part) => {
            if (!/^\d{1,3}$/.test(part)) {
                return false;
            }
            const value = Number(part);
            return value >= 0 && value <= 255;
        });
    }
    isValidIpv4OrCidr(item) {
        if (this.isValidIpv4(item)) {
            return true;
        }
        const [ip, prefix] = item.split('/');
        if (!ip || prefix === undefined || !this.isValidIpv4(ip) || !/^\d{1,2}$/.test(prefix)) {
            return false;
        }
        const prefixNum = Number(prefix);
        return prefixNum >= 0 && prefixNum <= 32;
    }
    normalizeIpCidrList(value) {
        const items = value
            .split(',')
            .map((item) => item.trim())
            .filter((item) => item.length > 0);
        if (items.length === 0) {
            throw new common_1.BadRequestException('ipCidr는 최소 1개 이상의 항목이 필요합니다.');
        }
        const hasInvalid = items.some((item) => !this.isValidIpv4OrCidr(item));
        if (hasInvalid) {
            throw new common_1.BadRequestException('ipCidr는 단일 IP 또는 CIDR 형식이어야 하며, 다중 값은 콤마(,)로 구분해야 합니다.');
        }
        return items.join(',');
    }
    async create(dto) {
        if (dto.slug === system_tenant_constants_1.SYSTEM_TENANT_SLUG) {
            throw new common_1.ConflictException('system 슬러그는 예약되어 있습니다.');
        }
        const existing = await this.tenantRepo.findOne({ where: { slug: dto.slug } });
        if (existing) {
            throw new common_1.ConflictException(`슬러그 '${dto.slug}'는 이미 사용 중입니다.`);
        }
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const tier = dto.tierId
                ? await this.findTierForTenantById(dto.tierId)
                : await this.findDefaultTierForTenant();
            if (!tier) {
                throw new common_1.NotFoundException(dto.tierId ? `등급 ID ${dto.tierId}를 찾을 수 없습니다.` : '사용 가능한 등급이 없습니다.');
            }
            const tenant = this.tenantRepo.create({
                slug: dto.slug,
                name: dto.name,
                contactEmail: dto.contactEmail,
                tierId: tier.id,
                ipCidr: this.normalizeIpCidrList(dto.ipCidr),
                expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
            });
            const saved = await queryRunner.manager.save(tenant);
            const settings = this.settingsRepo.create({
                tenantId: saved.id,
                epsLimit: dto.epsLimit ?? 1000,
                storageQuotaGb: dto.storageQuotaGb ?? tier.dailyLogQuotaGb,
                retentionDays: dto.retentionDays ?? 90,
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
        if (tenant.slug === system_tenant_constants_1.SYSTEM_TENANT_SLUG && dto.status && dto.status !== tenant_entity_1.TenantStatus.ACTIVE) {
            throw new common_1.BadRequestException('system 테넌트는 비활성화하거나 삭제 상태로 변경할 수 없습니다.');
        }
        const hasSettingsUpdate = dto.tierId !== undefined
            || dto.epsLimit !== undefined
            || dto.storageQuotaGb !== undefined
            || dto.retentionDays !== undefined;
        if (hasSettingsUpdate) {
            const tier = dto.tierId !== undefined ? await this.findTierForTenantById(dto.tierId) : null;
            if (!tier) {
                throw new common_1.NotFoundException(`등급 ID ${dto.tierId}를 찾을 수 없습니다.`);
            }
            const settings = await this.settingsRepo.findOne({ where: { tenantId: id } })
                ?? this.settingsRepo.create({ tenantId: id });
            if (tier) {
                settings.storageQuotaGb = tier.dailyLogQuotaGb;
            }
            if (dto.epsLimit !== undefined) {
                settings.epsLimit = dto.epsLimit;
            }
            if (dto.storageQuotaGb !== undefined) {
                settings.storageQuotaGb = dto.storageQuotaGb;
            }
            if (dto.retentionDays !== undefined) {
                settings.retentionDays = dto.retentionDays;
            }
            await this.settingsRepo.save(settings);
        }
        const normalized = {};
        if (dto.name !== undefined) {
            normalized.name = dto.name;
        }
        if (dto.status !== undefined) {
            normalized.status = dto.status;
        }
        if (dto.contactEmail !== undefined) {
            normalized.contactEmail = dto.contactEmail;
        }
        if (dto.tierId !== undefined) {
            normalized.tierId = dto.tierId;
        }
        if (dto.expiresAt) {
            normalized.expiresAt = new Date(dto.expiresAt);
        }
        if (dto.ipCidr !== undefined) {
            normalized.ipCidr = this.normalizeIpCidrList(dto.ipCidr);
        }
        Object.assign(tenant, normalized);
        return this.tenantRepo.save(tenant);
    }
    async softDelete(id) {
        const tenant = await this.findOne(id);
        if (tenant.slug === system_tenant_constants_1.SYSTEM_TENANT_SLUG) {
            throw new common_1.BadRequestException('system 테넌트는 삭제할 수 없습니다.');
        }
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
        if (dto.dailyLogQuotaGb !== undefined) {
            const tenants = await this.tenantRepo.find({ where: { tierId: tier.id } });
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
    async getTierDeletionStatus(id) {
        const tier = await this.tierRepo.findOne({ where: { id } });
        if (!tier) {
            throw new common_1.NotFoundException(`등급 ID ${id}를 찾을 수 없습니다.`);
        }
        const usageCount = await this.tenantRepo.count({ where: { tierId: tier.id } });
        if (usageCount > 0) {
            return {
                canDelete: false,
                tier,
                usageCount,
                reason: `해당 등급은 현재 ${usageCount}개 테넌트에서 사용 중이라 삭제할 수 없습니다.`,
            };
        }
        return {
            canDelete: true,
            tier,
            usageCount: 0,
            reason: null,
        };
    }
    async deleteTier(id) {
        const deletionStatus = await this.getTierDeletionStatus(id);
        if (!deletionStatus.canDelete) {
            throw new common_1.ConflictException(deletionStatus.reason ?? '해당 등급은 삭제할 수 없습니다.');
        }
        await this.tierRepo.remove(deletionStatus.tier);
        return deletionStatus.tier;
    }
    async issueBootstrapToken(tenantId, dto, issuedByMasterUserId) {
        const tenant = await this.findOne(tenantId);
        const rawToken = (0, crypto_1.randomBytes)(24).toString('hex');
        const tokenHash = await bcrypt.hash(rawToken, 12);
        const expiresMinutes = dto.expiresMinutes ?? 60;
        const expiresAt = new Date(Date.now() + (expiresMinutes * 60 * 1000));
        const normalizedEmail = dto.email?.trim().toLowerCase() ?? null;
        await this.tenantBootstrapTokenRepo.update({
            tenantId,
            usedAt: (0, typeorm_2.IsNull)(),
        }, {
            usedAt: new Date(),
        });
        await this.tenantBootstrapTokenRepo.save(this.tenantBootstrapTokenRepo.create({
            tenantId,
            email: normalizedEmail,
            tokenHash,
            expiresAt,
            usedAt: null,
            issuedByMasterUserId,
        }));
        return {
            tenantId: tenant.id,
            tenantSlug: tenant.slug,
            email: normalizedEmail,
            token: rawToken,
            expiresAt: expiresAt.toISOString(),
        };
    }
    async getBootstrapTokenHistory(tenantId, query) {
        await this.findOne(tenantId);
        const page = query.page ?? 1;
        const limit = query.limit ?? 10;
        const skip = (page - 1) * limit;
        const qb = this.tenantBootstrapTokenRepo
            .createQueryBuilder('token')
            .where('token.tenant_id = :tenantId', { tenantId });
        if (query.from) {
            qb.andWhere('token.created_at >= :from', { from: query.from });
        }
        if (query.to) {
            qb.andWhere('token.created_at <= :to', { to: query.to });
        }
        const [rows, total] = await qb
            .orderBy('token.created_at', 'DESC')
            .skip(skip)
            .take(limit)
            .getManyAndCount();
        return {
            items: rows.map((row) => ({
                id: row.id,
                email: row.email,
                expiresAt: row.expiresAt.toISOString(),
                usedAt: row.usedAt ? row.usedAt.toISOString() : null,
                issuedByMasterUserId: row.issuedByMasterUserId,
                createdAt: row.createdAt.toISOString(),
            })),
            page,
            limit,
            total,
        };
    }
};
exports.TenantsService = TenantsService;
exports.TenantsService = TenantsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(tenant_entity_1.Tenant)),
    __param(1, (0, typeorm_1.InjectRepository)(tenant_settings_entity_1.TenantSettings)),
    __param(2, (0, typeorm_1.InjectRepository)(tenant_tier_entity_1.TenantTier)),
    __param(3, (0, typeorm_1.InjectRepository)(tenant_bootstrap_token_entity_1.TenantBootstrapToken)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource])
], TenantsService);
//# sourceMappingURL=tenants.service.js.map