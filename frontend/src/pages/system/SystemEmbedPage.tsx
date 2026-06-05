import React, { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/TenantButton';
import { Card } from 'primereact/card';

const SECTION_METADATA: Record<string, { title: string; description: string }> = {
  tenants: {
    title: 'Tenant Management',
    description: 'Manage tenant lifecycle, status, and related platform policies from the unified master console.',
  },
  'auth-settings': {
    title: 'Auth Settings',
    description: 'Control authentication policy and global multi-tenant mode for the platform.',
  },
  'audit-logs': {
    title: 'Audit Logs',
    description: 'Review admin-level security and CUD audit events from a single operating console.',
  },
  monitoring: {
    title: 'Monitoring',
    description: 'Inspect platform-wide operational signals and incident indicators.',
  },
  billing: {
    title: 'Billing',
    description: 'Track tenant usage and billing-related snapshots in one place.',
  },
};

const SystemEmbedPage: React.FC = () => {
  const navigate = useNavigate();
  const { section } = useParams();

  const sectionMeta = useMemo(() => {
    if (!section) {
      return null;
    }
    return SECTION_METADATA[section] ?? null;
  }, [section]);

  if (!sectionMeta) {
    return (
      <div className="admin-page">
        <Card className="admin-card monitoring-panel-card">
          <h2 className="mt-0 mb-2">Unknown system section</h2>
          <p className="m-0 mb-4 text-color-secondary">
            The requested system page is not mapped yet.
          </p>
          <Button label="Back to System Hub" icon="pi pi-arrow-left" onClick={() => navigate('/system')} />
        </Card>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <Card className="admin-card monitoring-panel-card">
        <div className="flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <div>
            <h2 className="m-0">{sectionMeta.title}</h2>
            <small className="text-color-secondary">{sectionMeta.description}</small>
          </div>
          <Button label="Hub" icon="pi pi-arrow-left" severity="secondary" onClick={() => navigate('/system')} />
        </div>

        <div
          className="border-1 surface-border border-round-lg p-4"
          style={{
            minHeight: '50vh',
            background: 'color-mix(in srgb, var(--surface-card) 88%, var(--surface-ground) 12%)',
          }}
        >
          <div className="flex align-items-start gap-3">
            <i className="pi pi-cog text-primary" style={{ fontSize: '1.4rem', marginTop: '0.15rem' }} />
            <div>
              <h3 className="m-0 mb-2">Unified Master Migration Stage</h3>
              <p className="m-0 text-color-secondary">
                This section is now served by frontend without depending on legacy admin runtime routing.
                Next step is page-level full migration of detailed admin UIs into this application.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SystemEmbedPage;
