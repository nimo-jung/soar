import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Tenant, TenantStatus } from './entities/tenant.entity';
import { TenantSettings } from './entities/tenant-settings.entity';
import { TenantTier, TenantTierCode } from './entities/tenant-tier.entity';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { CreateTenantTierDto } from './dto/create-tenant-tier.dto';
import { UpdateTenantTierDto } from './dto/update-tenant-tier.dto';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(TenantSettings)
    private readonly settingsRepo: Repository<TenantSettings>,
    @InjectRepository(TenantTier)
    private readonly tierRepo: Repository<TenantTier>,
    private readonly dataSource: DataSource,
  ) {}

  private async findTierForTenantByCode(code: TenantTierCode): Promise<TenantTier | null> {
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

  async create(dto: CreateTenantDto): Promise<Tenant> {
    const existing = await this.tenantRepo.findOne({ where: { slug: dto.slug } });
    if (existing) {
      throw new ConflictException(`슬러그 '${dto.slug}'는 이미 사용 중입니다.`);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const tierCode = dto.tierCode ?? TenantTierCode.LITE;
      const tier = await this.findTierForTenantByCode(tierCode);
      if (!tier) {
        throw new NotFoundException(`등급 코드 ${tierCode}를 찾을 수 없습니다.`);
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

      // 기본 설정 생성
      const settings = this.settingsRepo.create({
        tenantId: saved.id,
        storageQuotaGb: tier.dailyLogQuotaGb,
      });
      await queryRunner.manager.save(settings);

      // 테넌트 전용 DB 동적 프로비저닝
      const dbName = `tenant_db_${dto.slug.replace(/-/g, '_')}`;
      await queryRunner.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);

      await queryRunner.commitTransaction();
      return saved;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(): Promise<Tenant[]> {
    return this.tenantRepo.find({ relations: ['tier'], order: { createdAt: 'DESC' } });
  }

  async findOne(id: number): Promise<Tenant> {
    const tenant = await this.tenantRepo.findOne({ where: { id }, relations: ['tier'] });
    if (!tenant) {
      throw new NotFoundException(`테넌트 ID ${id}를 찾을 수 없습니다.`);
    }
    return tenant;
  }

  async update(id: number, dto: UpdateTenantDto): Promise<Tenant> {
    const tenant = await this.findOne(id);

    if (dto.tierCode) {
      const tier = await this.findTierForTenantByCode(dto.tierCode);
      if (!tier) {
        throw new NotFoundException(`등급 코드 ${dto.tierCode}를 찾을 수 없습니다.`);
      }
      const settings = await this.settingsRepo.findOne({ where: { tenantId: id } });
      if (settings) {
        settings.storageQuotaGb = tier.dailyLogQuotaGb;
        await this.settingsRepo.save(settings);
      }
    }

    const normalized: Partial<Tenant> = {
      ...dto,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : tenant.expiresAt,
    };

    Object.assign(tenant, normalized);
    return this.tenantRepo.save(tenant);
  }

  async softDelete(id: number): Promise<void> {
    const tenant = await this.findOne(id);
    tenant.status = TenantStatus.DELETED;
    await this.tenantRepo.save(tenant);
  }

  async getSettings(tenantId: number): Promise<TenantSettings> {
    const settings = await this.settingsRepo.findOne({ where: { tenantId } });
    if (!settings) {
      throw new NotFoundException(`테넌트 ID ${tenantId}의 설정을 찾을 수 없습니다.`);
    }
    return settings;
  }

  async updateSettings(
    tenantId: number,
    updates: Partial<TenantSettings>,
  ): Promise<TenantSettings> {
    const settings = await this.getSettings(tenantId);
    Object.assign(settings, updates);
    return this.settingsRepo.save(settings);
  }

  async getTiers(): Promise<TenantTier[]> {
    return this.tierRepo.find({ order: { id: 'ASC' } });
  }

  private async validateTierDuplicateRules(
    name: string,
    dailyLogQuotaGb: number,
    maxUsers: number,
    excludeId?: number,
  ): Promise<void> {
    const trimmedName = name.trim();

    const nameQuery = this.tierRepo
      .createQueryBuilder('tier')
      .where('LOWER(tier.name) = LOWER(:name)', { name: trimmedName });
    if (excludeId) {
      nameQuery.andWhere('tier.id != :excludeId', { excludeId });
    }
    const duplicatedName = await nameQuery.getOne();
    if (duplicatedName) {
      throw new ConflictException(`등급명 '${trimmedName}'은(는) 이미 존재합니다.`);
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
      throw new ConflictException(
        `일일 로그 용량 ${dailyLogQuotaGb}GB + 사용자 수 ${maxUsers}명 조합은 이미 존재합니다.`,
      );
    }
  }

  async createTier(dto: CreateTenantTierDto): Promise<TenantTier> {
    await this.validateTierDuplicateRules(dto.name, dto.dailyLogQuotaGb, dto.maxUsers);

    const tier = this.tierRepo.create({
      ...dto,
      name: dto.name.trim(),
      description: dto.description?.trim() ?? null,
    });
    return this.tierRepo.save(tier);
  }

  async updateTier(id: number, dto: UpdateTenantTierDto): Promise<TenantTier> {
    const tier = await this.tierRepo.findOne({ where: { id } });
    if (!tier) {
      throw new NotFoundException(`등급 ID ${id}를 찾을 수 없습니다.`);
    }

    const nextName = dto.name ?? tier.name;
    const nextDailyLogQuotaGb = dto.dailyLogQuotaGb ?? tier.dailyLogQuotaGb;
    const nextMaxUsers = dto.maxUsers ?? tier.maxUsers;
    await this.validateTierDuplicateRules(nextName, nextDailyLogQuotaGb, nextMaxUsers, id);

    const normalizedDto: UpdateTenantTierDto = {
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
          item.storageQuotaGb = dto.dailyLogQuotaGb as number;
        });
        await this.settingsRepo.save(settings);
      }
    }

    return savedTier;
  }
}
