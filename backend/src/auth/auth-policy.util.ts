import {
  AUTH_POLICY_LIMITS,
  AuthPolicy,
  DEFAULT_AUTH_POLICY,
} from './auth-policy.constants';

export function validateAuthPolicy(policy: AuthPolicy): void {
  if (
    policy.maxLoginFailures < AUTH_POLICY_LIMITS.loginFailures.min
    || policy.maxLoginFailures > AUTH_POLICY_LIMITS.loginFailures.max
  ) {
    throw new Error('maxLoginFailures 값이 허용 범위를 벗어났습니다.');
  }

  if (
    policy.lockMinutes < AUTH_POLICY_LIMITS.lockMinutes.min
    || policy.lockMinutes > AUTH_POLICY_LIMITS.lockMinutes.max
  ) {
    throw new Error('lockMinutes 값이 허용 범위를 벗어났습니다.');
  }

  if (
    policy.maxConcurrentSessions < AUTH_POLICY_LIMITS.concurrentSessions.min
    || policy.maxConcurrentSessions > AUTH_POLICY_LIMITS.concurrentSessions.max
  ) {
    throw new Error('maxConcurrentSessions 값이 허용 범위를 벗어났습니다.');
  }

  const timeout = policy.autoLogoutTimeoutMinutes;
  const timeoutMin = AUTH_POLICY_LIMITS.autoLogoutTimeoutMinutes.min;
  const timeoutMax = AUTH_POLICY_LIMITS.autoLogoutTimeoutMinutes.max;
  const timeoutPermanent = AUTH_POLICY_LIMITS.autoLogoutTimeoutMinutes.permanent;
  const isValidTimeout = timeout === timeoutPermanent || (timeout >= timeoutMin && timeout <= timeoutMax);

  if (!isValidTimeout) {
    throw new Error('autoLogoutTimeoutMinutes 값이 허용 범위를 벗어났습니다.');
  }
}

export function normalizeAuthPolicy(raw?: Partial<AuthPolicy> | null): AuthPolicy {
  return {
    maxLoginFailures: raw?.maxLoginFailures ?? DEFAULT_AUTH_POLICY.maxLoginFailures,
    lockMinutes: raw?.lockMinutes ?? DEFAULT_AUTH_POLICY.lockMinutes,
    maxConcurrentSessions: raw?.maxConcurrentSessions ?? DEFAULT_AUTH_POLICY.maxConcurrentSessions,
    autoLogoutTimeoutMinutes:
      raw?.autoLogoutTimeoutMinutes ?? DEFAULT_AUTH_POLICY.autoLogoutTimeoutMinutes,
  };
}
