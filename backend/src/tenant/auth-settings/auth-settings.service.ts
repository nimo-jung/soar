import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../../admin/tenants/entities/tenant.entity';
import { TenantSettings } from '../../admin/tenants/entities/tenant-settings.entity';
import { AuthPolicy, DEFAULT_AUTH_POLICY } from '../../auth/auth-policy.constants';
import { normalizeAuthPolicy, validateAuthPolicy } from '../../auth/auth-policy.util';
import { UpdateAuthPolicyDto } from '../../auth/dto/update-auth-policy.dto';
import { TenantContext } from '../../common/context/tenant.context';

@Injectable()
export class TenantAuthSettingsService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(TenantSettings)
    private readonly tenantSettingsRepo: Repository<TenantSettings>,
  ) {}

  private async getCurrentTenant(): Promise<Tenant> {
    const tenantContextId = TenantContext.getTenantId();
    const tenant = await this.tenantRepo
      .createQueryBuilder('tenant')
      .where("REPLACE(tenant.slug, '-', '_') = :tenantContextId", { tenantContextId })
      .getOne();

    if (!tenant) {
      throw new NotFoundException('현재 테넌트 정보를 찾을 수 없습니다.');
    }

    return tenant;
  }

  private async getOrCreateSettings(tenantId: number): Promise<TenantSettings> {
    let settings = await this.tenantSettingsRepo.findOne({ where: { tenantId } });

    if (!settings) {
      settings = await this.tenantSettingsRepo.save(
        this.tenantSettingsRepo.create({ tenantId, ...DEFAULT_AUTH_POLICY }),
      );
    }

    return settings;
  }

  async getSettings(): Promise<AuthPolicy> {
    const tenant = await this.getCurrentTenant();
    const settings = await this.getOrCreateSettings(tenant.id);
    return normalizeAuthPolicy(settings);
  }

  async updateSettings(dto: UpdateAuthPolicyDto): Promise<AuthPolicy> {
    const policy = normalizeAuthPolicy(dto);

    try {
      validateAuthPolicy(policy);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : '인증 설정 값이 유효하지 않습니다.',
      );
    }

    const tenant = await this.getCurrentTenant();
    const settings = await this.getOrCreateSettings(tenant.id);

    Object.assign(settings, policy);
    const saved = await this.tenantSettingsRepo.save(settings);
    return normalizeAuthPolicy(saved);
  }
}
