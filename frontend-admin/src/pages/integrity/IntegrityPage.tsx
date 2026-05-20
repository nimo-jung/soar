import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
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
  const toast = useRef<Toast>(null);
  const [baselines, setBaselines] = useState<IntegrityBaseline[]>([]);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [syncingId, setSyncingId] = useState<number | null>(null);
  const [showRegister, setShowRegister] = useState(false);
  const [form, setForm] = useState({ filePath: '', fileLabel: '' });

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
      toast.current?.show({ severity: 'info', summary: t('integrity.checkDone'), life: 3000 });
    } finally {
      setChecking(false);
    }
  };

  const handleSync = async (row: IntegrityBaseline) => {
    setSyncingId(row.id);
    try {
      await api.post(`/admin/integrity/${row.id}/sync`);
      toast.current?.show({ severity: 'success', summary: t('integrity.syncDone'), detail: row.fileLabel, life: 3000 });
      void load();
    } catch {
      toast.current?.show({ severity: 'error', summary: t('integrity.syncFailed'), life: 3000 });
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
        await api.delete(`/admin/integrity/${row.id}`);
        void load();
      },
    });
  };

  const handleRegister = async () => {
    if (!form.filePath.trim() || !form.fileLabel.trim()) return;
    await api.post('/admin/integrity/register', form);
    setShowRegister(false);
    setForm({ filePath: '', fileLabel: '' });
    void load();
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
        size="small"
        icon="pi pi-sync"
        label={t('integrity.syncBtn')}
        outlined
        loading={syncingId === row.id}
        onClick={() => { void handleSync(row); }}
        disabled={row.status === 'MISSING'}
      />
      <Button
        size="small"
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
    <div className="p-4">
      <Toast ref={toast} />
      <ConfirmDialog />
      <div className="page-header">
        <h1>{t('integrity.title')}</h1>
        <div className="flex gap-2">
          <Button icon="pi pi-search" label={t('integrity.checkAllBtn')} loading={checking} onClick={() => { void handleCheckAll(); }} />
          <Button icon="pi pi-plus" label={t('integrity.registerBtn')} outlined onClick={() => setShowRegister(true)} />
        </div>
      </div>

      {(changedCount > 0 || missingCount > 0) && (
        <div className="p-message p-message-error mb-3 p-3 border-round" style={{ background: 'var(--red-50)', border: '1px solid var(--red-200)' }}>
          <i className="pi pi-exclamation-triangle mr-2 text-red-500" />
          <span className="text-red-700">
            {t('integrity.warningMsg', { changed: changedCount, missing: missingCount })}
          </span>
        </div>
      )}

      <Card>
        <CommonDataTable
          value={baselines}
          loading={loading}
          paginator
          rows={20}
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
        header={t('integrity.registerDialog.title')}
        visible={showRegister}
        style={{ width: '480px' }}
        onHide={() => setShowRegister(false)}
        footer={
          <div className="flex justify-content-end gap-2">
            <Button label={t('common.cancel')} outlined onClick={() => setShowRegister(false)} />
            <Button label={t('common.register')} onClick={() => { void handleRegister(); }} />
          </div>
        }
      >
        <div className="flex flex-column gap-3 pt-2">
          <div>
            <label className="block mb-1 text-sm">{t('integrity.registerDialog.filePath')}</label>
            <InputText
              value={form.filePath}
              onChange={(e) => setForm({ ...form, filePath: e.target.value })}
              className="w-full"
              placeholder="/app/dist/main.js"
            />
          </div>
          <div>
            <label className="block mb-1 text-sm">{t('integrity.registerDialog.fileLabel')}</label>
            <InputText
              value={form.fileLabel}
              onChange={(e) => setForm({ ...form, fileLabel: e.target.value })}
              className="w-full"
              placeholder="Backend 빌드 결과물"
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default IntegrityPage;
