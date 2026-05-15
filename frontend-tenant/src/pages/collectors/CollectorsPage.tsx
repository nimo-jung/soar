import React, { useEffect, useState } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import api from '../../api';

interface Collector {
  id: number;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: string;
}

const CollectorsPage: React.FC = () => {
  const [collectors, setCollectors] = useState<Collector[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', description: '' });

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get<Collector[]>('/api/collectors');
      setCollectors(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    const res = await api.post<{ plainApiKey: string }>('/api/collectors', form);
    setNewKey(res.data.plainApiKey);
    setShowCreate(false);
    load();
  };

  return (
    <div className="p-4">
      <div className="flex justify-content-between align-items-center mb-4">
        <h1 className="text-2xl font-bold">Collector 관리</h1>
        <Button label="Collector 등록" icon="pi pi-plus" onClick={() => setShowCreate(true)} />
      </div>

      {newKey && (
        <Message
          severity="warn"
          className="mb-4 w-full"
          content={
            <div>
              <p className="font-bold">API Key (단 1회만 표시됩니다. 반드시 저장하세요!)</p>
              <code className="text-sm break-all">{newKey}</code>
              <Button size="small" icon="pi pi-times" text onClick={() => setNewKey(null)} className="ml-2" />
            </div>
          }
        />
      )}

      <DataTable value={collectors} loading={loading} paginator rows={10} className="p-datatable-sm">
        <Column field="name" header="이름" />
        <Column field="description" header="설명" />
        <Column
          field="isActive"
          header="상태"
          body={(row: Collector) => (
            <span className={row.isActive ? 'text-green-400' : 'text-red-400'}>
              {row.isActive ? '활성' : '비활성'}
            </span>
          )}
        />
        <Column
          field="createdAt"
          header="등록일"
          body={(row: Collector) => new Date(row.createdAt).toLocaleDateString('ko-KR')}
        />
        <Column
          header="액션"
          body={(row: Collector) => (
            <Button
              size="small"
              label="비활성화"
              severity="danger"
              onClick={() => api.patch(`/api/collectors/${row.id}/deactivate`).then(load)}
              disabled={!row.isActive}
            />
          )}
        />
      </DataTable>

      <Dialog header="Collector 등록" visible={showCreate} style={{ width: '440px' }} onHide={() => setShowCreate(false)}>
        <div className="flex flex-column gap-3 pt-2">
          <div>
            <label className="block mb-1 text-sm">이름</label>
            <InputText value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full" />
          </div>
          <div>
            <label className="block mb-1 text-sm">설명</label>
            <InputText value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full" />
          </div>
          <Button label="등록" onClick={handleCreate} />
        </div>
      </Dialog>
    </div>
  );
};

export default CollectorsPage;
