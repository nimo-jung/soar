import React, { useEffect, useMemo, useState } from 'react';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { InputSwitch } from 'primereact/inputswitch';
import { Tag } from 'primereact/tag';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { useTranslation } from 'react-i18next';
import api from '../../api';
import CommonDataTable from '../../components/CommonDataTable';
import { formatDateTimeSeconds } from '../../utils/date';

interface MasterUser {
  id: number;
  email: string;
  isActive: boolean;
  status: 'ACTIVE' | 'DELETED';
  deletedAt: string | null;
  createdAt: string;
}

type MasterUserFormErrors = {
  email?: string;
  password?: string;
};

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const isValidMasterPassword = (value: string) => {
  if (!value || /\s/.test(value)) {
    return false;
  }

  const hasLetter = /[A-Za-z]/.test(value);
  const hasNumber = /\d/.test(value);
  const hasSpecial = /[^A-Za-z0-9]/.test(value);
  const categoryCount = [hasLetter, hasNumber, hasSpecial].filter(Boolean).length;

  if (value.length >= 10 && categoryCount >= 2) {
    return true;
  }

  if (value.length >= 8 && categoryCount >= 3) {
    return true;
  }

  return false;
};

const MasterUsersPage: React.FC = () => {
  const { t } = useTranslation();
  const [users, setUsers] = useState<MasterUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<MasterUser | null>(null);
  const [formErrors, setFormErrors] = useState<MasterUserFormErrors>({});
  const [resultDialog, setResultDialog] = useState({
    visible: false,
    success: false,
    title: '',
    message: '',
  });

  const [form, setForm] = useState({
    email: '',
    password: '',
    isActive: true,
  });

  const activeUserCount = useMemo(
    () => users.filter((user) => user.status === 'ACTIVE').length,
    [users],
  );

  const canCreate = activeUserCount < 10;

  const load = async () => {
    setLoading(true);
    try {
      const response = await api.get<MasterUser[]>('/admin/master-users');
      setUsers(response.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const showResultDialog = (success: boolean, message: string) => {
    setResultDialog({
      visible: true,
      success,
      title: success ? t('masterUsers.result.successTitle') : t('masterUsers.result.errorTitle'),
      message,
    });
  };

  const openCreateDialog = () => {
    setEditingUser(null);
    setFormErrors({});
    setForm({
      email: '',
      password: '',
      isActive: true,
    });
    setShowDialog(true);
  };

  const openEditDialog = (user: MasterUser) => {
    setEditingUser(user);
    setFormErrors({});
    setForm({
      email: user.email,
      password: '',
      isActive: user.isActive,
    });
    setShowDialog(true);
  };

  const validateForm = () => {
    const nextErrors: MasterUserFormErrors = {};
    const trimmedEmail = form.email.trim();
    const trimmedPassword = form.password.trim();

    if (!trimmedEmail) {
      nextErrors.email = t('masterUsers.validation.emailRequired');
    } else if (!isValidEmail(trimmedEmail)) {
      nextErrors.email = t('masterUsers.validation.emailInvalid');
    }

    if (!editingUser && !trimmedPassword) {
      nextErrors.password = t('masterUsers.validation.passwordRequired');
    }

    if (trimmedPassword && !isValidMasterPassword(trimmedPassword)) {
      nextErrors.password = t('masterUsers.validation.passwordPolicy');
    }

    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      if (editingUser) {
        await api.patch(`/admin/master-users/${editingUser.id}`, {
          email: form.email.trim(),
          isActive: form.isActive,
          ...(form.password.trim().length > 0 ? { password: form.password.trim() } : {}),
        });
      } else {
        await api.post('/admin/master-users', {
          email: form.email.trim(),
          password: form.password.trim(),
          isActive: form.isActive,
        });
      }

      setShowDialog(false);
      await load();
      showResultDialog(true, t('masterUsers.result.saveSuccess'));
    } catch (error: any) {
      const responseMessage = error?.response?.data?.message;
      const message = Array.isArray(responseMessage)
        ? responseMessage.join(', ')
        : responseMessage || t('masterUsers.result.saveFailed');
      showResultDialog(false, String(message));
    } finally {
      setSaving(false);
    }
  };

  const handleSoftDelete = (user: MasterUser) => {
    confirmDialog({
      header: t('masterUsers.confirmDelete.header'),
      message: t('masterUsers.confirmDelete.message', { email: user.email }),
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      acceptLabel: t('masterUsers.actions.delete'),
      rejectLabel: t('common.cancel'),
      accept: async () => {
        try {
          await api.patch(`/admin/master-users/${user.id}/delete`);
          await load();
          showResultDialog(true, t('masterUsers.result.deleteSuccess'));
        } catch (error: any) {
          const responseMessage = error?.response?.data?.message;
          const message = Array.isArray(responseMessage)
            ? responseMessage.join(', ')
            : responseMessage || t('masterUsers.result.deleteFailed');
          showResultDialog(false, String(message));
        }
      },
    });
  };

  const handleRestore = (user: MasterUser) => {
    confirmDialog({
      header: t('masterUsers.confirmRestore.header'),
      message: t('masterUsers.confirmRestore.message', { email: user.email }),
      icon: 'pi pi-refresh',
      acceptClassName: 'p-button-success',
      acceptLabel: t('masterUsers.actions.restore'),
      rejectLabel: t('common.cancel'),
      accept: async () => {
        try {
          await api.patch(`/admin/master-users/${user.id}/restore`);
          await load();
          showResultDialog(true, t('masterUsers.result.restoreSuccess'));
        } catch (error: any) {
          const responseMessage = error?.response?.data?.message;
          const message = Array.isArray(responseMessage)
            ? responseMessage.join(', ')
            : responseMessage || t('masterUsers.result.restoreFailed');
          showResultDialog(false, String(message));
        }
      },
    });
  };

  return (
    <div className="admin-page tenants-page">
      <ConfirmDialog />
      <div className="admin-page-header page-header">
        <h1>{t('masterUsers.title')}</h1>
        <Button
          label={t('masterUsers.createBtn')}
          icon="pi pi-user-plus"
          onClick={openCreateDialog}
          className="admin-primary-action"
          disabled={!canCreate}
          tooltip={!canCreate ? t('masterUsers.limitReached') : undefined}
          tooltipOptions={{ position: 'left' }}
        />
      </div>

      <div className="admin-table-shell">
        <CommonDataTable
          value={users}
          loading={loading}
          paginator
          rows={10}
          rowsPerPageOptions={[10, 20, 50]}
          className="admin-table"
        >
          <Column field="id" header={t('masterUsers.table.id')} style={{ width: '6rem' }} />
          <Column field="email" header={t('masterUsers.table.email')} style={{ minWidth: '16rem' }} />
          <Column
            field="isActive"
            header={t('masterUsers.table.isActive')}
            style={{ width: '8rem' }}
            body={(row: MasterUser) => (
              <Tag
                value={row.isActive ? t('common.active') : t('common.inactive')}
                rounded
                className={`tenant-status-tag ${row.isActive ? 'tenant-status-active' : 'tenant-status-inactive'}`}
              />
            )}
          />
          <Column
            field="status"
            header={t('masterUsers.table.status')}
            style={{ width: '8rem' }}
            body={(row: MasterUser) => (
              <Tag
                value={row.status === 'ACTIVE' ? t('common.active') : t('tenants.filters.deleted')}
                rounded
                className={`tenant-status-tag ${row.status === 'ACTIVE' ? 'tenant-status-active' : 'tenant-status-inactive'}`}
              />
            )}
          />
          <Column
            field="createdAt"
            header={t('masterUsers.table.createdAt')}
            style={{ width: '15rem' }}
            body={(row: MasterUser) => formatDateTimeSeconds(row.createdAt)}
          />
          <Column
            header={t('common.actions')}
            style={{ width: '5.2rem' }}
            bodyClassName="text-center"
            headerClassName="text-center"
            body={(row: MasterUser) => (
              <div className="tier-action-stack">
                <Button
                  type="button"
                  icon="pi pi-pencil"
                  text
                  rounded
                  size="small"
                  aria-label={t('masterUsers.actions.edit')}
                  onClick={() => openEditDialog(row)}
                />
                {row.status === 'DELETED' ? (
                  <Button
                    type="button"
                    icon="pi pi-refresh"
                    text
                    rounded
                    severity="success"
                    size="small"
                    aria-label={t('masterUsers.actions.restore')}
                    onClick={() => handleRestore(row)}
                    disabled={activeUserCount >= 10}
                  />
                ) : (
                  <Button
                    type="button"
                    icon="pi pi-trash"
                    text
                    rounded
                    severity="danger"
                    size="small"
                    aria-label={t('masterUsers.actions.delete')}
                    onClick={() => handleSoftDelete(row)}
                  />
                )}
              </div>
            )}
          />
        </CommonDataTable>
      </div>

      <Dialog
        header={editingUser ? t('masterUsers.dialog.editTitle') : t('masterUsers.dialog.createTitle')}
        visible={showDialog}
        style={{ width: '520px' }}
        className="tiers-dialog"
        onHide={() => setShowDialog(false)}
      >
        <div className="flex flex-column gap-3 pt-2">
          <div>
            <label htmlFor="master-user-email" className="admin-form-label">
              {t('masterUsers.dialog.email')}
              <span className="p-error ml-1">*</span>
            </label>
            <InputText
              id="master-user-email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              className={formErrors.email ? 'p-invalid w-full tenants-search-input p-inputtext-sm' : 'w-full tenants-search-input p-inputtext-sm'}
            />
            {formErrors.email && <small className="p-error">{formErrors.email}</small>}
          </div>

          <div>
            <label htmlFor="master-user-password" className="admin-form-label">
              {t('masterUsers.dialog.password')}
              {!editingUser && <span className="p-error ml-1">*</span>}
            </label>
            <Password
              inputId="master-user-password"
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              className={formErrors.password ? 'p-invalid w-full master-user-password' : 'w-full master-user-password'}
              style={{ width: '100%' }}
              inputClassName="w-full p-inputtext-sm"
              feedback={false}
              toggleMask
              placeholder={editingUser ? t('masterUsers.dialog.passwordOptional') : undefined}
            />
            <div>
                <small className="text-color-secondary">{t('masterUsers.validation.passwordPolicy')}</small>
            </div>
            {formErrors.password && <small className="p-error">{formErrors.password}</small>}
          </div>

          <div className="flex align-items-center gap-2">
            <InputSwitch
              id="master-user-active"
              checked={form.isActive}
              onChange={(event) => setForm((prev) => ({ ...prev, isActive: Boolean(event.value) }))}
            />
            <span>{t('masterUsers.dialog.isActive')}</span>
          </div>

          <div className="flex gap-1 justify-between">
            <div className="flex gap-1">
            </div>
            <div className="flex gap-1 flex-1 flex-row-reverse">
              <Button
                label={editingUser ? t('common.save') : t('common.create')}
                loading={saving}
                size="small"
                onClick={() => {
                  void handleSave();
                }}
              />
            </div>
          </div>
        </div>
      </Dialog>

      <Dialog
        visible={resultDialog.visible}
        onHide={() => setResultDialog((prev) => ({ ...prev, visible: false }))}
        header={resultDialog.title}
        style={{ width: '30rem', maxWidth: '92vw' }}
        footer={(
          <div className="flex justify-content-end">
            <Button
              label={t('tenants.tiers.result.ok')}
              onClick={() => setResultDialog((prev) => ({ ...prev, visible: false }))}
              autoFocus
            />
          </div>
        )}
      >
        <div className="flex align-items-start gap-3">
          <i
            className={`pi ${resultDialog.success ? 'pi-check-circle text-green-500' : 'pi-times-circle text-red-500'}`}
            style={{ fontSize: '1.5rem' }}
          />
          <p className="m-0 line-height-3">{resultDialog.message}</p>
        </div>
      </Dialog>
    </div>
  );
};

export default MasterUsersPage;
