import React, { useEffect, useState } from 'react';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { InputText } from 'primereact/inputtext';
import { Button } from '@/components/TenantButton';
import CommonDataTable from '@/components/CommonDataTable';
import api from '@/api';
import { formatDateTimeSeconds } from '@/utils/date';
import { useTranslation } from 'react-i18next';

interface AuditLogRow {
  id: number;
  actorType: 'MASTER' | 'TENANT' | 'SYSTEM';
  actorEmail: string | null;
  tenantSlug: string | null;
  action: string;
  resourceType: string | null;
  ipAddress: string | null;
  createdAt: string;
}

const actorTypeSeverity = (type: AuditLogRow['actorType']) => {
  if (type === 'MASTER') return 'info';
  if (type === 'TENANT') return 'success';
  return 'warning';
};

const AuditLogsSystemPage: React.FC = () => {
  const { t } = useTranslation();
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchAction, setSearchAction] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string | number> = { limit: 100, source: 'GLOBAL' };
      if (searchAction.trim()) {
        params.action = searchAction.trim();
      }

      const response = await api.get<AuditLogRow[]>('/admin/audit-logs', { params });
      setRows(response.data);
    } catch (requestError: any) {
      const message = Array.isArray(requestError?.response?.data?.message)
        ? requestError.response.data.message.join(', ')
        : requestError?.response?.data?.message;
      setError(message || t('auditLogs.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">{t('auditLogs.title')}</h1>
        </div>
        <div className="admin-actions-row">
          <InputText
            value={searchAction}
            onChange={(event) => setSearchAction(event.target.value)}
            placeholder={t('auditLogs.filters.actionPlaceholder')}
          />
          <Button label={t('auditLogs.actions.search')} icon="pi pi-search" onClick={() => void load()} loading={loading} />
        </div>
      </div>

      {error && <Tag value={error} severity="danger" className="mb-3" />}

      <div className="admin-table-shell">
        <CommonDataTable value={rows} loading={loading} paginator rows={10} dataKey="id" responsiveLayout="scroll" className="admin-table">
          <Column
            field="createdAt"
            header={t('auditLogs.table.createdAt')}
            body={(row: AuditLogRow) => formatDateTimeSeconds(row.createdAt)}
            style={{ width: '12rem' }}
          />
          <Column
            field="actorType"
            header={t('auditLogs.table.actorType')}
            style={{ width: '10rem' }}
            body={(row: AuditLogRow) => <Tag value={row.actorType} severity={actorTypeSeverity(row.actorType)} />}
          />
          <Column field="actorEmail" header={t('auditLogs.table.actor')} body={(row: AuditLogRow) => row.actorEmail ?? '-'} />
          <Column field="action" header={t('auditLogs.table.action')} />
          <Column field="resourceType" header={t('auditLogs.table.resource')} body={(row: AuditLogRow) => row.resourceType ?? '-'} />
          <Column field="tenantSlug" header={t('auditLogs.table.tenant')} body={(row: AuditLogRow) => row.tenantSlug ?? '-'} />
          <Column field="ipAddress" header={t('auditLogs.table.ipAddress')} body={(row: AuditLogRow) => row.ipAddress ?? '-'} />
        </CommonDataTable>
      </div>
    </div>
  );
};

export default AuditLogsSystemPage;
