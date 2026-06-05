import React, { useEffect, useState } from 'react';
import { Column } from 'primereact/column';
import { Button } from '@/components/TenantButton';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Tag } from 'primereact/tag';
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
  const [feeds, setFeeds] = useState<ThreatFeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [dispatching, setDispatching] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ feedType: 'IP', indicator: '', severity: 'HIGH', source: '' });
  const [showValidation, setShowValidation] = useState(false);
  const [resultDialog, setResultDialog] = useState({
    visible: false,
    title: '',
    message: '',
  });

  const openResultDialog = (title: string, message: string) => {
    setResultDialog({ visible: true, title, message });
  };

  const extractApiMessage = (error: unknown): string => {
    const rawMessage = (error as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
    if (typeof rawMessage === 'string') {
      return rawMessage;
    }
    if (Array.isArray(rawMessage)) {
      return rawMessage.filter((item): item is string => typeof item === 'string').join(', ');
    }
    return '';
  };

  const feedTypeMissing = showValidation && form.feedType.trim().length === 0;
  const indicatorMissing = showValidation && form.indicator.trim().length === 0;
  const severityMissing = showValidation && form.severity.trim().length === 0;

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get<ThreatFeed[]>('/admin/threat-intel');
      setFeeds(res.data);
    } catch (error: unknown) {
      openResultDialog(t('threatIntel.resultDialog.failedTitle'), extractApiMessage(error) || t('threatIntel.resultDialog.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleCreate = async () => {
    setShowValidation(true);
    if (feedTypeMissing || indicatorMissing || severityMissing) {
      return;
    }

    try {
      await api.post('/admin/threat-intel', {
        feedType: form.feedType.trim(),
        indicator: form.indicator.trim(),
        severity: form.severity.trim(),
        source: form.source.trim(),
      });
      setShowCreate(false);
      setForm({ feedType: 'IP', indicator: '', severity: 'HIGH', source: '' });
      setShowValidation(false);
      openResultDialog(t('threatIntel.resultDialog.successTitle'), t('threatIntel.resultDialog.createSuccess'));
      void load();
    } catch (error: unknown) {
      openResultDialog(t('threatIntel.resultDialog.failedTitle'), extractApiMessage(error) || t('threatIntel.resultDialog.createFailed'));
    }
  };

  const handleDeactivate = async (id: number) => {
    try {
      await api.patch(`/admin/threat-intel/${id}/deactivate`);
      openResultDialog(t('threatIntel.resultDialog.successTitle'), t('threatIntel.resultDialog.deactivateSuccess'));
      void load();
    } catch (error: unknown) {
      openResultDialog(t('threatIntel.resultDialog.failedTitle'), extractApiMessage(error) || t('threatIntel.resultDialog.deactivateFailed'));
    }
  };

  const handleDispatch = async (id: number) => {
    setDispatching(id);
    try {
      const res = await api.post<ThreatFeed>(`/admin/threat-intel/${id}/dispatch`);
      if (res.data.dispatchStatus === 'DISPATCHED') {
        openResultDialog(t('threatIntel.dispatch.successTitle'), t('threatIntel.dispatch.success'));
      } else {
        openResultDialog(t('threatIntel.dispatch.failedTitle'), res.data.dispatchError ?? t('threatIntel.dispatch.failed'));
      }
      void load();
    } catch (error: unknown) {
      openResultDialog(t('threatIntel.dispatch.failedTitle'), extractApiMessage(error) || t('threatIntel.dispatch.failed'));
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
        buttonSize="dense"
        icon="pi pi-send"
        label={t('threatIntel.dispatch.retryBtn')}
        outlined
        severity={row.dispatchStatus === 'FAILED' ? 'danger' : 'secondary'}
        loading={dispatching === row.id}
        onClick={() => { void handleDispatch(row.id); }}
      />
      <Button
        buttonSize="dense"
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
      <Dialog
        className="tenant-dialog"
        visible={resultDialog.visible}
        header={resultDialog.title}
        style={{ width: '460px', maxWidth: '96vw' }}
        onHide={() => setResultDialog((prev) => ({ ...prev, visible: false }))}
        footer={(
          <div className="flex justify-content-end">
            <Button label={t('common.confirm')} onClick={() => setResultDialog((prev) => ({ ...prev, visible: false }))} />
          </div>
        )}
      >
        <p className="m-0 line-height-3" style={{ color: 'var(--text-color)' }}>{resultDialog.message}</p>
      </Dialog>
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
        className="tenant-dialog"
        header={t('threatIntel.dialog.title')}
        visible={showCreate}
        style={{ width: '480px' }}
        onHide={() => {
          setShowCreate(false);
          setShowValidation(false);
        }}
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
            <InputText value={form.feedType} onChange={(e) => setForm({ ...form, feedType: e.target.value })} className="w-full" invalid={feedTypeMissing} />
            {feedTypeMissing && <small className="p-error block mt-1">{t('threatIntel.validation.typeRequired')}</small>}
          </div>
          <div>
            <label className="admin-form-label">{t('threatIntel.dialog.indicator')}</label>
            <InputText value={form.indicator} onChange={(e) => setForm({ ...form, indicator: e.target.value })} className="w-full" invalid={indicatorMissing} />
            {indicatorMissing && <small className="p-error block mt-1">{t('threatIntel.validation.indicatorRequired')}</small>}
          </div>
          <div>
            <label className="admin-form-label">{t('threatIntel.dialog.severity')}</label>
            <InputText value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })} className="w-full" invalid={severityMissing} />
            {severityMissing && <small className="p-error block mt-1">{t('threatIntel.validation.severityRequired')}</small>}
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
