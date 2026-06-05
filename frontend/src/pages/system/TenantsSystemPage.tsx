import React, { useEffect, useState } from 'react';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { confirmDialog, ConfirmDialog } from 'primereact/confirmdialog';
import { useTranslation } from 'react-i18next';
import CommonDataTable from '@/components/CommonDataTable';
import { Button } from '@/components/TenantButton';
import api from '@/api';
import { formatDateTimeSeconds } from '@/utils/date';

interface Tenant {
  id: number;
  slug: string;
  name: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'DELETED';
  contactEmail: string;
  createdAt: string;
  expiresAt: string | null;
}

const statusSeverity = (status: Tenant['status']) => {
  if (status === 'ACTIVE') return 'success';
  if (status === 'SUSPENDED') return 'warning';
  return 'danger';
};

const TenantsSystemPage: React.FC = () => {
  const { t } = useTranslation();
  const [rows, setRows] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get<Tenant[]>('/admin/tenants');
      setRows(response.data);
    } catch (requestError: any) {
      const message = Array.isArray(requestError?.response?.data?.message)
        ? requestError.response.data.message.join(', ')
        : requestError?.response?.data?.message;
      setError(message || t('tenants.systemPage.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const updateStatus = async (tenant: Tenant, nextStatus: Tenant['status']) => {
    try {
      await api.patch(`/admin/tenants/${tenant.id}`, { status: nextStatus });
      await load();
    } catch (requestError: any) {
      const message = Array.isArray(requestError?.response?.data?.message)
        ? requestError.response.data.message.join(', ')
        : requestError?.response?.data?.message;
      setError(message || t('tenants.systemPage.updateFailed'));
    }
  };

  const askUpdateStatus = (tenant: Tenant, nextStatus: Tenant['status']) => {
    const actionLabel = nextStatus === 'ACTIVE'
      ? t('common.activate')
      : nextStatus === 'SUSPENDED'
        ? t('common.suspend')
        : t('tenants.actions.delete');

    confirmDialog({
      header: t('tenants.confirmStatus.header'),
      message: t('tenants.confirmStatus.message', { name: tenant.name, action: actionLabel }),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: t('common.confirm'),
      rejectLabel: t('common.cancel'),
      accept: () => {
        void updateStatus(tenant, nextStatus);
      },
    });
  };

  return (
    <div className="admin-page tenants-page">
      <ConfirmDialog />
      <div className="admin-page-header page-header">
        <div>
          <h1>{t('tenants.title')}</h1>
          <p className="admin-page-subtitle">{t('tenants.systemPage.subtitle')}</p>
        </div>
        <Button label={t('common.refresh')} icon="pi pi-refresh" onClick={() => void load()} loading={loading} />
      </div>

      {error && <Tag value={error} severity="danger" className="mb-3" />}

      <div className="admin-table-shell">
        <CommonDataTable value={rows} loading={loading} paginator rows={10} dataKey="id" responsiveLayout="scroll" className="admin-table">
          <Column field="id" header={t('tenants.table.id')} style={{ width: '6rem' }} />
          <Column field="slug" header={t('tenants.table.slug')} />
          <Column field="name" header={t('tenants.table.name')} />
          <Column
            field="status"
            header={t('common.status')}
            body={(row: Tenant) => <Tag value={row.status} severity={statusSeverity(row.status)} />}
            style={{ width: '10rem' }}
          />
          <Column field="contactEmail" header={t('tenants.table.contactEmail')} />
          <Column
            field="createdAt"
            header={t('common.createdAt')}
            body={(row: Tenant) => formatDateTimeSeconds(row.createdAt)}
            style={{ width: '12rem' }}
          />
          <Column
            header={t('common.actions')}
            style={{ width: '18rem' }}
            body={(row: Tenant) => (
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="small"
                  label={t('common.activate')}
                  severity="success"
                  disabled={row.status === 'ACTIVE'}
                  onClick={() => askUpdateStatus(row, 'ACTIVE')}
                />
                <Button
                  size="small"
                  label={t('common.suspend')}
                  severity="warning"
                  disabled={row.status === 'SUSPENDED'}
                  onClick={() => askUpdateStatus(row, 'SUSPENDED')}
                />
                <Button
                  size="small"
                  label={t('tenants.actions.delete')}
                  severity="danger"
                  disabled={row.status === 'DELETED'}
                  onClick={() => askUpdateStatus(row, 'DELETED')}
                />
              </div>
            )}
          />
        </CommonDataTable>
      </div>
    </div>
  );
};

export default TenantsSystemPage;
