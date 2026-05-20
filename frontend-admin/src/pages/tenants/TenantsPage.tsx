import React, { useEffect, useMemo, useState } from 'react';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { Menu } from 'primereact/menu';
import type { MenuItem } from 'primereact/menuitem';
import { Dialog } from 'primereact/dialog';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { InputText } from 'primereact/inputtext';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { OverlayPanel } from 'primereact/overlaypanel';
import { Checkbox } from 'primereact/checkbox';
import { SelectButton } from 'primereact/selectbutton';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { useTranslation } from 'react-i18next';
import api from '../../api';
import CommonDataTable from '../../components/CommonDataTable';
import { formatDateTimeSeconds } from '../../utils/date';

interface TenantTier {
  id: number;
  code: string;
  name: string;
  dailyLogQuotaGb: number;
  maxUsers: number;
  description: string | null;
  isActive: boolean;
}

interface Tenant {
  id: number;
  slug: string;
  name: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'DELETED';
  contactEmail: string;
  expiresAt: string | null;
  ipCidr: string | null;
  tierId: number;
  tier?: TenantTier;
  createdAt: string;
}

type TenantFormErrors = {
  slug?: string;
  name?: string;
  contactEmail?: string;
  tierId?: string;
  expiresAt?: string;
  ipCidr?: string;
};

type TenantVisibleField =
  | 'id'
  | 'slug'
  | 'name'
  | 'status'
  | 'tier'
  | 'expiresAt'
  | 'ipCidr'
  | 'contactEmail'
  | 'createdAt';

const tenantFieldOrder: TenantVisibleField[] = [
  'id',
  'slug',
  'name',
  'status',
  'tier',
  'expiresAt',
  'ipCidr',
  'contactEmail',
  'createdAt',
];

const statusSeverity = (status: string) => {
  if (status === 'ACTIVE') return 'success';
  if (status === 'SUSPENDED') return 'warning';
  return 'danger';
};

const statusLabelKey = (status: Tenant['status']) => {
  if (status === 'ACTIVE') return 'common.active';
  if (status === 'SUSPENDED') return 'common.suspend';
  return 'tenants.filters.deleted';
};

const isValidTenantSlug = (value: string) => /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$/.test(value);

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const isValidIpv4Cidr = (value: string) => {
  const match = value.match(/^(\d{1,3}(?:\.\d{1,3}){3})\/(\d{1,2})$/);
  if (!match) return false;

  const octets = match[1].split('.').map((part) => Number(part));
  if (octets.some((octet) => Number.isNaN(octet) || octet < 0 || octet > 255)) return false;

  const prefix = Number(match[2]);
  return Number.isInteger(prefix) && prefix >= 0 && prefix <= 32;
};

const isValidIpv4 = (value: string) => {
  const match = value.match(/^(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (!match) return false;

  const octets = match[1].split('.').map((part) => Number(part));
  return !octets.some((octet) => Number.isNaN(octet) || octet < 0 || octet > 255);
};

const normalizeIpCidrList = (value: string): string[] | null => {
  const items = value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  if (items.length === 0) {
    return null;
  }

  const allValid = items.every((item) => isValidIpv4(item) || isValidIpv4Cidr(item));
  if (!allValid) {
    return null;
  }

  return items;
};

const getDefaultExpiresAt = () => {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  return date;
};

const formatTierLimit = (value: number, unit: string, unlimitedLabel: string): string => {
  if (value === 0) {
    return unlimitedLabel;
  }

  return `${value}${unit}`;
};

const TenantsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const rowMenusRef = React.useRef<Record<number, Menu | null>>({});
  const fieldPanelRef = React.useRef<OverlayPanel | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tiers, setTiers] = useState<TenantTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showTenantDialog, setShowTenantDialog] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | Tenant['status']>('ALL');
  const [visibleFields, setVisibleFields] = useState<TenantVisibleField[]>(tenantFieldOrder);
  const [formErrors, setFormErrors] = useState<TenantFormErrors>({});
  const [form, setForm] = useState({
    slug: '',
    name: '',
    contactEmail: '',
    tierId: undefined as number | undefined,
    expiresAt: getDefaultExpiresAt() as Date | null,
    ipCidr: '',
  });

  const locale = i18n.language.startsWith('ko') ? 'ko-KR' : 'en-US';
  const minSelectableDate = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [tenantRes, tierRes] = await Promise.all([
        api.get<Tenant[]>('/admin/tenants'),
        api.get<TenantTier[]>('/admin/tenants/tiers'),
      ]);
      setTenants(tenantRes.data);
      setTiers(tierRes.data);
      if (!form.tierId && tierRes.data.length > 0) {
        setForm((prev) => ({ ...prev, tierId: tierRes.data[0].id }));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput);
    }, 700);

    return () => {
      window.clearTimeout(timer);
    };
  }, [searchInput]);

  const resetCreateForm = () => {
    setForm({
      slug: '',
      name: '',
      contactEmail: '',
      tierId: tiers[0]?.id,
      expiresAt: getDefaultExpiresAt(),
      ipCidr: '',
    });
    setFormErrors({});
  };

  const openCreateDialog = () => {
    setEditingTenant(null);
    resetCreateForm();
    setShowTenantDialog(true);
  };

  const openEditDialog = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setForm({
      slug: tenant.slug,
      name: tenant.name,
      contactEmail: tenant.contactEmail ?? '',
      tierId: tenant.tierId,
      expiresAt: tenant.expiresAt ? new Date(tenant.expiresAt) : null,
      ipCidr: tenant.ipCidr ?? '',
    });
    setFormErrors({});
    setShowTenantDialog(true);
  };

  const closeTenantDialog = () => {
    setShowTenantDialog(false);
    setEditingTenant(null);
    setFormErrors({});
  };

  const validateTenantForm = () => {
    const nextErrors: TenantFormErrors = {};
    const trimmedSlug = form.slug.trim();
    const trimmedName = form.name.trim();
    const trimmedEmail = form.contactEmail.trim();
    const trimmedCidr = form.ipCidr.trim();
    const normalizedIpCidrs = normalizeIpCidrList(trimmedCidr);

    if (!trimmedSlug) {
      nextErrors.slug = t('tenants.validation.slugRequired');
    } else if (!isValidTenantSlug(trimmedSlug)) {
      nextErrors.slug = t('tenants.validation.slugInvalid');
    }

    if (!trimmedName) {
      nextErrors.name = t('tenants.validation.nameRequired');
    }

    if (!trimmedEmail) {
      nextErrors.contactEmail = t('tenants.validation.contactEmailRequired');
    } else if (!isValidEmail(trimmedEmail)) {
      nextErrors.contactEmail = t('tenants.validation.contactEmailInvalid');
    }

    if (!form.tierId) {
      nextErrors.tierId = t('tenants.validation.tierRequired');
    }

    if (!form.expiresAt) {
      nextErrors.expiresAt = t('tenants.validation.expiresAtRequired');
    } else if (Number.isNaN(form.expiresAt.getTime())) {
      nextErrors.expiresAt = t('tenants.validation.expiresAtInvalid');
    }

    if (!trimmedCidr) {
      nextErrors.ipCidr = t('tenants.validation.ipCidrRequired');
    } else if (!normalizedIpCidrs) {
      nextErrors.ipCidr = t('tenants.validation.ipCidrInvalid');
    }

    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSaveTenant = async () => {
    if (!validateTenantForm()) {
      return;
    }

    const normalizedIpCidrs = normalizeIpCidrList(form.ipCidr.trim());
    if (!normalizedIpCidrs) {
      return;
    }

    setSaving(true);
    try {
      if (editingTenant) {
        await api.patch(`/admin/tenants/${editingTenant.id}`, {
          name: form.name.trim(),
          contactEmail: form.contactEmail.trim(),
          tierId: form.tierId || undefined,
          expiresAt: form.expiresAt ? form.expiresAt.toISOString().slice(0, 10) : undefined,
          ipCidr: normalizedIpCidrs.join(','),
        });
      } else {
        await api.post('/admin/tenants', {
          slug: form.slug.trim(),
          name: form.name.trim(),
          contactEmail: form.contactEmail.trim(),
          tierId: form.tierId || undefined,
          expiresAt: form.expiresAt ? form.expiresAt.toISOString().slice(0, 10) : undefined,
          ipCidr: normalizedIpCidrs.join(','),
        });
      }

      closeTenantDialog();
      resetCreateForm();
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleSuspend = async (id: number, current: string) => {
    const newStatus = current === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    await api.patch(`/admin/tenants/${id}`, { status: newStatus });
    load();
  };

  const handleDelete = async (id: number) => {
    await api.patch(`/admin/tenants/${id}`, { status: 'DELETED' });
    load();
  };

  const handleRestore = async (id: number) => {
    await api.patch(`/admin/tenants/${id}`, { status: 'ACTIVE' });
    load();
  };

  const confirmStatusToggle = (row: Tenant) => {
    const isActive = row.status === 'ACTIVE';
    confirmDialog({
      header: t('tenants.confirmStatus.header'),
      message: t('tenants.confirmStatus.message', {
        name: row.name,
        action: isActive ? t('tenants.table.suspendBtn') : t('tenants.table.activateBtn'),
      }),
      icon: isActive ? 'pi pi-exclamation-triangle' : 'pi pi-check-circle',
      acceptClassName: isActive ? 'p-button-warning' : 'p-button-success',
      acceptLabel: isActive ? t('tenants.table.suspendBtn') : t('tenants.table.activateBtn'),
      rejectLabel: t('common.cancel'),
      accept: () => {
        handleSuspend(row.id, row.status);
      },
    });
  };

  const confirmDeleteTenant = (row: Tenant) => {
    confirmDialog({
      header: t('tenants.confirmDelete.header'),
      message: t('tenants.confirmDelete.message', { name: row.name }),
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      acceptLabel: t('tenants.actions.delete'),
      rejectLabel: t('common.cancel'),
      accept: () => {
        handleDelete(row.id);
      },
    });
  };

  const confirmRestoreTenant = (row: Tenant) => {
    confirmDialog({
      header: t('tenants.confirmRestore.header'),
      message: t('tenants.confirmRestore.message', { name: row.name }),
      icon: 'pi pi-refresh',
      acceptClassName: 'p-button-success',
      acceptLabel: t('tenants.actions.restore'),
      rejectLabel: t('common.cancel'),
      accept: () => {
        handleRestore(row.id);
      },
    });
  };

  const filteredTenants = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return tenants.filter((tenant) => {
      const statusMatched = statusFilter === 'ALL' || tenant.status === statusFilter;
      if (!statusMatched) return false;
      if (!keyword) return true;
      return [
        tenant.slug,
        tenant.name,
        tenant.contactEmail,
        tenant.ipCidr ?? '',
        tenant.tier?.name ?? String(tenant.tierId),
      ].some((value) =>
        value.toLowerCase().includes(keyword),
      );
    });
  }, [tenants, search, statusFilter]);

  const statusFilterOptions = useMemo(
    () => [
      { label: t('tenants.filters.all'), value: 'ALL' as const },
      { label: t('common.active'), value: 'ACTIVE' as const },
      { label: t('common.suspend'), value: 'SUSPENDED' as const },
      { label: t('tenants.filters.deleted'), value: 'DELETED' as const },
    ],
    [t],
  );

  const renderStatusFilterOption = (option: { label: string; value: 'ALL' | Tenant['status'] }) => {
    return (
      <span className={`tenant-filter-pill tenant-filter-pill-${option.value.toLowerCase()}`}>
        {option.label}
      </span>
    );
  };

  const fieldOptions = useMemo(
    () => [
      { label: t('tenants.table.id'), value: 'id' as const },
      { label: t('tenants.table.slug'), value: 'slug' as const },
      { label: t('tenants.table.name'), value: 'name' as const },
      { label: t('common.status'), value: 'status' as const },
      { label: t('tenants.table.tier'), value: 'tier' as const },
      { label: t('tenants.table.expiresAt'), value: 'expiresAt' as const },
      { label: t('tenants.table.ipCidr'), value: 'ipCidr' as const },
      { label: t('tenants.table.contactEmail'), value: 'contactEmail' as const },
      { label: t('common.createdAt'), value: 'createdAt' as const },
    ],
    [t],
  );

  const tierOptions = useMemo(
    () =>
      tiers.map((tier) => ({
        label: `${tier.name} (${tier.code} · ${formatTierLimit(tier.dailyLogQuotaGb, 'GB', t('tenants.tiers.unlimited'))} / ${formatTierLimit(tier.maxUsers, '', t('tenants.tiers.unlimited'))})`,
        value: tier.id,
      })),
    [tiers, t],
  );

  const isFieldVisible = (field: TenantVisibleField) => visibleFields.includes(field);

  const handleToggleField = (field: TenantVisibleField) => {
    const exists = visibleFields.includes(field);

    if (exists) {
      if (visibleFields.length === 1) return;
      setVisibleFields(visibleFields.filter((item) => item !== field));
      return;
    }

    const next = [...visibleFields, field].sort(
      (a, b) => tenantFieldOrder.indexOf(a) - tenantFieldOrder.indexOf(b),
    );
    setVisibleFields(next);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearch('');
  };

  const tenantSummary = useMemo(
    () => ({
      total: tenants.length,
      active: tenants.filter((tenant) => tenant.status === 'ACTIVE').length,
      suspended: tenants.filter((tenant) => tenant.status === 'SUSPENDED').length,
      deleted: tenants.filter((tenant) => tenant.status === 'DELETED').length,
    }),
    [tenants],
  );

  const buildTenantActions = (row: Tenant): MenuItem[] => [
    {
      label: t('tenants.actions.edit'),
      icon: 'pi pi-pencil',
      command: () => openEditDialog(row),
    },
    {
      separator: true,
    },
    {
      label: row.status === 'ACTIVE' ? t('tenants.table.suspendBtn') : t('tenants.table.activateBtn'),
      icon: row.status === 'ACTIVE' ? 'pi pi-pause' : 'pi pi-play',
      className: row.status === 'ACTIVE' ? 'tenant-menu-action-warning' : 'tenant-menu-action-safe',
      disabled: row.status === 'DELETED',
      command: () => {
        confirmStatusToggle(row);
      },
    },
    {
      separator: true,
    },
    {
      label: t('tenants.actions.restore'),
      icon: 'pi pi-refresh',
      className: 'tenant-menu-action-restore',
      disabled: row.status !== 'DELETED',
      command: () => {
        confirmRestoreTenant(row);
      },
    },
    {
      separator: true,
    },
    {
      label: t('tenants.actions.delete'),
      icon: 'pi pi-trash',
      className: 'tenant-menu-action-danger',
      disabled: row.status === 'DELETED',
      command: () => {
        confirmDeleteTenant(row);
      },
    },
  ];

  return (
    <div className="tenants-page">
      <ConfirmDialog />
      <div className="page-header">
        <div></div>
        <Button
          label={t('tenants.createBtn')}
          icon="pi pi-plus"
          onClick={openCreateDialog}
          rounded
          size="small"
        />
      </div>
      <div className="tenant-summary-grid mb-3">
        <div className="tenant-summary-card">
          <span className="summary-label">{t('tenants.summary.total')}</span>
          <span className="summary-value">{tenantSummary.total}</span>
        </div>
        <div className="tenant-summary-card tenant-summary-card-active">
          <span className="summary-label">{t('tenants.summary.active')}</span>
          <span className="summary-value">{tenantSummary.active}</span>
        </div>
        <div className="tenant-summary-card tenant-summary-card-suspended">
          <span className="summary-label">{t('tenants.summary.suspended')}</span>
          <span className="summary-value">{tenantSummary.suspended}</span>
        </div>
        <div className="tenant-summary-card tenant-summary-card-deleted">
          <span className="summary-label">{t('tenants.summary.deleted')}</span>
          <span className="summary-value">{tenantSummary.deleted}</span>
        </div>
      </div>

      <div className="tenants-table-card">
        <div className="tenants-table-toolbar">
          <div className="tenants-toolbar-left">
            <div className="tenants-search-shell">
              <IconField iconPosition="left" className="tenants-search">
                <InputIcon className="pi pi-search" />
                <InputText
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full tenants-search-input p-inputtext-sm"
                  placeholder={t('tenants.searchPlaceholder')}
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
              value={statusFilter}
              options={statusFilterOptions}
              optionLabel="label"
              optionValue="value"
              className="tenants-status-select"
              itemTemplate={renderStatusFilterOption}
              onChange={(e) => setStatusFilter(e.value as 'ALL' | Tenant['status'])}
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
                    htmlFor={`tenant-field-${fieldOption.value}`}
                  >
                    <Checkbox
                      inputId={`tenant-field-${fieldOption.value}`}
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
          value={filteredTenants}
          loading={loading}
          paginator
          rows={10}
          rowsPerPageOptions={[10, 20, 50]}
          removableSort
          rowClassName={(row: Tenant) => (row.status === 'DELETED' ? 'tenant-row-deleted' : '')}
          className="admin-tenants-table"
        >
        {isFieldVisible('id') && (
          <Column field="id" header={t('tenants.table.id')} style={{ width: '72px' }} bodyClassName="text-right" headerClassName="text-right" />
        )}
        {isFieldVisible('slug') && (
          <Column
            field="slug"
            header={t('tenants.table.slug')}
            style={{ minWidth: '9rem' }}
            body={(row: Tenant) => <Tag value={row.slug} rounded className="tenant-slug-tag" />}
          />
        )}
        {isFieldVisible('name') && (
          <Column
            field="name"
            header={t('tenants.table.name')}
            style={{ minWidth: '12rem' }}
            body={(row: Tenant) => <span className="tenant-name-cell">{row.name}</span>}
          />
        )}
        {isFieldVisible('status') && (
          <Column
            field="status"
            header={t('common.status')}
            body={(row: Tenant) => (
              <Tag
                value={t(statusLabelKey(row.status))}
                severity={statusSeverity(row.status) as any}                
                rounded
                className={`tenant-status-tag tenant-status-${row.status.toLowerCase()}`}
              />
            )}
          />
        )}
        {isFieldVisible('tier') && (
          <Column
            field="tierId"
            header={t('tenants.table.tier')}
            style={{ minWidth: '10rem' }}
            body={(row: Tenant) => <span>{row.tier?.name ?? '-'}</span>}
          />
        )}
        {isFieldVisible('expiresAt') && (
          <Column
            field="expiresAt"
            header={t('tenants.table.expiresAt')}
            style={{ minWidth: '8.5rem' }}
            body={(row: Tenant) => (row.expiresAt ? new Date(row.expiresAt).toLocaleDateString(locale) : '-')}
          />
        )}
        {isFieldVisible('ipCidr') && (
          <Column
            field="ipCidr"
            header={t('tenants.table.ipCidr')}
            style={{ minWidth: '10rem' }}
            body={(row: Tenant) => row.ipCidr || '-'}
          />
        )}
        {isFieldVisible('contactEmail') && (
          <Column field="contactEmail" header={t('tenants.table.contactEmail')} style={{ minWidth: '15rem' }} />
        )}
        {isFieldVisible('createdAt') && (
          <Column
            field="createdAt"
            header={t('common.createdAt')}
            sortable
            bodyClassName="text-right"
            headerClassName="text-right"
            style={{ width: '27rem' }}
            body={(row: Tenant) => formatDateTimeSeconds(row.createdAt)}
          />
        )}
        <Column
          header={t('common.actions')}
          style={{ width: '8.5rem' }}
          body={(row: Tenant) => (
            <div className="tenant-action-stack">
              <Button
                size="small"
                icon={row.status === 'DELETED' ? 'pi pi-refresh' : row.status === 'ACTIVE' ? 'pi pi-pause' : 'pi pi-play'}
                severity={row.status === 'DELETED' ? 'success' : row.status === 'ACTIVE' ? 'warning' : 'success'}
                tooltip={
                  row.status === 'DELETED'
                    ? t('tenants.actions.restore')
                    : row.status === 'ACTIVE'
                      ? t('tenants.table.suspendBtn')
                      : t('tenants.table.activateBtn')
                }
                tooltipOptions={{ position: 'top' }}
                text
                rounded
                aria-label={
                  row.status === 'DELETED'
                    ? t('tenants.actions.restore')
                    : row.status === 'ACTIVE'
                      ? t('tenants.table.suspendBtn')
                      : t('tenants.table.activateBtn')
                }
                onClick={() => (row.status === 'DELETED' ? confirmRestoreTenant(row) : confirmStatusToggle(row))}
              />
              <Button
                size="small"
                icon="pi pi-ellipsis-v"
                severity="secondary"
                text
                rounded
                tooltip={t('tenants.actions.more')}
                tooltipOptions={{ position: 'top' }}
                aria-haspopup
                aria-controls={`tenant-row-menu-${row.id}`}
                aria-label={t('tenants.actions.more')}
                onClick={(event) => rowMenusRef.current[row.id]?.toggle(event)}
              />
              <Menu
                id={`tenant-row-menu-${row.id}`}
                popup
                model={buildTenantActions(row)}
                className="tenant-row-menu"
                ref={(el) => {
                  rowMenusRef.current[row.id] = el;
                }}
              />
            </div>
          )}
        />
        </CommonDataTable>
      </div>

      <Dialog
        header={editingTenant ? t('tenants.dialog.editTitle') : t('tenants.dialog.title')}
        visible={showTenantDialog}
        style={{ width: '560px', maxWidth: '96vw' }}
        className="tenant-create-dialog"
        onHide={closeTenantDialog}
      >
        <div className="flex flex-column gap-3 pt-2">
          <div>
            <label className="block mb-1 text-sm">
              {t('tenants.dialog.slug')}
              <span className="p-error ml-1">*</span>
            </label>
            <InputText
              value={form.slug}
              disabled={!!editingTenant}
              onChange={(e) => {
                setForm({ ...form, slug: e.target.value });
                if (formErrors.slug) {
                  setFormErrors({ ...formErrors, slug: undefined });
                }
              }}
              className={`w-full tenants-search-input p-inputtext-sm ${formErrors.slug ? 'p-invalid' : ''}`}
              placeholder={t('tenants.dialog.slugPlaceholder')}
            />
            {formErrors.slug && <small className="p-error">{formErrors.slug}</small>}
          </div>
          <div>
            <label className="block mb-1 text-sm">
              {t('tenants.dialog.companyName')}
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
              className={`w-full tenants-search-input p-inputtext-sm ${formErrors.name ? 'p-invalid' : ''}`}
            />
            {formErrors.name && <small className="p-error">{formErrors.name}</small>}
          </div>
          <div>
            <label className="block mb-1 text-sm">
              {t('tenants.dialog.contactEmail')}
              <span className="p-error ml-1">*</span>
            </label>
            <InputText
              value={form.contactEmail}
              onChange={(e) => {
                setForm({ ...form, contactEmail: e.target.value });
                if (formErrors.contactEmail) {
                  setFormErrors({ ...formErrors, contactEmail: undefined });
                }
              }}
              className={`w-full tenants-search-input p-inputtext-sm ${formErrors.contactEmail ? 'p-invalid' : ''}`}
            />
            {formErrors.contactEmail && <small className="p-error">{formErrors.contactEmail}</small>}
          </div>
          <div className="grid m-0">
            <div className="col-12 md:col-6 pl-0 pr-0 md:pr-2">
              <label className="block mb-1 text-sm">
                {t('tenants.dialog.tierCode')}
                <span className="p-error ml-1">*</span>
              </label>
              <Dropdown
                value={form.tierId ?? null}
                options={tierOptions}
                optionLabel="label"
                optionValue="value"
                placeholder={t('tenants.dialog.tierPlaceholder')}
                className={`w-full ${formErrors.tierId ? 'p-invalid' : ''}`}
                onChange={(e) => {
                  setForm({ ...form, tierId: e.value ? Number(e.value) : undefined });
                  if (formErrors.tierId) {
                    setFormErrors({ ...formErrors, tierId: undefined });
                  }
                }}
              />
              {formErrors.tierId && <small className="p-error">{formErrors.tierId}</small>}
            </div>
            <div className="col-12 md:col-6 pl-0 pr-0 md:pr-2">
              <label className="block mb-1 text-sm">{t('tenants.dialog.expiresAt')}</label>
              <Calendar
                value={form.expiresAt}
                onChange={(e) => {
                  setForm({ ...form, expiresAt: (e.value as Date | null) ?? null });
                  if (formErrors.expiresAt) {
                    setFormErrors({ ...formErrors, expiresAt: undefined });
                  }
                }}
                dateFormat="yy-mm-dd"
                showIcon
                showButtonBar
                touchUI={false}
                minDate={minSelectableDate}
                inputClassName="w-full"
                className={`w-full ${formErrors.expiresAt ? 'p-invalid' : ''}`}
              />
              {formErrors.expiresAt && <small className="p-error">{formErrors.expiresAt}</small>}
            </div>
          </div>
          <div>
            <label className="block mb-1 text-sm">
              {t('tenants.dialog.ipCidr')}
              <span className="p-error ml-1">*</span>
            </label>
            <InputText
              value={form.ipCidr}
              onChange={(e) => {
                setForm({ ...form, ipCidr: e.target.value });
                if (formErrors.ipCidr) {
                  setFormErrors({ ...formErrors, ipCidr: undefined });
                }
              }}
              className={`w-full tenants-search-input p-inputtext-sm ${formErrors.ipCidr ? 'p-invalid' : ''}`}
              placeholder={t('tenants.dialog.ipCidrPlaceholder')}
            />
            {formErrors.ipCidr && <small className="p-error">{formErrors.ipCidr}</small>}
          </div>
          <div className="flex gap-1 justify-between pt-1">
            <div className="flex gap-1"></div>
            <div className="flex gap-1 flex-1 flex-row-reverse">
              <Button
                label={t('common.save')}
                onClick={handleSaveTenant}
                loading={saving}
                size="small"
              />
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default TenantsPage;
