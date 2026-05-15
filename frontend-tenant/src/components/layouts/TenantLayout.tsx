import React from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { useBrandingStore } from '../../store/branding.store';

const navItems = [
  { label: '대시보드', path: '/dashboard', icon: 'pi pi-home' },
  { label: 'Collector', path: '/collectors', icon: 'pi pi-server' },
  { label: '알람', path: '/alerts', icon: 'pi pi-bell' },
  { label: '플레이북', path: '/playbooks', icon: 'pi pi-sitemap' },
  { label: '설정', path: '/settings', icon: 'pi pi-cog' },
];

const TenantLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const logout = useAuthStore((s) => s.logout);
  const branding = useBrandingStore((s) => s.branding);
  const user = useAuthStore((s) => s.user);

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      <aside className="w-64 bg-gray-800 flex flex-column p-3 gap-2" style={{ borderTop: `3px solid ${branding.primaryColor ?? '#3B82F6'}` }}>
        <div className="flex align-items-center gap-2 p-3 mb-2">
          {branding.logoUrl && <img src={branding.logoUrl} alt="logo" className="h-6" />}
          <span className="text-lg font-bold" style={{ color: branding.primaryColor ?? '#3B82F6' }}>
            {branding.companyName ?? 'SOAR'}
          </span>
        </div>
        {navItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`flex align-items-center gap-2 p-3 rounded cursor-pointer border-none text-left w-full transition-colors ${
              location.pathname.startsWith(item.path)
                ? 'text-white'
                : 'bg-transparent text-gray-300 hover:bg-gray-700'
            }`}
            style={location.pathname.startsWith(item.path) ? { backgroundColor: branding.primaryColor ?? '#3B82F6' } : {}}
          >
            <i className={item.icon} />
            {item.label}
          </button>
        ))}
        <div className="mt-auto">
          <div className="text-xs text-gray-400 px-3 mb-2">{user?.role?.toUpperCase()} · {user?.tenantId}</div>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="flex align-items-center gap-2 p-3 rounded w-full border-none bg-transparent text-red-400 hover:bg-red-900 cursor-pointer"
          >
            <i className="pi pi-sign-out" />
            로그아웃
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default TenantLayout;
