import React, { useEffect, useState } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Tag } from 'primereact/tag';
import api from '../../api';

interface ThreatFeed {
  id: number;
  feedType: string;
  indicator: string;
  severity: string;
  source: string;
  isActive: boolean;
  createdAt: string;
}

const ThreatIntelPage: React.FC = () => {
  const [feeds, setFeeds] = useState<ThreatFeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ feedType: 'IP', indicator: '', severity: 'HIGH', source: '' });

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get<ThreatFeed[]>('/admin/threat-intel');
      setFeeds(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    await api.post('/admin/threat-intel', form);
    setShowCreate(false);
    load();
  };

  const handleDeactivate = async (id: number) => {
    await api.patch(`/admin/threat-intel/${id}/deactivate`);
    load();
  };

  return (
    <div className="p-4">
      <div className="flex justify-content-between align-items-center mb-4">
        <h1 className="text-2xl font-bold">글로벌 위협 인텔리전스</h1>
        <Button label="TI 등록" icon="pi pi-plus" onClick={() => setShowCreate(true)} />
      </div>

      <DataTable value={feeds} loading={loading} paginator rows={10} className="p-datatable-sm">
        <Column field="feedType" header="유형" />
        <Column field="indicator" header="지표" />
        <Column
          field="severity"
          header="위험도"
          body={(row: ThreatFeed) => (
            <Tag
              value={row.severity}
              severity={row.severity === 'CRITICAL' ? 'danger' : row.severity === 'HIGH' ? 'warning' : 'info'}
            />
          )}
        />
        <Column field="source" header="출처" />
        <Column
          header="액션"
          body={(row: ThreatFeed) => (
            <Button
              size="small"
              label="비활성화"
              severity="danger"
              onClick={() => handleDeactivate(row.id)}
              disabled={!row.isActive}
            />
          )}
        />
      </DataTable>

      <Dialog header="TI 피드 등록" visible={showCreate} style={{ width: '480px' }} onHide={() => setShowCreate(false)}>
        <div className="flex flex-column gap-3 pt-2">
          <div>
            <label className="block mb-1 text-sm">유형</label>
            <InputText value={form.feedType} onChange={(e) => setForm({ ...form, feedType: e.target.value })} className="w-full" />
          </div>
          <div>
            <label className="block mb-1 text-sm">지표</label>
            <InputText value={form.indicator} onChange={(e) => setForm({ ...form, indicator: e.target.value })} className="w-full" />
          </div>
          <div>
            <label className="block mb-1 text-sm">위험도</label>
            <InputText value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })} className="w-full" />
          </div>
          <div>
            <label className="block mb-1 text-sm">출처</label>
            <InputText value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} className="w-full" />
          </div>
          <Button label="등록" onClick={handleCreate} />
        </div>
      </Dialog>
    </div>
  );
};

export default ThreatIntelPage;
