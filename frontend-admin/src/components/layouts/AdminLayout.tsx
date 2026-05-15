import React, { useState } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/auth.store';
import LanguageSwitcher from '../LanguageSwitcher';

const navItems = [
  { labelKey: 'nav.tenants', path: '/tenants', icon: 'pi pi-building' },
  { labelKey: 'nav.threatIntel', path: '/threat-intel', icon: 'pi pi-shield' },
  { labelKey: 'nav.billing', path: '/billing', icon: 'pi pi-chart-bar' },
  { labelKey: 'nav.monitoring', path: '/monitoring', icon: 'pi pi-desktop' },
];

const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const { t } = useTranslation();
  const [staticInactive, setStaticInactive] = useState(false);
  const [mobileActive, setMobileActive] = useState(false);

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
          <i className="pi pi-shield" style={{ fontSize: '1.5rem', color: 'var(--primary-color)' }} />
          <span>SOAR Admin</span>
        </div>

        <ul className="layout-menu">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) => (isActive ? 'active-route' : '')}
                onClick={() => setMobileActive(false)}
              >
                <i className={`layout-menuitem-icon ${item.icon}`} />
                <span>{t(item.labelKey)}</span>
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="layout-sidebar-footer">
          <button onClick={() => { logout(); navigate('/login'); }}>
            <i className="pi pi-sign-out" />
            <span>{t('common.logout')}</span>
          </button>
        </div>
      </div>

      {/* ── Main container ── */}
      <div className="layout-main-container">
        <div className="layout-topbar">
          <button className="layout-menu-button" onClick={toggleMenu} aria-label="메뉴 토글">
            <i className="pi pi-bars" />
          </button>
          <div className="layout-topbar-actions">
            <LanguageSwitcher />
            <span className="topbar-label">{t('nav.masterAdmin')}</span>
          </div>
        </div>

        <div className="layout-main">
          <Outlet />
        </div>
      </div>

      {/* ── Mobile overlay ── */}
      <div className="layout-mask" onClick={() => setMobileActive(false)} />
    </div>
  );
};

export default AdminLayout;
