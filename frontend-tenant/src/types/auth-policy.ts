export interface AuthPolicy {
  maxLoginFailures: number;
  lockMinutes: number;
  maxConcurrentSessions: number;
  autoLogoutTimeoutMinutes: number;
}
