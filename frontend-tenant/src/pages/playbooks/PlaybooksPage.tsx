import React, { useEffect, useState } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import api from '../../api';

interface Playbook {
  id: number;
  name: string;
  description: string;
  status: string;
  createdAt: string;
}

const PlaybooksPage: React.FC = () => {
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', definition: '{"steps": []}' });

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get<Playbook[]>('/api/playbooks');
      setPlaybooks(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    await api.post('/api/playbooks', {
      ...form,
      definition: JSON.parse(form.definition),
    });
    setShowCreate(false);
    load();
  };

  const handleExecute = async (id: number) => {
    await api.post(`/api/playbooks/${id}/execute`);
  };

  return (
    <div className="p-4">
      <div className="flex justify-content-between align-items-center mb-4">
        <h1 className="text-2xl font-bold">플레이북</h1>
        <Button label="플레이북 생성" icon="pi pi-plus" onClick={() => setShowCreate(true)} />
      </div>

      <DataTable value={playbooks} loading={loading} paginator rows={10} className="p-datatable-sm">
        <Column field="name" header="이름" />
        <Column field="description" header="설명" />
        <Column
          field="status"
          header="상태"
          body={(row: Playbook) => (
            <Tag
              value={row.status}
              severity={row.status === 'ACTIVE' ? 'success' : row.status === 'DRAFT' ? 'info' : 'secondary'}
            />
          )}
        />
        <Column
          header="액션"
          body={(row: Playbook) => (
            <Button size="small" label="실행" icon="pi pi-play" onClick={() => handleExecute(row.id)} />
          )}
        />
      </DataTable>

      <Dialog header="플레이북 생성" visible={showCreate} style={{ width: '560px' }} onHide={() => setShowCreate(false)}>
        <div className="flex flex-column gap-3 pt-2">
          <div>
            <label className="block mb-1 text-sm">이름</label>
            <InputText value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full" />
          </div>
          <div>
            <label className="block mb-1 text-sm">설명</label>
            <InputText value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full" />
          </div>
          <div>
            <label className="block mb-1 text-sm">워크플로우 정의 (JSON)</label>
            <InputTextarea
              value={form.definition}
              onChange={(e) => setForm({ ...form, definition: e.target.value })}
              className="w-full font-mono text-sm"
              rows={6}
            />
          </div>
          <Button label="생성" onClick={handleCreate} />
        </div>
      </Dialog>
    </div>
  );
};

export default PlaybooksPage;
