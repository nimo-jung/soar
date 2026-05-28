import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import nodemailer from 'nodemailer';
import { MasterSetting } from '../auth-settings/entities/master-setting.entity';
import { SMTP_MODE, SMTP_SETTINGS_KEYS, SMTP_SETTINGS_SECTION } from '../smtp-settings/smtp-settings.constants';

interface BootstrapTokenMailPayload {
  to: string;
  tenantName: string;
  tenantSlug: string;
  token: string;
  expiresAtIso: string;
}

interface PasswordResetTokenMailPayload {
  to: string;
  tenantName: string;
  tenantSlug: string;
  token: string;
  expiresAtIso: string;
}

@Injectable()
export class BootstrapTokenMailService {
  private readonly logger = new Logger(BootstrapTokenMailService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(MasterSetting)
    private readonly masterSettingRepo: Repository<MasterSetting>,
  ) {}

  private parseBoolean(raw: string | undefined, defaultValue: boolean): boolean {
    if (raw === undefined) {
      return defaultValue;
    }
    return raw === 'true';
  }

  private parsePort(raw: string | undefined, fallback: number): number {
    if (raw === undefined) {
      return fallback;
    }

    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > 65535) {
      return fallback;
    }

    return Math.trunc(parsed);
  }

  private async resolveMailConfig() {
    const rows = await this.masterSettingRepo.find({
      where: { section: SMTP_SETTINGS_SECTION },
    });
    const settingMap = new Map(rows.map((row) => [row.identy, row.value]));

    const mode = settingMap.get(SMTP_SETTINGS_KEYS.mode) === SMTP_MODE.external
      ? SMTP_MODE.external
      : SMTP_MODE.local;

    const envHost = this.configService.get<string>('SMTP_HOST')?.trim();
    const envFrom = this.configService.get<string>('SMTP_FROM')?.trim();
    const envPort = this.parsePort(this.configService.get<string>('SMTP_PORT')?.trim(), 587);
    const envUser = this.configService.get<string>('SMTP_USER')?.trim();
    const envPass = this.configService.get<string>('SMTP_PASS')?.trim();
    const envBootstrapBaseUrl = this.configService.get<string>('TENANT_BOOTSTRAP_URL')?.trim();

    const dbHost = settingMap.get(SMTP_SETTINGS_KEYS.host)?.trim();
    const dbFrom = settingMap.get(SMTP_SETTINGS_KEYS.from)?.trim();
    const dbUser = settingMap.get(SMTP_SETTINGS_KEYS.user)?.trim();
    const dbPass = settingMap.get(SMTP_SETTINGS_KEYS.pass)?.trim();
    const dbBootstrapBaseUrl = settingMap.get(SMTP_SETTINGS_KEYS.tenantBootstrapUrl)?.trim();

    const host = mode === SMTP_MODE.local ? envHost : dbHost;
    const from = mode === SMTP_MODE.local ? envFrom : dbFrom;

    if (!host || !from) {
      if (mode === SMTP_MODE.local) {
        throw new ServiceUnavailableException('SMTP 설정이 없어 이메일 토큰 발송을 처리할 수 없습니다. SMTP_HOST/SMTP_FROM을 설정하세요.');
      }

      throw new ServiceUnavailableException('외부 SMTP 모드에서 필수 설정(SMTP Host/발신자 이메일)이 비어 있습니다. 관리자 SMTP 설정을 확인하세요.');
    }

    const port = mode === SMTP_MODE.local
      ? envPort
      : this.parsePort(settingMap.get(SMTP_SETTINGS_KEYS.port)?.trim(), 587);
    const secure = mode === SMTP_MODE.local
      ? this.parseBoolean(this.configService.get<string>('SMTP_SECURE'), port === 465)
      : (settingMap.has(SMTP_SETTINGS_KEYS.secure)
        ? settingMap.get(SMTP_SETTINGS_KEYS.secure) === 'true'
        : port === 465);

    const user = mode === SMTP_MODE.local
      ? envUser
      : dbUser;
    const pass = mode === SMTP_MODE.local
      ? envPass
      : dbPass;
    const bootstrapBaseUrl = mode === SMTP_MODE.local ? envBootstrapBaseUrl : dbBootstrapBaseUrl;

    return {
      mode,
      host,
      from,
      port,
      secure,
      user,
      pass,
      bootstrapBaseUrl,
    };
  }

  async sendBootstrapToken(payload: BootstrapTokenMailPayload): Promise<void> {
    const {
      mode,
      host,
      from,
      port,
      secure,
      user,
      pass,
      bootstrapBaseUrl,
    } = await this.resolveMailConfig();

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
    });

    const tokenUrl = bootstrapBaseUrl
      ? `${bootstrapBaseUrl.replace(/\/$/, '')}?token=${encodeURIComponent(payload.token)}`
      : null;

    const subject = `[TMS] ${payload.tenantName} 초기 관리자 등록 토큰`;
    const lines = [
      `${payload.tenantName} (${payload.tenantSlug}) 초기 관리자 등록 토큰입니다.`,
      `토큰: ${payload.token}`,
      `만료시각(UTC): ${payload.expiresAtIso}`,
      tokenUrl ? `등록 URL: ${tokenUrl}` : undefined,
      '',
      '이 토큰은 1회만 사용할 수 있습니다.',
    ].filter((line): line is string => Boolean(line));

    try {
      this.logger.log(`bootstrap 토큰 이메일 발송 시도: mode=${mode}, host=${host}, port=${port}, secure=${secure}, to=${payload.to}, tenant=${payload.tenantSlug}`);
      const info = await transporter.sendMail({
        from,
        to: payload.to,
        subject,
        text: lines.join('\n'),
      });
      this.logger.log(`bootstrap 토큰 이메일 발송 성공: to=${payload.to}, tenant=${payload.tenantSlug}, messageId=${info.messageId ?? '-'}, response=${info.response ?? '-'}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`bootstrap 토큰 이메일 발송 실패: to=${payload.to}, tenant=${payload.tenantSlug}, reason=${message}`);
      throw new ServiceUnavailableException(`토큰 이메일 발송에 실패했습니다. SMTP 설정 또는 수신 주소를 확인하세요. (${message})`);
    }
  }

  async sendPasswordResetToken(payload: PasswordResetTokenMailPayload): Promise<void> {
    const {
      mode,
      host,
      from,
      port,
      secure,
      user,
      pass,
    } = await this.resolveMailConfig();

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
    });

    const subject = `[TMS] ${payload.tenantName} 비밀번호 재설정 토큰`;
    const lines = [
      `${payload.tenantName} (${payload.tenantSlug}) 비밀번호 재설정 토큰입니다.`,
      `토큰: ${payload.token}`,
      `만료시각(UTC): ${payload.expiresAtIso}`,
      '',
      '이 토큰은 1회만 사용할 수 있습니다.',
    ];

    try {
      this.logger.log(`password reset 토큰 이메일 발송 시도: mode=${mode}, host=${host}, port=${port}, secure=${secure}, to=${payload.to}, tenant=${payload.tenantSlug}`);
      const info = await transporter.sendMail({
        from,
        to: payload.to,
        subject,
        text: lines.join('\n'),
      });
      this.logger.log(`password reset 토큰 이메일 발송 성공: to=${payload.to}, tenant=${payload.tenantSlug}, messageId=${info.messageId ?? '-'}, response=${info.response ?? '-'}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`password reset 토큰 이메일 발송 실패: to=${payload.to}, tenant=${payload.tenantSlug}, reason=${message}`);
      throw new ServiceUnavailableException(`재설정 토큰 이메일 발송에 실패했습니다. SMTP 설정 또는 수신 주소를 확인하세요. (${message})`);
    }
  }
}
