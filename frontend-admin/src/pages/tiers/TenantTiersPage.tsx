import React, { useEffect, useMemo, useState } from 'react';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { InputSwitch } from 'primereact/inputswitch';
import { SelectButton } from 'primereact/selectbutton';
import { Tag } from 'primereact/tag';
import { useTranslation } from 'react-i18next';
import api from '../../api';
import CommonDataTable from '../../components/CommonDataTable';

type TierCode = 'LITE' | 'PREMIUM' | 'ENTERPRISE';

interface TenantTier {
  id: number;
  code: TierCode;
  name: string;
  dailyLogQuotaGb: number;
  maxUsers: number;
  description: string | null;
  isActive: boolean;
}

type TierFormErrors = {
  code?: string;
  name?: string;
  dailyLogQuotaGb?: string;
  maxUsers?: string;
  description?: string;
};

const TenantTiersPage: React.FC = () => {
  const { t } = useTranslation();
  const [tiers, setTiers] = useState<TenantTier[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [editingTier, setEditingTier] = useState<TenantTier | null>(null);
  const [formErrors, setFormErrors] = useState<TierFormErrors>({});
  const [resultDialog, setResultDialog] = useState({
    visible: false,
    success: false,
    title: '',
    message: '',
  });

  const [form, setForm] = useState({
    code: 'LITE' as TierCode,
    name: 'Lite',
    dailyLogQuotaGb: 1,
    maxUsers: 1,
    description: '',
    isActive: true,
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get<TenantTier[]>('/admin/tenants/tiers');
      setTiers(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const tierCodeOptions = useMemo(
    () => [
      { label: 'Lite', value: 'LITE' as const },
      { label: t('tenants.tiers.premiumName'), value: 'PREMIUM' as const },
      { label: t('tenants.tiers.enterpriseName'), value: 'ENTERPRISE' as const },
    ],
    [t],
  );

  const renderTierCodeOption = (option: { label: string; value: TierCode }) => {
    return <span className="tenant-filter-pill">{option.label}</span>;
  };

  const showResultDialog = (success: boolean, message: string) => {
    setResultDialog({
      visible: true,
      success,
      title: success ? t('tenants.tiers.result.successTitle') : t('tenants.tiers.result.errorTitle'),
      message,
    });
  };

  const openCreateDialog = () => {
    setEditingTier(null);
    setFormErrors({});
    setForm({
      code: 'LITE',
      name: 'Lite',
      dailyLogQuotaGb: 1,
      maxUsers: 1,
      description: '',
      isActive: true,
    });
    setShowDialog(true);
  };

  const openEditDialog = (tier: TenantTier) => {
    setEditingTier(tier);
    setFormErrors({});
    setForm({
      code: tier.code,
      name: tier.name,
      dailyLogQuotaGb: tier.dailyLogQuotaGb,
      maxUsers: tier.maxUsers,
      description: tier.description ?? '',
      isActive: tier.isActive,
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    const nextErrors: TierFormErrors = {};

    if (!form.code) {
      nextErrors.code = t('tenants.tiers.validation.codeRequired');
    }
    if (!form.name.trim()) {
      nextErrors.name = t('tenants.tiers.validation.nameRequired');
    }
    if (!Number.isFinite(form.dailyLogQuotaGb) || form.dailyLogQuotaGb < 1) {
      nextErrors.dailyLogQuotaGb = t('tenants.tiers.validation.dailyLogQuotaGbRequired');
    }
    if (!Number.isFinite(form.maxUsers) || form.maxUsers < 1) {
      nextErrors.maxUsers = t('tenants.tiers.validation.maxUsersRequired');
    }
    if (!form.description.trim()) {
      nextErrors.description = t('tenants.tiers.validation.descriptionRequired');
    }

    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        name: form.name.trim(),
        description: form.description.trim(),
      };

      if (editingTier) {
        await api.patch(`/admin/tenants/tiers/${editingTier.id}`, payload);
      } else {
        await api.post('/admin/tenants/tiers', payload);
      }

      setShowDialog(false);
      await load();
      showResultDialog(true, t('tenants.tiers.result.saveSuccess'));
    } catch (error: any) {
      const responseMessage = error?.response?.data?.message;
      const message = Array.isArray(responseMessage)
        ? responseMessage.join(', ')
        : responseMessage || t('tenants.tiers.result.saveFailed');
      showResultDialog(false, String(message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="tenants-page">
      <div className="page-header">
        <div></div>
        <Button
          label={t('tenants.tiers.createBtn')}
          icon="pi pi-plus"
          onClick={openCreateDialog}
          rounded
          size="small"
        />
      </div>

      <div className="tenants-table-card">
        <CommonDataTable
          value={tiers}
          loading={loading}
          paginator
          rows={10}
          rowsPerPageOptions={[10, 20, 50]}
          className="admin-tenants-table"
        >
          <Column field="code" header={t('tenants.tiers.code')} style={{ width: '10rem' }} />
          <Column field="name" header={t('tenants.tiers.name')} style={{ minWidth: '10rem' }} />
          <Column field="dailyLogQuotaGb" header={t('tenants.tiers.dailyLogQuotaGb')} style={{ width: '12rem' }} />
          <Column field="maxUsers" header={t('tenants.tiers.maxUsers')} style={{ width: '9rem' }} />
          <Column field="description" header={t('tenants.tiers.description')} style={{ minWidth: '18rem' }} />
          <Column
            field="isActive"
            header={t('common.status')}
            style={{ width: '8rem' }}
            body={(row: TenantTier) => (
              <Tag
                value={row.isActive ? t('common.active') : t('common.inactive')}
                severity={row.isActive ? 'success' : 'secondary'}
              />
            )}
          />
          <Column
            header={t('common.actions')}
            style={{ width: '7rem' }}
            body={(row: TenantTier) => (
              <Button
                type="button"
                icon="pi pi-pencil"
                text
                rounded
                size="small"
                aria-label={t('common.save')}
                onClick={() => openEditDialog(row)}
              />
            )}
          />
        </CommonDataTable>
      </div>

      <Dialog
        header={editingTier ? t('tenants.tiers.editDialogTitle') : t('tenants.tiers.createBtn')}
        visible={showDialog}
        style={{ width: '520px' }}
        className="tiers-dialog"
        onHide={() => setShowDialog(false)}
      >
        <div className="flex flex-column gap-3 pt-2">
          <div>
            <label className="block mb-1 text-sm">
              {t('tenants.tiers.code')}
              <span className="p-error ml-1">*</span>
            </label>
            <SelectButton
              value={form.code}
              options={tierCodeOptions}
              optionLabel="label"
              optionValue="value"
              className="tenants-status-select tiers-code-select"
              itemTemplate={renderTierCodeOption}
              disabled={!!editingTier}
              onChange={(e) => {
                setForm({ ...form, code: e.value as TierCode });
                if (formErrors.code) {
                  setFormErrors({ ...formErrors, code: undefined });
                }
              }}
            />
            {formErrors.code && <small className="p-error">{formErrors.code}</small>}
          </div>
          <div>
            <label className="block mb-1 text-sm">
              {t('tenants.tiers.name')}
              <span className="p-error ml-1">*</span>
            </label>
            <InputText
              value={form.name}
              onChange={(e) => {
                setForm({ ...form, name: e.target.value });
                if (formErrors.name) {
                  setFormErrors({ ...formErrors, name: undefined });
                }
              }}
              className="w-full tenants-search-input p-inputtext-sm"
            />
            {formErrors.name && <small className="p-error">{formErrors.name}</small>}
          </div>
            <div className="flex gap-1">
            <div>
                <label className="block mb-1 text-sm">
                  {t('tenants.tiers.dailyLogQuotaGb')}
                  <span className="p-error ml-1">*</span>
                </label>
                <InputNumber
                value={form.dailyLogQuotaGb}
                onValueChange={(e) => {
                  setForm({ ...form, dailyLogQuotaGb: e.value ?? 0 });
                  if (formErrors.dailyLogQuotaGb) {
                    setFormErrors({ ...formErrors, dailyLogQuotaGb: undefined });
                  }
                }}
                className="w-full"
                inputClassName="w-full p-inputtext-sm"
                useGrouping={false}
                min={1}
                max={10240}
                showButtons 
                />
                {formErrors.dailyLogQuotaGb && <small className="p-error">{formErrors.dailyLogQuotaGb}</small>}
            </div>
            <div>
                <label className="block mb-1 text-sm">
                  {t('tenants.tiers.maxUsers')}
                  <span className="p-error ml-1">*</span>
                </label>
                <InputNumber
                value={form.maxUsers}
                onValueChange={(e) => {
                  setForm({ ...form, maxUsers: e.value ?? 0 });
                  if (formErrors.maxUsers) {
                    setFormErrors({ ...formErrors, maxUsers: undefined });
                  }
                }}
                className="w-full"
                inputClassName="w-full p-inputtext-sm"
                useGrouping={false}
                min={1}
                max={100}
                showButtons
                />
                {formErrors.maxUsers && <small className="p-error">{formErrors.maxUsers}</small>}
            </div>
            </div>        
          <div>
            <label className="block mb-1 text-sm">
              {t('tenants.tiers.description')}
              <span className="p-error ml-1">*</span>
            </label>
            <InputText
              value={form.description}
              onChange={(e) => {
                setForm({ ...form, description: e.target.value });
                if (formErrors.description) {
                  setFormErrors({ ...formErrors, description: undefined });
                }
              }}
              className="w-full tenants-search-input p-inputtext-sm"
            />
            {formErrors.description && <small className="p-error">{formErrors.description}</small>}
          </div>
          <div className="flex align-items-center gap-2">
            <InputSwitch
              className="tiers-switch-sm"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: Boolean(e.value) })}
            />
            <span>{form.isActive ? t('common.active') : t('common.inactive')}</span>
          </div>
          <div className="flex gap-1 justify-between">
            <div className="flex gap-1">

            </div>
            <div className="flex gap-1 flex-1 flex-row-reverse">
                <Button label={t('common.save')} loading={saving} onClick={handleSave} size="small" />
            </div>
          </div>
        </div>
      </Dialog>

      <Dialog
        header={resultDialog.title}
        visible={resultDialog.visible}
        style={{ width: '420px' }}
        className="tiers-result-dialog"
        onHide={() => setResultDialog((prev) => ({ ...prev, visible: false }))}
      >
        <div className="flex flex-column gap-3">
          <div className="flex align-items-start gap-2">
            <i
              className={`pi ${resultDialog.success ? 'pi-check-circle text-green-400' : 'pi-exclamation-triangle text-orange-400'}`}
              style={{ fontSize: '1.15rem', marginTop: '0.1rem' }}
            />
            <span>{resultDialog.message}</span>
          </div>
          <div className="flex justify-content-end">
            <Button
              label={t('tenants.tiers.result.ok')}
              size="small"
              severity={resultDialog.success ? 'success' : 'secondary'}
              onClick={() => setResultDialog((prev) => ({ ...prev, visible: false }))}
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default TenantTiersPage;
