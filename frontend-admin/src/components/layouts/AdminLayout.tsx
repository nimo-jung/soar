import React from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';

const navItems = [
  { label: '테넌트 관리', path: '/tenants', icon: 'pi pi-building' },
  { label: '위협 인텔리전스', path: '/threat-intel', icon: 'pi pi-shield' },
  { label: '빌링', path: '/billing', icon: 'pi pi-chart-bar' },
  { label: '모니터링', path: '/monitoring', icon: 'pi pi-desktop' },
];

const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const logout = useAuthStore((s) => s.logout);

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-800 flex flex-column p-3 gap-2">
        <div className="text-xl font-bold text-blue-400 p-3 mb-2">SOAR Admin</div>
        {navItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`flex align-items-center gap-2 p-3 rounded cursor-pointer border-none text-left w-full transition-colors ${
              location.pathname.startsWith(item.path)
                ? 'bg-blue-700 text-white'
                : 'bg-transparent text-gray-300 hover:bg-gray-700'
            }`}
          >
            <i className={item.icon} />
            {item.label}
          </button>
        ))}
        <div className="mt-auto">
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="flex align-items-center gap-2 p-3 rounded w-full border-none bg-transparent text-red-400 hover:bg-red-900 cursor-pointer"
          >
            <i className="pi pi-sign-out" />
            로그아웃
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
