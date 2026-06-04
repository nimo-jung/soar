import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../../admin/tenants/entities/tenant.entity';
import { TenantSettings } from '../../admin/tenants/entities/tenant-settings.entity';
import { TenantContext } from '../../common/context/tenant.context';
import { VECTOR_INGESTION_MODES } from '../../admin/vector-settings/vector-settings.constants';
import {
  TenantVectorSourceItemDto,
  UpdateTenantVectorSourcesDto,
} from './dto/update-tenant-vector-sources.dto';

export interface TenantVectorSourceItem {
  id: string;
  name: string;
  vendor: string;
  ingestionMode: (typeof VECTOR_INGESTION_MODES)[number];
  enabled: boolean;
  sourceConfig?: {
    transport?: 'udp' | 'tcp';
    address?: string;
    port?: number;
    path?: string;
    authStrategy?: 'none' | 'basic' | 'token';
    authToken?: string;
    basicUsername?: string;
    basicPassword?: string;
    command?: string;
    intervalSeconds?: number;
    includePatterns?: string[];
    readFrom?: 'beginning' | 'end';
    bootstrapServers?: string;
    topic?: string;
    groupId?: string;
  };
}

export interface TenantVectorSourcesResponse {
  items: TenantVectorSourceItem[];
}

@Injectable()
export class TenantVectorSourcesService {
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
        this.tenantSettingsRepo.create({ tenantId }),
      );
    }

    return settings;
  }

  private normalize(items: TenantVectorSourceItemDto[]): TenantVectorSourceItem[] {
    const seen = new Set<string>();
    const normalized = items.map((item) => {
      const id = item.id.trim().toLowerCase();
      const vendor = item.vendor.trim().toLowerCase();

      if (seen.has(id)) {
        throw new BadRequestException(`중복 source id가 존재합니다: ${id}`);
      }
      seen.add(id);

      if (!VECTOR_INGESTION_MODES.includes(item.ingestionMode)) {
        throw new BadRequestException(`source id=${id}의 ingestionMode가 유효하지 않습니다.`);
      }

      return {
        id,
        name: item.name.trim(),
        vendor,
        ingestionMode: item.ingestionMode,
        enabled: item.enabled,
        sourceConfig: {
          transport: item.sourceConfig?.transport,
          address: item.sourceConfig?.address?.trim(),
          port: item.sourceConfig?.port,
          path: item.sourceConfig?.path?.trim(),
          authStrategy: item.sourceConfig?.authStrategy,
          authToken: item.sourceConfig?.authToken?.trim(),
          basicUsername: item.sourceConfig?.basicUsername?.trim(),
          basicPassword: item.sourceConfig?.basicPassword,
          command: item.sourceConfig?.command?.trim(),
          intervalSeconds: item.sourceConfig?.intervalSeconds,
          includePatterns: item.sourceConfig?.includePatterns?.map((entry) => entry.trim()).filter((entry) => entry.length > 0),
          readFrom: item.sourceConfig?.readFrom,
          bootstrapServers: item.sourceConfig?.bootstrapServers?.trim(),
          topic: item.sourceConfig?.topic?.trim(),
          groupId: item.sourceConfig?.groupId?.trim(),
        },
      } satisfies TenantVectorSourceItem;
    });

    return normalized;
  }

  async getSources(): Promise<TenantVectorSourcesResponse> {
    const tenant = await this.getCurrentTenant();
    const settings = await this.getOrCreateSettings(tenant.id);
    const raw = settings.vectorSourcesConfig;

    if (!Array.isArray(raw)) {
      return { items: [] };
    }

    return { items: raw as unknown as TenantVectorSourceItem[] };
  }

  async updateSources(dto: UpdateTenantVectorSourcesDto): Promise<TenantVectorSourcesResponse> {
    const tenant = await this.getCurrentTenant();
    const settings = await this.getOrCreateSettings(tenant.id);

    const normalized = this.normalize(dto.items);
    settings.vectorSourcesConfig = normalized as unknown as Array<Record<string, unknown>>;
    const saved = await this.tenantSettingsRepo.save(settings);

    return {
      items: (saved.vectorSourcesConfig as unknown as TenantVectorSourceItem[]) ?? [],
    };
  }
}
