import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import RolesGuard from './components/RolesGuard';
import TenantLayout from './components/layouts/TenantLayout';
import LoginPage from './pages/login/LoginPage';
import CollectorsPage from './pages/collectors/CollectorsPage';
import AlertsPage from './pages/alerts/AlertsPage';
import PlaybooksPage from './pages/playbooks/PlaybooksPage';
import ServerErrorPage from './pages/errors/ServerErrorPage';
import AuthSettingsPage from './pages/auth-settings/AuthSettingsPage';

const DashboardPage = () => <div className="p-4"><h1 className="text-2xl font-bold">대시보드</h1><p className="text-gray-400 mt-2">위젯 구성 예정</p></div>;
const SettingsPage = () => <div className="p-4"><h1 className="text-2xl font-bold">설정</h1><p className="text-gray-400 mt-2">IP 화이트리스트 · 파싱 룰 · 브랜딩 설정</p></div>;

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/server-error" element={<ServerErrorPage />} />
      <Route element={<RolesGuard />}>
        <Route element={<TenantLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/collectors" element={<CollectorsPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/playbooks" element={<PlaybooksPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/auth-settings" element={<AuthSettingsPage />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
