import React, { useEffect, useState } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { useNavigate } from 'react-router-dom';
import api from '../../api';

interface Tenant {
  id: number;
  slug: string;
  name: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'DELETED';
  contactEmail: string;
  createdAt: string;
}

const statusSeverity = (status: string) => {
  if (status === 'ACTIVE') return 'success';
  if (status === 'SUSPENDED') return 'warning';
  return 'danger';
};

const TenantsPage: React.FC = () => {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ slug: '', name: '', contactEmail: '' });

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get<Tenant[]>('/admin/tenants');
      setTenants(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    await api.post('/admin/tenants', form);
    setShowCreate(false);
    setForm({ slug: '', name: '', contactEmail: '' });
    load();
  };

  const handleSuspend = async (id: number, current: string) => {
    const newStatus = current === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    await api.patch(`/admin/tenants/${id}`, { status: newStatus });
    load();
  };

  return (
    <div className="p-4">
      <div className="flex justify-content-between align-items-center mb-4">
        <h1 className="text-2xl font-bold">테넌트 관리</h1>
        <Button label="테넌트 생성" icon="pi pi-plus" onClick={() => setShowCreate(true)} />
      </div>

      <DataTable value={tenants} loading={loading} paginator rows={10} className="p-datatable-sm">
        <Column field="id" header="ID" style={{ width: '60px' }} />
        <Column field="slug" header="슬러그" />
        <Column field="name" header="고객사명" />
        <Column
          field="status"
          header="상태"
          body={(row: Tenant) => (
            <Tag value={row.status} severity={statusSeverity(row.status) as any} />
          )}
        />
        <Column field="contactEmail" header="담당자 이메일" />
        <Column
          field="createdAt"
          header="생성일"
          body={(row: Tenant) => new Date(row.createdAt).toLocaleDateString('ko-KR')}
        />
        <Column
          header="액션"
          body={(row: Tenant) => (
            <div className="flex gap-2">
              <Button
                size="small"
                label={row.status === 'ACTIVE' ? '정지' : '활성화'}
                severity={row.status === 'ACTIVE' ? 'warning' : 'success'}
                onClick={() => handleSuspend(row.id, row.status)}
              />
              <Button
                size="small"
                icon="pi pi-cog"
                severity="secondary"
                onClick={() => navigate(`/tenants/${row.id}/settings`)}
              />
            </div>
          )}
        />
      </DataTable>

      <Dialog
        header="테넌트 생성"
        visible={showCreate}
        style={{ width: '480px' }}
        onHide={() => setShowCreate(false)}
      >
        <div className="flex flex-column gap-3 pt-2">
          <div>
            <label className="block mb-1 text-sm">슬러그 (영문 소문자)</label>
            <InputText
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              className="w-full"
              placeholder="acme-corp"
            />
          </div>
          <div>
            <label className="block mb-1 text-sm">고객사명</label>
            <InputText
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full"
            />
          </div>
          <div>
            <label className="block mb-1 text-sm">담당자 이메일</label>
            <InputText
              value={form.contactEmail}
              onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
              className="w-full"
            />
          </div>
          <Button label="생성" onClick={handleCreate} />
        </div>
      </Dialog>
    </div>
  );
};

export default TenantsPage;
