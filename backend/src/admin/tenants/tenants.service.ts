import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Tenant, TenantStatus } from './entities/tenant.entity';
import { TenantSettings } from './entities/tenant-settings.entity';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(TenantSettings)
    private readonly settingsRepo: Repository<TenantSettings>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateTenantDto): Promise<Tenant> {
    const existing = await this.tenantRepo.findOne({ where: { slug: dto.slug } });
    if (existing) {
      throw new ConflictException(`슬러그 '${dto.slug}'는 이미 사용 중입니다.`);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const tenant = this.tenantRepo.create(dto);
      const saved = await queryRunner.manager.save(tenant);

      // 기본 설정 생성
      const settings = this.settingsRepo.create({ tenantId: saved.id });
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
    return this.tenantRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: number): Promise<Tenant> {
    const tenant = await this.tenantRepo.findOne({ where: { id } });
    if (!tenant) {
      throw new NotFoundException(`테넌트 ID ${id}를 찾을 수 없습니다.`);
    }
    return tenant;
  }

  async update(id: number, dto: UpdateTenantDto): Promise<Tenant> {
    const tenant = await this.findOne(id);
    Object.assign(tenant, dto);
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
}
