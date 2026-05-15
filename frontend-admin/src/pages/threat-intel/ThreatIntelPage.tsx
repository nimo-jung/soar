import React, { useEffect, useState } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Tag } from 'primereact/tag';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
        <h1 className="text-2xl font-bold">{t('threatIntel.title')}</h1>
        <Button label={t('threatIntel.registerBtn')} icon="pi pi-plus" onClick={() => setShowCreate(true)} />
      </div>

      <DataTable value={feeds} loading={loading} paginator rows={10} className="p-datatable-sm">
        <Column field="feedType" header={t('threatIntel.table.type')} />
        <Column field="indicator" header={t('threatIntel.table.indicator')} />
        <Column
          field="severity"
          header={t('threatIntel.table.severity')}
          body={(row: ThreatFeed) => (
            <Tag
              value={row.severity}
              severity={row.severity === 'CRITICAL' ? 'danger' : row.severity === 'HIGH' ? 'warning' : 'info'}
            />
          )}
        />
        <Column field="source" header={t('threatIntel.table.source')} />
        <Column
          header={t('common.actions')}
          body={(row: ThreatFeed) => (
            <Button
              size="small"
              label={t('threatIntel.table.deactivateBtn')}
              severity="danger"
              onClick={() => handleDeactivate(row.id)}
              disabled={!row.isActive}
            />
          )}
        />
      </DataTable>

      <Dialog header={t('threatIntel.dialog.title')} visible={showCreate} style={{ width: '480px' }} onHide={() => setShowCreate(false)}>
        <div className="flex flex-column gap-3 pt-2">
          <div>
            <label className="block mb-1 text-sm">{t('threatIntel.dialog.type')}</label>
            <InputText value={form.feedType} onChange={(e) => setForm({ ...form, feedType: e.target.value })} className="w-full" />
          </div>
          <div>
            <label className="block mb-1 text-sm">{t('threatIntel.dialog.indicator')}</label>
            <InputText value={form.indicator} onChange={(e) => setForm({ ...form, indicator: e.target.value })} className="w-full" />
          </div>
          <div>
            <label className="block mb-1 text-sm">{t('threatIntel.dialog.severity')}</label>
            <InputText value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })} className="w-full" />
          </div>
          <div>
            <label className="block mb-1 text-sm">{t('threatIntel.dialog.source')}</label>
            <InputText value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} className="w-full" />
          </div>
          <Button label={t('common.register')} onClick={handleCreate} />
        </div>
      </Dialog>
    </div>
  );
};

export default ThreatIntelPage;
