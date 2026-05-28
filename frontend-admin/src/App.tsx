import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MasterGuard from './components/MasterGuard';
import AdminLayout from './components/layouts/AdminLayout';
import LicenseWarningDialog from './components/LicenseWarningDialog';
import LoginPage from './pages/login/LoginPage';
import TenantsPage from './pages/tenants/TenantsPage';
import ThreatIntelPage from './pages/threat-intel/ThreatIntelPage';
import TenantTiersPage from './pages/tiers/TenantTiersPage';
import AuditLogsPage from './pages/audit-logs/AuditLogsPage';
import MasterUsersPage from './pages/master-users/MasterUsersPage';
import ServerErrorPage from './pages/errors/ServerErrorPage';
import AuthSettingsPage from './pages/auth-settings/AuthSettingsPage';
import ProductInfoPage from './pages/product-info/ProductInfoPage';
import BillingPage from './pages/billing/BillingPage';
import MonitoringPage from './pages/monitoring/MonitoringPage';
import DataIsolationPage from './pages/data-isolation/DataIsolationPage';
import SystemStatusPage from './pages/system-status/SystemStatusPage';
import IntegrityPage from './pages/integrity/IntegrityPage';
import SmtpSettingsPage from './pages/smtp-settings/SmtpSettingsPage';

const App: React.FC = () => {
  return (
    <>
      <LicenseWarningDialog />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/server-error" element={<ServerErrorPage />} />
        <Route element={<MasterGuard />}>
          <Route element={<AdminLayout />}>
            <Route path="/tenants" element={<TenantsPage />} />
            <Route path="/tiers" element={<TenantTiersPage />} />
            <Route path="/quotas" element={<Navigate to="/tenants" replace />} />
            <Route path="/master-users" element={<MasterUsersPage />} />
            <Route path="/auth-settings" element={<AuthSettingsPage />} />
            <Route path="/smtp-settings" element={<SmtpSettingsPage />} />
            <Route path="/product-info" element={<ProductInfoPage />} />
            <Route path="/audit-logs" element={<AuditLogsPage />} />
            <Route path="/threat-intel" element={<ThreatIntelPage />} />
            <Route path="/billing" element={<BillingPage />} />
            <Route path="/monitoring" element={<MonitoringPage />} />
            <Route path="/data-isolation" element={<DataIsolationPage />} />
            <Route path="/system-status" element={<SystemStatusPage />} />
            <Route path="/integrity" element={<IntegrityPage />} />
            <Route path="/" element={<Navigate to="/tenants" replace />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
};

export default App;
