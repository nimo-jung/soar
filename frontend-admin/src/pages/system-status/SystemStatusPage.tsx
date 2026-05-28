import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Tag } from 'primereact/tag';
import { ProgressBar } from 'primereact/progressbar';
import { TabView, TabPanel } from 'primereact/tabview';
import CommonDataTable from '../../components/CommonDataTable';
import api from '../../api';
import { formatDateTimeSeconds } from '../../utils/date';

type ServiceStatus = 'ONLINE' | 'OFFLINE' | 'UNKNOWN';
type AlertSeverity = 'WARN' | 'CRITICAL';
type AlertType =
  | 'CPU_HIGH' | 'MEMORY_HIGH' | 'DISK_HIGH'
  | 'DB_DOWN' | 'REDIS_DOWN' | 'CLICKHOUSE_DOWN' | 'GO_ENGINE_DOWN'
  | 'INTEGRITY_CHANGED' | 'FILE_MISSING';

type HealthStatus = {
  cpuUsagePct: number;
  memoryUsagePct: number;
  diskUsagePct: number;
  dbStatus: ServiceStatus;
  redisStatus: ServiceStatus;
  clickhouseStatus: ServiceStatus;
  goEngineStatus: ServiceStatus;
  checkedAt: string;
  hasAlert: boolean;
  activeAlerts: AlertEvent[];
};

type HealthSnapshot = {
  id: number;
  cpuUsagePct: number;
  memoryUsagePct: number;
  diskUsagePct: number;
  dbStatus: ServiceStatus;
  redisStatus: ServiceStatus;
  clickhouseStatus: ServiceStatus;
  goEngineStatus: ServiceStatus;
  hasAlert: boolean;
  checkedAt: string;
};

type AlertEvent = {
  id: number;
  alertType: AlertType;
  severity: AlertSeverity;
  message: string;
  metricValue: number | null;
  alertCount: number;
  isResolved: boolean;
  resolvedAt: string | null;
  lastAlertedAt: string | null;
  createdAt: string;
};

const SERVICE_SEVERITY_MAP: Record<ServiceStatus, 'success' | 'danger' | 'warning'> = {
  ONLINE: 'success',
  OFFLINE: 'danger',
  UNKNOWN: 'warning',
};

const ALERT_SEVERITY_MAP: Record<AlertSeverity, 'warning' | 'danger'> = {
  WARN: 'warning',
  CRITICAL: 'danger',
};

function usageColor(pct: number): string {
  if (pct >= 90) return 'var(--red-500)';
  if (pct >= 80) return 'var(--yellow-500)';
  return 'var(--green-500)';
}

const SystemStatusPage: React.FC = () => {
  const { t } = useTranslation();
  const [current, setCurrent] = useState<HealthStatus | null>(null);
  const [history, setHistory] = useState<HealthSnapshot[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [alertsTotal, setAlertsTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [alertsPage, setAlertsPage] = useState(1);
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

  const loadCurrent = useCallback(async () => {
    const res = await api.get<HealthStatus>('/admin/system-status/current');
    setCurrent(res.data);
  }, []);

  const loadHistory = useCallback(async (page = historyPage) => {
    const res = await api.get<{ items: HealthSnapshot[]; total: number }>('/admin/system-status/history', {
      params: { page, limit: 20 },
    });
    setHistory(res.data.items);
    setHistoryTotal(res.data.total);
    setHistoryPage(page);
  }, [historyPage]);

  const loadAlerts = useCallback(async (page = alertsPage) => {
    const res = await api.get<{ items: AlertEvent[]; total: number }>('/admin/system-status/alerts', {
      params: { page, limit: 20 },
    });
    setAlerts(res.data.items);
    setAlertsTotal(res.data.total);
    setAlertsPage(page);
  }, [alertsPage]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadCurrent(), loadHistory(1), loadAlerts(1)]);
    } catch (error: unknown) {
      openResultDialog(t('systemStatus.resultDialog.failedTitle'), extractApiMessage(error) || t('systemStatus.resultDialog.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [loadCurrent, loadHistory, loadAlerts, t]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const handleCheck = async () => {
    setChecking(true);
    try {
      await api.post('/admin/system-status/check');
      openResultDialog(t('systemStatus.resultDialog.successTitle'), t('systemStatus.checkDone'));
      await loadAll();
    } catch (error: unknown) {
      openResultDialog(t('systemStatus.resultDialog.failedTitle'), extractApiMessage(error) || t('systemStatus.resultDialog.checkFailed'));
    } finally {
      setChecking(false);
    }
  };

  const handleResolve = async (id: number) => {
    try {
      await api.post(`/admin/system-status/alerts/${id}/resolve`);
      openResultDialog(t('systemStatus.resultDialog.successTitle'), t('systemStatus.resultDialog.resolveSuccess'));
      void loadAlerts(alertsPage);
    } catch (error: unknown) {
      openResultDialog(t('systemStatus.resultDialog.failedTitle'), extractApiMessage(error) || t('systemStatus.resultDialog.resolveFailed'));
    }
  };

  const serviceTag = (status: ServiceStatus) => (
    <Tag value={t(`systemStatus.service.${status}`)} severity={SERVICE_SEVERITY_MAP[status]} />
  );

  return (
    <div className="admin-page">
      <Dialog
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
        <p className="m-0 line-height-3" style={{ color: 'var(--text-color, #111827)' }}>{resultDialog.message}</p>
      </Dialog>
      <div className="admin-page-header">
        <h1>{t('systemStatus.title')}</h1>
        <div className="admin-actions-row">
          <Button
            icon="pi pi-refresh"
            label={t('common.refresh')}
            outlined
            loading={loading}
            onClick={() => { void loadAll(); }}
          />
          <Button
            icon="pi pi-play"
            label={t('systemStatus.checkNow')}
            outlined
            loading={checking}
            onClick={() => { void handleCheck(); }}
          />
        </div>
      </div>

      {current && (
        <div className="grid mb-3">
          {/* 리소스 사용률 카드 */}
          <div className="col-12 md:col-4">
            <Card title="CPU" className="admin-card admin-stat-card">
              <div className="mb-2 text-2xl font-bold" style={{ color: usageColor(current.cpuUsagePct) }}>
                {current.cpuUsagePct.toFixed(1)}%
              </div>
              <ProgressBar value={current.cpuUsagePct} showValue={false} style={{ height: '8px' }} />
            </Card>
          </div>
          <div className="col-12 md:col-4">
            <Card title={t('systemStatus.memory')} className="admin-card admin-stat-card">
              <div className="mb-2 text-2xl font-bold" style={{ color: usageColor(current.memoryUsagePct) }}>
                {current.memoryUsagePct.toFixed(1)}%
              </div>
              <ProgressBar value={current.memoryUsagePct} showValue={false} style={{ height: '8px' }} />
            </Card>
          </div>
          <div className="col-12 md:col-4">
            <Card title={t('systemStatus.disk')} className="admin-card admin-stat-card">
              <div className="mb-2 text-2xl font-bold" style={{ color: usageColor(current.diskUsagePct) }}>
                {current.diskUsagePct.toFixed(1)}%
              </div>
              <ProgressBar value={current.diskUsagePct} showValue={false} style={{ height: '8px' }} />
            </Card>
          </div>

          {/* 서비스 상태 카드 */}
          <div className="col-12">
            <Card title={t('systemStatus.services')} className="admin-card">
              <div className="flex flex-wrap gap-3">
                <div className="flex align-items-center gap-2">
                  <span className="font-semibold">MariaDB</span>
                  {serviceTag(current.dbStatus)}
                </div>
                <div className="flex align-items-center gap-2">
                  <span className="font-semibold">Redis</span>
                  {serviceTag(current.redisStatus)}
                </div>
                <div className="flex align-items-center gap-2">
                  <span className="font-semibold">ClickHouse</span>
                  {serviceTag(current.clickhouseStatus)}
                </div>
                <div className="flex align-items-center gap-2">
                  <span className="font-semibold">Go Engine</span>
                  {serviceTag(current.goEngineStatus)}
                </div>
              </div>
              <small className="block mt-3 text-color-secondary">
                {t('systemStatus.checkedAt', { at: formatDateTimeSeconds(current.checkedAt) })}
              </small>
            </Card>
          </div>
        </div>
      )}

      <TabView>
        <TabPanel header={t('systemStatus.tabs.alerts')}>
          <CommonDataTable
            value={alerts}
            loading={loading}
            paginator
            first={(alertsPage - 1) * 20}
            rows={20}
            totalRecords={alertsTotal}
            className="admin-table"
            onPage={(e) => { void loadAlerts(Math.floor((e.first ?? 0) / 20) + 1); }}
          >
            <Column
              field="severity"
              header={t('systemStatus.alert.severity')}
              body={(row: AlertEvent) => (
                <Tag value={row.severity} severity={ALERT_SEVERITY_MAP[row.severity]} />
              )}
            />
            <Column field="alertType" header={t('systemStatus.alert.type')} />
            <Column field="message" header={t('systemStatus.alert.message')} />
            <Column field="alertCount" header={t('systemStatus.alert.count')} style={{ width: '80px' }} />
            <Column
              field="isResolved"
              header={t('systemStatus.alert.resolved')}
              body={(row: AlertEvent) => (
                <Tag
                  value={row.isResolved ? t('common.inactive') : t('common.active')}
                  severity={row.isResolved ? 'success' : 'danger'}
                />
              )}
            />
            <Column
              field="createdAt"
              header={t('common.createdAt')}
              body={(row: AlertEvent) => formatDateTimeSeconds(row.createdAt)}
            />
            <Column
              header={t('common.actions')}
              body={(row: AlertEvent) =>
                !row.isResolved ? (
                  <Button
                    size="small"
                    label={t('systemStatus.alert.resolveBtn')}
                    outlined
                    onClick={() => { void handleResolve(row.id); }}
                  />
                ) : null
              }
            />
          </CommonDataTable>
        </TabPanel>

        <TabPanel header={t('systemStatus.tabs.history')}>
          <CommonDataTable
            value={history}
            loading={loading}
            paginator
            first={(historyPage - 1) * 20}
            rows={20}
            totalRecords={historyTotal}
            className="admin-table"
            onPage={(e) => { void loadHistory(Math.floor((e.first ?? 0) / 20) + 1); }}
          >
            <Column
              field="checkedAt"
              header={t('systemStatus.history.checkedAt')}
              body={(row: HealthSnapshot) => formatDateTimeSeconds(row.checkedAt)}
            />
            <Column field="cpuUsagePct" header="CPU %" body={(row: HealthSnapshot) => `${row.cpuUsagePct.toFixed(1)}%`} />
            <Column field="memoryUsagePct" header={t('systemStatus.memory') + ' %'} body={(row: HealthSnapshot) => `${row.memoryUsagePct.toFixed(1)}%`} />
            <Column field="diskUsagePct" header={t('systemStatus.disk') + ' %'} body={(row: HealthSnapshot) => `${row.diskUsagePct.toFixed(1)}%`} />
            <Column field="dbStatus" header="DB" body={(row: HealthSnapshot) => serviceTag(row.dbStatus)} />
            <Column field="redisStatus" header="Redis" body={(row: HealthSnapshot) => serviceTag(row.redisStatus)} />
            <Column field="clickhouseStatus" header="ClickHouse" body={(row: HealthSnapshot) => serviceTag(row.clickhouseStatus)} />
            <Column field="goEngineStatus" header="Go Engine" body={(row: HealthSnapshot) => serviceTag(row.goEngineStatus)} />
            <Column
              field="hasAlert"
              header={t('systemStatus.history.hasAlert')}
              body={(row: HealthSnapshot) =>
                row.hasAlert ? <Tag value={t('common.active')} severity="danger" /> : null
              }
            />
          </CommonDataTable>
        </TabPanel>
      </TabView>
    </div>
  );
};

export default SystemStatusPage;
