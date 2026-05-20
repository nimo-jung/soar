import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
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

const MonitoringPage: React.FC = () => {
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
  const [tenantOptions, setTenantOptions] = useState<Array<{ label: string; value: number }>>([]);
  const [overview, setOverview] = useState<MonitoringOverviewResponse>({
    epsSeries: [],
    ingestErrorRate: 0,
    parseErrorRate: 0,
    avgIngestLatencyMs: 0,
    engineHealthy: false,
    engineCheckedAt: null,
  });

  const chartPolyline = React.useMemo(() => {
    if (overview.epsSeries.length < 2) {
      return '';
    }

    const width = 720;
    const height = 180;
    const padding = 20;
    const values = overview.epsSeries.map((item) => item.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    return overview.epsSeries
      .map((point, index) => {
        const x = padding + (index / (overview.epsSeries.length - 1)) * (width - padding * 2);
        const y = height - padding - ((point.value - min) / range) * (height - padding * 2);
        return `${x},${y}`;
      })
      .join(' ');
  }, [overview.epsSeries]);

  const chartPoints = React.useMemo(() => {
    if (overview.epsSeries.length < 2) {
      return [] as Array<{ x: number; y: number; label: string }>;
    }

    const width = 720;
    const height = 180;
    const padding = 20;
    const values = overview.epsSeries.map((item) => item.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    return overview.epsSeries.map((point, index) => {
      const x = padding + (index / (overview.epsSeries.length - 1)) * (width - padding * 2);
      const y = height - padding - ((point.value - min) / range) * (height - padding * 2);
      return {
        x,
        y,
        label: `${formatDateTimeSeconds(point.ts)} / EPS ${point.value.toFixed(2)}`,
      };
    });
  }, [overview.epsSeries]);

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

  const loadMonitoring = async (nextPage = page, nextLimit = limit) => {
    setLoading(true);
    try {
      const params = {
        tenantId: tenantId ?? undefined,
        severity: severity || undefined,
        from: from ? `${from} 00:00:00` : undefined,
        to: to ? `${to} 23:59:59` : undefined,
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
    void loadMonitoring(1, limit);
  }, [tenantId, severity, from, to]);

  return (
    <div className="p-4">
      <div className="page-header">
        <h1>{t('monitoring.title')}</h1>
        <Button
          type="button"
          icon="pi pi-refresh"
          label={t('monitoring.actions.refresh')}
          outlined
          onClick={() => {
            void loadMonitoring(1, limit);
          }}
        />
      </div>

      <Card className="mb-3">
        <div className="grid">
          <div className="col-12 md:col-3">
            <label className="block mb-2 text-sm">{t('monitoring.filters.tenant')}</label>
            <Dropdown
              value={tenantId}
              options={[{ label: t('monitoring.filters.allTenants'), value: null }, ...tenantOptions]}
              onChange={(e) => setTenantId(e.value as number | null)}
              className="w-full"
            />
          </div>
          <div className="col-12 md:col-3">
            <label className="block mb-2 text-sm">{t('monitoring.filters.severity')}</label>
            <Dropdown
              value={severity}
              options={severityOptions}
              onChange={(e) => setSeverity(String(e.value ?? ''))}
              className="w-full"
            />
          </div>
          <div className="col-12 md:col-3">
            <label className="block mb-2 text-sm">{t('monitoring.filters.from')}</label>
            <InputText type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full" />
          </div>
          <div className="col-12 md:col-3">
            <label className="block mb-2 text-sm">{t('monitoring.filters.to')}</label>
            <InputText type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full" />
          </div>
        </div>
      </Card>

      <div className="grid mb-3">
        <div className="col-12 md:col-3">
          <Card title={t('monitoring.cards.ingestErrorRate')}>
            <span>{overview.ingestErrorRate.toFixed(2)}%</span>
          </Card>
        </div>
        <div className="col-12 md:col-3">
          <Card title={t('monitoring.cards.parseErrorRate')}>
            <span>{overview.parseErrorRate.toFixed(2)}%</span>
          </Card>
        </div>
        <div className="col-12 md:col-3">
          <Card title={t('monitoring.cards.avgIngestLatencyMs')}>
            <span>{overview.avgIngestLatencyMs.toFixed(2)} ms</span>
          </Card>
        </div>
        <div className="col-12 md:col-3">
          <Card title={t('monitoring.cards.eventCount')}>
            <span>{total}</span>
          </Card>
        </div>
        <div className="col-12 md:col-3">
          <Card title={t('monitoring.cards.engineHealth')}>
            <div className="flex flex-column gap-1">
              <span>{overview.engineHealthy ? t('monitoring.engine.healthy') : t('monitoring.engine.unhealthy')}</span>
              <small className="text-color-secondary">
                {overview.engineCheckedAt
                  ? t('monitoring.engine.checkedAt', { checkedAt: formatDateTimeSeconds(overview.engineCheckedAt) })
                  : '-'}
              </small>
            </div>
          </Card>
        </div>
      </div>

      <Card title={t('monitoring.chart.epsTitle')} className="mb-3">
        {chartPolyline ? (
          <div className="flex flex-column gap-2">
            <svg viewBox="0 0 720 180" role="img" aria-label={t('monitoring.chart.epsTitle')} style={{ width: '100%' }}>
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

      <Card title={t('monitoring.table.title')}>
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
            void loadMonitoring(nextPage, nextLimit);
          }}
        >
          <Column field="occurredAt" header={t('monitoring.table.occurredAt')} body={(row: MonitoringEventRow) => formatDateTimeSeconds(row.occurredAt)} />
          <Column field="tenantLabel" header={t('monitoring.table.tenant')} />
          <Column field="severity" header={t('monitoring.table.severity')} />
          <Column field="code" header={t('monitoring.table.code')} />
          <Column field="message" header={t('monitoring.table.message')} />
        </CommonDataTable>
      </Card>
    </div>
  );
};

export default MonitoringPage;
