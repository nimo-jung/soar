import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import nodemailer from 'nodemailer';
import { MasterSetting } from '../auth-settings/entities/master-setting.entity';
import { UpdateSmtpSettingsDto } from './dto/update-smtp-settings.dto';
import { SMTP_MODE, SMTP_SETTINGS_KEYS, SMTP_SETTINGS_SECTION, SMTP_VTYPE, type SmtpMode } from './smtp-settings.constants';

export interface AdminSmtpSettingsResponse {
  smtpMode: SmtpMode;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpSecure: boolean;
  smtpUser: string | null;
  smtpFrom: string | null;
  tenantBootstrapUrl: string | null;
  tenantPasswordResetUrl: string | null;
  hasSmtpPass: boolean;
}

@Injectable()
export class SmtpSettingsService {
  private readonly logger = new Logger(SmtpSettingsService.name);

  constructor(
    @InjectRepository(MasterSetting)
    private readonly masterSettingRepo: Repository<MasterSetting>,
    private readonly configService: ConfigService,
  ) {}

  private trimOrNull(value?: string): string | null {
    if (value === undefined) {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private parseBool(value: string | null | undefined, fallback: boolean): boolean {
    if (!value) {
      return fallback;
    }
    return value === 'true';
  }

  private parseInt(value: string | null | undefined, fallback: number | null): number | null {
    if (!value) {
      return fallback;
    }
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  private parsePort(value: string | null | undefined, fallback: number): number {
    if (!value) {
      return fallback;
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > 65535) {
      return fallback;
    }

    return Math.trunc(parsed);
  }

  private parseBoolean(value: string | null | undefined, fallback: boolean): boolean {
    if (value === undefined || value === null || value.length === 0) {
      return fallback;
    }

    return value === 'true';
  }

  private async getSmtpSettingsMap(): Promise<Map<string, MasterSetting>> {
    const rows = await this.masterSettingRepo.find({
      where: { section: SMTP_SETTINGS_SECTION },
    });

    return new Map(rows.map((row) => [row.identy, row]));
  }

  private async upsertSmtpSetting(identy: string, value: string | null, vtype: number): Promise<void> {
    let row = await this.masterSettingRepo.findOne({
      where: {
        section: SMTP_SETTINGS_SECTION,
        identy,
      },
    });

    if (!row) {
      row = this.masterSettingRepo.create({
        section: SMTP_SETTINGS_SECTION,
        identy,
        value,
        vtype,
      });
    } else {
      row.value = value;
      row.vtype = vtype;
    }

    await this.masterSettingRepo.save(row);
  }

  private async deleteSmtpSetting(identy: string): Promise<void> {
    await this.masterSettingRepo.delete({ section: SMTP_SETTINGS_SECTION, identy });
  }

  private toResponse(smtpMap: Map<string, MasterSetting>): AdminSmtpSettingsResponse {
    const smtpModeRaw = smtpMap.get(SMTP_SETTINGS_KEYS.mode)?.value;
    const smtpMode: SmtpMode = smtpModeRaw === SMTP_MODE.external ? SMTP_MODE.external : SMTP_MODE.local;
    const smtpHost = smtpMap.get(SMTP_SETTINGS_KEYS.host)?.value ?? null;
    const smtpPort = this.parseInt(smtpMap.get(SMTP_SETTINGS_KEYS.port)?.value, null);
    const smtpSecure = this.parseBool(smtpMap.get(SMTP_SETTINGS_KEYS.secure)?.value, false);
    const smtpUser = smtpMap.get(SMTP_SETTINGS_KEYS.user)?.value ?? null;
    const smtpFrom = smtpMap.get(SMTP_SETTINGS_KEYS.from)?.value ?? null;
    const tenantBootstrapUrl = smtpMap.get(SMTP_SETTINGS_KEYS.tenantBootstrapUrl)?.value ?? null;
    const tenantPasswordResetUrl = smtpMap.get(SMTP_SETTINGS_KEYS.tenantPasswordResetUrl)?.value ?? null;
    const hasSmtpPass = Boolean(smtpMap.get(SMTP_SETTINGS_KEYS.pass)?.value);

    return {
      smtpMode,
      smtpHost,
      smtpPort,
      smtpSecure,
      smtpUser,
      smtpFrom,
      tenantBootstrapUrl,
      tenantPasswordResetUrl,
      hasSmtpPass,
    };
  }

  private resolveEffectiveMailConfig(smtpMap: Map<string, MasterSetting>) {
    const smtpModeRaw = smtpMap.get(SMTP_SETTINGS_KEYS.mode)?.value;
    const smtpMode: SmtpMode = smtpModeRaw === SMTP_MODE.external ? SMTP_MODE.external : SMTP_MODE.local;

    const envHost = this.configService.get<string>('SMTP_HOST')?.trim() ?? null;
    const envFrom = this.configService.get<string>('SMTP_FROM')?.trim() ?? null;
    const envPort = this.parsePort(this.configService.get<string>('SMTP_PORT')?.trim(), 587);
    const envSecure = this.parseBoolean(this.configService.get<string>('SMTP_SECURE')?.trim(), envPort === 465);
    const envUser = this.configService.get<string>('SMTP_USER')?.trim() ?? null;
    const envPass = this.configService.get<string>('SMTP_PASS')?.trim() ?? null;

    const dbHost = smtpMap.get(SMTP_SETTINGS_KEYS.host)?.value?.trim() ?? null;
    const dbFrom = smtpMap.get(SMTP_SETTINGS_KEYS.from)?.value?.trim() ?? null;
    const dbPort = this.parsePort(smtpMap.get(SMTP_SETTINGS_KEYS.port)?.value?.trim(), 587);
    const dbSecure = smtpMap.has(SMTP_SETTINGS_KEYS.secure)
      ? smtpMap.get(SMTP_SETTINGS_KEYS.secure)?.value === 'true'
      : dbPort === 465;
    const dbUser = smtpMap.get(SMTP_SETTINGS_KEYS.user)?.value?.trim() ?? null;
    const dbPass = smtpMap.get(SMTP_SETTINGS_KEYS.pass)?.value?.trim() ?? null;

    const host = smtpMode === SMTP_MODE.local ? envHost : dbHost;
    const from = smtpMode === SMTP_MODE.local ? envFrom : dbFrom;
    const port = smtpMode === SMTP_MODE.local ? envPort : dbPort;
    const secure = smtpMode === SMTP_MODE.local ? envSecure : dbSecure;
    const user = smtpMode === SMTP_MODE.local ? envUser : dbUser;
    const pass = smtpMode === SMTP_MODE.local ? envPass : dbPass;

    if (!host || !from) {
      if (smtpMode === SMTP_MODE.local) {
        throw new ServiceUnavailableException('SMTP 설정이 없어 테스트 메일을 발송할 수 없습니다. SMTP_HOST/SMTP_FROM을 확인하세요.');
      }

      throw new ServiceUnavailableException('외부 SMTP 모드에서 필수 설정(SMTP Host/발신자 이메일)이 비어 있어 테스트 메일 발송이 불가합니다.');
    }

    return {
      smtpMode,
      host,
      from,
      port,
      secure,
      user,
      pass,
    };
  }

  async getSettings(): Promise<AdminSmtpSettingsResponse> {
    const smtpMap = await this.getSmtpSettingsMap();
    return this.toResponse(smtpMap);
  }

  async updateSettings(dto: UpdateSmtpSettingsDto): Promise<AdminSmtpSettingsResponse> {
    const normalizedSmtpMode = dto.smtpMode === SMTP_MODE.local ? SMTP_MODE.local : dto.smtpMode === SMTP_MODE.external ? SMTP_MODE.external : undefined;
    const normalizedSmtpHost = dto.smtpHost !== undefined ? this.trimOrNull(dto.smtpHost) : undefined;
    const normalizedSmtpFrom = dto.smtpFrom !== undefined ? this.trimOrNull(dto.smtpFrom) : undefined;
    const normalizedSmtpUser = dto.smtpUser !== undefined ? this.trimOrNull(dto.smtpUser) : undefined;
    const normalizedSmtpPass = dto.smtpPass !== undefined ? this.trimOrNull(dto.smtpPass) : undefined;
    const normalizedTenantBootstrapUrl = dto.tenantBootstrapUrl !== undefined
      ? this.trimOrNull(dto.tenantBootstrapUrl)
      : undefined;
    const normalizedTenantPasswordResetUrl = dto.tenantPasswordResetUrl !== undefined
      ? this.trimOrNull(dto.tenantPasswordResetUrl)
      : undefined;

    const smtpMap = await this.getSmtpSettingsMap();
    const effectiveSmtpMode: SmtpMode = normalizedSmtpMode
      ?? (smtpMap.get(SMTP_SETTINGS_KEYS.mode)?.value === SMTP_MODE.external ? SMTP_MODE.external : SMTP_MODE.local);

    const effectiveSmtpHost = normalizedSmtpHost !== undefined
      ? normalizedSmtpHost
      : smtpMap.get(SMTP_SETTINGS_KEYS.host)?.value ?? null;
    const effectiveSmtpFrom = normalizedSmtpFrom !== undefined
      ? normalizedSmtpFrom
      : smtpMap.get(SMTP_SETTINGS_KEYS.from)?.value ?? null;
    const effectiveSmtpPort = dto.smtpPort !== undefined
      ? dto.smtpPort
      : this.parseInt(smtpMap.get(SMTP_SETTINGS_KEYS.port)?.value, null);

    if (effectiveSmtpMode === SMTP_MODE.external) {
      if (!effectiveSmtpHost || !effectiveSmtpFrom) {
        throw new BadRequestException('외부 SMTP 모드에서는 SMTP Host와 발신자 이메일을 모두 입력해야 합니다.');
      }

      if (!effectiveSmtpPort || !Number.isFinite(effectiveSmtpPort) || effectiveSmtpPort < 1 || effectiveSmtpPort > 65535) {
        throw new BadRequestException('외부 SMTP 모드에서는 smtpPort를 1~65535 범위로 입력해야 합니다.');
      }
    }

    if (normalizedSmtpMode !== undefined) {
      await this.upsertSmtpSetting(SMTP_SETTINGS_KEYS.mode, normalizedSmtpMode, SMTP_VTYPE.text);
    }

    if (normalizedSmtpHost !== undefined) {
      await this.upsertSmtpSetting(SMTP_SETTINGS_KEYS.host, normalizedSmtpHost, SMTP_VTYPE.text);
    }
    if (dto.smtpPort !== undefined) {
      await this.upsertSmtpSetting(
        SMTP_SETTINGS_KEYS.port,
        dto.smtpPort !== null ? String(dto.smtpPort) : null,
        SMTP_VTYPE.integer,
      );
    }
    if (dto.smtpSecure !== undefined) {
      await this.upsertSmtpSetting(SMTP_SETTINGS_KEYS.secure, dto.smtpSecure ? 'true' : 'false', SMTP_VTYPE.boolean);
    }
    if (normalizedSmtpUser !== undefined) {
      await this.upsertSmtpSetting(SMTP_SETTINGS_KEYS.user, normalizedSmtpUser, SMTP_VTYPE.text);
    }
    if (dto.clearSmtpPass) {
      await this.deleteSmtpSetting(SMTP_SETTINGS_KEYS.pass);
    } else if (normalizedSmtpPass !== undefined) {
      await this.upsertSmtpSetting(SMTP_SETTINGS_KEYS.pass, normalizedSmtpPass, SMTP_VTYPE.text);
    }
    if (normalizedSmtpFrom !== undefined) {
      await this.upsertSmtpSetting(SMTP_SETTINGS_KEYS.from, normalizedSmtpFrom, SMTP_VTYPE.text);
    }
    if (normalizedTenantBootstrapUrl !== undefined) {
      await this.upsertSmtpSetting(
        SMTP_SETTINGS_KEYS.tenantBootstrapUrl,
        normalizedTenantBootstrapUrl,
        SMTP_VTYPE.text,
      );
    }
    if (normalizedTenantPasswordResetUrl !== undefined) {
      await this.upsertSmtpSetting(
        SMTP_SETTINGS_KEYS.tenantPasswordResetUrl,
        normalizedTenantPasswordResetUrl,
        SMTP_VTYPE.text,
      );
    }

    const updatedSmtpMap = await this.getSmtpSettingsMap();
    return this.toResponse(updatedSmtpMap);
  }

  async sendTestMail(to: string): Promise<{ mode: SmtpMode; host: string; port: number; secure: boolean; from: string; to: string; messageId: string | null; response: string | null }> {
    const normalizedTo = to.trim().toLowerCase();
    if (!normalizedTo) {
      throw new BadRequestException('테스트 수신 이메일이 필요합니다.');
    }

    const smtpMap = await this.getSmtpSettingsMap();
    const config = this.resolveEffectiveMailConfig(smtpMap);

    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.user && config.pass ? { user: config.user, pass: config.pass } : undefined,
    });

    const subject = `[TMS] SMTP 테스트 메일 (${config.smtpMode})`;
    const lines = [
      'SMTP 테스트 메일입니다.',
      `mode: ${config.smtpMode}`,
      `host: ${config.host}`,
      `port: ${config.port}`,
      `secure: ${config.secure ? 'true' : 'false'}`,
      `sentAt(UTC): ${new Date().toISOString()}`,
    ];

    try {
      this.logger.log(`SMTP 테스트 메일 발송 시도: mode=${config.smtpMode}, host=${config.host}, port=${config.port}, secure=${config.secure}, to=${normalizedTo}`);
      const info = await transporter.sendMail({
        from: config.from,
        to: normalizedTo,
        subject,
        text: lines.join('\n'),
      });
      this.logger.log(`SMTP 테스트 메일 발송 성공: to=${normalizedTo}, messageId=${info.messageId ?? '-'}, response=${info.response ?? '-'}`);

      return {
        mode: config.smtpMode,
        host: config.host,
        port: config.port,
        secure: config.secure,
        from: config.from,
        to: normalizedTo,
        messageId: info.messageId ?? null,
        response: info.response ?? null,
      };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(`SMTP 테스트 메일 발송 실패: to=${normalizedTo}, reason=${reason}`);
      throw new ServiceUnavailableException(`SMTP 테스트 메일 발송에 실패했습니다. (${reason})`);
    }
  }
}
