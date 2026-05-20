import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { Dialog } from 'primereact/dialog';
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

type PricingPolicyRow = {
  tierCode: string;
  baseFee: number;
  includedEps: number;
  epsOveragePer100: number;
  storageOveragePerGb: number;
  logPerMillion: number;
  currency: string;
};

type PricingPolicyResponse = {
  items: PricingPolicyRow[];
};

type BillingFilters = {
  tenantId: number | null;
  tierCode: string;
  from: string;
  to: string;
};

const BillingPage: React.FC = () => {
  const { t } = useTranslation();
  const [rows, setRows] = useState<BillingRow[]>([]);
  const [summary, setSummary] = useState<UsageSummary>({ totalLogCount: 0, avgEps: 0, avgStorageGb: 0 });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [tenantOptions, setTenantOptions] = useState<TenantOption[]>([]);
  const [tenantId, setTenantId] = useState<number | null>(null);
  const [tierCode, setTierCode] = useState<string>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [draftTenantId, setDraftTenantId] = useState<number | null>(null);
  const [draftTierCode, setDraftTierCode] = useState<string>('');
  const [draftFrom, setDraftFrom] = useState('');
  const [draftTo, setDraftTo] = useState('');
  const [pricingPolicies, setPricingPolicies] = useState<PricingPolicyRow[]>([]);
  const [loadingPricing, setLoadingPricing] = useState(false);
  const [savingPricing, setSavingPricing] = useState(false);

  const tierOptions = useMemo(
    () => [
      { label: t('billing.filters.allTiers'), value: '' },
      { label: 'LITE', value: 'LITE' },
      { label: 'PREMIUM', value: 'PREMIUM' },
      { label: 'ENTERPRISE', value: 'ENTERPRISE' },
    ],
    [t],
  );

  const activeFilterCount = useMemo(
    () => [tenantId !== null, tierCode !== '', from !== '', to !== ''].filter(Boolean).length,
    [tenantId, tierCode, from, to],
  );

  const loadTenants = async () => {
    const res = await api.get<TenantDto[]>('/admin/tenants');
    setTenantOptions(res.data.map((tenant) => ({ label: tenant.name, value: tenant.id })));
  };

  const loadUsage = async (
    nextPage = page,
    nextLimit = limit,
    filters: BillingFilters = { tenantId, tierCode, from, to },
  ) => {
    setLoading(true);
    try {
      const res = await api.get<UsageResponse>('/admin/billing/usage', {
        params: {
          tenantId: filters.tenantId ?? undefined,
          tierCode: filters.tierCode || undefined,
          from: filters.from || undefined,
          to: filters.to || undefined,
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

  const loadPricingPolicies = async () => {
    setLoadingPricing(true);
    try {
      const res = await api.get<PricingPolicyResponse>('/admin/billing/pricing-policies');
      setPricingPolicies(res.data.items);
    } finally {
      setLoadingPricing(false);
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

  const handleCollectUsage = async () => {
    setCollecting(true);
    try {
      await api.post('/admin/billing/usage/collect');
      await loadUsage(1, limit);
    } finally {
      setCollecting(false);
    }
  };

  const setPolicyNumber = (tierCode: string, key: keyof Omit<PricingPolicyRow, 'tierCode' | 'currency'>, value: number) => {
    setPricingPolicies((prev) => prev.map((policy) => (
      policy.tierCode === tierCode
        ? { ...policy, [key]: Number.isFinite(value) ? value : 0 }
        : policy
    )));
  };

  const setPolicyCurrency = (tierCode: string, value: string) => {
    setPricingPolicies((prev) => prev.map((policy) => (
      policy.tierCode === tierCode
        ? { ...policy, currency: value.toUpperCase() }
        : policy
    )));
  };

  const handleSavePricingPolicies = async () => {
    setSavingPricing(true);
    try {
      const payload = {
        items: pricingPolicies.map((policy) => ({
          tierCode: policy.tierCode,
          baseFee: policy.baseFee,
          includedEps: policy.includedEps,
          epsOveragePer100: policy.epsOveragePer100,
          storageOveragePerGb: policy.storageOveragePerGb,
          logPerMillion: policy.logPerMillion,
          currency: policy.currency || 'USD',
        })),
      };

      const res = await api.patch<PricingPolicyResponse>('/admin/billing/pricing-policies', payload);
      setPricingPolicies(res.data.items);
    } finally {
      setSavingPricing(false);
    }
  };

  useEffect(() => {
    void loadTenants();
    void loadPricingPolicies();
  }, []);

  useEffect(() => {
    void loadUsage(1, 10);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openFilterDialog = () => {
    setDraftTenantId(tenantId);
    setDraftTierCode(tierCode);
    setDraftFrom(from);
    setDraftTo(to);
    setShowFilterDialog(true);
  };

  const applyFilters = () => {
    const nextFilters: BillingFilters = {
      tenantId: draftTenantId,
      tierCode: draftTierCode,
      from: draftFrom,
      to: draftTo,
    };

    setTenantId(draftTenantId);
    setTierCode(draftTierCode);
    setFrom(draftFrom);
    setTo(draftTo);
    setShowFilterDialog(false);
    void loadUsage(1, limit, nextFilters);
  };

  const resetFilters = () => {
    setDraftTenantId(null);
    setDraftTierCode('');
    setDraftFrom('');
    setDraftTo('');
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>{t('billing.title')}</h1>
        <div className="admin-actions-row">
          <Button
            type="button"
            icon="pi pi-filter"
            label={activeFilterCount > 0 ? `${t('billing.actions.filter')} (${activeFilterCount})` : t('billing.actions.filter')}
            outlined
            onClick={openFilterDialog}
          />
          <Button
            type="button"
            icon="pi pi-refresh"
            label={t('billing.actions.refresh')}
            outlined
            loading={loading}
            onClick={() => {
              void loadUsage(1, limit);
            }}
          />
          <Button
            type="button"
            icon="pi pi-database"
            label={t('billing.actions.collectUsage')}
            outlined
            loading={collecting}
            onClick={() => {
              void handleCollectUsage();
            }}
          />
          <Button
            type="button"
            icon="pi pi-download"
            label={t('billing.actions.exportCsv')}
            outlined
            loading={exporting}
            onClick={() => {
              void handleExport();
            }}
          />
        </div>
      </div>

      <Dialog
        header={t('billing.filters.dialogTitle')}
        visible={showFilterDialog}
        style={{ width: '520px' }}
        onHide={() => setShowFilterDialog(false)}
        footer={(
          <div className="flex justify-content-end gap-2">
            <Button
              type="button"
              icon="pi pi-eraser"
              label={t('billing.actions.resetFilters')}
              outlined
              onClick={resetFilters}
            />
            <Button
              type="button"
              icon="pi pi-check"
              label={t('billing.actions.applyFilters')}
              onClick={applyFilters}
            />
          </div>
        )}
      >
        <div className="grid pt-2">
          <div className="col-12">
            <label className="admin-form-label">{t('billing.filters.tenant')}</label>
            <Dropdown
              value={draftTenantId}
              options={[{ label: t('billing.filters.allTenants'), value: null }, ...tenantOptions]}
              onChange={(e) => setDraftTenantId(e.value as number | null)}
              className="w-full"
              placeholder={t('billing.filters.allTenants')}
            />
          </div>
          <div className="col-12">
            <label className="admin-form-label">{t('billing.filters.tier')}</label>
            <Dropdown
              value={draftTierCode}
              options={tierOptions}
              onChange={(e) => setDraftTierCode(String(e.value ?? ''))}
              className="w-full"
            />
          </div>
          <div className="col-12 md:col-6">
            <label className="admin-form-label">{t('billing.filters.from')}</label>
            <InputText type="date" value={draftFrom} onChange={(e) => setDraftFrom(e.target.value)} className="w-full" />
          </div>
          <div className="col-12 md:col-6">
            <label className="admin-form-label">{t('billing.filters.to')}</label>
            <InputText type="date" value={draftTo} onChange={(e) => setDraftTo(e.target.value)} className="w-full" />
          </div>
        </div>
      </Dialog>

      <div className="grid mb-3">
        <div className="col-12 md:col-4">
          <Card title={t('billing.summary.totalLogCount')} className="admin-card admin-stat-card">
            <span>{summary.totalLogCount}</span>
          </Card>
        </div>
        <div className="col-12 md:col-4">
          <Card title={t('billing.summary.avgEps')} className="admin-card admin-stat-card">
            <span>{summary.avgEps.toFixed(2)}</span>
          </Card>
        </div>
        <div className="col-12 md:col-4">
          <Card title={t('billing.summary.avgStorageGb')} className="admin-card admin-stat-card">
            <span>{summary.avgStorageGb.toFixed(2)} GB</span>
          </Card>
        </div>
      </div>

      <div className="admin-table-shell">
        <div className="admin-table-toolbar">
          <div className="tenants-toolbar-left">
            <span className="text-sm font-semibold text-color-secondary">{t('billing.table.title')}</span>
          </div>
        </div>
        <CommonDataTable
          value={rows}
          loading={loading}
          paginator
          first={(page - 1) * limit}
          rows={limit}
          totalRecords={total}
          rowsPerPageOptions={[10, 20, 50]}
          className="admin-table"
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
      </div>

      <div className="admin-table-shell mt-3">
        <div className="admin-table-toolbar">
          <div className="tenants-toolbar-left">
            <span className="text-sm font-semibold text-color-secondary">{t('billing.pricing.title')}</span>
          </div>
          <div className="admin-actions-row">
            <Button
              type="button"
              icon="pi pi-save"
              label={t('billing.pricing.save')}
              outlined
              loading={savingPricing}
              disabled={loadingPricing || pricingPolicies.length === 0}
              onClick={() => {
                void handleSavePricingPolicies();
              }}
            />
          </div>
        </div>
        <CommonDataTable value={pricingPolicies} loading={loadingPricing} className="admin-table">
          <Column field="tierCode" header={t('billing.pricing.columns.tierCode')} />
          <Column
            header={t('billing.pricing.columns.baseFee')}
            body={(row: PricingPolicyRow) => (
              <InputNumber
                value={row.baseFee}
                min={0}
                minFractionDigits={2}
                maxFractionDigits={2}
                mode="decimal"
                useGrouping={false}
                className="w-full"
                onValueChange={(event) => setPolicyNumber(row.tierCode, 'baseFee', event.value ?? 0)}
              />
            )}
          />
          <Column
            header={t('billing.pricing.columns.includedEps')}
            body={(row: PricingPolicyRow) => (
              <InputNumber
                value={row.includedEps}
                min={0}
                minFractionDigits={0}
                maxFractionDigits={2}
                mode="decimal"
                useGrouping={false}
                className="w-full"
                onValueChange={(event) => setPolicyNumber(row.tierCode, 'includedEps', event.value ?? 0)}
              />
            )}
          />
          <Column
            header={t('billing.pricing.columns.epsOveragePer100')}
            body={(row: PricingPolicyRow) => (
              <InputNumber
                value={row.epsOveragePer100}
                min={0}
                minFractionDigits={0}
                maxFractionDigits={4}
                mode="decimal"
                useGrouping={false}
                className="w-full"
                onValueChange={(event) => setPolicyNumber(row.tierCode, 'epsOveragePer100', event.value ?? 0)}
              />
            )}
          />
          <Column
            header={t('billing.pricing.columns.storageOveragePerGb')}
            body={(row: PricingPolicyRow) => (
              <InputNumber
                value={row.storageOveragePerGb}
                min={0}
                minFractionDigits={0}
                maxFractionDigits={4}
                mode="decimal"
                useGrouping={false}
                className="w-full"
                onValueChange={(event) => setPolicyNumber(row.tierCode, 'storageOveragePerGb', event.value ?? 0)}
              />
            )}
          />
          <Column
            header={t('billing.pricing.columns.logPerMillion')}
            body={(row: PricingPolicyRow) => (
              <InputNumber
                value={row.logPerMillion}
                min={0}
                minFractionDigits={0}
                maxFractionDigits={4}
                mode="decimal"
                useGrouping={false}
                className="w-full"
                onValueChange={(event) => setPolicyNumber(row.tierCode, 'logPerMillion', event.value ?? 0)}
              />
            )}
          />
          <Column
            header={t('billing.pricing.columns.currency')}
            body={(row: PricingPolicyRow) => (
              <InputText
                value={row.currency}
                maxLength={10}
                className="w-full"
                onChange={(event) => setPolicyCurrency(row.tierCode, event.target.value)}
              />
            )}
          />
        </CommonDataTable>
      </div>
    </div>
  );
};

export default BillingPage;
