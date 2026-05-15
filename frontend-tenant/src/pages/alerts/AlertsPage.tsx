import React, { useEffect, useState } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
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
      <h1 className="text-2xl font-bold mb-4">알람 목록</h1>
      <DataTable value={alerts} loading={loading} paginator rows={20} className="p-datatable-sm">
        <Column field="id" header="ID" style={{ width: '60px' }} />
        <Column field="title" header="제목" />
        <Column
          field="severity"
          header="위험도"
          body={(row: Alert) => <Tag value={row.severity} severity={severitySeverity(row.severity) as any} />}
        />
        <Column field="status" header="상태" />
        <Column field="sourceIp" header="출발지 IP" />
        <Column
          field="createdAt"
          header="발생일시"
          body={(row: Alert) => new Date(row.createdAt).toLocaleString('ko-KR')}
        />
      </DataTable>
    </div>
  );
};

export default AlertsPage;
