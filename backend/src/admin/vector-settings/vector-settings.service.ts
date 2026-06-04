import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { promises as fs } from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { MasterSetting } from '../auth-settings/entities/master-setting.entity';
import { TenantSettings } from '../tenants/entities/tenant-settings.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { TenantStatus } from '../tenants/entities/tenant.entity';
import {
  DEFAULT_VECTOR_OUTPUT_TOPIC,
  DEFAULT_VECTOR_PARSER_PROFILES,
  DEFAULT_VECTOR_QUARANTINE_TOPIC,
  VECTOR_SETTINGS_KEYS,
  VECTOR_SETTINGS_SECTION,
  VECTOR_VTYPE,
  VECTOR_INGESTION_MODES,
  type VectorSourceConfig,
  type VectorParserProfile,
} from './vector-settings.constants';
import { UpdateVectorSettingsDto } from './dto/update-vector-settings.dto';

const execAsync = promisify(exec);

export interface VectorSettingsResponse {
  parserProfiles: VectorParserProfile[];
  seedParserProfiles: VectorParserProfile[];
  outputTopic: string;
  defaultOutputTopic: string;
  quarantineTopic: string;
  defaultQuarantineTopic: string;
  allowUnknownVendor: boolean;
  configVersion: number;
  appliedVersion: number;
  appliedAt: string | null;
  applyStatus: 'IDLE' | 'APPLIED' | 'FAILED';
  applyMessage: string | null;
}

export interface VectorApplyResult {
  applyStatus: 'APPLIED' | 'FAILED';
  message: string;
  configPath: string;
  renderedBytes: number;
  reloadAttempted: boolean;
  reloadSucceeded: boolean;
}

export interface VectorDryRunResult {
  valid: boolean;
  configPath: string;
  renderedBytes: number;
  warnings: string[];
  preview: string;
}

export interface VectorApplyHistoryItem {
  id: string;
  attemptedAt: string;
  configVersion: number;
  applyStatus: 'APPLIED' | 'FAILED';
  message: string;
  configPath: string;
  renderedBytes: number;
  reloadAttempted: boolean;
  reloadSucceeded: boolean;
}

interface TenantSourceRenderEntry {
  sourceName: string;
  ingestionMode: (typeof VECTOR_INGESTION_MODES)[number];
  sourceConfig: VectorSourceConfig;
}

@Injectable()
export class VectorSettingsService {
  constructor(
    @InjectRepository(MasterSetting)
    private readonly masterSettingRepo: Repository<MasterSetting>,
    @InjectRepository(TenantSettings)
    private readonly tenantSettingsRepo: Repository<TenantSettings>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
  ) {}

  private parseBoolean(value: string | null | undefined, fallback: boolean): boolean {
    if (!value) {
      return fallback;
    }
    return value === 'true';
  }

  private parseInt(value: string | null | undefined, fallback: number): number {
    if (!value) {
      return fallback;
    }

    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  private trimOrNull(value?: string): string | null {
    if (value === undefined) {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private async getSettingsMap(): Promise<Map<string, MasterSetting>> {
    const rows = await this.masterSettingRepo.find({ where: { section: VECTOR_SETTINGS_SECTION } });
    return new Map(rows.map((row) => [row.identy, row]));
  }

  private async upsertSetting(identy: string, value: string | null, vtype: number): Promise<void> {
    let row = await this.masterSettingRepo.findOne({
      where: {
        section: VECTOR_SETTINGS_SECTION,
        identy,
      },
    });

    if (!row) {
      row = this.masterSettingRepo.create({
        section: VECTOR_SETTINGS_SECTION,
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

  private parseProfiles(rawValue?: string | null): VectorParserProfile[] {
    if (!rawValue) {
      return DEFAULT_VECTOR_PARSER_PROFILES;
    }

    try {
      const parsed = JSON.parse(rawValue) as VectorParserProfile[];
      if (!Array.isArray(parsed)) {
        return DEFAULT_VECTOR_PARSER_PROFILES;
      }
      return parsed.map((profile) => ({
        ...profile,
        ingestionMode: (() => {
          // Backward compatibility for legacy saved values.
          if ((profile.ingestionMode as string) === 'http_rest') {
            return 'http';
          }
          if (VECTOR_INGESTION_MODES.includes(profile.ingestionMode)) {
            return profile.ingestionMode;
          }
          return 'syslog';
        })(),
        vrlScript: profile.vrlScript ?? '',
      }));
    } catch {
      return DEFAULT_VECTOR_PARSER_PROFILES;
    }
  }

  private parseApplyHistory(rawValue?: string | null): VectorApplyHistoryItem[] {
    if (!rawValue) {
      return [];
    }

    try {
      const parsed = JSON.parse(rawValue) as VectorApplyHistoryItem[];
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed;
    } catch {
      return [];
    }
  }

  private toResponse(settingsMap: Map<string, MasterSetting>): VectorSettingsResponse {
    const applyStatusRaw = settingsMap.get(VECTOR_SETTINGS_KEYS.lastApplyStatus)?.value;
    const applyStatus = applyStatusRaw === 'APPLIED' || applyStatusRaw === 'FAILED' ? applyStatusRaw : 'IDLE';

    return {
      parserProfiles: this.parseProfiles(settingsMap.get(VECTOR_SETTINGS_KEYS.parserProfilesJson)?.value),
      seedParserProfiles: DEFAULT_VECTOR_PARSER_PROFILES,
      outputTopic: settingsMap.get(VECTOR_SETTINGS_KEYS.outputTopic)?.value ?? DEFAULT_VECTOR_OUTPUT_TOPIC,
      defaultOutputTopic: DEFAULT_VECTOR_OUTPUT_TOPIC,
      quarantineTopic: settingsMap.get(VECTOR_SETTINGS_KEYS.quarantineTopic)?.value ?? DEFAULT_VECTOR_QUARANTINE_TOPIC,
      defaultQuarantineTopic: DEFAULT_VECTOR_QUARANTINE_TOPIC,
      allowUnknownVendor: this.parseBoolean(settingsMap.get(VECTOR_SETTINGS_KEYS.allowUnknownVendor)?.value, false),
      configVersion: this.parseInt(settingsMap.get(VECTOR_SETTINGS_KEYS.configVersion)?.value, 1),
      appliedVersion: this.parseInt(settingsMap.get(VECTOR_SETTINGS_KEYS.appliedVersion)?.value, 0),
      appliedAt: settingsMap.get(VECTOR_SETTINGS_KEYS.appliedAt)?.value ?? null,
      applyStatus,
      applyMessage: settingsMap.get(VECTOR_SETTINGS_KEYS.lastApplyMessage)?.value ?? null,
    };
  }

  private toSingleQuotedValue(raw: string): string {
    return `'${raw.replace(/'/g, "''")}'`;
  }

  private renderClassifier(profile: VectorParserProfile): string {
    const indicators = profile.matchIndicators
      .map((item) => item.trim().toLowerCase())
      .filter((item) => item.length > 0)
      .map((item) => `contains(m, ${this.toSingleQuotedValue(item)})`);

    if (indicators.length === 0) {
      return 'false';
    }

    return indicators.join(' || ');
  }

  private sourceName(profile: VectorParserProfile): string {
    const safeVendor = profile.vendor.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    return `${profile.ingestionMode}_${safeVendor}`;
  }

  private renderSourceBlock(profile: VectorParserProfile): string {
    const sourceName = this.sourceName(profile);

    if (profile.ingestionMode === 'syslog') {
      const transport = 'udp';
      const address = '0.0.0.0';
      const port = 1514;
      return `  ${sourceName}:\n    type: syslog\n    address: ${address}:${port}\n    mode: ${transport}`;
    }

    if (profile.ingestionMode === 'snmp') {
      const address = '0.0.0.0';
      const port = 9162;
      return `  ${sourceName}:\n    type: snmp_trap\n    address: ${address}:${port}`;
    }

    if (profile.ingestionMode === 'http') {
      const address = '0.0.0.0';
      const port = 8686;
      const pathValue = '/ingest';
      return `  ${sourceName}:\n    type: http_server\n    address: ${address}:${port}\n    path: ${pathValue}`;
    }

    if (profile.ingestionMode === 'cmd') {
      const command = 'echo cmd_source_not_configured';
      const intervalSeconds = 60;
      return `  ${sourceName}:\n    type: exec\n    command:\n      - sh\n      - -lc\n      - \"${command.replace(/"/g, '\\"')}\"\n    mode: scheduled\n    scheduled:\n      exec_interval_secs: ${intervalSeconds}`;
    }

    if (profile.ingestionMode === 'file') {
      const includes = ['/var/log/*.log'];
      const includeLines = includes.map((item) => `      - ${item}`).join('\n');
      const readFrom = 'beginning';
      return `  ${sourceName}:\n    type: file\n    include:\n${includeLines}\n    read_from: ${readFrom}`;
    }

    const bootstrapServers = '${VECTOR_KAFKA_BROKERS}';
    const topic = 'logs.raw.input';
    const groupId = 'vector-input-group';
    return `  ${sourceName}:\n    type: kafka\n    bootstrap_servers: \"${bootstrapServers}\"\n    group_id: \"${groupId}\"\n    topics:\n      - \"${topic}\"`;
  }

  private renderSourceBlockByMode(
    sourceName: string,
    ingestionMode: (typeof VECTOR_INGESTION_MODES)[number],
    cfg: VectorSourceConfig,
  ): string {
    if (ingestionMode === 'syslog') {
      const transport = cfg.transport === 'tcp' ? 'tcp' : 'udp';
      const address = cfg.address?.trim() || '0.0.0.0';
      const port = Number.isFinite(cfg.port) ? cfg.port : 1514;
      return `  ${sourceName}:\n    type: syslog\n    address: ${address}:${port}\n    mode: ${transport}`;
    }

    if (ingestionMode === 'snmp') {
      const address = cfg.address?.trim() || '0.0.0.0';
      const port = Number.isFinite(cfg.port) ? cfg.port : 9162;
      return `  ${sourceName}:\n    type: snmp_trap\n    address: ${address}:${port}`;
    }

    if (ingestionMode === 'http') {
      const address = cfg.address?.trim() || '0.0.0.0';
      const port = Number.isFinite(cfg.port) ? cfg.port : 8686;
      const pathValue = cfg.path?.trim() || '/ingest';
      return `  ${sourceName}:\n    type: http_server\n    address: ${address}:${port}\n    path: ${pathValue}`;
    }

    if (ingestionMode === 'cmd') {
      const command = cfg.command?.trim() || 'echo cmd_source_not_configured';
      const intervalSeconds = Number.isFinite(cfg.intervalSeconds) ? cfg.intervalSeconds : 60;
      return `  ${sourceName}:\n    type: exec\n    command:\n      - sh\n      - -lc\n      - \"${command.replace(/"/g, '\\"')}\"\n    mode: scheduled\n    scheduled:\n      exec_interval_secs: ${intervalSeconds}`;
    }

    if (ingestionMode === 'file') {
      const includes = cfg.includePatterns && cfg.includePatterns.length > 0
        ? cfg.includePatterns
        : ['/var/log/*.log'];
      const includeLines = includes.map((item) => `      - ${item}`).join('\n');
      const readFrom = cfg.readFrom === 'end' ? 'end' : 'beginning';
      return `  ${sourceName}:\n    type: file\n    include:\n${includeLines}\n    read_from: ${readFrom}`;
    }

    const bootstrapServers = cfg.bootstrapServers?.trim() || '${VECTOR_KAFKA_BROKERS}';
    const topic = cfg.topic?.trim() || 'logs.raw.input';
    const groupId = cfg.groupId?.trim() || 'vector-input-group';
    return `  ${sourceName}:\n    type: kafka\n    bootstrap_servers: \"${bootstrapServers}\"\n    group_id: \"${groupId}\"\n    topics:\n      - \"${topic}\"`;
  }

  private parseTenantSourceEntries(raw: unknown): Array<Record<string, unknown>> {
    return Array.isArray(raw) ? (raw as Array<Record<string, unknown>>) : [];
  }

  private normalizeSourceName(tenantSlug: string, sourceId: string, ingestionMode: string): string {
    const safeTenant = tenantSlug.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const safeSource = sourceId.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const safeMode = ingestionMode.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    return `${safeMode}_${safeTenant}_${safeSource}`;
  }

  private async getTenantSourceRenderEntries(
    activeProfiles: VectorParserProfile[],
  ): Promise<TenantSourceRenderEntry[]> {
    const allowedVendors = new Set(activeProfiles.map((profile) => profile.vendor));

    const [tenantRows, settingsRows] = await Promise.all([
      this.tenantRepo.find({ select: ['id', 'slug', 'status'] }),
      this.tenantSettingsRepo.find({ select: ['tenantId', 'vectorSourcesConfig'] }),
    ]);

    const tenantMap = new Map(
      tenantRows
        .filter((tenant) => tenant.status === 'ACTIVE')
        .map((tenant) => [tenant.id, tenant.slug]),
    );

    const entries: TenantSourceRenderEntry[] = [];
    for (const settings of settingsRows) {
      const tenantSlug = tenantMap.get(settings.tenantId);
      if (!tenantSlug) {
        continue;
      }

      for (const source of this.parseTenantSourceEntries(settings.vectorSourcesConfig)) {
        const vendor = String(source.vendor ?? '').trim().toLowerCase();
        const sourceId = String(source.id ?? '').trim();
        const ingestionMode = String(source.ingestionMode ?? '').trim();
        if (!vendor || !sourceId || !allowedVendors.has(vendor)) {
          continue;
        }

        if (!VECTOR_INGESTION_MODES.includes(ingestionMode as (typeof VECTOR_INGESTION_MODES)[number])) {
          continue;
        }

        if (!Boolean(source.enabled)) {
          continue;
        }

        entries.push({
          sourceName: this.normalizeSourceName(tenantSlug, sourceId, ingestionMode),
          ingestionMode: ingestionMode as (typeof VECTOR_INGESTION_MODES)[number],
          sourceConfig: (source.sourceConfig as VectorSourceConfig | undefined) ?? {},
        });
      }
    }

    return entries;
  }

  async validateGatewayHttpAuth(
    tenantSlugRaw: string,
    sourceIdRaw: string,
    authHeaderRaw?: string,
    tokenHeaderRaw?: string,
  ): Promise<boolean> {
    const tenantSlug = tenantSlugRaw.trim().toLowerCase();
    const sourceId = sourceIdRaw.trim().toLowerCase();
    if (!tenantSlug || !sourceId) {
      return false;
    }

    const tenant = await this.tenantRepo.findOne({ where: { slug: tenantSlug } });
    if (!tenant || tenant.status !== TenantStatus.ACTIVE) {
      return false;
    }

    const settings = await this.tenantSettingsRepo.findOne({ where: { tenantId: tenant.id } });
    if (!settings) {
      return false;
    }

    const source = this.parseTenantSourceEntries(settings.vectorSourcesConfig)
      .find((item) => String(item.id ?? '').trim().toLowerCase() === sourceId
        && String(item.ingestionMode ?? '').trim().toLowerCase() === 'http'
        && Boolean(item.enabled));

    if (!source) {
      return false;
    }

    const cfg = (source.sourceConfig as VectorSourceConfig | undefined) ?? {};
    const strategy = cfg.authStrategy ?? 'none';

    if (strategy === 'none') {
      return true;
    }

    if (strategy === 'token') {
      const expected = cfg.authToken?.trim();
      const provided = tokenHeaderRaw?.trim();
      return !!expected && !!provided && expected === provided;
    }

    const user = cfg.basicUsername ?? '';
    const pass = cfg.basicPassword ?? '';
    if (!user || !pass || !authHeaderRaw) {
      return false;
    }

    const expectedBasic = `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`;
    return authHeaderRaw.trim() === expectedBasic;
  }

  private async renderVectorConfig(settings: VectorSettingsResponse): Promise<string> {
    const activeProfiles = settings.parserProfiles.filter((profile) => profile.enabled);

    const hasActiveProfiles = activeProfiles.length > 0;

    const tenantSourceEntries = await this.getTenantSourceRenderEntries(activeProfiles);

    let sourceBlocks: string[] = tenantSourceEntries.map((entry) => this.renderSourceBlockByMode(
      entry.sourceName,
      entry.ingestionMode,
      entry.sourceConfig,
    ));
    let normalizeInputs: string[] = tenantSourceEntries.map((entry) => entry.sourceName);

    // Backward compatibility: tenant source가 없으면 기존 Admin profile 기본 source 렌더링을 사용한다.
    if (normalizeInputs.length === 0) {
      sourceBlocks = activeProfiles.map((profile) => this.renderSourceBlock(profile));
      normalizeInputs = activeProfiles.map((profile) => this.sourceName(profile));
    }

    if (normalizeInputs.length === 0) {
      normalizeInputs.push('syslog_udp', 'syslog_tcp');
      sourceBlocks.push(`  syslog_udp:\n    type: syslog\n    address: 0.0.0.0:1514\n    mode: udp`);
      sourceBlocks.push(`  syslog_tcp:\n    type: syslog\n    address: 0.0.0.0:1514\n    mode: tcp`);
    }

    const sourceSection = sourceBlocks.join('\n\n');
    const normalizeInputSection = normalizeInputs.map((name) => `      - ${name}`).join('\n');

    const routeEntries = activeProfiles
      .map((profile) => `      ${profile.vendor}: '.vendor == ${this.toSingleQuotedValue(profile.vendor)}'`)
      .join('\n');

    const classifierBranches = hasActiveProfiles
      ? activeProfiles
        .map((profile, index) => {
          const prefix = index === 0 ? 'if' : 'else if';
          return `      ${prefix} ${this.renderClassifier(profile)} {\n        .vendor = ${this.toSingleQuotedValue(profile.vendor)}\n      }`;
        })
        .join('\n')
      : '      .vendor = "unknown"';

    const classifierFallback = hasActiveProfiles
      ? '      else {\n        .vendor = "unknown"\n      }'
      : '';

    const parseTransforms = activeProfiles
      .map((profile) => {
        const additionalVrl = profile.vrlScript?.trim()
          ? `\n      # 사용자 정의 VRL\n${profile.vrlScript
            .split('\n')
            .map((line) => `      ${line}`)
            .join('\n')}`
          : '';

        return `  parse_${profile.vendor}:\n    type: remap\n    inputs:\n      - vendor_route.${profile.vendor}\n    source: |\n      .parse_status = "ok"\n      .event_time = format_timestamp!(now(), "%+")\n      m, err = parse_regex(.message, ${this.toSingleQuotedValue(profile.deviceCodeRegex)})\n      if err != null {\n        .parse_status = "failed"\n        .parse_error = "device_code_not_found"\n      } else {\n        .device_code = upcase!(to_string!(m.device_code))\n      }\n      .parsed = {\n        "vendor": .vendor,\n        "host": .host,\n        "appname": .appname,\n      }${additionalVrl}`;
      })
      .join('\n\n');

    const parseRouteInputs = activeProfiles
      .map((profile) => `      - parse_${profile.vendor}`)
      .join('\n');

    const unknownPolicyComment = settings.allowUnknownVendor
      ? '# unknown vendor도 quarantine 경로로 유지하되 운영상 허용 상태를 설정으로 관리한다.'
      : '# unknown vendor는 quarantine 경로로 분리한다.';

    return `data_dir: /var/lib/vector

sources:
${sourceSection}

transforms:
  normalize_common:
    type: remap
    inputs:
${normalizeInputSection}
    source: |
      .ingest_time = now()
      .source_ip = to_string(.source_ip) ?? (to_string(.host) ?? "")
      .raw_message = to_string(.message) ?? ""
      .message = .raw_message
      .host = to_string(.host) ?? ""
      .appname = to_string(.appname) ?? ""

  classify_vendor:
    type: remap
    inputs:
      - normalize_common
    source: |
      m = downcase!(.message)
${classifierBranches}
${classifierFallback}

  vendor_route:
    type: route
    inputs:
      - classify_vendor
    route:
${routeEntries}
      unknown: '.vendor == "unknown"'

${parseTransforms}

  parse_unknown:
    type: remap
    inputs:
      - vendor_route.unknown
    source: |
      .parse_status = "failed"
      .parse_error = "unknown_vendor"
      .event_time = format_timestamp!(now(), "%+")
      .parsed = {
        "vendor": .vendor,
        "host": .host,
        "appname": .appname,
      }

  route_events:
    type: route
    inputs:
${parseRouteInputs}
      - parse_unknown
    route:
      accepted: '.parse_status == "ok" && exists(.device_code) && .device_code != ""'
${unknownPolicyComment}
      quarantine: '.parse_status != "ok" || !exists(.device_code) || .device_code == ""'

sinks:
  kafka_parsed_input:
    type: kafka
    inputs:
      - route_events.accepted
    bootstrap_servers: "\${VECTOR_KAFKA_BROKERS}"
    topic: ${this.toSingleQuotedValue(settings.outputTopic)}
    encoding:
      codec: json

  kafka_quarantine:
    type: kafka
    inputs:
      - route_events.quarantine
    bootstrap_servers: "\${VECTOR_KAFKA_BROKERS}"
    topic: ${this.toSingleQuotedValue(settings.quarantineTopic)}
    encoding:
      codec: json
`;
  }

  private resolveConfigPath(): string {
    const fromEnv = process.env.VECTOR_CONFIG_FILE_PATH?.trim();
    if (fromEnv) {
      return path.resolve(fromEnv);
    }
    return path.resolve(process.cwd(), '../infra/vector/vector.yaml');
  }

  private async writeConfigAtomically(configPath: string, content: string): Promise<void> {
    const tempPath = `${configPath}.tmp`;
    await fs.mkdir(path.dirname(configPath), { recursive: true });
    await fs.writeFile(tempPath, content, 'utf8');
    await fs.rename(tempPath, configPath);
  }

  private async reloadVectorContainers(): Promise<{ attempted: boolean; succeeded: boolean; message: string }> {
    const customReloadCmd = process.env.VECTOR_RELOAD_CMD?.trim();
    if (customReloadCmd) {
      await execAsync(customReloadCmd);
      return {
        attempted: true,
        succeeded: true,
        message: `custom reload command executed: ${customReloadCmd}`,
      };
    }

    try {
      const { stdout } = await execAsync('docker ps --format {{.Names}}');
      const running = stdout
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      const targets = ['tms-vector-dev', 'tms-vector-prod'].filter((name) => running.includes(name));
      if (targets.length === 0) {
        return {
          attempted: false,
          succeeded: false,
          message: 'vector container not found; config file was written only',
        };
      }

      await execAsync(`docker kill --signal=HUP ${targets.join(' ')}`);
      return {
        attempted: true,
        succeeded: true,
        message: `sent SIGHUP to containers: ${targets.join(', ')}`,
      };
    } catch {
      return {
        attempted: true,
        succeeded: false,
        message: 'docker reload command failed; config file was written only',
      };
    }
  }

  private async appendApplyHistory(entry: VectorApplyHistoryItem): Promise<void> {
    const settingsMap = await this.getSettingsMap();
    const history = this.parseApplyHistory(settingsMap.get(VECTOR_SETTINGS_KEYS.applyHistoryJson)?.value);
    const nextHistory = [entry, ...history].slice(0, 50);
    await this.upsertSetting(VECTOR_SETTINGS_KEYS.applyHistoryJson, JSON.stringify(nextHistory), VECTOR_VTYPE.text);
  }

  private toJsRegexPattern(pattern: string): string {
    // Vector/VRL uses Rust-style named groups (?P<name>...), while Node RegExp expects (?<name>...).
    return pattern.replace(/\(\?P<([A-Za-z_][A-Za-z0-9_]*)>/g, '(?<$1>');
  }

  private validateProfiles(profiles: VectorParserProfile[]): void {
    const seen = new Set<string>();

    for (const profile of profiles) {
      const vendor = profile.vendor.trim().toLowerCase();
      if (seen.has(vendor)) {
        throw new BadRequestException(`중복 vendor가 존재합니다: ${vendor}`);
      }
      seen.add(vendor);

      if (!VECTOR_INGESTION_MODES.includes(profile.ingestionMode)) {
        throw new BadRequestException(`vendor=${vendor}의 ingestionMode가 유효하지 않습니다.`);
      }

      if (!profile.matchIndicators.length) {
        throw new BadRequestException(`vendor=${vendor}의 matchIndicators는 최소 1개 이상이어야 합니다.`);
      }

      try {
        // 런타임 적용 전, 잘못된 정규식을 조기에 차단한다.
        new RegExp(this.toJsRegexPattern(profile.deviceCodeRegex));
      } catch {
        throw new BadRequestException(`vendor=${vendor}의 deviceCodeRegex가 유효하지 않습니다.`);
      }
    }
  }

  async getSettings(): Promise<VectorSettingsResponse> {
    const settingsMap = await this.getSettingsMap();
    return this.toResponse(settingsMap);
  }

  async updateSettings(dto: UpdateVectorSettingsDto): Promise<VectorSettingsResponse> {
    const beforeMap = await this.getSettingsMap();
    const before = this.toResponse(beforeMap);
    let parserProfilesChanged = false;
    let outputTopicChanged = false;
    let quarantineTopicChanged = false;
    let allowUnknownVendorChanged = false;

    if (dto.parserProfiles !== undefined) {
      const normalizedProfiles: VectorParserProfile[] = dto.parserProfiles.map((profile) => ({
        vendor: profile.vendor.trim().toLowerCase(),
        ingestionMode: profile.ingestionMode,
        matchIndicators: profile.matchIndicators.map((item) => item.trim()).filter((item) => item.length > 0),
        deviceCodeRegex: profile.deviceCodeRegex,
        vrlScript: profile.vrlScript?.trim() ?? '',
        enabled: profile.enabled,
      }));

      if (normalizedProfiles.length === 0) {
        throw new BadRequestException('parserProfiles는 최소 1개 이상이어야 합니다.');
      }

      this.validateProfiles(normalizedProfiles);
      parserProfilesChanged = JSON.stringify(normalizedProfiles) !== JSON.stringify(before.parserProfiles);
      await this.upsertSetting(
        VECTOR_SETTINGS_KEYS.parserProfilesJson,
        JSON.stringify(normalizedProfiles),
        VECTOR_VTYPE.text,
      );
    }

    const normalizedOutputTopic = this.trimOrNull(dto.outputTopic);
    if (dto.outputTopic !== undefined) {
      outputTopicChanged = (normalizedOutputTopic ?? DEFAULT_VECTOR_OUTPUT_TOPIC) !== before.outputTopic;
      await this.upsertSetting(VECTOR_SETTINGS_KEYS.outputTopic, normalizedOutputTopic, VECTOR_VTYPE.text);
    }

    const normalizedQuarantineTopic = this.trimOrNull(dto.quarantineTopic);
    if (dto.quarantineTopic !== undefined) {
      quarantineTopicChanged = (normalizedQuarantineTopic ?? DEFAULT_VECTOR_QUARANTINE_TOPIC) !== before.quarantineTopic;
      await this.upsertSetting(
        VECTOR_SETTINGS_KEYS.quarantineTopic,
        normalizedQuarantineTopic,
        VECTOR_VTYPE.text,
      );
    }

    if (dto.allowUnknownVendor !== undefined) {
      allowUnknownVendorChanged = dto.allowUnknownVendor !== before.allowUnknownVendor;
      await this.upsertSetting(
        VECTOR_SETTINGS_KEYS.allowUnknownVendor,
        dto.allowUnknownVendor ? 'true' : 'false',
        VECTOR_VTYPE.boolean,
      );
    }

    const changed =
      parserProfilesChanged
      || outputTopicChanged
      || quarantineTopicChanged
      || allowUnknownVendorChanged;

    if (changed) {
      const nextVersion = before.configVersion + 1;
      await this.upsertSetting(VECTOR_SETTINGS_KEYS.configVersion, String(nextVersion), VECTOR_VTYPE.integer);
    }

    const updatedMap = await this.getSettingsMap();
    return this.toResponse(updatedMap);
  }

  async dryRunSettings(): Promise<VectorDryRunResult> {
    const settings = await this.getSettings();
    const configPath = this.resolveConfigPath();

    this.validateProfiles(settings.parserProfiles);

    const activeProfiles = settings.parserProfiles.filter((profile) => profile.enabled);
    const warnings: string[] = [];
    if (activeProfiles.length === 0) {
      warnings.push('활성 파서 프로파일이 없어 모든 이벤트가 quarantine 경로로 분류됩니다.');
    }

    const tenantSourceEntries = await this.getTenantSourceRenderEntries(activeProfiles);
    if (tenantSourceEntries.length === 0 && activeProfiles.length > 0) {
      warnings.push('활성 테넌트 source 인스턴스가 없어 Admin 기본 source 템플릿으로 렌더링됩니다. 테넌트 화면에서 Vector Source를 설정하세요.');
    }

    const rendered = await this.renderVectorConfig(settings);
    return {
      valid: true,
      configPath,
      renderedBytes: Buffer.byteLength(rendered, 'utf8'),
      warnings,
      preview: rendered,
    };
  }

  async getApplyHistory(limit = 30): Promise<VectorApplyHistoryItem[]> {
    const settingsMap = await this.getSettingsMap();
    const history = this.parseApplyHistory(settingsMap.get(VECTOR_SETTINGS_KEYS.applyHistoryJson)?.value);
    return history.slice(0, Math.max(1, Math.min(limit, 100)));
  }

  async applySettings(): Promise<VectorApplyResult> {
    const settingsMap = await this.getSettingsMap();
    const settings = this.toResponse(settingsMap);
    const configPath = this.resolveConfigPath();
    const rendered = await this.renderVectorConfig(settings);

    try {
      await this.writeConfigAtomically(configPath, rendered);
      const reloadResult = await this.reloadVectorContainers();

      await this.upsertSetting(VECTOR_SETTINGS_KEYS.appliedVersion, String(settings.configVersion), VECTOR_VTYPE.integer);
      await this.upsertSetting(VECTOR_SETTINGS_KEYS.appliedAt, new Date().toISOString(), VECTOR_VTYPE.text);
      await this.upsertSetting(VECTOR_SETTINGS_KEYS.lastApplyStatus, 'APPLIED', VECTOR_VTYPE.text);
      await this.upsertSetting(VECTOR_SETTINGS_KEYS.lastApplyMessage, reloadResult.message, VECTOR_VTYPE.text);

      await this.appendApplyHistory({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        attemptedAt: new Date().toISOString(),
        configVersion: settings.configVersion,
        applyStatus: 'APPLIED',
        message: reloadResult.message,
        configPath,
        renderedBytes: Buffer.byteLength(rendered, 'utf8'),
        reloadAttempted: reloadResult.attempted,
        reloadSucceeded: reloadResult.succeeded,
      });

      return {
        applyStatus: 'APPLIED',
        message: reloadResult.message,
        configPath,
        renderedBytes: Buffer.byteLength(rendered, 'utf8'),
        reloadAttempted: reloadResult.attempted,
        reloadSucceeded: reloadResult.succeeded,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.upsertSetting(VECTOR_SETTINGS_KEYS.lastApplyStatus, 'FAILED', VECTOR_VTYPE.text);
      await this.upsertSetting(VECTOR_SETTINGS_KEYS.lastApplyMessage, message, VECTOR_VTYPE.text);
      await this.appendApplyHistory({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        attemptedAt: new Date().toISOString(),
        configVersion: settings.configVersion,
        applyStatus: 'FAILED',
        message,
        configPath,
        renderedBytes: Buffer.byteLength(rendered, 'utf8'),
        reloadAttempted: false,
        reloadSucceeded: false,
      });

      return {
        applyStatus: 'FAILED',
        message,
        configPath,
        renderedBytes: Buffer.byteLength(rendered, 'utf8'),
        reloadAttempted: false,
        reloadSucceeded: false,
      };
    }
  }
}
