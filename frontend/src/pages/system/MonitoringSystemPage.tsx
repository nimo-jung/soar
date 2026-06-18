import React, { useEffect, useMemo, useState } from 'react';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Dialog } from 'primereact/dialog';
import { Tag } from 'primereact/tag';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/TenantButton';
import CommonDataTable from '@/components/CommonDataTable';
import api from '@/api';
import { formatDateTimeSeconds } from '@/utils/date';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ReferenceLine,
} from 'recharts';

// ─── Types ────────────────────────────────────────────

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
  pagination: { page: number; limit: number; total: number };
};

type TenantDto = { id: number; name: string };
type MonitoringFilters = {
  tenantId: number | null;
  severity: string;
  from: string;
  to: string;
};

// ─── Chart data type ──────────────────────────────────

interface EpsChartDataPoint {
  ts: string;
  value: number;
  timeLabel: string;
}

// ─── Helpers ──────────────────────────────────────────

const fmtHHMM = (ts: string): string => {
  try {
    const d = new Date(ts);
    return isNaN(d.getTime()) ? ts : `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch {
    return ts;
  }
};

const fmtDateShort = (ts: string) => {
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return ts;
    return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch {
    return ts;
  }
};

// ─── Component ────────────────────────────────────────

const MonitoringSystemPage: React.FC = () => {
  const { t } = useTranslation();
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

  const activeFilterCount = useMemo(
    () => [tenantId !== null, severity !== '', from !== '', to !== ''].filter(Boolean).length,
    [tenantId, severity, from, to],
  );

  // EPS chart data in Recharts format
  const epsChartData = useMemo<EpsChartDataPoint[]>(() => {
    const series = overview.epsSeries;
    if (series.length < 2) return [];
    return series.map((point) => ({
      ts: point.ts,
      value: point.value,
      timeLabel: fmtHHMM(point.ts),
    }));
  }, [overview.epsSeries]);

  // Chart statistics
  const chartStats = useMemo(() => {
    if (epsChartData.length === 0) return null;
    const values = epsChartData.map((d) => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const current = values[values.length - 1];
    return { min, max, avg, current };
  }, [epsChartData]);

  const severityOptions = [
    { label: t('monitoring.filters.allSeverities'), value: '' },
    { label: 'HIGH', value: 'HIGH' },
    { label: 'MEDIUM', value: 'MEDIUM' },
    { label: 'LOW', value: 'LOW' },
  ];

  const loadTenants = async () => {
    const res = await api.get<TenantDto[]>('/admin/tenants');
    setTenantOptions(res.data.map((t) => ({ label: t.name, value: t.id })));
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
          params: { ...params, page: nextPage, limit: nextLimit },
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
    setTenantId(draftTenantId);
    setSeverity(draftSeverity);
    setFrom(draftFrom);
    setTo(draftTo);
    setShowFilterDialog(false);
    void loadMonitoring(1, limit, {
      tenantId: draftTenantId,
      severity: draftSeverity,
      from: draftFrom,
      to: draftTo,
    });
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1 className="admin-page-title">{t('monitoring.title')}</h1>
        <div className="admin-actions-row">
          <Button
            type="button"
            icon="pi pi-filter"
            label={activeFilterCount > 0 ? `${t('monitoring.actions.filter')} (${activeFilterCount})` : t('monitoring.actions.filter')}
            outlined
            onClick={openFilterDialog}
          />
          <Button type="button" icon="pi pi-refresh" label={t('monitoring.actions.refresh')} outlined loading={loading} onClick={() => void loadMonitoring(1, limit)} />
        </div>
      </div>

      {/* ── Filter Dialog ── */}
      <Dialog
        className="tenant-dialog"
        header={t('monitoring.filters.dialogTitle')}
        visible={showFilterDialog}
        style={{ width: '520px' }}
        onHide={() => setShowFilterDialog(false)}
        footer={(
          <div className="flex justify-content-end gap-2">
            <Button type="button" icon="pi pi-check" label={t('monitoring.actions.applyFilters')} onClick={applyFilters} />
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
            <Dropdown value={draftSeverity} options={severityOptions} onChange={(e) => setDraftSeverity(String(e.value ?? ''))} className="w-full" />
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

      {/* ── Top metric cards (DataIsolation style) ── */}
      <div className="grid mb-3">
        <div className="col-12 md:col-6 xl:col-3">
          <Card className="admin-card admin-stat-card" style={{ minHeight: '70px' }}>
            <span className="text-color-secondary text-sm">{t('monitoring.cards.ingestErrorRate')}</span>
            <div className="flex align-items-center justify-content-between mt-1">
              <span className="text-2xl font-bold" style={{ color: 'var(--red-500)' }}>{overview.ingestErrorRate.toFixed(2)}%</span>
              <Tag value="ERR" severity="danger" rounded />
            </div>
          </Card>
        </div>
        <div className="col-12 md:col-6 xl:col-3">
          <Card className="admin-card admin-stat-card" style={{ minHeight: '70px' }}>
            <span className="text-color-secondary text-sm">{t('monitoring.cards.parseErrorRate')}</span>
            <div className="flex align-items-center justify-content-between mt-1">
              <span className="text-2xl font-bold" style={{ color: 'var(--orange-500)' }}>{overview.parseErrorRate.toFixed(2)}%</span>
              <Tag value="ERR" severity="warning" rounded />
            </div>
          </Card>
        </div>
        <div className="col-12 md:col-6 xl:col-3">
          <Card className="admin-card admin-stat-card" style={{ minHeight: '70px' }}>
            <span className="text-color-secondary text-sm">{t('monitoring.cards.avgIngestLatencyMs')}</span>
            <div className="flex align-items-center justify-content-between mt-1">
              <span className="text-2xl font-bold" style={{ color: 'var(--blue-500)' }}>{overview.avgIngestLatencyMs.toFixed(2)} ms</span>
              <Tag value="LATENCY" severity="info" rounded />
            </div>
          </Card>
        </div>
        <div className="col-12 md:col-6 xl:col-3">
          <Card className="admin-card admin-stat-card" style={{ minHeight: '70px' }}>
            <span className="text-color-secondary text-sm">{t('monitoring.cards.eventCount')}</span>
            <div className="flex align-items-center justify-content-between mt-1">
              <span className="text-2xl font-bold" style={{ color: 'var(--primary-color)' }}>{total}</span>
              <Tag value="EVT" severity="success" rounded />
            </div>
          </Card>
        </div>
      </div>

      {/* ── EPS Chart (Recharts) ── */}
      <Card title={t('monitoring.chart.epsTitle')} className="admin-card mb-3">
        {epsChartData.length >= 2 ? (
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <LineChart data={epsChartData}>
                <XAxis
                  dataKey="timeLabel"
                  tick={{ fill: 'var(--text-color-secondary)', fontSize: 11 }}
                  interval={0}
                />
                <YAxis
                  tick={{ fill: 'var(--text-color-secondary)', fontSize: 11 }}
                  label={{ value: 'EPS', angle: -90, position: 'insideLeft', fill: 'var(--text-color-secondary)', fontSize: 11 }}
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: 'var(--surface-card)',
                    border: `1px solid var(--surface-border)`,
                    borderRadius: '6px',
                    color: 'var(--text-color)',
                    fontSize: 12,
                  }}
                  labelStyle={{ color: 'var(--text-color-secondary)', marginBottom: 4 }}
                  formatter={(value: any) => [`${Number(value).toFixed(1)}`, 'EPS'] as [string, string]}
                  labelFormatter={(label, payload: any) => {
                    if (payload && payload[0] && payload[0].payload) {
                      return fmtDateShort(payload[0].payload.ts);
                    }
                    return String(label);
                  }}
                />
                <ReferenceLine
                  y={chartStats?.avg ?? 0}
                  stroke="var(--yellow-500)"
                  strokeDasharray="5,3"
                  label={{
                    value: t('monitoring.chart.avgLabel', { value: (chartStats?.avg ?? 0).toFixed(1) }),
                    position: 'right',
                    fill: 'var(--yellow-600)',
                    fontSize: 11,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="var(--primary-color)"
                  strokeWidth={2}
                  dot={{ fill: 'var(--primary-color)', r: 3 }}
                  activeDot={{ r: 5, fill: 'var(--primary-color)' }}
                  animationDuration={600}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-color-secondary py-4 text-center">{t('monitoring.chart.noData')}</div>
        )}
      </Card>

      {/* ── EPS Summary Cards (한 줄 4열) ── */}
      {chartStats && (
        <div className="grid mb-3">
          <div className="col-12 md:col-6 xl:col-3">
            <Card className="admin-card admin-stat-card" style={{ minHeight: '70px' }}>
              <span className="text-color-secondary text-sm">{t('monitoring.chart.currentEps')}</span>
              <div className="flex align-items-center justify-content-between mt-1">
                <span className="text-2xl font-bold" style={{ color: 'var(--primary-color)' }}>{chartStats.current.toFixed(1)}</span>
                <Tag value="EPS" severity="info" rounded />
              </div>
            </Card>
          </div>
          <div className="col-12 md:col-6 xl:col-3">
            <Card className="admin-card admin-stat-card" style={{ minHeight: '70px' }}>
              <span className="text-color-secondary text-sm">{t('monitoring.chart.avgEps')}</span>
              <div className="flex align-items-center justify-content-between mt-1">
                <span className="text-2xl font-bold" style={{ color: 'var(--yellow-600)' }}>{chartStats.avg.toFixed(1)}</span>
                <Tag value="EPS" severity="warning" rounded />
              </div>
            </Card>
          </div>
          <div className="col-12 md:col-6 xl:col-3">
            <Card className="admin-card admin-stat-card" style={{ minHeight: '70px' }}>
              <span className="text-color-secondary text-sm">{t('monitoring.chart.minEps')}</span>
              <div className="flex align-items-center justify-content-between mt-1">
                <span className="text-2xl font-bold" style={{ color: 'var(--green-600)' }}>{chartStats.min.toFixed(1)}</span>
                <Tag value="EPS" severity="success" rounded />
              </div>
            </Card>
          </div>
          <div className="col-12 md:col-6 xl:col-3">
            <Card className="admin-card admin-stat-card" style={{ minHeight: '70px' }}>
              <span className="text-color-secondary text-sm">{t('monitoring.chart.maxEps')}</span>
              <div className="flex align-items-center justify-content-between mt-1">
                <span className="text-2xl font-bold" style={{ color: 'var(--red-500)' }}>{chartStats.max.toFixed(1)}</span>
                <Tag value="EPS" severity="danger" rounded />
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ── Events table (DataIsolation style: toolbar + table) ── */}
      <div className="admin-table-shell">
        <div className="admin-table-toolbar">
          <div className="tenants-toolbar-left">
            <span className="text-sm font-semibold text-color-secondary">{t('monitoring.table.title')}</span>
          </div>
          <small className="text-color-secondary">
            {overview.engineCheckedAt && formatDateTimeSeconds(overview.engineCheckedAt) && (
              <span>{t('monitoring.engine.checkedAt', { checkedAt: formatDateTimeSeconds(overview.engineCheckedAt) })}</span>
            )}
          </small>
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
          emptyMessage={
            !loading ? (
              <div className="p-3 text-center">
                <i className="pi pi-database text-2xl text-color-secondary mb-2" style={{ display: 'block' }} />
                <span className="text-color-secondary text-sm">{t('monitoring.table.emptyClickHouse')}</span>
              </div>
            ) : undefined
          }
          onPage={(e) => {
            const np = Math.floor((e.first ?? 0) / (e.rows ?? 10)) + 1;
            void loadMonitoring(np, e.rows ?? 10);
          }}
        >
          <Column field="occurredAt" header={t('monitoring.table.occurredAt')} body={(r: MonitoringEventRow) => formatDateTimeSeconds(r.occurredAt)} />
          <Column field="tenantLabel" header={t('monitoring.table.tenant')} />
          <Column field="severity" header={t('monitoring.table.severity')} />
          <Column field="code" header={t('monitoring.table.logType')} />
          <Column field="message" header={t('monitoring.table.sourceInfo')} />
        </CommonDataTable>
      </div>
    </div>
  );
};

export default MonitoringSystemPage;
