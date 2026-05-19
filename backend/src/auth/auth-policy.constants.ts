export const AUTH_POLICY_LIMITS = {
  loginFailures: { min: 1, max: 5, default: 3 },
  lockMinutes: { min: 3, max: 30, default: 5 },
  concurrentSessions: { min: 1, max: 5, default: 1 },
  autoLogoutTimeoutMinutes: { min: 1, max: 30, default: 5, permanent: 0 },
  warningLeadSeconds: 10,
} as const;

export interface AuthPolicy {
  maxLoginFailures: number;
  lockMinutes: number;
  maxConcurrentSessions: number;
  autoLogoutTimeoutMinutes: number;
}

export const DEFAULT_AUTH_POLICY: AuthPolicy = {
  maxLoginFailures: AUTH_POLICY_LIMITS.loginFailures.default,
  lockMinutes: AUTH_POLICY_LIMITS.lockMinutes.default,
  maxConcurrentSessions: AUTH_POLICY_LIMITS.concurrentSessions.default,
  autoLogoutTimeoutMinutes: AUTH_POLICY_LIMITS.autoLogoutTimeoutMinutes.default,
};

export const LONG_LIVED_SESSION_DAYS = 365;

export enum AuthScope {
  MASTER = 'MASTER',
  TENANT = 'TENANT',
}
