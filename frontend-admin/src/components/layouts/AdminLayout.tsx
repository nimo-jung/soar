import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/auth.store';
import LanguageSwitcher from '../LanguageSwitcher';
import SessionTimeoutManager from '../SessionTimeoutManager';
import api from '../../api';

const navSections = [
  {
    sectionLabelKey: 'nav.operations',
    sectionIcon: 'pi pi-briefcase',
    items: [
      { labelKey: 'nav.tenants', path: '/tenants', icon: 'pi pi-building' },
      { labelKey: 'nav.tiers', path: '/tiers', icon: 'pi pi-id-card' },
      { labelKey: 'nav.threatIntel', path: '/threat-intel', icon: 'pi pi-shield' },
      { labelKey: 'nav.billing', path: '/billing', icon: 'pi pi-chart-bar' },
      { labelKey: 'nav.monitoring', path: '/monitoring', icon: 'pi pi-desktop' },
      { labelKey: 'nav.quotas', path: '/quotas', icon: 'pi pi-sliders-h' },
      { labelKey: 'nav.dataIsolation', path: '/data-isolation', icon: 'pi pi-lock-open' },
    ],
  },
  {
    sectionLabelKey: 'nav.securityAudit',
    sectionIcon: 'pi pi-bookmark',
    items: [
      { labelKey: 'nav.auditLogs', path: '/audit-logs', icon: 'pi pi-book' },
      { labelKey: 'nav.systemStatus', path: '/system-status', icon: 'pi pi-server' },
      { labelKey: 'nav.integrity', path: '/integrity', icon: 'pi pi-verified' },
    ],
  },
  {
    sectionLabelKey: 'nav.systemManagement',
    sectionIcon: 'pi pi-cog',
    items: [
      { labelKey: 'nav.userManagement', path: '/master-users', icon: 'pi pi-users' },
      { labelKey: 'nav.authSettings', path: '/auth-settings', icon: 'pi pi-lock' },
      { labelKey: 'nav.productInfo', path: '/product-info', icon: 'pi pi-info-circle' },
    ],
  },
];

function getBreadcrumbItem(pathname: string) {
  return navSections.flatMap((section) => section.items).find((item) => pathname.startsWith(item.path));
}

function getSectionLabelKeyByPath(pathname: string) {
  return navSections.find((section) => section.items.some((item) => pathname.startsWith(item.path)))?.sectionLabelKey;
}

const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const logout = useAuthStore((s) => s.logout);
  const { t } = useTranslation();
  const [staticInactive, setStaticInactive] = useState(false);
  const [mobileActive, setMobileActive] = useState(false);
  const [expandedSectionKeys, setExpandedSectionKeys] = useState<string[]>(() => {
    const initialSectionKey = getSectionLabelKeyByPath(location.pathname);
    return initialSectionKey ? [initialSectionKey] : [];
  });

  const breadcrumbItem = useMemo(() => getBreadcrumbItem(location.pathname), [location.pathname]);
  const activeSectionKey = useMemo(() => getSectionLabelKeyByPath(location.pathname), [location.pathname]);

  useEffect(() => {
    if (activeSectionKey) {
      setExpandedSectionKeys((prev) => (prev.includes(activeSectionKey) ? prev : [...prev, activeSectionKey]));
    }
  }, [activeSectionKey]);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // 로그아웃 감사로그 실패와 관계없이 클라이언트 세션은 정리한다.
    } finally {
      logout();
      navigate('/login');
    }
  };

  const toggleMenu = () => {
    if (window.innerWidth < 992) {
      setMobileActive((v) => !v);
    } else {
      setStaticInactive((v) => !v);
    }
  };

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
      {/* ── Sidebar ── */}
      <div className="layout-sidebar">
        <div className="layout-sidebar-logo">
          <div className="layout-sidebar-logo-icon">
            <i className="pi pi-shield" style={{ fontSize: '1.15rem', color: 'var(--primary-color)' }} />
          </div>
          <div className="layout-sidebar-logo-copy">
            <span>SOAR Admin</span>
            <small>{t('layout.brandSubtext')}</small>
          </div>
        </div>

        <ul className="layout-menu">
          {navSections.map((section, index) => (
            <li
              className={`layout-menu-group ${expandedSectionKeys.includes(section.sectionLabelKey) ? 'menu-group-expanded' : ''}`}
              key={`${section.sectionLabelKey}-${index}`}
            >
              <button
                type="button"
                className="layout-menu-group-header"
                aria-expanded={expandedSectionKeys.includes(section.sectionLabelKey)}
                onClick={() => {
                  setExpandedSectionKeys((prev) => (
                    prev.includes(section.sectionLabelKey)
                      ? prev.filter((key) => key !== section.sectionLabelKey)
                      : [...prev, section.sectionLabelKey]
                  ));
                }}
              >
                <i className={`layout-menuitem-icon ${section.sectionIcon}`} />
                <span>{t(section.sectionLabelKey)}</span>
                <i className="pi pi-chevron-down layout-menu-group-toggle" />
              </button>
              <ul className="layout-menu-submenu" aria-hidden={!expandedSectionKeys.includes(section.sectionLabelKey)}>
                {section.items.map((item) => (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      className={({ isActive }) => (isActive ? 'active-route' : '')}
                      onClick={() => setMobileActive(false)}
                    >
                      <i className={item.icon} />
                      <span>{t(item.labelKey)}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>

        <div className="layout-sidebar-footer">
          <button onClick={() => { void handleLogout(); }}>
            <i className="pi pi-sign-out" />
            <span>{t('common.logout')}</span>
          </button>
        </div>
      </div>

      {/* ── Main container ── */}
      <div className="layout-main-container">
        <div className="layout-topbar">
          <div className="layout-topbar-left">
            <button className="layout-menu-button" onClick={toggleMenu} aria-label="메뉴 토글">
              <i className="pi pi-bars" />
            </button>
            <div className="layout-topbar-breadcrumb">
              <i className="pi pi-home breadcrumb-home" />
              {breadcrumbItem && (
                <>
                  <i className="pi pi-chevron-right breadcrumb-separator" />
                  <i className={`${breadcrumbItem.icon} breadcrumb-menu-icon`} />
                  <span className="breadcrumb-current">{t(breadcrumbItem.labelKey)}</span>
                </>
              )}
            </div>
          </div>
          <div className="layout-topbar-actions">
            <span className="topbar-label">{t('nav.masterAdmin')}</span>
            <LanguageSwitcher />
          </div>
        </div>

        <div className="layout-main">
          <Outlet />
        </div>
      </div>

      {/* ── Mobile overlay ── */}
      <div className="layout-mask" onClick={() => setMobileActive(false)} />

      <SessionTimeoutManager />
    </div>
  );
};

export default AdminLayout;
