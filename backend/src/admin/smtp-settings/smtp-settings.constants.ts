export const SMTP_SETTINGS_SECTION = 'smtp';

export const SMTP_SETTINGS_KEYS = {
  mode: 'mode',
  host: 'host',
  port: 'port',
  secure: 'secure',
  user: 'user',
  pass: 'pass',
  from: 'from',
  tenantBootstrapUrl: 'tenant_bootstrap_url',
  tenantPasswordResetUrl: 'tenant_password_reset_url',
} as const;

export const SMTP_VTYPE = {
  text: 1,
  integer: 2,
  float: 3,
  boolean: 4,
} as const;

export const SMTP_MODE = {
  local: 'local',
  external: 'external',
} as const;

export type SmtpMode = (typeof SMTP_MODE)[keyof typeof SMTP_MODE];
