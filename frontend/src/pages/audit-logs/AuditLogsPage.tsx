import React, { useEffect, useState } from 'react';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { InputText } from 'primereact/inputtext';
import { Button } from '@/components/TenantButton';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { useTranslation } from 'react-i18next';
import api from '../../api';
import CommonDataTable from '../../components/CommonDataTable';
import { formatDateTimeSeconds } from '../../utils/date';

type ActorType = 'MASTER' | 'TENANT' | 'SYSTEM';

interface AuditLogRow {
  id: number;
  actorType: ActorType;
  actorId: number | null;
  actorEmail: string | null;
  tenantSlug: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  message: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

const actorSeverity: Record<ActorType, 'info' | 'success' | 'warning'> = {
  MASTER: 'info',
  TENANT: 'success',
  SYSTEM: 'warning',
};

const AuditLogsPage: React.FC = () => {
  const { t } = useTranslation();
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchActionInput, setSearchActionInput] = useState('');
  const [searchAction, setSearchAction] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { limit: 100 };
      if (searchAction.trim()) {
        params.action = searchAction.trim();
      }

      const response = await api.get<AuditLogRow[]>('/api/audit-logs', { params });
      setRows(response.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchAction(searchActionInput);
    }, 500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [searchActionInput]);

  useEffect(() => {
    void load();
  }, [searchAction]);

  const handleClearSearch = () => {
    setSearchActionInput('');
    setSearchAction('');
  };

  const renderActor = (row: AuditLogRow) => {
    if (row.actorEmail) {
      return row.actorEmail;
    }

    if (row.actorId !== null && row.actorId !== undefined) {
      return `${t('auditLogs.actor.idPrefix')} #${row.actorId}`;
    }

    return '-';
  };

  return (
    <div className="tenant-page">
      <div className="tenant-page-header">
        <div>
          <h1 className="tenant-page-title">{t('auditLogs.title')}</h1>
        </div>
      </div>

      <div className="tenant-table-shell">
        <div className="admin-table-toolbar">
          <div className="tenants-toolbar-left">
            <div className="tenants-search-shell">
              <IconField iconPosition="left" className="tenants-search">
                <InputIcon className="pi pi-search" />
                <InputText
                  value={searchActionInput}
                  onChange={(event) => setSearchActionInput(event.target.value)}
                  className="w-full tenants-search-input p-inputtext-sm"
                  placeholder={t('auditLogs.filters.actionPlaceholder')}
                />
              </IconField>
              {!!searchActionInput && (
                <Button
                  type="button"
                  icon="pi pi-times"
                  text
                  rounded
                  severity="secondary"
                  className="tenants-search-clear"
                  aria-label={t('auditLogs.actions.clearSearch')}
                  tooltip={t('auditLogs.actions.clearSearch')}
                  tooltipOptions={{ position: 'top' }}
                  onClick={handleClearSearch}
                />
              )}
            </div>
          </div>
          <div className="tenants-quick-filters">
            <Button
              type="button"
              icon="pi pi-refresh"
              outlined
              severity="secondary"
              className="admin-icon-button-xs"
              aria-label={t('auditLogs.actions.refresh')}
              tooltip={t('auditLogs.actions.refresh')}
              tooltipOptions={{ position: 'top' }}
              loading={loading}
              onClick={load}
            />
          </div>
        </div>

        <CommonDataTable value={rows} loading={loading} paginator rows={10} className="tenant-table p-datatable-sm">
          <Column
            field="createdAt"
            header={t('auditLogs.table.createdAt')}
            body={(row: AuditLogRow) => formatDateTimeSeconds(row.createdAt)}
            style={{ minWidth: '12rem' }}
          />
          <Column
            field="actorType"
            header={t('auditLogs.table.actorType')}
            body={(row: AuditLogRow) => <Tag value={row.actorType} severity={actorSeverity[row.actorType]} />}
            style={{ minWidth: '10rem' }}
          />
          <Column
            field="actorEmail"
            header={t('auditLogs.table.actor')}
            body={(row: AuditLogRow) => renderActor(row)}
            style={{ minWidth: '14rem' }}
          />
          <Column
            field="action"
            header={t('auditLogs.table.action')}
            style={{ minWidth: '12rem' }}
          />
          <Column
            field="resourceType"
            header={t('auditLogs.table.resource')}
            body={(row: AuditLogRow) => {
              if (!row.resourceType) {
                return '-';
              }
              return row.resourceId ? `${row.resourceType} #${row.resourceId}` : row.resourceType;
            }}
            style={{ minWidth: '12rem' }}
          />
          <Column
            field="message"
            header={t('auditLogs.table.message')}
            body={(row: AuditLogRow) => row.message ?? '-'}
            style={{ minWidth: '16rem' }}
          />
          <Column
            field="ipAddress"
            header={t('auditLogs.table.ipAddress')}
            body={(row: AuditLogRow) => row.ipAddress ?? '-'}
            style={{ minWidth: '10rem' }}
          />
        </CommonDataTable>
      </div>
    </div>
  );
};

export default AuditLogsPage;
