import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
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

const RISK_SEVERITY_MAP: Record<RiskLevel, 'success' | 'warning' | 'danger'> = {
  OK: 'success',
  WARN: 'warning',
  CRITICAL: 'danger',
};

const DataIsolationPage: React.FC = () => {
  const { t } = useTranslation();
  const toast = useRef<Toast>(null);
  const [data, setData] = useState<IsolationSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<IsolationSummary>('/admin/data-isolation/stats');
      setData(res.data);
    } catch {
      toast.current?.show({ severity: 'error', summary: t('dataIsolation.loadFailed'), life: 4000 });
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
      severity={RISK_SEVERITY_MAP[row.riskLevel]}
    />
  );

  const lastSnapshotBody = (row: IsolationTenantStat) =>
    row.lastSnapshotAt ? formatDateTimeSeconds(row.lastSnapshotAt) : '-';

  return (
    <div className="p-4">
      <Toast ref={toast} />
      <div className="page-header">
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
              <Card title={t('dataIsolation.summary.totalTenants')}>
                <span className="text-2xl font-bold">{data.totalTenants}</span>
              </Card>
            </div>
            <div className="col-12 md:col-3">
              <Card title={t('dataIsolation.summary.ok')}>
                <span className="text-2xl font-bold text-green-500">{data.okCount}</span>
              </Card>
            </div>
            <div className="col-12 md:col-3">
              <Card title={t('dataIsolation.summary.warn')}>
                <span className="text-2xl font-bold text-yellow-500">{data.warnCount}</span>
              </Card>
            </div>
            <div className="col-12 md:col-3">
              <Card title={t('dataIsolation.summary.critical')}>
                <span className="text-2xl font-bold text-red-500">{data.criticalCount}</span>
              </Card>
            </div>
          </div>

          <Card title={t('dataIsolation.table.title')}>
            <small className="block mb-3 text-color-secondary">
              {t('dataIsolation.checkedAt', { checkedAt: formatDateTimeSeconds(data.checkedAt) })}
            </small>
            <CommonDataTable
              value={data.tenants}
              loading={loading}
              paginator
              rows={20}
              rowsPerPageOptions={[10, 20, 50]}
              className="admin-tenants-table"
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
          </Card>
        </>
      )}
    </div>
  );
};

export default DataIsolationPage;
