import React, { useEffect, useMemo, useState } from 'react';
import { DataTable } from 'primereact/datatable';
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
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../api';

interface Tenant {
  id: number;
  slug: string;
  name: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'DELETED';
  contactEmail: string;
  createdAt: string;
}

type TenantVisibleField = 'id' | 'slug' | 'name' | 'status' | 'contactEmail' | 'createdAt';

const tenantFieldOrder: TenantVisibleField[] = [
  'id',
  'slug',
  'name',
  'status',
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
  return 'common.inactive';
};

const TenantsPage: React.FC = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const rowMenusRef = React.useRef<Record<number, Menu | null>>({});
  const fieldPanelRef = React.useRef<OverlayPanel | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | Tenant['status']>('ALL');
  const [visibleFields, setVisibleFields] = useState<TenantVisibleField[]>(tenantFieldOrder);
  const [form, setForm] = useState({ slug: '', name: '', contactEmail: '' });

  const locale = i18n.language.startsWith('ko') ? 'ko-KR' : 'en-US';

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

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput);
    }, 700);

    return () => {
      window.clearTimeout(timer);
    };
  }, [searchInput]);

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
      return [tenant.slug, tenant.name, tenant.contactEmail].some((value) =>
        value.toLowerCase().includes(keyword),
      );
    });
  }, [tenants, search, statusFilter]);

  const statusFilterOptions = useMemo(
    () => [
      { label: t('tenants.filters.all'), value: 'ALL' as const },
      { label: t('common.active'), value: 'ACTIVE' as const },
      { label: t('common.suspend'), value: 'SUSPENDED' as const },
      { label: t('tenants.actions.delete'), value: 'DELETED' as const },
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
      { label: t('tenants.table.contactEmail'), value: 'contactEmail' as const },
      { label: t('common.createdAt'), value: 'createdAt' as const },
    ],
    [t],
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
      label: t('tenants.actions.settings'),
      icon: 'pi pi-cog',
      command: () => navigate(`/tenants/${row.id}/settings`),
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
    <div className="tenants-page p-4">
      <ConfirmDialog />
      <div className="page-header">
        <h1>{t('tenants.title')}</h1>
        <Button
          label={t('tenants.createBtn')}
          icon="pi pi-plus"
          onClick={() => setShowCreate(true)}
          rounded
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
                  className="w-full tenants-search-input"
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
        <DataTable
          value={filteredTenants}
          loading={loading}
          paginator
          rows={10}
          rowsPerPageOptions={[10, 20, 50]}
          removableSort
          stripedRows
          rowHover
          emptyMessage={t('tenants.table.empty')}
          rowClassName={(row: Tenant) => (row.status === 'DELETED' ? 'tenant-row-deleted' : '')}
          className="admin-tenants-table"
          size="small"
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
            style={{ width: '9rem' }}
            body={(row: Tenant) => new Date(row.createdAt).toLocaleDateString(locale)}
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
        </DataTable>
      </div>

      <Dialog
        header={t('tenants.dialog.title')}
        visible={showCreate}
        style={{ width: '480px' }}
        onHide={() => setShowCreate(false)}
      >
        <div className="flex flex-column gap-3 pt-2">
          <div>
            <label className="block mb-1 text-sm">{t('tenants.dialog.slug')}</label>
            <InputText
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              className="w-full"
              placeholder={t('tenants.dialog.slugPlaceholder')}
            />
          </div>
          <div>
            <label className="block mb-1 text-sm">{t('tenants.dialog.companyName')}</label>
            <InputText
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full"
            />
          </div>
          <div>
            <label className="block mb-1 text-sm">{t('tenants.dialog.contactEmail')}</label>
            <InputText
              value={form.contactEmail}
              onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
              className="w-full"
            />
          </div>
          <Button label={t('common.create')} onClick={handleCreate} />
        </div>
      </Dialog>
    </div>
  );
};

export default TenantsPage;
