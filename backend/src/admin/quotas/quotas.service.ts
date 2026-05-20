import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantSettings } from '../tenants/entities/tenant-settings.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { UpdateQuotaDto } from './dto/update-quota.dto';

export interface QuotaRow {
  tenantId: number;
  tenantName: string;
  tenantSlug: string;
  epsLimit: number;
  storageQuotaGb: number;
  retentionDays: number;
  updatedAt: Date;
}

@Injectable()
export class QuotasService {
  constructor(
    @InjectRepository(TenantSettings)
    private readonly settingsRepo: Repository<TenantSettings>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
  ) {}

  async findAll(): Promise<QuotaRow[]> {
    const settings = await this.settingsRepo
      .createQueryBuilder('s')
      .innerJoin('s.tenant', 't')
      .select([
        's.tenantId',
        's.epsLimit',
        's.storageQuotaGb',
        's.retentionDays',
        's.updatedAt',
        't.name',
        't.slug',
      ])
      .where('t.status != :deleted', { deleted: 'DELETED' })
      .orderBy('t.name', 'ASC')
      .getMany();

    return settings.map((s) => ({
      tenantId: s.tenantId,
      tenantName: (s as TenantSettings & { tenant: Tenant }).tenant?.name ?? '-',
      tenantSlug: (s as TenantSettings & { tenant: Tenant }).tenant?.slug ?? '-',
      epsLimit: s.epsLimit,
      storageQuotaGb: s.storageQuotaGb,
      retentionDays: s.retentionDays,
      updatedAt: s.updatedAt,
    }));
  }

  async update(tenantId: number, dto: UpdateQuotaDto): Promise<QuotaRow> {
    const settings = await this.settingsRepo.findOne({ where: { tenantId }, relations: ['tenant'] });
    if (!settings) {
      throw new NotFoundException(`tenantId=${tenantId} 의 설정을 찾을 수 없습니다.`);
    }

    if (dto.epsLimit !== undefined) settings.epsLimit = dto.epsLimit;
    if (dto.storageQuotaGb !== undefined) settings.storageQuotaGb = dto.storageQuotaGb;
    if (dto.retentionDays !== undefined) settings.retentionDays = dto.retentionDays;

    const saved = await this.settingsRepo.save(settings);
    const tenant = (saved as TenantSettings & { tenant: Tenant }).tenant;
    return {
      tenantId: saved.tenantId,
      tenantName: tenant?.name ?? '-',
      tenantSlug: tenant?.slug ?? '-',
      epsLimit: saved.epsLimit,
      storageQuotaGb: saved.storageQuotaGb,
      retentionDays: saved.retentionDays,
      updatedAt: saved.updatedAt,
    };
  }

  async findOne(tenantId: number): Promise<QuotaRow> {
    const settings = await this.settingsRepo.findOne({ where: { tenantId }, relations: ['tenant'] });
    if (!settings) {
      throw new NotFoundException(`tenantId=${tenantId} 의 설정을 찾을 수 없습니다.`);
    }
    const tenant = (settings as TenantSettings & { tenant: Tenant }).tenant;
    return {
      tenantId: settings.tenantId,
      tenantName: tenant?.name ?? '-',
      tenantSlug: tenant?.slug ?? '-',
      epsLimit: settings.epsLimit,
      storageQuotaGb: settings.storageQuotaGb,
      retentionDays: settings.retentionDays,
      updatedAt: settings.updatedAt,
    };
  }
}
