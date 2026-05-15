import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/auth.store';
import { useBrandingStore } from '../../store/branding.store';
import LanguageSwitcher from '../LanguageSwitcher';

/* ── Verona grouped nav model ─────────────────────────────────── */
const navModel = [
  {
    categoryKey: 'nav.categories.security',
    items: [
      { labelKey: 'nav.dashboard', path: '/dashboard', icon: 'pi pi-home' },
      { labelKey: 'nav.alerts', path: '/alerts', icon: 'pi pi-bell' },
      { labelKey: 'nav.playbooks', path: '/playbooks', icon: 'pi pi-sitemap' },
    ],
  },
  {
    categoryKey: 'nav.categories.collection',
    items: [
      { labelKey: 'nav.collectors', path: '/collectors', icon: 'pi pi-server' },
    ],
  },
  {
    categoryKey: 'nav.categories.management',
    items: [
      { labelKey: 'nav.settings', path: '/settings', icon: 'pi pi-cog' },
    ],
  },
];

/* Find breadcrumb label for current route */
function getBreadcrumb(pathname: string, t: (key: string) => string): string {
  for (const group of navModel) {
    for (const item of group.items) {
      if (pathname.startsWith(item.path)) return t(item.labelKey);
    }
  }
  return '';
}

/* Derive initials from tenantId */
function initials(tenantId?: string): string {
  if (!tenantId) return 'U';
  return tenantId.slice(0, 2).toUpperCase();
}

const TenantLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const logout = useAuthStore((s) => s.logout);
  const branding = useBrandingStore((s) => s.branding);
  const user = useAuthStore((s) => s.user);

  const [staticInactive, setStaticInactive] = useState(false);
  const [mobileActive, setMobileActive] = useState(false);
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

  const toggleMenu = () => {
    if (window.innerWidth < 992) {
      setMobileActive((v) => !v);
    } else {
      setStaticInactive((v) => !v);
    }
  };

  const breadcrumb = useMemo(
    () => getBreadcrumb(location.pathname, t),
    [location.pathname, t],
  );

  const wrapperClass = [
    'layout-wrapper',
    'layout-static',
    staticInactive ? 'layout-static-inactive' : '',
    mobileActive ? 'layout-mobile-active' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={wrapperClass}>
      {/* ════════════════ SIDEBAR ════════════════ */}
      <div className="layout-sidebar">
        {/* Brand header */}
        <div className="layout-sidebar-header">
          {branding.logoUrl ? (
            <img src={branding.logoUrl} alt="logo" className="brand-logo" />
          ) : (
            <i className="pi pi-shield brand-icon" />
          )}
          <span className="brand-name">{branding.companyName ?? 'SOAR'}</span>
        </div>

        {/* Grouped menu */}
        <div className="layout-menu-container">
          <ul className="layout-menu">
            {navModel.map((group) => (
              <li key={group.categoryKey}>
                <span className="layout-menu-category">{t(group.categoryKey)}</span>
                <ul className="layout-menu" style={{ padding: 0 }}>
                  {group.items.map((item) => (
                    <li key={item.path}>
                      <NavLink
                        to={item.path}
                        className={({ isActive }) => (isActive ? 'active-route' : '')}
                        onClick={() => setMobileActive(false)}
                      >
                        <i className={`menu-icon ${item.icon}`} />
                        <span className="menu-label">{t(item.labelKey)}</span>
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>

        {/* Profile / logout footer */}
        <div className="layout-sidebar-profile">
          {user && (
            <div className="profile-info">
              <div className="profile-avatar">{initials(user.tenantId)}</div>
              <div className="profile-text">
                <div className="profile-name">{user.tenantId}</div>
                <div className="profile-role">{user.role}</div>
              </div>
            </div>
          )}
          <button className="logout-btn" onClick={() => { logout(); navigate('/login'); }}>
            <i className="pi pi-sign-out" />
            <span>{t('common.logout')}</span>
          </button>
        </div>
      </div>

      {/* ════════════════ MAIN ════════════════ */}
      <div className="layout-main-container">
        {/* Topbar */}
        <div className="layout-topbar">
          <div className="layout-topbar-left">
            <button className="layout-menu-button" onClick={toggleMenu} aria-label="메뉴 토글">
              <i className="pi pi-bars" />
            </button>
            <div className="layout-topbar-breadcrumb">
              <i className="pi pi-home breadcrumb-home" />
              {breadcrumb && (
                <>
                  <i className="pi pi-chevron-right breadcrumb-separator" />
                  <span className="breadcrumb-current">{breadcrumb}</span>
                </>
              )}
            </div>
          </div>

          <div className="layout-topbar-right">
            <LanguageSwitcher />
            <button className="topbar-icon-btn" aria-label="알림">
              <i className="pi pi-bell" />
              <span className="badge" />
            </button>
            <button className="topbar-icon-btn" aria-label="검색">
              <i className="pi pi-search" />
            </button>
            <div className="topbar-profile">
              <div className="topbar-avatar">{initials(user?.tenantId)}</div>
              <span className="topbar-username">{user?.tenantId ?? '사용자'}</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="layout-main">
          <Outlet />
        </div>
      </div>

      {/* Mobile overlay */}
      <div className="layout-mask" onClick={() => setMobileActive(false)} />
    </div>
  );
};

export default TenantLayout;
