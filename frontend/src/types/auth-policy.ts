export interface AuthPolicy {
  maxLoginFailures: number;
  lockMinutes: number;
  maxConcurrentSessions: number;
  autoLogoutTimeoutMinutes: number;
}

export interface AdminAuthSettings extends AuthPolicy {
  isMultiTenantEnabled: boolean;
  tenantVisibleMenuPaths: string[];
}
