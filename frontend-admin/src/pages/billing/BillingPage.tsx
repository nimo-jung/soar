import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import CommonDataTable from '../../components/CommonDataTable';
import api from '../../api';
import { formatDateTimeSeconds } from '../../utils/date';

type BillingRow = {
  tenantId: number;
  snapshotAt: string;
  tenantName: string;
  epsAvg: number;
  storageUsedGb: number;
  logCount: number;
};

type UsageSummary = {
  totalLogCount: number;
  avgEps: number;
  avgStorageGb: number;
};

type UsageResponse = {
  items: BillingRow[];
  summary: UsageSummary;
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
};

type TenantOption = {
  label: string;
  value: number;
};

type TenantDto = {
  id: number;
  name: string;
};

const BillingPage: React.FC = () => {
  const { t } = useTranslation();
  const [rows, setRows] = useState<BillingRow[]>([]);
  const [summary, setSummary] = useState<UsageSummary>({ totalLogCount: 0, avgEps: 0, avgStorageGb: 0 });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [tenantOptions, setTenantOptions] = useState<TenantOption[]>([]);
  const [tenantId, setTenantId] = useState<number | null>(null);
  const [tierCode, setTierCode] = useState<string>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const tierOptions = useMemo(
    () => [
      { label: t('billing.filters.allTiers'), value: '' },
      { label: 'LITE', value: 'LITE' },
      { label: 'PREMIUM', value: 'PREMIUM' },
      { label: 'ENTERPRISE', value: 'ENTERPRISE' },
    ],
    [t],
  );

  const loadTenants = async () => {
    const res = await api.get<TenantDto[]>('/admin/tenants');
    setTenantOptions(res.data.map((tenant) => ({ label: tenant.name, value: tenant.id })));
  };

  const loadUsage = async (nextPage = page, nextLimit = limit) => {
    setLoading(true);
    try {
      const res = await api.get<UsageResponse>('/admin/billing/usage', {
        params: {
          tenantId: tenantId ?? undefined,
          tierCode: tierCode || undefined,
          from: from || undefined,
          to: to || undefined,
          page: nextPage,
          limit: nextLimit,
        },
      });

      setRows(res.data.items);
      setSummary(res.data.summary);
      setTotal(res.data.pagination.total);
      setPage(res.data.pagination.page);
      setLimit(res.data.pagination.limit);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await api.get('/admin/billing/usage/export', {
        params: {
          tenantId: tenantId ?? undefined,
          tierCode: tierCode || undefined,
          from: from || undefined,
          to: to || undefined,
        },
        responseType: 'blob',
      });

      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `billing-usage-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    void loadTenants();
  }, []);

  useEffect(() => {
    void loadUsage(1, limit);
  }, [tenantId, tierCode, from, to]);

  return (
    <div className="p-4">
      <div className="page-header">
        <h1>{t('billing.title')}</h1>
        <div className="flex gap-2">
          <Button
            type="button"
            icon="pi pi-refresh"
            label={t('billing.actions.refresh')}
            outlined
            onClick={() => {
              void loadUsage(1, limit);
            }}
          />
          <Button
            type="button"
            icon="pi pi-download"
            label={t('billing.actions.exportCsv')}
            loading={exporting}
            onClick={() => {
              void handleExport();
            }}
          />
        </div>
      </div>

      <Card className="mb-3">
        <div className="grid">
          <div className="col-12 md:col-3">
            <label className="block mb-2 text-sm">{t('billing.filters.tenant')}</label>
            <Dropdown
              value={tenantId}
              options={[{ label: t('billing.filters.allTenants'), value: null }, ...tenantOptions]}
              onChange={(e) => setTenantId(e.value as number | null)}
              className="w-full"
              placeholder={t('billing.filters.allTenants')}
            />
          </div>
          <div className="col-12 md:col-3">
            <label className="block mb-2 text-sm">{t('billing.filters.tier')}</label>
            <Dropdown
              value={tierCode}
              options={tierOptions}
              onChange={(e) => setTierCode(String(e.value ?? ''))}
              className="w-full"
            />
          </div>
          <div className="col-12 md:col-3">
            <label className="block mb-2 text-sm">{t('billing.filters.from')}</label>
            <InputText type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full" />
          </div>
          <div className="col-12 md:col-3">
            <label className="block mb-2 text-sm">{t('billing.filters.to')}</label>
            <InputText type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full" />
          </div>
        </div>
      </Card>

      <div className="grid mb-3">
        <div className="col-12 md:col-4">
          <Card title={t('billing.summary.totalLogCount')}>
            <span>{summary.totalLogCount}</span>
          </Card>
        </div>
        <div className="col-12 md:col-4">
          <Card title={t('billing.summary.avgEps')}>
            <span>{summary.avgEps.toFixed(2)}</span>
          </Card>
        </div>
        <div className="col-12 md:col-4">
          <Card title={t('billing.summary.avgStorageGb')}>
            <span>{summary.avgStorageGb.toFixed(2)} GB</span>
          </Card>
        </div>
      </div>

      <Card title={t('billing.table.title')}>
        <CommonDataTable
          value={rows}
          loading={loading}
          paginator
          first={(page - 1) * limit}
          rows={limit}
          totalRecords={total}
          rowsPerPageOptions={[10, 20, 50]}
          className="admin-tenants-table"
          onPage={(event) => {
            const nextPage = Math.floor((event.first ?? 0) / (event.rows ?? 10)) + 1;
            const nextLimit = event.rows ?? 10;
            void loadUsage(nextPage, nextLimit);
          }}
        >
          <Column field="snapshotAt" header={t('billing.table.snapshotAt')} body={(row: BillingRow) => formatDateTimeSeconds(row.snapshotAt)} />
          <Column field="tenantName" header={t('billing.table.tenant')} />
          <Column field="epsAvg" header={t('billing.table.epsAvg')} body={(row: BillingRow) => row.epsAvg.toFixed(2)} />
          <Column field="storageUsedGb" header={t('billing.table.storageUsedGb')} body={(row: BillingRow) => row.storageUsedGb.toFixed(2)} />
          <Column field="logCount" header={t('billing.table.logCount')} />
        </CommonDataTable>
      </Card>
    </div>
  );
};

export default BillingPage;
