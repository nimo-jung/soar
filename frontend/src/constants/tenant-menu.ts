export interface TenantMenuOption {
  path: string;
  labelKey: string;
  icon?: string;
}

export interface TenantMenuGroup {
  key: string;
  labelKey: string;
  icon?: string;
  items: TenantMenuOption[];
}

export const TENANT_MENU_GROUPS: TenantMenuGroup[] = [
  {
    key: 'security-center',
    labelKey: 'nav.securityCenter',
    icon: 'pi pi-shield',
    items: [
      { path: '/dashboard', labelKey: 'nav.dashboard', icon: 'pi pi-home' },
      { path: '/alerts', labelKey: 'nav.alerts', icon: 'pi pi-bell' },
      { path: '/playbooks', labelKey: 'nav.playbooks', icon: 'pi pi-sitemap' },
    ],
  },
  {
    key: 'security-audit',
    labelKey: 'nav.securityAudit',
    icon: 'pi pi-bookmark',
    items: [
      { path: '/audit-logs', labelKey: 'nav.auditLogs', icon: 'pi pi-book' },
    ],
  },
  {
    key: 'data-policy',
    labelKey: 'nav.dataPolicy',
    icon: 'pi pi-database',
    items: [
      { path: '/collectors', labelKey: 'nav.collectors', icon: 'pi pi-server' },
      { path: '/settings', labelKey: 'nav.normalizationSettings', icon: 'pi pi-cog' },
    ],
  },
  {
    key: 'system-management',
    labelKey: 'nav.systemManagement',
    icon: 'pi pi-cog',
    items: [
      { path: '/users', labelKey: 'nav.users', icon: 'pi pi-user' },
      { path: '/auth-settings', labelKey: 'nav.authSettings', icon: 'pi pi-lock' },
    ],
  },
];

export const TENANT_MENU_OPTIONS: TenantMenuOption[] = TENANT_MENU_GROUPS.flatMap((group) => group.items);

export const DEFAULT_TENANT_VISIBLE_MENU_PATHS = TENANT_MENU_OPTIONS.map((item) => item.path);
