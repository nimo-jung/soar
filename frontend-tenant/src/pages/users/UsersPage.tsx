import React, { useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { useTranslation } from 'react-i18next';
import api from '../../api';
import { useAuthStore } from '../../store/auth.store';
import { formatDateOnly } from '../../utils/date';
import CommonDataTable from '../../components/CommonDataTable';

type TenantRole = 'operator' | 'analyst' | 'auditor';

interface TenantUser {
  id: number;
  email: string;
  displayName: string;
  role: TenantRole;
  isActive: boolean;
  createdAt: string;
}

interface UserFormState {
  email: string;
  displayName: string;
  role: TenantRole;
  password: string;
}

const DEFAULT_FORM: UserFormState = {
  email: '',
  displayName: '',
  role: 'analyst',
  password: '',
};

const UsersPage: React.FC = () => {
  const { t } = useTranslation();
  const currentUser = useAuthStore((state) => state.user);
  const canManageUsers = currentUser?.role === 'operator';

  const [users, setUsers] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [form, setForm] = useState<UserFormState>(DEFAULT_FORM);
  const [error, setError] = useState('');

  const roleOptions = useMemo(
    () => [
      { label: t('users.roles.operator'), value: 'operator' },
      { label: t('users.roles.analyst'), value: 'analyst' },
      { label: t('users.roles.auditor'), value: 'auditor' },
    ],
    [t],
  );

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get<TenantUser[]>('/api/users');
      setUsers(response.data);
    } catch (loadError: any) {
      const message = loadError?.response?.data?.message;
      setError(Array.isArray(message) ? message.join(', ') : message || t('users.errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const openCreateDialog = () => {
    setEditingUserId(null);
    setForm(DEFAULT_FORM);
    setError('');
    setDialogVisible(true);
  };

  const openEditDialog = (user: TenantUser) => {
    setEditingUserId(user.id);
    setForm({
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      password: '',
    });
    setError('');
    setDialogVisible(true);
  };

  const saveUser = async () => {
    try {
      setError('');
      if (editingUserId === null) {
        await api.post('/api/users', form);
      } else {
        await api.patch(`/api/users/${editingUserId}`, {
          displayName: form.displayName,
          role: form.role,
          password: form.password || undefined,
        });
      }
      setDialogVisible(false);
      await loadUsers();
    } catch (saveError: any) {
      const message = saveError?.response?.data?.message;
      setError(Array.isArray(message) ? message.join(', ') : message || t('users.errors.saveFailed'));
    }
  };

  const deactivateUser = async (userId: number) => {
    try {
      setError('');
      await api.patch(`/api/users/${userId}/deactivate`);
      await loadUsers();
    } catch (deactivateError: any) {
      const message = deactivateError?.response?.data?.message;
      setError(Array.isArray(message) ? message.join(', ') : message || t('users.errors.deactivateFailed'));
    }
  };

  const isCreate = editingUserId === null;

  return (
    <div className="tenant-page">
      <div className="tenant-page-header">
        <div>
          <h1 className="tenant-page-title">{t('users.title')}</h1>
          <p className="tenant-page-subtitle">{t('users.description')}</p>
        </div>
        <Button
          className="tenant-primary-action"
          label={t('users.createBtn')}
          icon="pi pi-plus"
          onClick={openCreateDialog}
          disabled={!canManageUsers}
        />
      </div>

      {error && <Message severity="error" text={error} className="w-full mb-3" />}

      <div className="tenant-table-shell">
        <CommonDataTable value={users} loading={loading} paginator rows={10} className="tenant-table p-datatable-sm">
        <Column field="email" header={t('users.table.email')} />
        <Column field="displayName" header={t('users.table.displayName')} />
        <Column
          field="role"
          header={t('users.table.role')}
          body={(row: TenantUser) => t(`users.roles.${row.role}`)}
        />
        <Column
          field="isActive"
          header={t('common.status')}
          body={(row: TenantUser) => (row.isActive ? t('common.active') : t('common.inactive'))}
        />
        <Column
          field="createdAt"
          header={t('common.createdAt')}
          body={(row: TenantUser) => formatDateOnly(row.createdAt)}
        />
        <Column
          header={t('common.actions')}
          body={(row: TenantUser) => (
            <div className="flex gap-2">
              <Button
                size="small"
                icon="pi pi-pencil"
                label={t('users.table.editBtn')}
                onClick={() => openEditDialog(row)}
                disabled={!canManageUsers}
              />
              <Button
                size="small"
                icon="pi pi-ban"
                label={t('users.table.deactivateBtn')}
                severity="danger"
                outlined
                onClick={() => {
                  void deactivateUser(row.id);
                }}
                disabled={!canManageUsers || !row.isActive}
              />
            </div>
          )}
        />
        </CommonDataTable>
      </div>

      <Dialog
        header={isCreate ? t('users.dialog.createTitle') : t('users.dialog.editTitle')}
        visible={dialogVisible}
        style={{ width: '460px' }}
        onHide={() => setDialogVisible(false)}
      >
        <div className="flex flex-column gap-3 pt-2">
          <div>
            <label htmlFor="user-email" className="tenant-form-label">{t('users.dialog.email')}</label>
            <InputText
              id="user-email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              className="w-full"
              disabled={!isCreate}
            />
          </div>
          <div>
            <label htmlFor="user-display-name" className="tenant-form-label">{t('users.dialog.displayName')}</label>
            <InputText
              id="user-display-name"
              value={form.displayName}
              onChange={(event) => setForm((prev) => ({ ...prev, displayName: event.target.value }))}
              className="w-full"
            />
          </div>
          <div>
            <label htmlFor="user-role" className="tenant-form-label">{t('users.dialog.role')}</label>
            <Dropdown
              id="user-role"
              value={form.role}
              options={roleOptions}
              onChange={(event) => setForm((prev) => ({ ...prev, role: event.value as TenantRole }))}
              className="w-full"
            />
          </div>
          <div>
            <label htmlFor="user-password" className="tenant-form-label">
              {isCreate ? t('users.dialog.password') : t('users.dialog.newPassword')}
            </label>
            <InputText
              id="user-password"
              type="password"
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              className="w-full"
              placeholder={isCreate ? '' : t('users.dialog.newPasswordPlaceholder')}
            />
          </div>
          <Button
            label={isCreate ? t('users.dialog.createConfirm') : t('users.dialog.editConfirm')}
            onClick={() => {
              void saveUser();
            }}
            disabled={!canManageUsers}
          />
        </div>
      </Dialog>
    </div>
  );
};

export default UsersPage;
