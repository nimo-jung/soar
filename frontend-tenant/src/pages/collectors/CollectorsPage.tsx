import React, { useEffect, useState } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { useTranslation } from 'react-i18next';
import api from '../../api';

interface Collector {
  id: number;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: string;
}

const CollectorsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith('ko') ? 'ko-KR' : 'en-US';
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
        <h1 className="text-2xl font-bold">{t('collectors.title')}</h1>
        <Button label={t('collectors.registerBtn')} icon="pi pi-plus" onClick={() => setShowCreate(true)} />
      </div>

      {newKey && (
        <Message
          severity="warn"
          className="mb-4 w-full"
          content={
            <div>
              <p className="font-bold">{t('collectors.apiKeyWarning')}</p>
              <code className="text-sm break-all">{newKey}</code>
              <Button size="small" icon="pi pi-times" text onClick={() => setNewKey(null)} className="ml-2" />
            </div>
          }
        />
      )}

      <DataTable value={collectors} loading={loading} paginator rows={10} className="p-datatable-sm">
        <Column field="name" header={t('collectors.table.name')} />
        <Column field="description" header={t('collectors.table.description')} />
        <Column
          field="isActive"
          header={t('common.status')}
          body={(row: Collector) => (
            <span className={row.isActive ? 'text-green-400' : 'text-red-400'}>
              {row.isActive ? t('common.active') : t('common.inactive')}
            </span>
          )}
        />
        <Column
          field="createdAt"
          header={t('common.createdAt')}
          body={(row: Collector) => new Date(row.createdAt).toLocaleDateString(locale)}
        />
        <Column
          header={t('common.actions')}
          body={(row: Collector) => (
            <Button
              size="small"
              label={t('collectors.table.deactivateBtn')}
              severity="danger"
              onClick={() => api.patch(`/api/collectors/${row.id}/deactivate`).then(load)}
              disabled={!row.isActive}
            />
          )}
        />
      </DataTable>

      <Dialog header={t('collectors.dialog.title')} visible={showCreate} style={{ width: '440px' }} onHide={() => setShowCreate(false)}>
        <div className="flex flex-column gap-3 pt-2">
          <div>
            <label className="block mb-1 text-sm">{t('collectors.dialog.name')}</label>
            <InputText value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full" />
          </div>
          <div>
            <label className="block mb-1 text-sm">{t('collectors.dialog.description')}</label>
            <InputText value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full" />
          </div>
          <Button label={t('common.register')} onClick={handleCreate} />
        </div>
      </Dialog>
    </div>
  );
};

export default CollectorsPage;
