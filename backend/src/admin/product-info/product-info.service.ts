import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { readFile } from 'fs/promises';
import { networkInterfaces } from 'os';
import { randomUUID } from 'crypto';
import { License } from './entities/license.entity';

interface ParsedLicensePayload {
  licenseKey: string;
  expiresAt: Date;
  nicMacAddress: string | null;
}

export interface ProductInfoPayload {
  productName: string;
  productVersion: string;
  releaseVersion: string;
  buildInfo: string;
}

@Injectable()
export class ProductInfoService {
  constructor(
    @InjectRepository(License)
    private readonly licenseRepo: Repository<License>,
    private readonly configService: ConfigService,
  ) {}

  private normalizeMacAddress(value: string | null | undefined): string | null {
    if (!value) {
      return null;
    }

    const compact = value.trim().toLowerCase().replace(/-/g, ':');
    const macRegex = /^([0-9a-f]{2}:){5}[0-9a-f]{2}$/;
    if (!macRegex.test(compact)) {
      throw new BadRequestException('NIC MAC 주소 형식이 올바르지 않습니다.');
    }

    return compact;
  }

  private parseDateOrThrow(value: string, fieldName: string): Date {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`${fieldName} 값이 유효한 날짜 형식이 아닙니다.`);
    }

    return parsed;
  }

  private parseTextKeyValue(content: string): Record<string, string> {
    return content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('#'))
      .reduce<Record<string, string>>((acc, line) => {
        const separatorIndex = line.indexOf('=');
        if (separatorIndex <= 0) {
          return acc;
        }

        const key = line.slice(0, separatorIndex).trim();
        const value = line.slice(separatorIndex + 1).trim();
        acc[key] = value;
        return acc;
      }, {});
  }

  private parseLicenseFile(buffer: Buffer): ParsedLicensePayload {
    const content = buffer.toString('utf-8').trim();
    if (!content) {
      throw new BadRequestException('비어있는 라이선스 파일은 업로드할 수 없습니다.');
    }

    let raw: Record<string, unknown>;
    if (content.startsWith('{')) {
      try {
        raw = JSON.parse(content) as Record<string, unknown>;
      } catch {
        throw new BadRequestException('라이선스 파일(JSON)을 파싱할 수 없습니다.');
      }
    } else {
      raw = this.parseTextKeyValue(content);
    }

    const licenseKey = String(raw.licenseKey ?? raw.license_key ?? '').trim();
    const expiresRaw = String(raw.expiresAt ?? raw.expires_at ?? '').trim();
    const nicRaw = String(raw.nicMacAddress ?? raw.nic_mac_address ?? '').trim();

    if (!licenseKey) {
      throw new BadRequestException('라이선스 키가 없습니다.');
    }

    if (!expiresRaw) {
      throw new BadRequestException('라이선스 만료일시가 없습니다.');
    }

    return {
      licenseKey,
      expiresAt: this.parseDateOrThrow(expiresRaw, '라이선스 만료일시'),
      nicMacAddress: this.normalizeMacAddress(nicRaw || null),
    };
  }

  private resolveProductInfoFileCandidates(): string[] {
    const configured = this.configService.get<string>('PRODUCT_INFO_FILE_PATH')?.trim();
    const cwd = process.cwd();

    return [
      configured,
      '/app/product.dat',
      `${cwd}/product.dat`,
      `${cwd}/dist/product.dat`,
      '/opt/soar/product.dat',
    ].filter((path): path is string => Boolean(path));
  }

  private async readProductFileText(): Promise<string | null> {
    const candidates = this.resolveProductInfoFileCandidates();

    for (const candidate of candidates) {
      try {
        return await readFile(candidate, 'utf-8');
      } catch {
        // try next candidate
      }
    }

    return null;
  }

  async getProductInfo(): Promise<ProductInfoPayload> {
    const text = await this.readProductFileText();
    if (!text) {
      return {
        productName: '-',
        productVersion: '-',
        releaseVersion: '-',
        buildInfo: '-',
      };
    }

    const parsed = this.parseTextKeyValue(text);
    return {
      productName: parsed.productName ?? parsed.product_name ?? '-',
      productVersion: parsed.productVersion ?? parsed.product_version ?? '-',
      releaseVersion: parsed.releaseVersion ?? parsed.release_version ?? '-',
      buildInfo: parsed.buildInfo ?? parsed.build_info ?? '-',
    };
  }

  async getCurrentLicense(): Promise<License | null> {
    const results = await this.licenseRepo.find({
      order: { updatedAt: 'DESC', id: 'DESC' },
      take: 1,
    });
    return results[0] ?? null;
  }

  async getProductInfoView(): Promise<{ product: ProductInfoPayload; license: License | null }> {
    const [product, license] = await Promise.all([
      this.getProductInfo(),
      this.getCurrentLicense(),
    ]);

    return { product, license };
  }

  async updateLicenseFromFile(fileBuffer: Buffer): Promise<License> {
    const payload = this.parseLicenseFile(fileBuffer);
    const current = await this.getCurrentLicense();

    if (!current) {
      const created = this.licenseRepo.create(payload);
      return this.licenseRepo.save(created);
    }

    current.licenseKey = payload.licenseKey;
    current.expiresAt = payload.expiresAt;
    current.nicMacAddress = payload.nicMacAddress;

    return this.licenseRepo.save(current);
  }

  private detectServerNicMacAddress(): string | null {
    const interfaces = networkInterfaces();
    const names = Object.keys(interfaces);

    for (const name of names) {
      const entries = interfaces[name] ?? [];
      for (const item of entries) {
        if (!item.internal && item.mac && item.mac !== '00:00:00:00:00:00') {
          return item.mac.toLowerCase();
        }
      }
    }

    return null;
  }

  async ensureDemoLicenseForBootstrap(): Promise<License> {
    const current = await this.getCurrentLicense();
    if (current) {
      return current;
    }

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const demoLicense = this.licenseRepo.create({
      licenseKey: `DEMO-${randomUUID().replace(/-/g, '').slice(0, 24).toUpperCase()}`,
      expiresAt,
      nicMacAddress: this.detectServerNicMacAddress(),
    });

    return this.licenseRepo.save(demoLicense);
  }

  async getLicenseWarning(): Promise<{ daysRemaining: number; expiresAt: string } | null> {
    const license = await this.getCurrentLicense();
    if (!license) {
      return null;
    }

    const nowMs = Date.now();
    const expiresMs = license.expiresAt.getTime();
    const diffDays = Math.ceil((expiresMs - nowMs) / (1000 * 60 * 60 * 24));

    if (diffDays > 30) {
      return null;
    }

    return {
      daysRemaining: Math.max(0, diffDays),
      expiresAt: license.expiresAt.toISOString(),
    };
  }
}
