import React, { useEffect, useMemo, useState } from 'react';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { SelectButton } from 'primereact/selectbutton';
import { Tag } from 'primereact/tag';
import { useTranslation } from 'react-i18next';
import api from '../../api';
import CommonDataTable from '../../components/CommonDataTable';

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
  ipAddress: string | null;
  createdAt: string;
}

const actorSeverity: Record<ActorType, 'info' | 'success' | 'warning'> = {
  MASTER: 'info',
  TENANT: 'success',
  SYSTEM: 'warning',
};

const AuditLogsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchActionInput, setSearchActionInput] = useState('');
  const [searchAction, setSearchAction] = useState('');
  const [actorTypeFilter, setActorTypeFilter] = useState<'ALL' | ActorType>('ALL');

  const locale = i18n.language.startsWith('ko') ? 'ko-KR' : 'en-US';

  const load = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { limit: 100 };
      if (searchAction.trim()) {
        params.action = searchAction.trim();
      }
      if (actorTypeFilter !== 'ALL') {
        params.actorType = actorTypeFilter;
      }

      const res = await api.get<AuditLogRow[]>('/admin/audit-logs', { params });
      setRows(res.data);
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
  }, [searchAction, actorTypeFilter]);

  const actorTypeOptions = useMemo(
    () => [
      { label: t('auditLogs.filters.allActorTypes'), value: 'ALL' as const },
      { label: 'MASTER', value: 'MASTER' as const },
      { label: 'TENANT', value: 'TENANT' as const },
      { label: 'SYSTEM', value: 'SYSTEM' as const },
    ],
    [t],
  );

  return (
    <div className="tenants-page">
      <div className="page-header">
        <div></div>
        <Button
          type="button"
          icon="pi pi-refresh"
          label={t('auditLogs.refresh')}
          outlined
          size="small"
          loading={loading}
          onClick={load}
        />
      </div>

      <div className="tenants-table-card">
        <div className="tenants-table-toolbar">
          <div className="tenants-toolbar-left">
            <InputText
              value={searchActionInput}
              onChange={(e) => setSearchActionInput(e.target.value)}
              className="w-full tenants-search-input p-inputtext-sm"
              placeholder={t('auditLogs.filters.actionPlaceholder')}
            />
          </div>
          <div className="tenants-quick-filters">
            <SelectButton
              value={actorTypeFilter}
              options={actorTypeOptions}
              optionLabel="label"
              optionValue="value"
              className="tenants-status-select"
              onChange={(e) => setActorTypeFilter(e.value as 'ALL' | ActorType)}
            />
          </div>
        </div>

        <CommonDataTable
          value={rows}
          loading={loading}
          paginator
          rows={10}
          rowsPerPageOptions={[10, 20, 50]}
          className="admin-tenants-table"
          emptyMessage={t('auditLogs.table.empty')}
        >
          <Column
            field="createdAt"
            header={t('auditLogs.table.createdAt')}
            style={{ width: '10rem' }}
            body={(row: AuditLogRow) => new Date(row.createdAt).toLocaleString(locale)}
          />
          <Column
            field="actorType"
            header={t('auditLogs.table.actorType')}
            style={{ width: '8rem' }}
            body={(row: AuditLogRow) => (
              <Tag value={row.actorType} severity={actorSeverity[row.actorType]} />
            )}
          />
          <Column
            field="actorEmail"
            header={t('auditLogs.table.actor')}
            style={{ minWidth: '14rem' }}
            body={(row: AuditLogRow) => row.actorEmail ?? row.actorId ?? '-'}
          />
          <Column
            field="action"
            header={t('auditLogs.table.action')}
            style={{ minWidth: '12rem' }}
          />
          <Column
            field="resourceType"
            header={t('auditLogs.table.resource')}
            style={{ minWidth: '12rem' }}
            body={(row: AuditLogRow) => {
              if (!row.resourceType) {
                return '-';
              }
              return row.resourceId ? `${row.resourceType} #${row.resourceId}` : row.resourceType;
            }}
          />
          <Column
            field="tenantSlug"
            header={t('auditLogs.table.tenant')}
            style={{ minWidth: '10rem' }}
            body={(row: AuditLogRow) => row.tenantSlug ?? '-'}
          />
          <Column
            field="message"
            header={t('auditLogs.table.message')}
            style={{ minWidth: '16rem' }}
            body={(row: AuditLogRow) => row.message ?? '-'}
          />
          <Column
            field="ipAddress"
            header={t('auditLogs.table.ipAddress')}
            style={{ width: '10rem' }}
            body={(row: AuditLogRow) => row.ipAddress ?? '-'}
          />
        </CommonDataTable>
      </div>
    </div>
  );
};

export default AuditLogsPage;
