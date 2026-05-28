import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { InputNumber } from 'primereact/inputnumber';
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
  const [rows, setRows] = useState<QuotaRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editTarget, setEditTarget] = useState<EditState | null>(null);
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
      openResultDialog(t('quota.result.successTitle'), t('quota.result.saveSuccess'));
      setEditTarget(null);
      void load();
    } catch (error: unknown) {
      openResultDialog(
        t('quota.result.errorTitle'),
        extractApiMessage(error) || t('quota.result.saveFailed'),
      );
    } finally {
      setSaving(false);
    }
  };

  const actionBody = (row: QuotaRow) => (
    <div className="tier-action-stack">
      <Button
        type="button"
        icon="pi pi-pencil"
        text
        rounded
        size="small"
        aria-label={t('common.edit')}
        tooltip={t('common.edit')}
        tooltipOptions={{ position: 'top' }}
        onClick={() => openEdit(row)}
      />
    </div>
  );

  const zeroLabel = (value: number) =>
    value === 0 ? <span className="text-green-600 font-semibold">{t('quota.unlimited')}</span> : <span>{value}</span>;

  return (
    <div className="admin-page">
      <Dialog
        visible={resultDialog.visible}
        header={resultDialog.title}
        style={{ width: '420px', maxWidth: '96vw' }}
        onHide={() => setResultDialog((prev) => ({ ...prev, visible: false }))}
        footer={(
          <div className="flex justify-content-end">
            <Button label={t('common.confirm')} onClick={() => setResultDialog((prev) => ({ ...prev, visible: false }))} />
          </div>
        )}
      >
        <p className="m-0">{resultDialog.message}</p>
      </Dialog>
      <div className="admin-page-header page-header">
        <h1>{t('quota.title')}</h1>
        <div className="admin-actions-row">
          <Button
            type="button"
            icon="pi pi-refresh"
            label={t('common.refresh')}
            outlined
            loading={loading}
            onClick={() => { void load(); }}
          />
        </div>
      </div>

      <div className="admin-table-shell">
        <div className="admin-table-toolbar">
          <div className="tenants-toolbar-left">
            <span className="text-sm font-semibold text-color-secondary">{t('quota.title')}</span>
          </div>
        </div>
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
          <Column
            header={t('common.actions')}
            body={actionBody}
            style={{ width: '5.2rem' }}
            bodyClassName="text-center"
            headerClassName="text-center"
          />
        </CommonDataTable>
      </div>

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
