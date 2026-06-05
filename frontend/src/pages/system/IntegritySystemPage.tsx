import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { Button } from '@/components/AdminButton';
import { Tag } from 'primereact/tag';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import CommonDataTable from '../../components/CommonDataTable';
import api from '../../api';
import { formatDateTimeSeconds } from '../../utils/date';

type IntegrityStatus = 'OK' | 'CHANGED' | 'MISSING' | 'UNCHECKED';

type IntegrityBaseline = {
  id: number;
  filePath: string;
  fileLabel: string;
  hashAlgorithm: string;
  expectedHash: string | null;
  currentHash: string | null;
  status: IntegrityStatus;
  lastCheckedAt: string | null;
  lastSyncedAt: string | null;
  createdAt: string;
};

const STATUS_SEVERITY_MAP: Record<IntegrityStatus, 'success' | 'danger' | 'warning' | 'info'> = {
  OK: 'success',
  CHANGED: 'danger',
  MISSING: 'warning',
  UNCHECKED: 'info',
};

const IntegrityPage: React.FC = () => {
  const { t } = useTranslation();
  const [baselines, setBaselines] = useState<IntegrityBaseline[]>([]);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [syncingId, setSyncingId] = useState<number | null>(null);
  const [showRegister, setShowRegister] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [form, setForm] = useState({ filePath: '', fileLabel: '' });
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

  const filePathMissing = showValidation && form.filePath.trim().length === 0;
  const fileLabelMissing = showValidation && form.fileLabel.trim().length === 0;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<IntegrityBaseline[]>('/admin/integrity');
      setBaselines(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCheckAll = async () => {
    setChecking(true);
    try {
      const res = await api.post<IntegrityBaseline[]>('/admin/integrity/check');
      setBaselines(res.data);
      openResultDialog(t('integrity.resultDialog.successTitle'), t('integrity.checkDone'));
    } catch (error: unknown) {
      openResultDialog(t('integrity.resultDialog.failedTitle'), extractApiMessage(error) || t('integrity.resultDialog.checkFailed'));
    } finally {
      setChecking(false);
    }
  };

  const handleSync = async (row: IntegrityBaseline) => {
    setSyncingId(row.id);
    try {
      await api.post(`/admin/integrity/${row.id}/sync`);
      openResultDialog(t('integrity.resultDialog.successTitle'), `${t('integrity.syncDone')}: ${row.fileLabel}`);
      void load();
    } catch (error: unknown) {
      openResultDialog(t('integrity.resultDialog.failedTitle'), extractApiMessage(error) || t('integrity.syncFailed'));
    } finally {
      setSyncingId(null);
    }
  };

  const handleDelete = (row: IntegrityBaseline) => {
    confirmDialog({
      message: t('integrity.deleteConfirm', { label: row.fileLabel }),
      header: t('integrity.deleteTitle'),
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await api.delete(`/admin/integrity/${row.id}`);
          openResultDialog(t('integrity.resultDialog.successTitle'), t('integrity.resultDialog.deleteSuccess'));
          void load();
        } catch (error: unknown) {
          openResultDialog(t('integrity.resultDialog.failedTitle'), extractApiMessage(error) || t('integrity.resultDialog.deleteFailed'));
        }
      },
    });
  };

  const handleRegister = async () => {
    setShowValidation(true);
    if (filePathMissing || fileLabelMissing) {
      return;
    }

    try {
      await api.post('/admin/integrity/register', {
        filePath: form.filePath.trim(),
        fileLabel: form.fileLabel.trim(),
      });
      setShowRegister(false);
      setForm({ filePath: '', fileLabel: '' });
      setShowValidation(false);
      openResultDialog(t('integrity.resultDialog.successTitle'), t('integrity.resultDialog.registerSuccess'));
      void load();
    } catch (error: unknown) {
      openResultDialog(t('integrity.resultDialog.failedTitle'), extractApiMessage(error) || t('integrity.resultDialog.registerFailed'));
    }
  };

  const statusBody = (row: IntegrityBaseline) => (
    <Tag
      value={t(`integrity.status.${row.status}`)}
      severity={STATUS_SEVERITY_MAP[row.status]}
    />
  );

  const hashBody = (hash: string | null) => {
    if (!hash) return <span className="text-color-secondary">-</span>;
    return <code className="text-xs">{hash.substring(0, 16)}…</code>;
  };

  const actionBody = (row: IntegrityBaseline) => (
    <div className="flex gap-2">
      <Button
        buttonSize="dense"
        icon="pi pi-sync"
        label={t('integrity.syncBtn')}
        outlined
        loading={syncingId === row.id}
        onClick={() => { void handleSync(row); }}
        disabled={row.status === 'MISSING'}
      />
      <Button
        buttonSize="dense"
        icon="pi pi-trash"
        severity="danger"
        outlined
        onClick={() => handleDelete(row)}
      />
    </div>
  );

  const changedCount = baselines.filter((b) => b.status === 'CHANGED').length;
  const missingCount = baselines.filter((b) => b.status === 'MISSING').length;

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
      <ConfirmDialog />
      <div className="admin-page-header">
        <h1>{t('integrity.title')}</h1>
        <div className="admin-actions-row">
          <Button icon="pi pi-search" label={t('integrity.checkAllBtn')} loading={checking} onClick={() => { void handleCheckAll(); }} />
          <Button icon="pi pi-plus" label={t('integrity.registerBtn')} outlined onClick={() => setShowRegister(true)} />
        </div>
      </div>

      {(changedCount > 0 || missingCount > 0) && (
        <div
          className="p-message p-message-error mb-3 p-3 border-round"
          style={{
            background: 'color-mix(in srgb, #ef4444 12%, var(--surface-card))',
            border: '1px solid color-mix(in srgb, #ef4444 45%, var(--surface-border))',
          }}
        >
          <i
            className="pi pi-exclamation-triangle mr-2"
            style={{ color: 'color-mix(in srgb, #ef4444 82%, var(--text-color))' }}
          />
          <span style={{ color: 'color-mix(in srgb, #ef4444 72%, var(--text-color))' }}>
            {t('integrity.warningMsg', { changed: changedCount, missing: missingCount })}
          </span>
        </div>
      )}

      <Card className="admin-card">
        <CommonDataTable
          value={baselines}
          loading={loading}
          paginator
          rows={20}
          className="admin-table"
        >
          <Column field="fileLabel" header={t('integrity.table.label')} sortable />
          <Column field="filePath" header={t('integrity.table.path')} style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis' }} />
          <Column field="status" header={t('integrity.table.status')} body={statusBody} sortable />
          <Column field="expectedHash" header={t('integrity.table.expectedHash')} body={(row: IntegrityBaseline) => hashBody(row.expectedHash)} />
          <Column field="currentHash" header={t('integrity.table.currentHash')} body={(row: IntegrityBaseline) => hashBody(row.currentHash)} />
          <Column
            field="lastCheckedAt"
            header={t('integrity.table.lastCheckedAt')}
            body={(row: IntegrityBaseline) => row.lastCheckedAt ? formatDateTimeSeconds(row.lastCheckedAt) : '-'}
          />
          <Column
            field="lastSyncedAt"
            header={t('integrity.table.lastSyncedAt')}
            body={(row: IntegrityBaseline) => row.lastSyncedAt ? formatDateTimeSeconds(row.lastSyncedAt) : '-'}
          />
          <Column header={t('common.actions')} body={actionBody} style={{ minWidth: '200px' }} />
        </CommonDataTable>
      </Card>

      <Dialog
        className="tenant-dialog"
        header={t('integrity.registerDialog.title')}
        visible={showRegister}
        style={{ width: '480px' }}
        onHide={() => {
          setShowRegister(false);
          setShowValidation(false);
        }}
        footer={
          <div className="flex justify-content-end gap-2">
            <Button label={t('common.cancel')} outlined onClick={() => setShowRegister(false)} />
            <Button label={t('common.register')} onClick={() => { void handleRegister(); }} />
          </div>
        }
      >
        <div className="flex flex-column gap-3 pt-2">
          <div>
            <label className="admin-form-label">{t('integrity.registerDialog.filePath')}</label>
            <InputText
              value={form.filePath}
              onChange={(e) => setForm({ ...form, filePath: e.target.value })}
              className="w-full"
              invalid={filePathMissing}
              placeholder="/app/dist/main.js"
            />
            {filePathMissing && <small className="p-error block mt-1">{t('integrity.validation.filePathRequired')}</small>}
          </div>
          <div>
            <label className="admin-form-label">{t('integrity.registerDialog.fileLabel')}</label>
            <InputText
              value={form.fileLabel}
              onChange={(e) => setForm({ ...form, fileLabel: e.target.value })}
              className="w-full"
              invalid={fileLabelMissing}
              placeholder="Backend 빌드 결과물"
            />
            {fileLabelMissing && <small className="p-error block mt-1">{t('integrity.validation.fileLabelRequired')}</small>}
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default IntegrityPage;
