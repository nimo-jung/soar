import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from 'primereact/card';
import { Button } from '@/components/TenantButton';

const items = [
  {
    title: 'Tenant Management',
    description: 'Create, suspend, and operate tenants from the admin console.',
    path: '/system/tenants',
    icon: 'pi pi-building',
  },
  {
    title: 'Auth Settings',
    description: 'Manage auth policy and multi-tenant mode configuration.',
    path: '/system/auth-settings',
    icon: 'pi pi-lock',
  },
  {
    title: 'Audit Logs',
    description: 'Review CUD and security audit trails from the master area.',
    path: '/system/audit-logs',
    icon: 'pi pi-book',
  },
  {
    title: 'Monitoring',
    description: 'Inspect platform-level telemetry and operational events.',
    path: '/system/monitoring',
    icon: 'pi pi-chart-line',
  },
  {
    title: 'Billing',
    description: 'Inspect usage snapshots and billing policy in one place.',
    path: '/system/billing',
    icon: 'pi pi-wallet',
  },
  {
    title: 'Threat Intel',
    description: 'Manage global threat intelligence feeds and dispatch status.',
    path: '/system/threat-intel',
    icon: 'pi pi-globe',
  },
  {
    title: 'Master Users',
    description: 'Manage master console operators and activation status.',
    path: '/system/master-users',
    icon: 'pi pi-user',
  },
  {
    title: 'Product Info',
    description: 'Review license and product metadata.',
    path: '/system/product-info',
    icon: 'pi pi-box',
  },
  {
    title: 'Data Isolation',
    description: 'Inspect isolation diagnostics for tenant-bound resources.',
    path: '/system/data-isolation',
    icon: 'pi pi-database',
  },
  {
    title: 'System Status',
    description: 'Track platform health, incidents, and status snapshots.',
    path: '/system/system-status',
    icon: 'pi pi-heart',
  },
  {
    title: 'Integrity',
    description: 'Run integrity checks and validate critical baselines.',
    path: '/system/integrity',
    icon: 'pi pi-check-square',
  },
  {
    title: 'SMTP Settings',
    description: 'Configure mail delivery mode and test notifications.',
    path: '/system/smtp-settings',
    icon: 'pi pi-envelope',
  },
  {
    title: 'Tenant Tiers',
    description: 'Manage tenant plan tiers and quota defaults.',
    path: '/system/tiers',
    icon: 'pi pi-chart-bar',
  },
  {
    title: 'Vector Settings',
    description: 'Configure vector parsers and ingestion behavior.',
    path: '/system/vector-settings',
    icon: 'pi pi-sliders-h',
  },
  {
    title: 'Vector Apply History',
    description: 'Review vector apply history and reload outcomes.',
    path: '/system/vector-settings/history',
    icon: 'pi pi-history',
  },
];

const SystemHubPage: React.FC = () => {
  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">System Console Bridge</h1>
          <p className="admin-page-subtitle">
            This unified master frontend keeps tenant-style UX and lets you open master system pages from one navigation.
          </p>
        </div>
      </div>

      <div className="grid">
        {items.map((item) => (
          <div key={item.path} className="col-12 md:col-6 xl:col-4">
            <Card
              className="admin-card h-full"
              title={
                <span className="flex align-items-center gap-2">
                  <i className={`${item.icon} text-primary`} />
                  <span>{item.title}</span>
                </span>
              }
            >
              <p className="m-0 mb-4 text-color-secondary">{item.description}</p>
              <Link to={item.path}>
                <Button label="Open" icon="pi pi-arrow-right" iconPos="right" />
              </Link>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SystemHubPage;
