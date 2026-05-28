import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MasterAuthSettings } from '../../auth/entities/master-auth-settings.entity';
import { AuthPolicy, DEFAULT_AUTH_POLICY } from '../../auth/auth-policy.constants';
import { normalizeAuthPolicy, validateAuthPolicy } from '../../auth/auth-policy.util';
import { UpdateAuthPolicyDto } from '../../auth/dto/update-auth-policy.dto';

export interface AdminAuthSettingsResponse extends AuthPolicy {
  isMultiTenantEnabled: boolean;
}

@Injectable()
export class AdminAuthSettingsService {
  constructor(
    @InjectRepository(MasterAuthSettings)
    private readonly masterAuthSettingsRepo: Repository<MasterAuthSettings>,
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
