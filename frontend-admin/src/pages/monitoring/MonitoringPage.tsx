import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Button } from '@/components/AdminButton';
import { Tag } from 'primereact/tag';
import { Dialog } from 'primereact/dialog';
import CommonDataTable from '../../components/CommonDataTable';
import api from '../../api';
import { formatDateTimeSeconds } from '../../utils/date';

type MonitoringEventRow = {
  occurredAt: string;
  tenantId: number | null;
  tenantLabel: string;
  severity: string;
  code: string;
  message: string;
};

type MonitoringOverviewResponse = {
  epsSeries: Array<{ ts: string; value: number }>;
  ingestErrorRate: number;
  parseErrorRate: number;
  avgIngestLatencyMs: number;
  engineHealthy: boolean;
  engineCheckedAt: string | null;
};

type MonitoringEventsResponse = {
  items: MonitoringEventRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
};

type TenantDto = {
  id: number;
  name: string;
};

type MonitoringFilters = {
  tenantId: number | null;
  severity: string;
  from: string;
  to: string;
};

const MonitoringPage: React.FC = () => {
  const { t } = useTranslation();
  const chartWidth = 720;
  const chartHeight = 72;
  const chartPadding = 8;
  const [rows, setRows] = useState<MonitoringEventRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [tenantId, setTenantId] = useState<number | null>(null);
  const [severity, setSeverity] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [draftTenantId, setDraftTenantId] = useState<number | null>(null);
  const [draftSeverity, setDraftSeverity] = useState('');
  const [draftFrom, setDraftFrom] = useState('');
  const [draftTo, setDraftTo] = useState('');
  const [tenantOptions, setTenantOptions] = useState<Array<{ label: string; value: number }>>([]);
  const [overview, setOverview] = useState<MonitoringOverviewResponse>({
    epsSeries: [],
    ingestErrorRate: 0,
    parseErrorRate: 0,
    avgIngestLatencyMs: 0,
    engineHealthy: false,
    engineCheckedAt: null,
  });

  const activeFilterCount = React.useMemo(
    () => [tenantId !== null, severity !== '', from !== '', to !== ''].filter(Boolean).length,
    [tenantId, severity, from, to],
  );

  const chartPolyline = React.useMemo(() => {
    if (overview.epsSeries.length < 2) {
      return '';
    }

    const values = overview.epsSeries.map((item) => item.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    return overview.epsSeries
      .map((point, index) => {
        const x = chartPadding + (index / (overview.epsSeries.length - 1)) * (chartWidth - chartPadding * 2);
        const y = chartHeight - chartPadding - ((point.value - min) / range) * (chartHeight - chartPadding * 2);
        return `${x},${y}`;
      })
      .join(' ');
  }, [chartHeight, chartPadding, chartWidth, overview.epsSeries]);

  const chartPoints = React.useMemo(() => {
    if (overview.epsSeries.length < 2) {
      return [] as Array<{ x: number; y: number; label: string }>;
    }

    const values = overview.epsSeries.map((item) => item.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    return overview.epsSeries.map((point, index) => {
      const x = chartPadding + (index / (overview.epsSeries.length - 1)) * (chartWidth - chartPadding * 2);
      const y = chartHeight - chartPadding - ((point.value - min) / range) * (chartHeight - chartPadding * 2);
      return {
        x,
        y,
        label: `${formatDateTimeSeconds(point.ts)} / EPS ${point.value.toFixed(2)}`,
      };
    });
  }, [chartHeight, chartPadding, chartWidth, overview.epsSeries]);

  const chartMinMax = React.useMemo(() => {
    if (overview.epsSeries.length === 0) {
      return { min: 0, max: 0 };
    }

    const values = overview.epsSeries.map((item) => item.value);
    return {
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }, [overview.epsSeries]);

  const xAxisLabels = React.useMemo(() => {
    if (overview.epsSeries.length === 0) {
      return {
        start: '-',
        middle: '-',
        end: '-',
      };
    }

    const start = overview.epsSeries[0];
    const middle = overview.epsSeries[Math.floor((overview.epsSeries.length - 1) / 2)];
    const end = overview.epsSeries[overview.epsSeries.length - 1];

    return {
      start: formatDateTimeSeconds(start.ts),
      middle: formatDateTimeSeconds(middle.ts),
      end: formatDateTimeSeconds(end.ts),
    };
  }, [overview.epsSeries]);

  const severityOptions = [
    { label: t('monitoring.filters.allSeverities'), value: '' },
    { label: 'HIGH', value: 'HIGH' },
    { label: 'MEDIUM', value: 'MEDIUM' },
    { label: 'LOW', value: 'LOW' },
  ];

  const loadTenants = async () => {
    const res = await api.get<TenantDto[]>('/admin/tenants');
    setTenantOptions(res.data.map((tenant) => ({ label: tenant.name, value: tenant.id })));
  };

  const loadMonitoring = async (
    nextPage = page,
    nextLimit = limit,
    filters: MonitoringFilters = { tenantId, severity, from, to },
  ) => {
    setLoading(true);
    try {
      const params = {
        tenantId: filters.tenantId ?? undefined,
        severity: filters.severity || undefined,
        from: filters.from ? `${filters.from} 00:00:00` : undefined,
        to: filters.to ? `${filters.to} 23:59:59` : undefined,
      };

      const [overviewRes, eventsRes] = await Promise.all([
        api.get<MonitoringOverviewResponse>('/admin/monitoring/overview', { params }),
        api.get<MonitoringEventsResponse>('/admin/monitoring/events', {
          params: {
            ...params,
            page: nextPage,
            limit: nextLimit,
          },
        }),
      ]);

      setOverview(overviewRes.data);
      setRows(eventsRes.data.items);
      setTotal(eventsRes.data.pagination.total);
      setPage(eventsRes.data.pagination.page);
      setLimit(eventsRes.data.pagination.limit);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTenants();
  }, []);

  useEffect(() => {
    void loadMonitoring(1, 10);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openFilterDialog = () => {
    setDraftTenantId(tenantId);
    setDraftSeverity(severity);
    setDraftFrom(from);
    setDraftTo(to);
    setShowFilterDialog(true);
  };

  const applyFilters = () => {
    const nextFilters: MonitoringFilters = {
      tenantId: draftTenantId,
      severity: draftSeverity,
      from: draftFrom,
      to: draftTo,
    };

    setTenantId(draftTenantId);
    setSeverity(draftSeverity);
    setFrom(draftFrom);
    setTo(draftTo);
    setShowFilterDialog(false);
    void loadMonitoring(1, limit, nextFilters);
  };

  const resetFilters = () => {
    setDraftTenantId(null);
    setDraftSeverity('');
    setDraftFrom('');
    setDraftTo('');
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>{t('monitoring.title')}</h1>
        <div className="admin-actions-row">
          <Button
            type="button"
            icon="pi pi-filter"
            label={activeFilterCount > 0 ? `${t('monitoring.actions.filter')} (${activeFilterCount})` : t('monitoring.actions.filter')}
            outlined
            onClick={openFilterDialog}
          />
          <Button
            type="button"
            icon="pi pi-refresh"
            label={t('monitoring.actions.refresh')}
            outlined
            loading={loading}
            onClick={() => {
              void loadMonitoring(1, limit);
            }}
          />
        </div>
      </div>

      <Dialog
        header={t('monitoring.filters.dialogTitle')}
        visible={showFilterDialog}
        style={{ width: '520px' }}
        onHide={() => setShowFilterDialog(false)}
        footer={(
          <div className="flex justify-content-end gap-2">
            <Button
              type="button"
              icon="pi pi-eraser"
              label={t('monitoring.actions.resetFilters')}
              outlined
              onClick={resetFilters}
            />
            <Button
              type="button"
              icon="pi pi-check"
              label={t('monitoring.actions.applyFilters')}
              onClick={applyFilters}
            />
          </div>
        )}
      >
        <div className="grid pt-2">
          <div className="col-12">
            <label className="admin-form-label">{t('monitoring.filters.tenant')}</label>
            <Dropdown
              value={draftTenantId}
              options={[{ label: t('monitoring.filters.allTenants'), value: null }, ...tenantOptions]}
              onChange={(e) => setDraftTenantId(e.value as number | null)}
              className="w-full"
            />
          </div>
          <div className="col-12">
            <label className="admin-form-label">{t('monitoring.filters.severity')}</label>
            <Dropdown
              value={draftSeverity}
              options={severityOptions}
              onChange={(e) => setDraftSeverity(String(e.value ?? ''))}
              className="w-full"
            />
          </div>
          <div className="col-12 md:col-6">
            <label className="admin-form-label">{t('monitoring.filters.from')}</label>
            <InputText type="date" value={draftFrom} onChange={(e) => setDraftFrom(e.target.value)} className="w-full" />
          </div>
          <div className="col-12 md:col-6">
            <label className="admin-form-label">{t('monitoring.filters.to')}</label>
            <InputText type="date" value={draftTo} onChange={(e) => setDraftTo(e.target.value)} className="w-full" />
          </div>
        </div>
      </Dialog>

      <div className="grid mb-3">
        <div className="col-12 md:col-6 xl:col-3">
          <Card title={t('monitoring.cards.ingestErrorRate')} className="admin-card admin-stat-card">
            <span className="text-2xl font-bold">{overview.ingestErrorRate.toFixed(2)}%</span>
          </Card>
        </div>
        <div className="col-12 md:col-6 xl:col-3">
          <Card title={t('monitoring.cards.parseErrorRate')} className="admin-card admin-stat-card">
            <span className="text-2xl font-bold">{overview.parseErrorRate.toFixed(2)}%</span>
          </Card>
        </div>
        <div className="col-12 md:col-6 xl:col-3">
          <Card title={t('monitoring.cards.avgIngestLatencyMs')} className="admin-card admin-stat-card">
            <span className="text-2xl font-bold">{overview.avgIngestLatencyMs.toFixed(2)} ms</span>
          </Card>
        </div>
        <div className="col-12 md:col-6 xl:col-3">
          <Card title={t('monitoring.cards.eventCount')} className="admin-card admin-stat-card">
            <span className="text-2xl font-bold">{total}</span>
          </Card>
        </div>
      </div>

      <div className="grid mb-3">
        <div className="col-12 xl:8">
          <Card title={t('monitoring.chart.epsTitle')} className="admin-card h-full monitoring-panel-card">
            {chartPolyline ? (
              <div className="flex flex-column gap-2">
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label={t('monitoring.chart.epsTitle')} style={{ width: '100%' }}>
                  <polyline fill="none" stroke="var(--primary-color)" strokeWidth="2.5" points={chartPolyline} />
                  {chartPoints.map((point, index) => (
                    <circle key={`point-${index}`} cx={point.x} cy={point.y} r="3" fill="var(--primary-color)">
                      <title>{point.label}</title>
                    </circle>
                  ))}
                </svg>
                <div className="flex justify-content-between text-sm text-color-secondary">
                  <span>{t('monitoring.chart.minLabel', { value: chartMinMax.min.toFixed(2) })}</span>
                  <span>{t('monitoring.chart.maxLabel', { value: chartMinMax.max.toFixed(2) })}</span>
                </div>
                <div className="flex justify-content-between text-sm text-color-secondary">
                  <span>{t('monitoring.chart.startLabel', { value: xAxisLabels.start })}</span>
                  <span>{t('monitoring.chart.middleLabel', { value: xAxisLabels.middle })}</span>
                  <span>{t('monitoring.chart.endLabel', { value: xAxisLabels.end })}</span>
                </div>
              </div>
            ) : (
              <div className="text-color-secondary">{t('monitoring.chart.noData')}</div>
            )}
          </Card>
        </div>
        <div className="col-12 xl:4">
          <Card title={t('monitoring.cards.engineHealth')} className="admin-card h-full monitoring-panel-card">
            <div className="flex flex-column gap-3">
              <div className="flex align-items-center justify-content-between">
                <span className="text-color-secondary">{t('common.status')}</span>
                <Tag
                  value={overview.engineHealthy ? t('monitoring.engine.healthy') : t('monitoring.engine.unhealthy')}
                  rounded
                  className={`tenant-status-tag ${overview.engineHealthy ? 'tenant-status-active' : 'tenant-status-deleted'}`}
                />
              </div>
              <div className="flex flex-column gap-1">
                <span className="text-color-secondary">{t('monitoring.engine.checkedAt', { checkedAt: overview.engineCheckedAt ? formatDateTimeSeconds(overview.engineCheckedAt) : '-' })}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="admin-table-shell">
        <div className="admin-table-toolbar">
          <div className="tenants-toolbar-left">
            <span className="text-sm font-semibold text-color-secondary">{t('monitoring.table.title')}</span>
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
            void loadMonitoring(nextPage, nextLimit);
          }}
        >
          <Column field="occurredAt" header={t('monitoring.table.occurredAt')} body={(row: MonitoringEventRow) => formatDateTimeSeconds(row.occurredAt)} />
          <Column field="tenantLabel" header={t('monitoring.table.tenant')} />
          <Column field="severity" header={t('monitoring.table.severity')} />
          <Column field="code" header={t('monitoring.table.code')} />
          <Column field="message" header={t('monitoring.table.message')} />
        </CommonDataTable>
      </div>
    </div>
  );
};

export default MonitoringPage;
