export const VECTOR_SETTINGS_SECTION = 'vector_pipeline';

export const VECTOR_SETTINGS_KEYS = {
  parserProfilesJson: 'parser_profiles_json',
  outputTopic: 'output_topic',
  quarantineTopic: 'quarantine_topic',
  allowUnknownVendor: 'allow_unknown_vendor',
  configVersion: 'config_version',
  appliedVersion: 'applied_version',
  appliedAt: 'applied_at',
  lastApplyStatus: 'last_apply_status',
  lastApplyMessage: 'last_apply_message',
  applyHistoryJson: 'apply_history_json',
} as const;

export const VECTOR_VTYPE = {
  text: 1,
  integer: 2,
  float: 3,
  boolean: 4,
} as const;

export const VECTOR_INGESTION_MODES = ['syslog', 'snmp', 'http', 'cmd', 'file', 'kafka'] as const;
export type VectorIngestionMode = typeof VECTOR_INGESTION_MODES[number];

export interface VectorSourceConfig {
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
}

export interface VectorParserProfile {
  vendor: string;
  ingestionMode: VectorIngestionMode;
  matchIndicators: string[];
  deviceCodeRegex: string;
  vrlScript?: string;
  enabled: boolean;
}

export const DEFAULT_VECTOR_PARSER_PROFILES: VectorParserProfile[] = [
  {
    vendor: 'paloalto',
    ingestionMode: 'syslog',
    matchIndicators: ['panos', 'palo alto'],
    deviceCodeRegex: '(?P<device_code>[A-Za-z0-9._:-]{3,128})',
    vrlScript: '',
    enabled: true,
  },
  {
    vendor: 'fortinet',
    ingestionMode: 'syslog',
    matchIndicators: ['fortigate', 'fortios'],
    deviceCodeRegex: 'device_id=(?P<device_code>[A-Za-z0-9._:-]{3,128})',
    vrlScript: '',
    enabled: true,
  },
  {
    vendor: 'cisco',
    ingestionMode: 'syslog',
    matchIndicators: ['cisco'],
    deviceCodeRegex: 'device_code=(?P<device_code>[A-Za-z0-9._:-]{3,128})',
    vrlScript: '',
    enabled: true,
  },
];

export const DEFAULT_VECTOR_OUTPUT_TOPIC = 'logs.parsed.input';
export const DEFAULT_VECTOR_QUARANTINE_TOPIC = 'logs.quarantine';
