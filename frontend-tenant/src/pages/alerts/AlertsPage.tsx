import React, { useEffect, useState } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { useTranslation } from 'react-i18next';
import api from '../../api';

interface Alert {
  id: number;
  title: string;
  severity: string;
  status: string;
  sourceIp: string;
  createdAt: string;
}

const severitySeverity = (s: string) => {
  if (s === 'CRITICAL') return 'danger';
  if (s === 'HIGH') return 'warning';
  if (s === 'MEDIUM') return 'info';
  return 'secondary';
};

const AlertsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith('ko') ? 'ko-KR' : 'en-US';
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get<Alert[]>('/api/alerts');
        setAlerts(res.data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">{t('alerts.title')}</h1>
      <DataTable value={alerts} loading={loading} paginator rows={20} className="p-datatable-sm">
        <Column field="id" header="ID" style={{ width: '60px' }} />
        <Column field="title" header={t('alerts.table.title')} />
        <Column
          field="severity"
          header={t('alerts.table.severity')}
          body={(row: Alert) => <Tag value={row.severity} severity={severitySeverity(row.severity) as any} />}
        />
        <Column field="status" header={t('common.status')} />
        <Column field="sourceIp" header={t('alerts.table.sourceIp')} />
        <Column
          field="createdAt"
          header={t('alerts.table.occurredAt')}
          body={(row: Alert) => new Date(row.createdAt).toLocaleString(locale)}
        />
      </DataTable>
    </div>
  );
};

export default AlertsPage;
