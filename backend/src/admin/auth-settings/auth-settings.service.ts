import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MasterAuthSettings } from '../../auth/entities/master-auth-settings.entity';
import { AuthPolicy, DEFAULT_AUTH_POLICY } from '../../auth/auth-policy.constants';
import { normalizeAuthPolicy, validateAuthPolicy } from '../../auth/auth-policy.util';
import { UpdateAuthPolicyDto } from '../../auth/dto/update-auth-policy.dto';
import { Tenant, TenantStatus } from '../tenants/entities/tenant.entity';
import { SYSTEM_TENANT_SLUG } from '../tenants/constants/system-tenant.constants';

export interface AdminAuthSettingsResponse extends AuthPolicy {
  isMultiTenantEnabled: boolean;
}

@Injectable()
export class AdminAuthSettingsService {
  constructor(
    @InjectRepository(MasterAuthSettings)
    private readonly masterAuthSettingsRepo: Repository<MasterAuthSettings>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
  ) {}
  private toResponse(settings: MasterAuthSettings): AdminAuthSettingsResponse {
    return {
      ...normalizeAuthPolicy(settings),
      isMultiTenantEnabled: settings.isMultiTenantEnabled,
    };
  }

  async getSettings(): Promise<AdminAuthSettingsResponse> {
    let settings = await this.masterAuthSettingsRepo.findOne({ where: { id: 1 } });
    if (!settings) {
      settings = await this.masterAuthSettingsRepo.save(
        this.masterAuthSettingsRepo.create({
          id: 1,
          ...DEFAULT_AUTH_POLICY,
          isMultiTenantEnabled: false,
        }),
      );
    }

    return this.toResponse(settings);
  }

  async updateSettings(dto: UpdateAuthPolicyDto): Promise<AdminAuthSettingsResponse> {
    const policy = normalizeAuthPolicy(dto);

    try {
      validateAuthPolicy(policy);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : '인증 설정 값이 유효하지 않습니다.',
      );
    }

    let settings = await this.masterAuthSettingsRepo.findOne({ where: { id: 1 } });

    if (dto.isMultiTenantEnabled === false) {
      const nonSystemTenantCount = await this.tenantRepo
        .createQueryBuilder('tenant')
        .where('tenant.slug != :systemSlug', { systemSlug: SYSTEM_TENANT_SLUG })
        .andWhere('tenant.status IN (:...statuses)', {
          statuses: [TenantStatus.ACTIVE, TenantStatus.SUSPENDED],
        })
        .getCount();

      if (nonSystemTenantCount > 0) {
        throw new BadRequestException(
          `system 이외 활성/정지 테넌트가 ${nonSystemTenantCount}개 존재하여 멀티테넌트 모드를 비활성화할 수 없습니다. 먼저 해당 테넌트를 삭제 상태로 전환하세요.`,
        );
      }
    }

    if (!settings) {
      settings = this.masterAuthSettingsRepo.create({
        id: 1,
        ...policy,
        isMultiTenantEnabled: dto.isMultiTenantEnabled ?? false,
      });
    } else {
      Object.assign(settings, policy);
      if (dto.isMultiTenantEnabled !== undefined) {
        settings.isMultiTenantEnabled = dto.isMultiTenantEnabled;
      }
    }

    const saved = await this.masterAuthSettingsRepo.save(settings);
    return this.toResponse(saved);
  }
}
