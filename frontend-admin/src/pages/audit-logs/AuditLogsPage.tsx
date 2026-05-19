import React, { useEffect, useMemo, useState } from 'react';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { SelectButton } from 'primereact/selectbutton';
import { Tag } from 'primereact/tag';
import { Dialog } from 'primereact/dialog';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { OverlayPanel } from 'primereact/overlaypanel';
import { Checkbox } from 'primereact/checkbox';
import { useTranslation } from 'react-i18next';
import api from '../../api';
import CommonDataTable from '../../components/CommonDataTable';
import { formatDateTimeSeconds } from '../../utils/date';

type ActorType = 'MASTER' | 'TENANT' | 'SYSTEM';

type AuditVisibleField =
  | 'createdAt'
  | 'actorType'
  | 'actorEmail'
  | 'action'
  | 'resourceType'
  | 'tenantSlug'
  | 'ipAddress';

const auditFieldOrder: AuditVisibleField[] = [
  'createdAt',
  'actorType',
  'actorEmail',
  'action',
  'resourceType',
  'tenantSlug',
  'ipAddress',
];

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
  const { t, i18n } = useTranslation();
  const fieldPanelRef = React.useRef<OverlayPanel | null>(null);
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchActionInput, setSearchActionInput] = useState('');
  const [searchAction, setSearchAction] = useState('');
  const [actorTypeFilter, setActorTypeFilter] = useState<'ALL' | ActorType>('ALL');
  const [selectedLog, setSelectedLog] = useState<AuditLogRow | null>(null);
  const [visibleFields, setVisibleFields] = useState<AuditVisibleField[]>(auditFieldOrder);

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

  const fieldOptions = useMemo(
    () => [
      { label: t('auditLogs.table.createdAt'), value: 'createdAt' as const },
      { label: t('auditLogs.table.actorType'), value: 'actorType' as const },
      { label: t('auditLogs.table.actor'), value: 'actorEmail' as const },
      { label: t('auditLogs.table.action'), value: 'action' as const },
      { label: t('auditLogs.table.resource'), value: 'resourceType' as const },
      { label: t('auditLogs.table.tenant'), value: 'tenantSlug' as const },
      { label: t('auditLogs.table.ipAddress'), value: 'ipAddress' as const },
    ],
    [t],
  );

  const renderActorTypeFilterOption = (option: { label: string; value: 'ALL' | ActorType }) => {
    return (
      <span className={`tenant-filter-pill tenant-filter-pill-${option.value.toLowerCase()}`}>
        {option.label}
      </span>
    );
  };

  const isFieldVisible = (field: AuditVisibleField) => visibleFields.includes(field);

  const handleToggleField = (field: AuditVisibleField) => {
    const exists = visibleFields.includes(field);

    if (exists) {
      if (visibleFields.length === 1) return;
      setVisibleFields(visibleFields.filter((item) => item !== field));
      return;
    }

    const next = [...visibleFields, field].sort(
      (a, b) => auditFieldOrder.indexOf(a) - auditFieldOrder.indexOf(b),
    );
    setVisibleFields(next);
  };

  const handleClearSearch = () => {
    setSearchActionInput('');
    setSearchAction('');
  };

  const renderActor = (row: AuditLogRow) => {
    if (row.actorEmail) {
      return row.actorEmail;
    }

    if (row.actorId !== null && row.actorId !== undefined) {
      return row.actorType === 'MASTER'
        ? `${t('auditLogs.actor.masterIdPrefix')} #${row.actorId}`
        : `${t('auditLogs.actor.idPrefix')} #${row.actorId}`;
    }

    return '-';
  };

  return (
    <div className="tenants-page">
      <div className="page-header">
        <div></div>
      </div>

      <div className="tenants-table-card">
        <div className="tenants-table-toolbar">
          <div className="tenants-toolbar-left">
            <div className="tenants-search-shell">
              <IconField iconPosition="left" className="tenants-search">
                <InputIcon className="pi pi-search" />
                <InputText
                  value={searchActionInput}
                  onChange={(e) => setSearchActionInput(e.target.value)}
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
                  aria-label={t('tenants.toolbar.clearSearch')}
                  tooltip={t('tenants.toolbar.clearSearch')}
                  tooltipOptions={{ position: 'top' }}
                  onClick={handleClearSearch}
                />
              )}
            </div>
          </div>
          <div className="tenants-quick-filters">
            <SelectButton
              value={actorTypeFilter}
              options={actorTypeOptions}
              optionLabel="label"
              optionValue="value"
              className="tenants-status-select"
              itemTemplate={renderActorTypeFilterOption}
              onChange={(e) => setActorTypeFilter(e.value as 'ALL' | ActorType)}
            />
            <Button
              type="button"
              icon="pi pi-refresh"
              outlined
              severity="secondary"
              className="tenants-icon-button-xs"
              aria-label={t('tenants.toolbar.refresh')}
              tooltip={t('tenants.toolbar.refresh')}
              tooltipOptions={{ position: 'top' }}
              loading={loading}
              onClick={load}
            />
            <Button
              type="button"
              icon="pi pi-sliders-h"
              outlined
              severity="secondary"
              className="tenants-icon-button-xs"
              aria-label={t('tenants.toolbar.fieldSettings')}
              tooltip={t('tenants.toolbar.fieldSettings')}
              tooltipOptions={{ position: 'top' }}
              onClick={(event) => fieldPanelRef.current?.toggle(event)}
            />
            <OverlayPanel ref={fieldPanelRef} className="tenants-field-panel">
              <div className="tenants-field-panel-list">
                {fieldOptions.map((fieldOption) => (
                  <label
                    key={fieldOption.value}
                    className="tenants-field-option"
                    htmlFor={`audit-field-${fieldOption.value}`}
                  >
                    <Checkbox
                      inputId={`audit-field-${fieldOption.value}`}
                      checked={visibleFields.includes(fieldOption.value)}
                      onChange={() => handleToggleField(fieldOption.value)}
                    />
                    <span>{fieldOption.label}</span>
                  </label>
                ))}
              </div>
            </OverlayPanel>
          </div>
        </div>

        <CommonDataTable
          value={rows}
          loading={loading}
          paginator
          rows={10}
          rowsPerPageOptions={[10, 20, 50]}
          className="admin-tenants-table audit-logs-clickable-table"
          emptyMessage={t('auditLogs.table.empty')}
          onRowClick={(event) => setSelectedLog(event.data as AuditLogRow)}
        >
          {isFieldVisible('createdAt') && (
            <Column
              field="createdAt"
              header={t('auditLogs.table.createdAt')}
              style={{ width: '15rem' }}
              body={(row: AuditLogRow) => formatDateTimeSeconds(row.createdAt)}
            />
          )}
          {isFieldVisible('actorType') && (
            <Column
              field="actorType"
              header={t('auditLogs.table.actorType')}
              style={{ width: '8rem' }}
              body={(row: AuditLogRow) => (
                <Tag value={row.actorType} severity={actorSeverity[row.actorType]} />
              )}
            />
          )}
          {isFieldVisible('actorEmail') && (
            <Column
              field="actorEmail"
              header={t('auditLogs.table.actor')}
              style={{ minWidth: '14rem' }}
              body={(row: AuditLogRow) => renderActor(row)}
            />
          )}
          {isFieldVisible('action') && (
            <Column
              field="action"
              header={t('auditLogs.table.action')}
              style={{ minWidth: '12rem' }}
            />
          )}
          {isFieldVisible('resourceType') && (
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
          )}
          {isFieldVisible('tenantSlug') && (
            <Column
              field="tenantSlug"
              header={t('auditLogs.table.tenant')}
              style={{ minWidth: '10rem' }}
              body={(row: AuditLogRow) => row.tenantSlug ?? '-'}
            />
          )}
          {isFieldVisible('ipAddress') && (
            <Column
              field="ipAddress"
              header={t('auditLogs.table.ipAddress')}
              style={{ width: '10rem' }}
              body={(row: AuditLogRow) => row.ipAddress ?? '-'}
            />
          )}
        </CommonDataTable>
      </div>

      <Dialog
        header={t('auditLogs.detail.title')}
        visible={selectedLog !== null}
        style={{ width: '640px', maxWidth: '96vw' }}
        onHide={() => setSelectedLog(null)}
      >
        {selectedLog && (
          <div className="flex flex-column gap-3 text-sm">
            <div><strong>{t('auditLogs.table.createdAt')}:</strong> {new Date(selectedLog.createdAt).toLocaleString(locale)}</div>
            <div><strong>{t('auditLogs.table.actorType')}:</strong> {selectedLog.actorType}</div>
            <div><strong>{t('auditLogs.table.actor')}:</strong> {renderActor(selectedLog)}</div>
            <div><strong>{t('auditLogs.table.action')}:</strong> {selectedLog.action}</div>
            <div><strong>{t('auditLogs.table.resource')}:</strong> {selectedLog.resourceType ? `${selectedLog.resourceType}${selectedLog.resourceId ? ` #${selectedLog.resourceId}` : ''}` : '-'}</div>
            <div><strong>{t('auditLogs.table.tenant')}:</strong> {selectedLog.tenantSlug ?? '-'}</div>
            <div><strong>{t('auditLogs.table.message')}:</strong> {selectedLog.message ?? '-'}</div>
            <div><strong>{t('auditLogs.table.ipAddress')}:</strong> {selectedLog.ipAddress ?? '-'}</div>
            <div><strong>{t('auditLogs.detail.userAgent')}:</strong> {selectedLog.userAgent ?? '-'}</div>
            <div>
              <strong>{t('auditLogs.detail.metadata')}:</strong>
              <pre className="mt-2 p-2 border-1 surface-border border-round text-xs" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {selectedLog.metadata ? JSON.stringify(selectedLog.metadata, null, 2) : '-'}
              </pre>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
};

export default AuditLogsPage;
