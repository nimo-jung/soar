import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { Tenant, TenantStatus } from './entities/tenant.entity';
import { TenantSettings } from './entities/tenant-settings.entity';
import { TenantTier } from './entities/tenant-tier.entity';
import { TenantBootstrapToken } from './entities/tenant-bootstrap-token.entity';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { CreateTenantTierDto } from './dto/create-tenant-tier.dto';
import { UpdateTenantTierDto } from './dto/update-tenant-tier.dto';
import { IssueTenantBootstrapTokenDto } from './dto/issue-tenant-bootstrap-token.dto';
import { GetTenantBootstrapTokensQueryDto } from './dto/get-tenant-bootstrap-tokens-query.dto';
import { SYSTEM_TENANT_SLUG } from './constants/system-tenant.constants';

export interface TierDeletionStatus {
  canDelete: boolean;
  tier: TenantTier;
  usageCount: number;
  reason: string | null;
}

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(TenantSettings)
    private readonly settingsRepo: Repository<TenantSettings>,
    @InjectRepository(TenantTier)
    private readonly tierRepo: Repository<TenantTier>,
    @InjectRepository(TenantBootstrapToken)
    private readonly tenantBootstrapTokenRepo: Repository<TenantBootstrapToken>,
    private readonly dataSource: DataSource,
  ) {}

  private async findTierForTenantById(id: number): Promise<TenantTier | null> {
    return this.tierRepo.findOne({ where: { id } });
  }

  private async findDefaultTierForTenant(): Promise<TenantTier | null> {
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

  private isValidIpv4(ip: string): boolean {
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

  private isValidIpv4OrCidr(item: string): boolean {
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

  private normalizeIpCidrList(value: string): string {
    const items = value
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    if (items.length === 0) {
      throw new BadRequestException('ipCidr는 최소 1개 이상의 항목이 필요합니다.');
    }

    const hasInvalid = items.some((item) => !this.isValidIpv4OrCidr(item));
    if (hasInvalid) {
      throw new BadRequestException('ipCidr는 단일 IP 또는 CIDR 형식이어야 하며, 다중 값은 콤마(,)로 구분해야 합니다.');
    }

    return items.join(',');
  }

  async create(dto: CreateTenantDto): Promise<Tenant> {
    if (dto.slug === SYSTEM_TENANT_SLUG) {
      throw new ConflictException('system 슬러그는 예약되어 있습니다.');
    }

    const existing = await this.tenantRepo.findOne({ where: { slug: dto.slug } });
    if (existing) {
      throw new ConflictException(`슬러그 '${dto.slug}'는 이미 사용 중입니다.`);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const tier = dto.tierId
        ? await this.findTierForTenantById(dto.tierId)
        : await this.findDefaultTierForTenant();
      if (!tier) {
        throw new NotFoundException(dto.tierId ? `등급 ID ${dto.tierId}를 찾을 수 없습니다.` : '사용 가능한 등급이 없습니다.');
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

    if (tenant.slug === SYSTEM_TENANT_SLUG && dto.status && dto.status !== TenantStatus.ACTIVE) {
      throw new BadRequestException('system 테넌트는 비활성화하거나 삭제 상태로 변경할 수 없습니다.');
    }

    if (dto.tierId) {
      const tier = await this.findTierForTenantById(dto.tierId);
      if (!tier) {
        throw new NotFoundException(`등급 ID ${dto.tierId}를 찾을 수 없습니다.`);
      }
      const settings = await this.settingsRepo.findOne({ where: { tenantId: id } });
      if (settings) {
        settings.storageQuotaGb = tier.dailyLogQuotaGb;
        await this.settingsRepo.save(settings);
      }
    }

    const normalized: Partial<Tenant> = {};

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

  async softDelete(id: number): Promise<void> {
    const tenant = await this.findOne(id);

    if (tenant.slug === SYSTEM_TENANT_SLUG) {
      throw new BadRequestException('system 테넌트는 삭제할 수 없습니다.');
    }

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

    if (dto.dailyLogQuotaGb !== undefined) {
      const tenants = await this.tenantRepo.find({ where: { tierId: tier.id } });
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

  async getTierDeletionStatus(id: number): Promise<TierDeletionStatus> {
    const tier = await this.tierRepo.findOne({ where: { id } });
    if (!tier) {
      throw new NotFoundException(`등급 ID ${id}를 찾을 수 없습니다.`);
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

  async deleteTier(id: number): Promise<TenantTier> {
    const deletionStatus = await this.getTierDeletionStatus(id);
    if (!deletionStatus.canDelete) {
      throw new ConflictException(deletionStatus.reason ?? '해당 등급은 삭제할 수 없습니다.');
    }

    await this.tierRepo.remove(deletionStatus.tier);
    return deletionStatus.tier;
  }

  async issueBootstrapToken(
    tenantId: number,
    dto: IssueTenantBootstrapTokenDto,
    issuedByMasterUserId: number,
  ): Promise<{ tenantId: number; tenantSlug: string; email: string | null; token: string; expiresAt: string }> {
    const tenant = await this.findOne(tenantId);
    const rawToken = randomBytes(24).toString('hex');
    const tokenHash = await bcrypt.hash(rawToken, 12);
    const expiresMinutes = dto.expiresMinutes ?? 60;
    const expiresAt = new Date(Date.now() + (expiresMinutes * 60 * 1000));
    const normalizedEmail = dto.email?.trim().toLowerCase() ?? null;

    // 동일 테넌트의 미사용 토큰은 발급 시점에 만료 처리한다.
    await this.tenantBootstrapTokenRepo.update(
      {
        tenantId,
        usedAt: IsNull(),
      },
      {
        usedAt: new Date(),
      },
    );

    await this.tenantBootstrapTokenRepo.save(
      this.tenantBootstrapTokenRepo.create({
        tenantId,
        email: normalizedEmail,
        tokenHash,
        expiresAt,
        usedAt: null,
        issuedByMasterUserId,
      }),
    );

    return {
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      email: normalizedEmail,
      token: rawToken,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async getBootstrapTokenHistory(
    tenantId: number,
    query: GetTenantBootstrapTokensQueryDto,
  ): Promise<{
      items: Array<{
        id: number;
        email: string | null;
        expiresAt: string;
        usedAt: string | null;
        issuedByMasterUserId: number | null;
        createdAt: string;
      }>;
      page: number;
      limit: number;
      total: number;
    }> {
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
}
