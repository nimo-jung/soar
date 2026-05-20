import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { InputNumber } from 'primereact/inputnumber';
import { Toast } from 'primereact/toast';
import { Dialog } from 'primereact/dialog';
import CommonDataTable from '../../components/CommonDataTable';
import api from '../../api';
import { formatDateTimeSeconds } from '../../utils/date';

type QuotaRow = {
  tenantId: number;
  tenantName: string;
  tenantSlug: string;
  epsLimit: number;
  storageQuotaGb: number;
  retentionDays: number;
  updatedAt: string;
};

type EditState = {
  tenantId: number;
  tenantName: string;
  epsLimit: number;
  storageQuotaGb: number;
  retentionDays: number;
};

const QuotaPage: React.FC = () => {
  const { t } = useTranslation();
  const toast = useRef<Toast>(null);
  const [rows, setRows] = useState<QuotaRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editTarget, setEditTarget] = useState<EditState | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<QuotaRow[]>('/admin/quotas');
      setRows(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openEdit = (row: QuotaRow) => {
    setEditTarget({
      tenantId: row.tenantId,
      tenantName: row.tenantName,
      epsLimit: row.epsLimit,
      storageQuotaGb: row.storageQuotaGb,
      retentionDays: row.retentionDays,
    });
  };

  const handleSave = async () => {
    if (!editTarget) return;
    setSaving(true);
    try {
      await api.patch(`/admin/quotas/${editTarget.tenantId}`, {
        epsLimit: editTarget.epsLimit,
        storageQuotaGb: editTarget.storageQuotaGb,
        retentionDays: editTarget.retentionDays,
      });
      toast.current?.show({ severity: 'success', summary: t('quota.result.successTitle'), detail: t('quota.result.saveSuccess'), life: 3000 });
      setEditTarget(null);
      void load();
    } catch {
      toast.current?.show({ severity: 'error', summary: t('quota.result.errorTitle'), detail: t('quota.result.saveFailed'), life: 4000 });
    } finally {
      setSaving(false);
    }
  };

  const actionBody = (row: QuotaRow) => (
    <Button
      size="small"
      icon="pi pi-pencil"
      label={t('common.edit')}
      outlined
      onClick={() => openEdit(row)}
    />
  );

  const zeroLabel = (value: number) =>
    value === 0 ? <span className="text-green-600 font-semibold">{t('quota.unlimited')}</span> : <span>{value}</span>;

  return (
    <div className="admin-page">
      <Toast ref={toast} />
      <div className="admin-page-header">
        <h1>{t('quota.title')}</h1>
        <Button
          type="button"
          icon="pi pi-refresh"
          label={t('common.refresh')}
          outlined
          onClick={() => { void load(); }}
        />
      </div>

      <Card className="admin-card">
        <CommonDataTable
          value={rows}
          loading={loading}
          paginator
          rows={20}
          rowsPerPageOptions={[10, 20, 50]}
          className="admin-table"
        >
          <Column field="tenantName" header={t('quota.table.tenant')} sortable />
          <Column field="tenantSlug" header={t('quota.table.slug')} />
          <Column
            field="epsLimit"
            header={t('quota.table.epsLimit')}
            body={(row: QuotaRow) => zeroLabel(row.epsLimit)}
            sortable
          />
          <Column
            field="storageQuotaGb"
            header={t('quota.table.storageQuotaGb')}
            body={(row: QuotaRow) => zeroLabel(row.storageQuotaGb)}
            sortable
          />
          <Column
            field="retentionDays"
            header={t('quota.table.retentionDays')}
            body={(row: QuotaRow) => zeroLabel(row.retentionDays)}
            sortable
          />
          <Column
            field="updatedAt"
            header={t('quota.table.updatedAt')}
            body={(row: QuotaRow) => formatDateTimeSeconds(row.updatedAt)}
          />
          <Column header={t('common.actions')} body={actionBody} style={{ width: '120px' }} />
        </CommonDataTable>
      </Card>

      <Dialog
        header={t('quota.dialog.title', { name: editTarget?.tenantName })}
        visible={!!editTarget}
        style={{ width: '480px' }}
        onHide={() => setEditTarget(null)}
        footer={
          <div className="flex justify-content-end gap-2">
            <Button label={t('common.cancel')} outlined onClick={() => setEditTarget(null)} />
            <Button label={t('common.save')} loading={saving} onClick={() => { void handleSave(); }} />
          </div>
        }
      >
        {editTarget && (
          <div className="flex flex-column gap-4 pt-2">
            <div>
              <label className="admin-form-label">{t('quota.dialog.epsLimit')}</label>
              <InputNumber
                value={editTarget.epsLimit}
                min={0}
                onValueChange={(e) => setEditTarget({ ...editTarget, epsLimit: e.value ?? 0 })}
                className="w-full"
                suffix={t('quota.dialog.epsSuffix')}
              />
              <small className="text-color-secondary">{t('quota.dialog.zeroMeansUnlimited')}</small>
            </div>
            <div>
              <label className="admin-form-label">{t('quota.dialog.storageQuotaGb')}</label>
              <InputNumber
                value={editTarget.storageQuotaGb}
                min={0}
                onValueChange={(e) => setEditTarget({ ...editTarget, storageQuotaGb: e.value ?? 0 })}
                className="w-full"
                suffix=" GB"
              />
              <small className="text-color-secondary">{t('quota.dialog.zeroMeansUnlimited')}</small>
            </div>
            <div>
              <label className="admin-form-label">{t('quota.dialog.retentionDays')}</label>
              <InputNumber
                value={editTarget.retentionDays}
                min={0}
                onValueChange={(e) => setEditTarget({ ...editTarget, retentionDays: e.value ?? 0 })}
                className="w-full"
                suffix={t('quota.dialog.daysSuffix')}
              />
              <small className="text-color-secondary">{t('quota.dialog.zeroMeansUnlimited')}</small>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
};

export default QuotaPage;
