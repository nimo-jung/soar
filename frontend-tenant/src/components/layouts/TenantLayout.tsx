import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BreadCrumb } from 'primereact/breadcrumb';
import { IconField } from 'primereact/iconfield';
import { InputText } from 'primereact/inputtext';
import { InputIcon } from 'primereact/inputicon';
import { Tooltip } from 'primereact/tooltip';
import { useAuthStore } from '../../store/auth.store';
import { useBrandingStore } from '../../store/branding.store';
import LanguageSwitcher from '../LanguageSwitcher';
import SessionTimeoutManager from '../SessionTimeoutManager';
import api from '../../api';

interface NavItem {
  labelKey: string;
  icon: string;
  path?: string;
  children?: NavItem[];
}

interface NavGroup {
  categoryKey: string;
  items: NavItem[];
}

/* ── Verona grouped nav model (2-depth) ───────────────────────── */
const navModel = [
  {
    categoryKey: 'nav.categories.security',
    items: [
      {
        labelKey: 'nav.securityCenter',
        icon: 'pi pi-home',
        children: [
          { labelKey: 'nav.dashboard', path: '/dashboard', icon: 'pi pi-home' },
          { labelKey: 'nav.alerts', path: '/alerts', icon: 'pi pi-bell' },
          { labelKey: 'nav.playbooks', path: '/playbooks', icon: 'pi pi-sitemap' },
        ],
      },
    ],
  },
  {
    categoryKey: 'nav.categories.collection',
    items: [
      {
        labelKey: 'nav.ingestion',
        icon: 'pi pi-cloud-upload',
        children: [
          { labelKey: 'nav.collectors', path: '/collectors', icon: 'pi pi-server' },
        ],
      },
    ],
  },
  {
    categoryKey: 'nav.categories.management',
    items: [
      {
        labelKey: 'nav.tenantAdmin',
        icon: 'pi pi-briefcase',
        children: [
          { labelKey: 'nav.users', path: '/users', icon: 'pi pi-users' },
          { labelKey: 'nav.auditLogs', path: '/audit-logs', icon: 'pi pi-book' },
          { labelKey: 'nav.settings', path: '/settings', icon: 'pi pi-cog' },
          { labelKey: 'nav.authSettings', path: '/auth-settings', icon: 'pi pi-lock' },
        ],
      },
    ],
  },
] as NavGroup[];

const EXPANDED_OPEN_ROOTS_STORAGE_KEY = 'tenant.sidebar.expandedOpenRoots';
const SIDEBAR_MODE_STORAGE_KEY = 'tenant.sidebar.mode';
const THEME_STORAGE_KEY = 'tenant.theme.mode';
const DARK_MODE_CLASS = 'tenant-dark-mode';

function isPathActive(currentPath: string, path?: string): boolean {
  if (!path) return false;
  return currentPath.startsWith(path);
}

/* Find breadcrumb label for current route */
function getBreadcrumbItems(pathname: string, t: (key: string) => string): Array<{ label: string; icon: string }> {
  for (const group of navModel) {
    for (const item of group.items) {
      if (isPathActive(pathname, item.path)) {
        return [{ label: t(item.labelKey), icon: item.icon }];
      }
      if (item.children) {
        for (const child of item.children) {
          if (isPathActive(pathname, child.path)) {
            return [
              { label: t(item.labelKey), icon: item.icon },
              { label: t(child.labelKey), icon: child.icon },
            ];
          }
        }
      }
    }
  }
  return [];
}

function getMenuKey(groupKey: string, itemKey: string): string {
  return `${groupKey}::${itemKey}`;
}

/* Derive initials from tenantId */
function initials(tenantId?: string): string {
  if (!tenantId) return 'U';
  return tenantId.slice(0, 2).toUpperCase();
}

function getDisplayCompanyName(companyName?: string): string {
  const trimmed = companyName?.trim();
  if (!trimmed) {
    return 'Sniper TMS';
  }

  return trimmed.toUpperCase() === 'TMS' ? 'Sniper TMS' : trimmed;
}

const TenantLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const logout = useAuthStore((s) => s.logout);
  const resetBranding = useBrandingStore((s) => s.reset);
  const branding = useBrandingStore((s) => s.branding);
  const user = useAuthStore((s) => s.user);

  const [staticInactive] = useState(false);
  const [mobileActive, setMobileActive] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    return window.localStorage.getItem(THEME_STORAGE_KEY) === 'dark';
  });
  const [isSidebarExpanded, setIsSidebarExpanded] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    return window.localStorage.getItem(SIDEBAR_MODE_STORAGE_KEY) === 'expanded';
  });
  const [isSidebarTransitioning, setIsSidebarTransitioning] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [activeRootMenuKey, setActiveRootMenuKey] = useState<string>('');
  const [expandedOpenRootMenuKeys, setExpandedOpenRootMenuKeys] = useState<string[]>([]);
  const [isExpandedRootsHydrated, setIsExpandedRootsHydrated] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const sidebarTransitionTimerRef = useRef<number | null>(null);
  const { t } = useTranslation();

  /* Inject branding CSS variables */
  useEffect(() => {
    const root = document.documentElement;
    if (branding.primaryColor) {
      root.style.setProperty('--brand-primary', branding.primaryColor);
      /* derive gradient tones from brand color */
      root.style.setProperty('--brand-gradient-from', branding.primaryColor);
      root.style.setProperty('--brand-gradient-to', branding.primaryColor + '99');
    } else {
      root.style.removeProperty('--brand-primary');
      root.style.removeProperty('--brand-gradient-from');
      root.style.removeProperty('--brand-gradient-to');
    }
  }, [branding.primaryColor]);

  const breadcrumbItems = useMemo(
    () => getBreadcrumbItems(location.pathname, t).map((item) => ({
      label: item.label,
      template: () => (
        <span className="tenant-breadcrumb-item">
          <i className={`p-menuitem-icon ${item.icon}`} />
          <span className="p-menuitem-text">{item.label}</span>
        </span>
      ),
    })),
    [location.pathname, t],
  );

  useEffect(() => {
    if (!profileMenuOpen) return;

    const handleDocumentClick = (event: MouseEvent) => {
      if (!profileMenuRef.current) return;
      if (!profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleDocumentClick);
    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
    };
  }, [profileMenuOpen]);

  useEffect(() => {
    return () => {
      if (sidebarTransitionTimerRef.current !== null) {
        window.clearTimeout(sidebarTransitionTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle(DARK_MODE_CLASS, isDarkMode);
    window.localStorage.setItem(THEME_STORAGE_KEY, isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(EXPANDED_OPEN_ROOTS_STORAGE_KEY);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return;
      }

      const validRootKeys = new Set(
        navModel.flatMap((group) => group.items.map((item) => getMenuKey(group.categoryKey, item.labelKey))),
      );
      const filtered = parsed.filter((value): value is string => typeof value === 'string' && validRootKeys.has(value));
      setExpandedOpenRootMenuKeys(filtered);
    } catch {
      // 저장된 값이 손상된 경우 무시한다.
    } finally {
      setIsExpandedRootsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isExpandedRootsHydrated) {
      return;
    }

    window.localStorage.setItem(EXPANDED_OPEN_ROOTS_STORAGE_KEY, JSON.stringify(expandedOpenRootMenuKeys));
  }, [expandedOpenRootMenuKeys, isExpandedRootsHydrated]);

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_MODE_STORAGE_KEY, isSidebarExpanded ? 'expanded' : 'slim');
  }, [isSidebarExpanded]);

  useEffect(() => {
    if (isSidebarExpanded || !activeRootMenuKey) return;

    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target) return;

      const clickedMenuItem = target.closest('.layout-root-menuitem');
      const clickedSidebarToggle = target.closest('.layout-sidebar-toggle');

      if (clickedMenuItem || clickedSidebarToggle) {
        return;
      }

      setActiveRootMenuKey('');
    };

    document.addEventListener('mousedown', handleDocumentClick);
    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
    };
  }, [isSidebarExpanded, activeRootMenuKey]);

  const handleLogout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // 로그아웃 감사로그 실패와 관계없이 클라이언트 세션은 정리한다.
    } finally {
      resetBranding();
      logout();
      navigate('/login');
    }
  }, [logout, navigate, resetBranding]);

  const wrapperClass = [
    'layout-container',
    isSidebarExpanded ? 'layout-expanded' : 'layout-slim',
    'layout-light',
    'p-ripple-disabled',
    'layout-wrapper',
    'layout-static',
    staticInactive ? 'layout-static-inactive' : '',
    mobileActive ? 'layout-mobile-active' : '',
    isSidebarTransitioning ? 'layout-sidebar-transitioning' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const toggleRootMenu = (rootKey: string) => {
    setActiveRootMenuKey((prev) => (prev === rootKey ? '' : rootKey));
  };

  const handleSidebarModeToggle = () => {
    setIsSidebarExpanded((prev) => {
      const next = !prev;

      if (!next) {
        setActiveRootMenuKey('');
      }

      setIsSidebarTransitioning(true);
      if (sidebarTransitionTimerRef.current !== null) {
        window.clearTimeout(sidebarTransitionTimerRef.current);
      }
      sidebarTransitionTimerRef.current = window.setTimeout(() => {
        setIsSidebarTransitioning(false);
      }, 260);

      return next;
    });
  };

  const toggleExpandedRootMenu = (rootKey: string) => {
    setExpandedOpenRootMenuKeys((prev) => (
      prev.includes(rootKey) ? prev.filter((key) => key !== rootKey) : [...prev, rootKey]
    ));
  };

  return (
    <div className={wrapperClass}>
      <div className="layout-topbar">
        <button
          type="button"
          className="app-logo"
          onClick={() => navigate('/dashboard')}
          aria-label={t('nav.dashboard')}
        >
          <span className={`brand-logo-shell ${isDarkMode ? 'is-dark' : ''}`}>
            <img src="/winstechnet.png" alt={t('auth.logoAlt')} className="brand-logo" />
          </span>
          <span className="app-name">{getDisplayCompanyName(branding.companyName)}</span>
        </button>

        <div className="topbar-search">
          <IconField iconPosition="left" className="topbar-search-field">
            <InputIcon className="pi pi-search" />
            <InputText
              className="topbar-search-input"
              placeholder={t('layout.topbar.searchPlaceholder')}
              aria-label={t('layout.topbar.searchAria')}
            />
          </IconField>
        </div>

        <div className="layout-topbar-right">
          <button
            type="button"
            className="topbar-icon-btn p-link"
            onClick={() => setIsDarkMode((prev) => !prev)}
            aria-label={isDarkMode ? t('common.switchToLightMode') : t('common.switchToDarkMode')}
            title={isDarkMode ? t('common.switchToLightMode') : t('common.switchToDarkMode')}
          >
            <i className={`pi ${isDarkMode ? 'pi-sun' : 'pi-moon'}`} />
          </button>

          <LanguageSwitcher />

          <div className="topbar-profile" ref={profileMenuRef}>
            <button
              className="topbar-profile-button p-link"
              type="button"
              onClick={() => setProfileMenuOpen((prev) => !prev)}
              aria-label={t('common.profile')}
            >
              <span className="topbar-avatar-image">{initials(user?.tenantId)}</span>
              <span className="profile-details">
                <span className="profile-name">{user?.tenantId ?? t('common.user')}</span>
                <span className="profile-job">{user?.role ?? '-'}</span>
              </span>
              <i className="pi pi-angle-down" />
            </button>
            <ul className={`topbar-profile-menu list-none p-3 m-0 border-round shadow-2 absolute surface-overlay origin-top w-full sm:w-12rem mt-2 right-0 top-auto ${profileMenuOpen ? '' : 'hidden'}`}>
              <li>
                <button type="button" className="p-ripple flex p-2 border-round align-items-center hover:surface-hover transition-colors transition-duration-150 cursor-pointer topbar-profile-menu-item">
                  <i className="pi pi-user mr-3" />
                  <span>{t('common.profile')}</span>
                </button>
                <button type="button" className="p-ripple flex p-2 border-round align-items-center hover:surface-hover transition-colors transition-duration-150 cursor-pointer topbar-profile-menu-item">
                  <i className="pi pi-inbox mr-3" />
                  <span>{t('common.inbox')}</span>
                </button>
                <button type="button" className="p-ripple flex p-2 border-round align-items-center hover:surface-hover transition-colors transition-duration-150 cursor-pointer topbar-profile-menu-item">
                  <i className="pi pi-cog mr-3" />
                  <span>{t('common.settings')}</span>
                </button>
                <button
                  type="button"
                  className="p-ripple flex p-2 border-round align-items-center hover:surface-hover transition-colors transition-duration-150 cursor-pointer topbar-profile-menu-item"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    void handleLogout();
                  }}
                >
                  <i className="pi pi-power-off mr-3" />
                  <span>{t('common.logout')}</span>
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="layout-sidebar" ref={sidebarRef}>
        <div className="layout-menu-container">
          <ul className="layout-menu">
            {navModel.map((group) => (
              <li className="layout-root-menuitem" key={group.categoryKey}>
                {group.items.map((item) => {
                  const rootKey = getMenuKey(group.categoryKey, item.labelKey);
                  const hasChildren = Boolean(item.children?.length);
                  const isActiveRoot = activeRootMenuKey === rootKey;
                  const isExpandedRootOpen = expandedOpenRootMenuKeys.includes(rootKey);
                  const isSubmenuOpen = !isSidebarTransitioning && (isSidebarExpanded ? isExpandedRootOpen : isActiveRoot);
                  const hasActiveChild = Boolean(item.children?.some((child) => isPathActive(location.pathname, child.path)));

                  return (
                    <React.Fragment key={rootKey}>
                      <div className="layout-menuitem-root-text">
                        <span>{t(group.categoryKey)}</span>
                      </div>
                      <a
                        className={`p-ripple tooltip-target ${hasActiveChild ? 'active-route' : ''} ${isActiveRoot ? 'active-menuitem' : ''}`}
                        data-pr-tooltip={t(item.labelKey)}
                        data-pr-disabled={isSidebarExpanded}
                        tabIndex={0}
                        title={t(item.labelKey)}
                        role="button"
                        aria-expanded={isSubmenuOpen ? 'true' : 'false'}
                        onClick={(event) => {
                          event.preventDefault();
                          if (isSidebarExpanded) {
                            toggleExpandedRootMenu(rootKey);
                            return;
                          }
                          toggleRootMenu(rootKey);
                        }}
                      >
                        <i className={`layout-menuitem-icon ${item.icon}`} />
                        <span className="layout-menuitem-text">{t(item.labelKey)}</span>
                        {hasChildren && <i className="pi pi-fw pi-angle-down layout-submenu-toggler" />}
                      </a>
                      <ul className={`layout-root-submenulist ${isSubmenuOpen ? 'layout-submenu-open' : 'layout-submenu-closed'}`}>
                        {item.children?.map((child) => (
                          <li key={child.path ?? child.labelKey}>
                            <NavLink
                              to={child.path ?? '/'}
                              className={({ isActive }) => (isActive ? 'p-ripple active-route' : 'p-ripple')}
                              onClick={() => {
                                setMobileActive(false);
                                if (window.innerWidth >= 992) {
                                  setActiveRootMenuKey('');
                                }
                              }}
                            >
                              <i className={`layout-menuitem-icon ${child.icon}`} />
                              <span className="layout-menuitem-text">{t(child.labelKey)}</span>
                            </NavLink>
                          </li>
                        ))}
                      </ul>
                    </React.Fragment>
                  );
                })}
              </li>
            ))}
          </ul>
        </div>

        <div className="layout-sidebar-toggle-wrap">
          <button
            type="button"
            className="layout-sidebar-toggle p-link"
            onClick={handleSidebarModeToggle}
            aria-label={t('common.menuToggle')}
            title={t('common.menuToggle')}
          >
            <i className={`pi ${isSidebarExpanded ? 'pi-angle-double-left' : 'pi-angle-double-right'}`} />
          </button>
        </div>
      </div>

      <div className="layout-content-wrapper layout-main-container">
        <div className="layout-content">
          <div className="layout-content-inner">
            <nav className="layout-breadcrumb">
              <BreadCrumb
                model={breadcrumbItems}
                className="tenant-breadcrumb"
              />
            </nav>
            <div className="layout-main">
              <Outlet />
            </div>
            <div className="layout-footer mt-auto">
              <div className="footer-start">
              </div>
              <div className="footer-right">
                <span>{t('layout.footer.copyright')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile overlay */}
      <div className="layout-mask" onClick={() => setMobileActive(false)} />

      <Tooltip
        target=".layout-sidebar .tooltip-target"
        position="right"
        showDelay={120}
        hideDelay={80}
        className="sidebar-menu-tooltip"
      />

      <SessionTimeoutManager />
    </div>
  );
};

export default TenantLayout;
