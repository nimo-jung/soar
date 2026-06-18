import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import RolesGuard from './components/RolesGuard';
import MasterOnlyGuard from './components/MasterOnlyGuard';
import TenantLayout from './components/layouts/TenantLayout';
import TenantExpiryWarningDialog from './components/TenantExpiryWarningDialog';

const LoginPage = lazy(() => import('./pages/login/LoginPage'));
const CollectorsPage = lazy(() => import('./pages/collectors/CollectorsPage'));
const AlertsPage = lazy(() => import('./pages/alerts/AlertsPage'));
const PlaybooksPage = lazy(() => import('./pages/playbooks/PlaybooksPage'));
const ServerErrorPage = lazy(() => import('./pages/errors/ServerErrorPage'));
const AuthSettingsPage = lazy(() => import('./pages/auth-settings/AuthSettingsPage'));
const UsersPage = lazy(() => import('./pages/users/UsersPage'));
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage'));
const BootstrapPage = lazy(() => import('./pages/login/BootstrapPage'));
const ResetPasswordPage = lazy(() => import('./pages/login/ResetPasswordPage'));
const AuditLogsPage = lazy(() => import('./pages/audit-logs/AuditLogsPage'));
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));
const TenantsSystemPage = lazy(() => import('./pages/system/TenantsSystemPage'));
const AuthSettingsSystemPage = lazy(() => import('./pages/system/AuthSettingsSystemPage'));
const AuditLogsSystemPage = lazy(() => import('./pages/system/AuditLogsSystemPage'));
const MonitoringSystemPage = lazy(() => import('./pages/system/MonitoringSystemPage'));
const BillingSystemPage = lazy(() => import('./pages/system/BillingSystemPage'));
const ThreatIntelSystemPage = lazy(() => import('./pages/system/ThreatIntelSystemPage'));
const MasterUsersSystemPage = lazy(() => import('./pages/system/MasterUsersSystemPage'));
const ProductInfoSystemPage = lazy(() => import('./pages/system/ProductInfoSystemPage'));
const DataIsolationSystemPage = lazy(() => import('./pages/system/DataIsolationSystemPage'));
const SystemStatusSystemPage = lazy(() => import('./pages/system/SystemStatusSystemPage'));
const IntegritySystemPage = lazy(() => import('./pages/system/IntegritySystemPage'));
const SmtpSettingsSystemPage = lazy(() => import('./pages/system/SmtpSettingsSystemPage'));
const TenantTiersSystemPage = lazy(() => import('./pages/system/TenantTiersSystemPage'));
const VectorSettingsSystemPage = lazy(() => import('./pages/system/VectorSettingsSystemPage'));
const NetworkTopologyPage = lazy(() => import('./pages/network-topology/NetworkTopologyPage'));

const App: React.FC = () => {
  return (
    <>
      <TenantExpiryWarningDialog />
      <Suspense fallback={<div className="p-4 text-sm text-color-secondary">Loading...</div>}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/bootstrap" element={<BootstrapPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/server-error" element={<ServerErrorPage />} />
          <Route element={<RolesGuard />}>
            <Route element={<TenantLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/collectors" element={<CollectorsPage />} />
              <Route path="/alerts" element={<AlertsPage />} />
              <Route path="/playbooks" element={<PlaybooksPage />} />
              <Route path="/network-topology" element={<NetworkTopologyPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/auth-settings" element={<AuthSettingsPage />} />
              <Route path="/audit-logs" element={<AuditLogsPage />} />
              <Route element={<MasterOnlyGuard />}>
                <Route path="/system" element={<Navigate to="/system/tenants" replace />} />
                <Route path="/system/tenants" element={<TenantsSystemPage />} />
                <Route path="/system/auth-settings" element={<AuthSettingsSystemPage />} />
                <Route path="/system/audit-logs" element={<AuditLogsSystemPage />} />
                <Route path="/system/monitoring" element={<MonitoringSystemPage />} />
                <Route path="/system/billing" element={<BillingSystemPage />} />
                <Route path="/system/threat-intel" element={<ThreatIntelSystemPage />} />
                <Route path="/system/master-users" element={<MasterUsersSystemPage />} />
                <Route path="/system/product-info" element={<ProductInfoSystemPage />} />
                <Route path="/system/data-isolation" element={<DataIsolationSystemPage />} />
                <Route path="/system/system-status" element={<SystemStatusSystemPage />} />
                <Route path="/system/integrity" element={<IntegritySystemPage />} />
                <Route path="/system/smtp-settings" element={<SmtpSettingsSystemPage />} />
                <Route path="/system/tiers" element={<TenantTiersSystemPage />} />
                <Route path="/system/vector-settings" element={<VectorSettingsSystemPage />} />
                <Route path="/system/network-topology" element={<NetworkTopologyPage />} />
              </Route>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  );
};

export default App;
