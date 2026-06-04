import React, { useEffect, useState } from 'react';
import { Column } from 'primereact/column';
import { Button } from '@/components/TenantButton';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { useTranslation } from 'react-i18next';
import api from '../../api';
import CommonDataTable from '../../components/CommonDataTable';
import { formatDateOnly } from '../../utils/date';

interface Collector {
  id: number;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: string;
}

const CollectorsPage: React.FC = () => {
  const { t } = useTranslation();
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
    <div className="tenant-page">
      <div className="tenant-page-header">
        <h1>{t('collectors.title')}</h1>
        <Button className="tenant-primary-action" label={t('collectors.registerBtn')} icon="pi pi-plus" onClick={() => setShowCreate(true)} />
      </div>

      {newKey && (
        <Message
          severity="warn"
          className="mb-4 w-full"
          content={
            <div>
              <p className="font-bold">{t('collectors.apiKeyWarning')}</p>
              <code className="text-sm break-all">{newKey}</code>
              <Button buttonSize="dense" icon="pi pi-times" text onClick={() => setNewKey(null)} className="ml-2" />
            </div>
          }
        />
      )}

      <div className="tenant-table-shell">
        <CommonDataTable value={collectors} loading={loading} paginator rows={10} className="tenant-table p-datatable-sm">
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
          body={(row: Collector) => formatDateOnly(row.createdAt)}
        />
        <Column
          header={t('common.actions')}
          body={(row: Collector) => (
            <Button
              buttonSize="dense"
              label={t('collectors.table.deactivateBtn')}
              severity="danger"
              onClick={() => api.patch(`/api/collectors/${row.id}/deactivate`).then(load)}
              disabled={!row.isActive}
            />
          )}
        />
        </CommonDataTable>
      </div>

      <Dialog header={t('collectors.dialog.title')} visible={showCreate} style={{ width: '440px' }} onHide={() => setShowCreate(false)}>
        <div className="flex flex-column gap-3 pt-2">
          <div>
            <label className="tenant-form-label">{t('collectors.dialog.name')}</label>
            <InputText value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full" />
          </div>
          <div>
            <label className="tenant-form-label">{t('collectors.dialog.description')}</label>
            <InputText value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full" />
          </div>
          <Button label={t('common.register')} onClick={handleCreate} />
        </div>
      </Dialog>
    </div>
  );
};

export default CollectorsPage;
