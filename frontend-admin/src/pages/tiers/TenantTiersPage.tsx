import React, { useEffect, useMemo, useState } from 'react';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { InputSwitch } from 'primereact/inputswitch';
import { SelectButton } from 'primereact/selectbutton';
import { Tag } from 'primereact/tag';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { OverlayPanel } from 'primereact/overlaypanel';
import { Checkbox } from 'primereact/checkbox';
import { useTranslation } from 'react-i18next';
import api from '../../api';
import CommonDataTable from '../../components/CommonDataTable';

type TierCode = 'LITE' | 'PREMIUM' | 'ENTERPRISE';
type TierCodeFilter = 'ALL' | TierCode;

interface TenantTier {
  id: number;
  code: TierCode;
  name: string;
  dailyLogQuotaGb: number;
  maxUsers: number;
  description: string | null;
  isActive: boolean;
}

interface TierDeletionCheckResponse {
  canDelete: boolean;
  usageCount: number;
  reason: string | null;
}

type TierFormErrors = {
  code?: string;
  name?: string;
  dailyLogQuotaGb?: string;
  maxUsers?: string;
  description?: string;
};

type TierVisibleField =
  | 'code'
  | 'name'
  | 'dailyLogQuotaGb'
  | 'maxUsers'
  | 'description'
  | 'isActive';

const tierFieldOrder: TierVisibleField[] = [
  'code',
  'name',
  'dailyLogQuotaGb',
  'maxUsers',
  'description',
  'isActive',
];

const TenantTiersPage: React.FC = () => {
  const { t } = useTranslation();
  const fieldPanelRef = React.useRef<OverlayPanel | null>(null);
  const [tiers, setTiers] = useState<TenantTier[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [editingTier, setEditingTier] = useState<TenantTier | null>(null);
  const [checkingDeleteTierId, setCheckingDeleteTierId] = useState<number | null>(null);
  const [deletingTierId, setDeletingTierId] = useState<number | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [codeFilter, setCodeFilter] = useState<TierCodeFilter>('ALL');
  const [visibleFields, setVisibleFields] = useState<TierVisibleField[]>(tierFieldOrder);
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

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput);
    }, 700);

    return () => {
      window.clearTimeout(timer);
    };
  }, [searchInput]);

  const tierCodeLabelMap = useMemo(
    () => ({
      LITE: t('tenants.tiers.liteName'),
      PREMIUM: t('tenants.tiers.premiumName'),
      ENTERPRISE: t('tenants.tiers.enterpriseName'),
    }),
    [t],
  );

  const getTierCodeLabel = (code: TierCode) => tierCodeLabelMap[code] ?? code;

  const tierCodeOptions = useMemo(
    () => [
      { label: getTierCodeLabel('LITE'), value: 'LITE' as const },
      { label: getTierCodeLabel('PREMIUM'), value: 'PREMIUM' as const },
      { label: getTierCodeLabel('ENTERPRISE'), value: 'ENTERPRISE' as const },
    ],
    [getTierCodeLabel],
  );

  const codeFilterOptions = useMemo(
    () => [
      { label: t('tenants.filters.all'), value: 'ALL' as const },
      ...tierCodeOptions,
    ],
    [t, tierCodeOptions],
  );

  const renderTierCodeOption = (option: { label: string; value: TierCode }) => {
    return <span className="tenant-filter-pill">{option.label}</span>;
  };

  const renderTierFilterOption = (option: { label: string; value: TierCodeFilter }) => {
    return <span className={`tenant-filter-pill tenant-filter-pill-${option.value.toLowerCase()}`}>{option.label}</span>;
  };

  const fieldOptions = useMemo(
    () => [
      { label: t('tenants.tiers.code'), value: 'code' as const },
      { label: t('tenants.tiers.name'), value: 'name' as const },
      { label: t('tenants.tiers.dailyLogQuotaGb'), value: 'dailyLogQuotaGb' as const },
      { label: t('tenants.tiers.maxUsers'), value: 'maxUsers' as const },
      { label: t('tenants.tiers.description'), value: 'description' as const },
      { label: t('common.status'), value: 'isActive' as const },
    ],
    [t],
  );

  const isFieldVisible = (field: TierVisibleField) => visibleFields.includes(field);

  const handleToggleField = (field: TierVisibleField) => {
    const exists = visibleFields.includes(field);

    if (exists) {
      if (visibleFields.length === 1) return;
      setVisibleFields(visibleFields.filter((item) => item !== field));
      return;
    }

    const next = [...visibleFields, field].sort(
      (a, b) => tierFieldOrder.indexOf(a) - tierFieldOrder.indexOf(b),
    );
    setVisibleFields(next);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearch('');
  };

  const filteredTiers = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return tiers.filter((tier) => {
      const codeMatched = codeFilter === 'ALL' || tier.code === codeFilter;
      if (!codeMatched) return false;

      if (!keyword) return true;

      return [tier.name, tier.description ?? ''].some((value) =>
        value.toLowerCase().includes(keyword),
      );
    });
  }, [tiers, codeFilter, search]);

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
      name: t('tenants.tiers.liteName'),
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

  const handleDeleteTier = async (tier: TenantTier) => {
    setCheckingDeleteTierId(tier.id);
    try {
      const checkRes = await api.get<TierDeletionCheckResponse>(`/admin/tenants/tiers/${tier.id}/deletion-check`);
      if (!checkRes.data.canDelete) {
        showResultDialog(
          false,
          checkRes.data.reason || t('tenants.tiers.delete.inUseReason', { count: checkRes.data.usageCount }),
        );
        return;
      }

      confirmDialog({
        header: t('tenants.tiers.delete.confirmTitle'),
        icon: 'pi pi-exclamation-triangle',
        acceptClassName: 'p-button-danger',
        acceptLabel: t('tenants.tiers.delete.confirmAccept'),
        rejectLabel: t('common.cancel'),
        message: (
          <div className="flex flex-column gap-2">
            <div>{t('tenants.tiers.delete.confirmCode', { code: getTierCodeLabel(tier.code) })}</div>
            <div>{t('tenants.tiers.delete.confirmName', { name: tier.name })}</div>
            <div className="text-sm text-color-secondary">{t('tenants.tiers.delete.blockedRuleMessage')}</div>
          </div>
        ),
        accept: async () => {
          setDeletingTierId(tier.id);
          try {
            await api.delete(`/admin/tenants/tiers/${tier.id}`);
            await load();
            showResultDialog(true, t('tenants.tiers.result.deleteSuccess'));
          } catch (error: any) {
            const responseMessage = error?.response?.data?.message;
            const message = Array.isArray(responseMessage)
              ? responseMessage.join(', ')
              : responseMessage || t('tenants.tiers.result.deleteFailed');
            showResultDialog(false, String(message));
          } finally {
            setDeletingTierId(null);
          }
        },
      });
    } catch (error: any) {
      const responseMessage = error?.response?.data?.message;
      const message = Array.isArray(responseMessage)
        ? responseMessage.join(', ')
        : responseMessage || t('tenants.tiers.result.deleteFailed');
      showResultDialog(false, String(message));
    } finally {
      setCheckingDeleteTierId(null);
    }
  };

  return (
    <div className="tenants-page">
      <ConfirmDialog />
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
        <div className="tenants-table-toolbar">
          <div className="tenants-toolbar-left">
            <div className="tenants-search-shell">
              <IconField iconPosition="left" className="tenants-search">
                <InputIcon className="pi pi-search" />
                <InputText
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  className="w-full tenants-search-input p-inputtext-sm"
                  placeholder={t('tenants.tiers.searchPlaceholder')}
                />
              </IconField>
              {!!searchInput && (
                <Button
                  type="button"
                  icon="pi pi-times"
                  text
                  rounded
                  severity="secondary"
                  className="tenants-search-clear"
                  aria-label={t('tenants.toolbar.clearSearch')}
                  tooltip={t('tenants.toolbar.clearSearch')}
                  tooltipOptions={{ position: 'top' }}
                  onClick={handleClearSearch}
                />
              )}
            </div>
          </div>
          <div className="tenants-quick-filters">
            <SelectButton
              value={codeFilter}
              options={codeFilterOptions}
              optionLabel="label"
              optionValue="value"
              className="tenants-status-select"
              itemTemplate={renderTierFilterOption}
              onChange={(event) => setCodeFilter(event.value as TierCodeFilter)}
            />
            <Button
              type="button"
              icon="pi pi-refresh"
              outlined
              severity="secondary"
              className="tenants-icon-button-xs"
              aria-label={t('tenants.toolbar.refresh')}
              tooltip={t('tenants.toolbar.refresh')}
              tooltipOptions={{ position: 'top' }}
              loading={loading}
              onClick={load}
            />
            <Button
              type="button"
              icon="pi pi-sliders-h"
              outlined
              severity="secondary"
              className="tenants-icon-button-xs"
              aria-label={t('tenants.toolbar.fieldSettings')}
              tooltip={t('tenants.toolbar.fieldSettings')}
              tooltipOptions={{ position: 'top' }}
              onClick={(event) => fieldPanelRef.current?.toggle(event)}
            />
            <OverlayPanel ref={fieldPanelRef} className="tenants-field-panel">
              <div className="tenants-field-panel-list">
                {fieldOptions.map((fieldOption) => (
                  <label
                    key={fieldOption.value}
                    className="tenants-field-option"
                    htmlFor={`tier-field-${fieldOption.value}`}
                  >
                    <Checkbox
                      inputId={`tier-field-${fieldOption.value}`}
                      checked={visibleFields.includes(fieldOption.value)}
                      onChange={() => handleToggleField(fieldOption.value)}
                    />
                    <span>{fieldOption.label}</span>
                  </label>
                ))}
              </div>
            </OverlayPanel>
          </div>
        </div>
        <CommonDataTable
          value={filteredTiers}
          loading={loading}
          paginator
          rows={10}
          rowsPerPageOptions={[10, 20, 50]}
          removableSort
          className="admin-tenants-table"
        >
          {isFieldVisible('code') && (
            <Column
              field="code"
              header={t('tenants.tiers.code')}
              style={{ width: '10rem' }}
              body={(row: TenantTier) => getTierCodeLabel(row.code)}
            />
          )}
          {isFieldVisible('name') && (
            <Column field="name" header={t('tenants.tiers.name')} style={{ minWidth: '10rem' }} />
          )}
          {isFieldVisible('dailyLogQuotaGb') && (
            <Column field="dailyLogQuotaGb" header={t('tenants.tiers.dailyLogQuotaGb')} style={{ width: '12rem' }} />
          )}
          {isFieldVisible('maxUsers') && (
            <Column field="maxUsers" header={t('tenants.tiers.maxUsers')} style={{ width: '9rem' }} />
          )}
          {isFieldVisible('description') && (
            <Column field="description" header={t('tenants.tiers.description')} style={{ minWidth: '18rem' }} />
          )}
          {isFieldVisible('isActive') && (
            <Column
              field="isActive"
              header={t('common.status')}
              style={{ width: '8rem' }}
              body={(row: TenantTier) => (
                <Tag
                  value={row.isActive ? t('common.active') : t('common.inactive')}
                  rounded
                  className={`tenant-status-tag ${row.isActive ? 'tenant-status-active' : 'tenant-status-inactive'}`}
                />
              )}
            />
          )}
          <Column
            header={t('common.actions')}
            style={{ width: '5.2rem' }}
            bodyClassName="text-center"
            headerClassName="text-center"
            body={(row: TenantTier) => (
              <div className="tier-action-stack">
                <Button
                  type="button"
                  icon="pi pi-pencil"
                  text
                  rounded
                  size="small"
                  aria-label={t('tenants.tiers.editDialogTitle')}
                  onClick={() => openEditDialog(row)}
                />
                <Button
                  type="button"
                  icon="pi pi-trash"
                  text
                  rounded
                  size="small"
                  severity="danger"
                  aria-label={t('tenants.actions.delete')}
                  loading={checkingDeleteTierId === row.id || deletingTierId === row.id}
                  onClick={() => {
                    void handleDeleteTier(row);
                  }}
                />
              </div>
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
