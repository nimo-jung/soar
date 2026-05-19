import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MasterGuard from './components/MasterGuard';
import AdminLayout from './components/layouts/AdminLayout';
import LoginPage from './pages/login/LoginPage';
import TenantsPage from './pages/tenants/TenantsPage';
import ThreatIntelPage from './pages/threat-intel/ThreatIntelPage';
import TenantTiersPage from './pages/tiers/TenantTiersPage';
import AuditLogsPage from './pages/audit-logs/AuditLogsPage';
import MasterUsersPage from './pages/master-users/MasterUsersPage';
import ServerErrorPage from './pages/errors/ServerErrorPage';
import AuthSettingsPage from './pages/auth-settings/AuthSettingsPage';

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/server-error" element={<ServerErrorPage />} />
      <Route element={<MasterGuard />}>
        <Route element={<AdminLayout />}>
          <Route path="/tenants" element={<TenantsPage />} />
          <Route path="/tiers" element={<TenantTiersPage />} />
          <Route path="/master-users" element={<MasterUsersPage />} />
          <Route path="/auth-settings" element={<AuthSettingsPage />} />
          <Route path="/audit-logs" element={<AuditLogsPage />} />
          <Route path="/threat-intel" element={<ThreatIntelPage />} />
          <Route path="/" element={<Navigate to="/tenants" replace />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
