import React, { useEffect, useRef, useState } from 'react';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { Tooltip } from 'primereact/tooltip';
import { useTranslation } from 'react-i18next';
import CommonDataTable from '../../components/CommonDataTable';
import api from '../../api';
import { formatDateTimeSeconds } from '../../utils/date';

interface ThreatFeed {
  id: number;
  feedType: string;
  indicator: string;
  severity: string;
  source: string;
  isActive: boolean;
  dispatchStatus: 'PENDING' | 'DISPATCHED' | 'FAILED';
  dispatchedAt: string | null;
  dispatchError: string | null;
  dispatchAttempts: number;
  createdAt: string;
}

const SEVERITY_MAP: Record<string, 'danger' | 'warning' | 'info' | 'success' | null | undefined> = {
  CRITICAL: 'danger',
  HIGH: 'warning',
  MEDIUM: 'info',
  LOW: 'success',
};

const DISPATCH_SEVERITY_MAP: Record<string, 'success' | 'warning' | 'danger'> = {
  DISPATCHED: 'success',
  PENDING: 'warning',
  FAILED: 'danger',
};

const ThreatIntelPage: React.FC = () => {
  const { t } = useTranslation();
  const toast = useRef<Toast>(null);
  const [feeds, setFeeds] = useState<ThreatFeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [dispatching, setDispatching] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ feedType: 'IP', indicator: '', severity: 'HIGH', source: '' });

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get<ThreatFeed[]>('/admin/threat-intel');
      setFeeds(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleCreate = async () => {
    await api.post('/admin/threat-intel', form);
    setShowCreate(false);
    setForm({ feedType: 'IP', indicator: '', severity: 'HIGH', source: '' });
    void load();
  };

  const handleDeactivate = async (id: number) => {
    await api.patch(`/admin/threat-intel/${id}/deactivate`);
    void load();
  };

  const handleDispatch = async (id: number) => {
    setDispatching(id);
    try {
      const res = await api.post<ThreatFeed>(`/admin/threat-intel/${id}/dispatch`);
      if (res.data.dispatchStatus === 'DISPATCHED') {
        toast.current?.show({ severity: 'success', summary: t('threatIntel.dispatch.successTitle'), detail: t('threatIntel.dispatch.success'), life: 3000 });
      } else {
        toast.current?.show({ severity: 'warn', summary: t('threatIntel.dispatch.failedTitle'), detail: res.data.dispatchError ?? t('threatIntel.dispatch.failed'), life: 4000 });
      }
      void load();
    } catch {
      toast.current?.show({ severity: 'error', summary: t('threatIntel.dispatch.failedTitle'), detail: t('threatIntel.dispatch.failed'), life: 4000 });
    } finally {
      setDispatching(null);
    }
  };

  const dispatchStatusBody = (row: ThreatFeed) => {
    const tooltipId = `dispatch-tooltip-${row.id}`;
    return (
      <>
        <Tooltip target={`#${tooltipId}`} />
        <span
          id={tooltipId}
          data-pr-tooltip={
            row.dispatchStatus === 'DISPATCHED' && row.dispatchedAt
              ? t('threatIntel.dispatch.dispatchedAt', { at: formatDateTimeSeconds(row.dispatchedAt) })
              : row.dispatchStatus === 'FAILED'
              ? (row.dispatchError ?? t('threatIntel.dispatch.failed'))
              : t('threatIntel.dispatch.pending')
          }
        >
          <Tag
            value={t(`threatIntel.dispatch.status.${row.dispatchStatus}`)}
            severity={DISPATCH_SEVERITY_MAP[row.dispatchStatus]}
          />
        </span>
        {row.dispatchAttempts > 0 && (
          <small className="ml-2 text-color-secondary">×{row.dispatchAttempts}</small>
        )}
      </>
    );
  };

  const actionBody = (row: ThreatFeed) => (
    <div className="flex gap-2">
      <Button
        size="small"
        icon="pi pi-send"
        label={t('threatIntel.dispatch.retryBtn')}
        outlined
        severity={row.dispatchStatus === 'FAILED' ? 'danger' : 'secondary'}
        loading={dispatching === row.id}
        onClick={() => { void handleDispatch(row.id); }}
      />
      <Button
        size="small"
        label={t('common.deactivate')}
        severity="danger"
        outlined
        onClick={() => { void handleDeactivate(row.id); }}
        disabled={!row.isActive}
      />
    </div>
  );

  return (
    <div className="admin-page">
      <Toast ref={toast} />
      <div className="admin-page-header">
        <h1>{t('threatIntel.title')}</h1>
        <Button outlined label={t('threatIntel.registerBtn')} icon="pi pi-plus" onClick={() => setShowCreate(true)} />
      </div>

        <div className="admin-table-shell">
          <div className="admin-table-toolbar">
            <div className="tenants-toolbar-left">
              <span className="text-sm font-semibold text-color-secondary">{t('threatIntel.title')}</span>
            </div>
          </div>
        <CommonDataTable value={feeds} loading={loading} paginator rows={10} className="admin-table p-datatable-sm">
        <Column field="feedType" header={t('threatIntel.table.type')} />
        <Column field="indicator" header={t('threatIntel.table.indicator')} />
        <Column
          field="severity"
          header={t('threatIntel.table.severity')}
          body={(row: ThreatFeed) => (
            <Tag
              value={row.severity}
              severity={SEVERITY_MAP[row.severity]}
            />
          )}
        />
        <Column field="source" header={t('threatIntel.table.source')} />
        <Column
          field="dispatchStatus"
          header={t('threatIntel.table.dispatchStatus')}
          body={dispatchStatusBody}
        />
        <Column
          field="createdAt"
          header={t('common.createdAt')}
          body={(row: ThreatFeed) => formatDateTimeSeconds(row.createdAt)}
        />
        <Column header={t('common.actions')} body={actionBody} style={{ minWidth: '220px' }} />
        </CommonDataTable>
        </div>

      <Dialog
        header={t('threatIntel.dialog.title')}
        visible={showCreate}
        style={{ width: '480px' }}
        onHide={() => setShowCreate(false)}
        footer={
          <div className="flex justify-content-end gap-2">
            <Button label={t('common.cancel')} outlined onClick={() => setShowCreate(false)} />
            <Button label={t('common.register')} onClick={() => { void handleCreate(); }} />
          </div>
        }
      >
        <div className="flex flex-column gap-3 pt-2">
          <div>
            <label className="admin-form-label">{t('threatIntel.dialog.type')}</label>
            <InputText value={form.feedType} onChange={(e) => setForm({ ...form, feedType: e.target.value })} className="w-full" />
          </div>
          <div>
            <label className="admin-form-label">{t('threatIntel.dialog.indicator')}</label>
            <InputText value={form.indicator} onChange={(e) => setForm({ ...form, indicator: e.target.value })} className="w-full" />
          </div>
          <div>
            <label className="admin-form-label">{t('threatIntel.dialog.severity')}</label>
            <InputText value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })} className="w-full" />
          </div>
          <div>
            <label className="admin-form-label">{t('threatIntel.dialog.source')}</label>
            <InputText value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} className="w-full" />
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default ThreatIntelPage;
