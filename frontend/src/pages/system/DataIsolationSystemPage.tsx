import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { Button } from '@/components/AdminButton';
import { Dialog } from 'primereact/dialog';
import { Tag } from 'primereact/tag';
import CommonDataTable from '../../components/CommonDataTable';
import api from '../../api';
import { formatDateTimeSeconds } from '../../utils/date';

type RiskLevel = 'OK' | 'WARN' | 'CRITICAL';

type IsolationTenantStat = {
  tenantId: number;
  tenantName: string;
  tenantSlug: string;
  snapshotCount: number;
  lastSnapshotAt: string | null;
  auditCrossCount: number;
  missingContextCount: number;
  riskLevel: RiskLevel;
};

type IsolationSummary = {
  totalTenants: number;
  okCount: number;
  warnCount: number;
  criticalCount: number;
  tenants: IsolationTenantStat[];
  checkedAt: string;
};

const DataIsolationPage: React.FC = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<IsolationSummary | null>(null);
  const [loading, setLoading] = useState(false);
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
      const res = await api.get<IsolationSummary>('/admin/data-isolation/stats');
      setData(res.data);
    } catch (error: unknown) {
      openResultDialog(t('dataIsolation.resultDialog.failedTitle'), extractApiMessage(error) || t('dataIsolation.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const riskBody = (row: IsolationTenantStat) => (
    <Tag
      value={t(`dataIsolation.risk.${row.riskLevel}`)}
      rounded
      className={`tenant-status-tag isolation-risk-tag isolation-risk-${row.riskLevel.toLowerCase()}`}
    />
  );

  const lastSnapshotBody = (row: IsolationTenantStat) =>
    row.lastSnapshotAt ? formatDateTimeSeconds(row.lastSnapshotAt) : '-';

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
        <h1>{t('dataIsolation.title')}</h1>
        <Button
          type="button"
          icon="pi pi-refresh"
          label={t('common.refresh')}
          outlined
          loading={loading}
          onClick={() => { void load(); }}
        />
      </div>

      {data && (
        <>
          <div className="grid mb-3">
            <div className="col-12 md:col-3">
              <Card title={t('dataIsolation.summary.totalTenants')} className="admin-card admin-stat-card">
                <span className="text-2xl font-bold">{data.totalTenants}</span>
              </Card>
            </div>
            <div className="col-12 md:col-3">
              <Card title={t('dataIsolation.summary.ok')} className="admin-card admin-stat-card">
                <span className="text-2xl font-bold text-green-500">{data.okCount}</span>
              </Card>
            </div>
            <div className="col-12 md:col-3">
              <Card title={t('dataIsolation.summary.warn')} className="admin-card admin-stat-card">
                <span className="text-2xl font-bold text-yellow-500">{data.warnCount}</span>
              </Card>
            </div>
            <div className="col-12 md:col-3">
              <Card title={t('dataIsolation.summary.critical')} className="admin-card admin-stat-card">
                <span className="text-2xl font-bold text-red-500">{data.criticalCount}</span>
              </Card>
            </div>
          </div>

          <div className="admin-table-shell">
            <div className="admin-table-toolbar">
              <div className="tenants-toolbar-left">
                <span className="text-sm font-semibold text-color-secondary">{t('dataIsolation.table.title')}</span>
              </div>
              <small className="text-color-secondary">
                {t('dataIsolation.checkedAt', { checkedAt: formatDateTimeSeconds(data.checkedAt) })}
              </small>
            </div>
            <CommonDataTable
              value={data.tenants}
              loading={loading}
              paginator
              rows={20}
              rowsPerPageOptions={[10, 20, 50]}
              className="admin-table"
            >
              <Column field="tenantName" header={t('dataIsolation.table.tenant')} sortable />
              <Column field="tenantSlug" header={t('dataIsolation.table.slug')} />
              <Column
                field="riskLevel"
                header={t('dataIsolation.table.riskLevel')}
                body={riskBody}
                sortable
              />
              <Column
                field="snapshotCount"
                header={t('dataIsolation.table.snapshotCount')}
                sortable
              />
              <Column
                field="lastSnapshotAt"
                header={t('dataIsolation.table.lastSnapshotAt')}
                body={lastSnapshotBody}
              />
              <Column
                field="missingContextCount"
                header={t('dataIsolation.table.missingContextCount')}
                sortable
              />
              <Column
                field="auditCrossCount"
                header={t('dataIsolation.table.auditCrossCount')}
                sortable
              />
            </CommonDataTable>
          </div>
        </>
      )}
    </div>
  );
};

export default DataIsolationPage;
