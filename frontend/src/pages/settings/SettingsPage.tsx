import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/TenantButton';
import { Column } from 'primereact/column';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { InputSwitch } from 'primereact/inputswitch';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import { useTranslation } from 'react-i18next';
import api from '../../api';
import { useAuthStore } from '../../store/auth.store';
import { formatDateTimeSeconds } from '../../utils/date';
import CommonDataTable from '../../components/CommonDataTable';

interface ParsingRule {
  id: number;
  name: string;
  ruleDefinition: Record<string, unknown>;
  logSourceType: string;
  isActive: boolean;
  priority: number;
  createdAt: string;
}

interface RuleForm {
  name: string;
  ruleDefinition: string;
  logSourceType: string;
  priority: number;
}

type IngestionMode = 'syslog' | 'snmp' | 'http' | 'cmd' | 'file' | 'kafka';

interface TenantVectorSource {
  id: string;
  name: string;
  vendor: string;
  ingestionMode: IngestionMode;
  enabled: boolean;
  sourceConfig?: {
    transport?: 'udp' | 'tcp';
    address?: string;
    port?: number;
    path?: string;
    authStrategy?: 'none' | 'basic' | 'token';
    authToken?: string;
    basicUsername?: string;
    basicPassword?: string;
    command?: string;
    intervalSeconds?: number;
    includePatterns?: string[];
    bootstrapServers?: string;
    topic?: string;
    groupId?: string;
  };
}

interface TenantVectorSourcesResponse {
  items: TenantVectorSource[];
}

interface SourceForm {
  id: string;
  name: string;
  vendor: string;
  ingestionMode: IngestionMode;
  enabled: boolean;
  transport: 'udp' | 'tcp';
  address: string;
  port: number;
  path: string;
  authStrategy: 'none' | 'basic' | 'token';
  authToken: string;
  basicUsername: string;
  basicPassword: string;
  command: string;
  intervalSeconds: number;
  includePatternsText: string;
  bootstrapServers: string;
  topic: string;
  groupId: string;
}

const DEFAULT_FORM: RuleForm = {
  name: '',
  ruleDefinition: '{"fieldMappings": {}}',
  logSourceType: '',
  priority: 0,
};

const DEFAULT_SOURCE_FORM: SourceForm = {
  id: '',
  name: '',
  vendor: '',
  ingestionMode: 'syslog',
  enabled: true,
  transport: 'udp',
  address: '0.0.0.0',
  port: 1514,
  path: '/ingest',
  authStrategy: 'none',
  authToken: '',
  basicUsername: '',
  basicPassword: '',
  command: 'echo cmd_source_not_configured',
  intervalSeconds: 60,
  includePatternsText: '/var/log/*.log',
  bootstrapServers: 'redpanda:9092',
  topic: 'logs.raw.input',
  groupId: 'vector-input-group',
};

const SettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const currentUser = useAuthStore((state) => state.user);
  const canManageRules = currentUser?.role === 'operator';

  const [rules, setRules] = useState<ParsingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [dialogVisible, setDialogVisible] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<number | null>(null);
  const [form, setForm] = useState<RuleForm>(DEFAULT_FORM);

  const [vectorSources, setVectorSources] = useState<TenantVectorSource[]>([]);
  const [sourceDialogVisible, setSourceDialogVisible] = useState(false);
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
  const [sourceForm, setSourceForm] = useState<SourceForm>(DEFAULT_SOURCE_FORM);
  const [savingSources, setSavingSources] = useState(false);

  const sourceTypeOptions = useMemo(
    () => [
      { label: t('settings.parsingRules.sources.all'), value: '' },
      { label: t('settings.parsingRules.sources.syslog'), value: 'syslog' },
      { label: t('settings.parsingRules.sources.firewall'), value: 'firewall' },
      { label: t('settings.parsingRules.sources.waf'), value: 'waf' },
      { label: t('settings.parsingRules.sources.edr'), value: 'edr' },
    ],
    [t],
  );

  const vectorModeOptions = useMemo(
    () => [
      { label: t('settings.vectorSources.modes.syslog'), value: 'syslog' },
      { label: t('settings.vectorSources.modes.snmp'), value: 'snmp' },
      { label: t('settings.vectorSources.modes.http'), value: 'http' },
      { label: t('settings.vectorSources.modes.cmd'), value: 'cmd' },
      { label: t('settings.vectorSources.modes.file'), value: 'file' },
      { label: t('settings.vectorSources.modes.kafka'), value: 'kafka' },
    ],
    [t],
  );

  const loadRules = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get<ParsingRule[]>('/api/parsing-rules');
      setRules(response.data);
    } catch (loadError: any) {
      const message = loadError?.response?.data?.message;
      setError(Array.isArray(message) ? message.join(', ') : message || t('settings.parsingRules.errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const loadVectorSources = async () => {
    try {
      const response = await api.get<TenantVectorSourcesResponse>('/api/vector-sources');
      setVectorSources(response.data.items ?? []);
    } catch (loadError: any) {
      const message = loadError?.response?.data?.message;
      setError(Array.isArray(message) ? message.join(', ') : message || t('settings.vectorSources.errors.loadFailed'));
    }
  };

  useEffect(() => {
    void loadRules();
    void loadVectorSources();
  }, []);

  const openCreateSourceDialog = () => {
    setEditingSourceId(null);
    setSourceForm(DEFAULT_SOURCE_FORM);
    setError('');
    setSourceDialogVisible(true);
  };

  const openEditSourceDialog = (source: TenantVectorSource) => {
    setEditingSourceId(source.id);
    setSourceForm({
      id: source.id,
      name: source.name,
      vendor: source.vendor,
      ingestionMode: source.ingestionMode,
      enabled: source.enabled,
      transport: source.sourceConfig?.transport ?? 'udp',
      address: source.sourceConfig?.address ?? '0.0.0.0',
      port: source.sourceConfig?.port ?? 1514,
      path: source.sourceConfig?.path ?? '/ingest',
      authStrategy: source.sourceConfig?.authStrategy ?? 'none',
      authToken: source.sourceConfig?.authToken ?? '',
      basicUsername: source.sourceConfig?.basicUsername ?? '',
      basicPassword: source.sourceConfig?.basicPassword ?? '',
      command: source.sourceConfig?.command ?? 'echo cmd_source_not_configured',
      intervalSeconds: source.sourceConfig?.intervalSeconds ?? 60,
      includePatternsText: source.sourceConfig?.includePatterns?.join(', ') ?? '/var/log/*.log',
      bootstrapServers: source.sourceConfig?.bootstrapServers ?? 'redpanda:9092',
      topic: source.sourceConfig?.topic ?? 'logs.raw.input',
      groupId: source.sourceConfig?.groupId ?? 'vector-input-group',
    });
    setError('');
    setSourceDialogVisible(true);
  };

  const saveSourceLocally = () => {
    const id = sourceForm.id.trim().toLowerCase();
    const vendor = sourceForm.vendor.trim().toLowerCase();
    const name = sourceForm.name.trim();

    if (!id || !vendor || !name) {
      setError(t('settings.vectorSources.errors.required'));
      return;
    }

    if (sourceForm.ingestionMode === 'http') {
      if (sourceForm.authStrategy === 'token' && sourceForm.authToken.trim().length === 0) {
        setError(t('settings.vectorSources.errors.tokenRequired'));
        return;
      }
      if (sourceForm.authStrategy === 'basic' && (sourceForm.basicUsername.trim().length === 0 || sourceForm.basicPassword.length === 0)) {
        setError(t('settings.vectorSources.errors.basicRequired'));
        return;
      }
    }

    const duplicate = vectorSources.some((item) => item.id === id && item.id !== editingSourceId);
    if (duplicate) {
      setError(t('settings.vectorSources.errors.duplicateId', { id }));
      return;
    }

    const includePatterns = sourceForm.includePatternsText
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    const next: TenantVectorSource = {
      id,
      name,
      vendor,
      ingestionMode: sourceForm.ingestionMode,
      enabled: sourceForm.enabled,
      sourceConfig: {
        transport: sourceForm.transport,
        address: sourceForm.address.trim(),
        port: sourceForm.port,
        path: sourceForm.path.trim(),
        authStrategy: sourceForm.authStrategy,
        authToken: sourceForm.authToken.trim(),
        basicUsername: sourceForm.basicUsername.trim(),
        basicPassword: sourceForm.basicPassword,
        command: sourceForm.command.trim(),
        intervalSeconds: sourceForm.intervalSeconds,
        includePatterns,
        bootstrapServers: sourceForm.bootstrapServers.trim(),
        topic: sourceForm.topic.trim(),
        groupId: sourceForm.groupId.trim(),
      },
    };

    if (!editingSourceId) {
      setVectorSources((prev) => [...prev, next]);
    } else {
      setVectorSources((prev) => prev.map((item) => (item.id === editingSourceId ? next : item)));
    }

    setSourceDialogVisible(false);
  };

  const deleteSource = (id: string) => {
    setVectorSources((prev) => prev.filter((item) => item.id !== id));
  };

  const saveVectorSources = async () => {
    setSavingSources(true);
    try {
      const response = await api.patch<TenantVectorSourcesResponse>('/api/vector-sources', {
        items: vectorSources,
      });
      setVectorSources(response.data.items ?? []);
    } catch (saveError: any) {
      const message = saveError?.response?.data?.message;
      setError(Array.isArray(message) ? message.join(', ') : message || t('settings.vectorSources.errors.saveFailed'));
    } finally {
      setSavingSources(false);
    }
  };

  const openCreateDialog = () => {
    setEditingRuleId(null);
    setForm(DEFAULT_FORM);
    setError('');
    setDialogVisible(true);
  };

  const openEditDialog = (rule: ParsingRule) => {
    setEditingRuleId(rule.id);
    setForm({
      name: rule.name,
      ruleDefinition: JSON.stringify(rule.ruleDefinition, null, 2),
      logSourceType: rule.logSourceType ?? '',
      priority: rule.priority,
    });
    setError('');
    setDialogVisible(true);
  };

  const saveRule = async () => {
    try {
      setError('');
      const parsedDefinition = JSON.parse(form.ruleDefinition);

      if (editingRuleId === null) {
        await api.post('/api/parsing-rules', {
          name: form.name,
          ruleDefinition: parsedDefinition,
          logSourceType: form.logSourceType || undefined,
          priority: form.priority,
        });
      } else {
        await api.patch(`/api/parsing-rules/${editingRuleId}`, {
          name: form.name,
          ruleDefinition: parsedDefinition,
          logSourceType: form.logSourceType,
          priority: form.priority,
        });
      }

      setDialogVisible(false);
      await loadRules();
    } catch (saveError: any) {
      if (saveError instanceof SyntaxError) {
        setError(t('settings.parsingRules.errors.invalidJson'));
        return;
      }

      const message = saveError?.response?.data?.message;
      setError(Array.isArray(message) ? message.join(', ') : message || t('settings.parsingRules.errors.saveFailed'));
    }
  };

  const deactivateRule = async (id: number) => {
    try {
      setError('');
      await api.patch(`/api/parsing-rules/${id}/deactivate`);
      await loadRules();
    } catch (deactivateError: any) {
      const message = deactivateError?.response?.data?.message;
      setError(Array.isArray(message) ? message.join(', ') : message || t('settings.parsingRules.errors.deactivateFailed'));
    }
  };

  const isCreate = editingRuleId === null;

  return (
    <div className="tenant-page">
      <div className="tenant-page-header">
        <div>
          <h1 className="tenant-page-title">{t('settings.title')}</h1>
          <p className="tenant-page-subtitle">{t('settings.description')}</p>
        </div>
      </div>

      {error && <Message severity="error" text={error} className="w-full mb-3" />}

      <div className="tenant-card p-4 mb-4">
        <div className="flex justify-content-between align-items-center mb-3">
          <h2 className="m-0 text-xl">{t('settings.parsingRules.title')}</h2>
          <Button
            className="tenant-primary-action"
            label={t('settings.parsingRules.createBtn')}
            icon="pi pi-plus"
            onClick={openCreateDialog}
            disabled={!canManageRules}
          />
        </div>

        <div className="tenant-table-shell">
          <CommonDataTable value={rules} loading={loading} paginator rows={10} className="tenant-table p-datatable-sm">
          <Column field="name" header={t('settings.parsingRules.table.name')} />
          <Column
            field="logSourceType"
            header={t('settings.parsingRules.table.logSourceType')}
            body={(row: ParsingRule) => row.logSourceType || t('settings.parsingRules.sources.all')}
          />
          <Column field="priority" header={t('settings.parsingRules.table.priority')} />
          <Column
            field="isActive"
            header={t('common.status')}
            body={(row: ParsingRule) => (row.isActive ? t('common.active') : t('common.inactive'))}
          />
          <Column
            field="createdAt"
            header={t('common.createdAt')}
            body={(row: ParsingRule) => formatDateTimeSeconds(row.createdAt)}
          />
          <Column
            header={t('common.actions')}
            body={(row: ParsingRule) => (
              <div className="flex gap-2">
                <Button
                  className="tenant-primary-action"
                  buttonSize="dense"
                  icon="pi pi-pencil"
                  label={t('settings.parsingRules.table.editBtn')}
                  onClick={() => openEditDialog(row)}
                  disabled={!canManageRules}
                />
                <Button
                  buttonSize="dense"
                  icon="pi pi-ban"
                  label={t('settings.parsingRules.table.deactivateBtn')}
                  severity="danger"
                  outlined
                  onClick={() => {
                    void deactivateRule(row.id);
                  }}
                  disabled={!canManageRules || !row.isActive}
                />
              </div>
            )}
          />
          </CommonDataTable>
        </div>
      </div>

      <div className="tenant-card p-4 mb-4">
        <div className="flex justify-content-between align-items-center mb-3">
          <h2 className="m-0 text-xl">{t('settings.vectorSources.title')}</h2>
          <div className="flex gap-2">
            <Button
              className="tenant-primary-action"
              label={t('settings.vectorSources.addBtn')}
              icon="pi pi-plus"
              onClick={openCreateSourceDialog}
              disabled={!canManageRules}
            />
            <Button
              label={savingSources ? t('common.loading') : t('common.save')}
              icon="pi pi-save"
              onClick={() => {
                void saveVectorSources();
              }}
              loading={savingSources}
              disabled={!canManageRules}
            />
          </div>
        </div>

        <div className="tenant-table-shell">
          <CommonDataTable value={vectorSources} paginator rows={10} className="tenant-table p-datatable-sm">
            <Column field="id" header={t('settings.vectorSources.table.id')} />
            <Column field="name" header={t('settings.vectorSources.table.name')} />
            <Column field="vendor" header={t('settings.vectorSources.table.vendor')} />
            <Column
              field="ingestionMode"
              header={t('settings.vectorSources.table.ingestionMode')}
              body={(row: TenantVectorSource) => t(`settings.vectorSources.modes.${row.ingestionMode}`)}
            />
            <Column
              field="enabled"
              header={t('common.status')}
              body={(row: TenantVectorSource) => (
                <Tag value={row.enabled ? t('common.active') : t('common.inactive')} severity={row.enabled ? 'success' : 'danger'} />
              )}
            />
            <Column
              header={t('common.actions')}
              body={(row: TenantVectorSource) => (
                <div className="flex gap-2">
                  <Button
                    className="tenant-primary-action"
                    buttonSize="dense"
                    icon="pi pi-pencil"
                    label={t('settings.vectorSources.table.editBtn')}
                    onClick={() => openEditSourceDialog(row)}
                    disabled={!canManageRules}
                  />
                  <Button
                    buttonSize="dense"
                    icon="pi pi-trash"
                    label={t('settings.vectorSources.table.deleteBtn')}
                    severity="danger"
                    outlined
                    onClick={() => deleteSource(row.id)}
                    disabled={!canManageRules}
                  />
                </div>
              )}
            />
          </CommonDataTable>
        </div>
      </div>

      <Dialog
        header={isCreate ? t('settings.parsingRules.dialog.createTitle') : t('settings.parsingRules.dialog.editTitle')}
        visible={dialogVisible}
        className="tenant-dialog"
        style={{ width: '620px' }}
        onHide={() => setDialogVisible(false)}
      >
        <div className="flex flex-column gap-3 pt-2">
          <div>
            <label htmlFor="rule-name" className="tenant-form-label">{t('settings.parsingRules.dialog.name')}</label>
            <InputText
              id="rule-name"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              className="w-full"
            />
          </div>
          <div>
            <label htmlFor="rule-source" className="tenant-form-label">{t('settings.parsingRules.dialog.logSourceType')}</label>
            <Dropdown
              id="rule-source"
              value={form.logSourceType}
              options={sourceTypeOptions}
              onChange={(event) => setForm((prev) => ({ ...prev, logSourceType: event.value as string }))}
              className="w-full"
            />
          </div>
          <div>
            <label htmlFor="rule-priority" className="tenant-form-label">{t('settings.parsingRules.dialog.priority')}</label>
            <InputNumber
              id="rule-priority"
              value={form.priority}
              min={0}
              useGrouping={false}
              className="w-full"
              onValueChange={(event) => setForm((prev) => ({ ...prev, priority: event.value ?? 0 }))}
            />
          </div>
          <div>
            <label htmlFor="rule-definition" className="tenant-form-label">{t('settings.parsingRules.dialog.ruleDefinition')}</label>
            <InputTextarea
              id="rule-definition"
              rows={10}
              value={form.ruleDefinition}
              onChange={(event) => setForm((prev) => ({ ...prev, ruleDefinition: event.target.value }))}
              className="w-full font-mono text-sm"
            />
            <small className="text-color-secondary">{t('settings.parsingRules.dialog.ruleDefinitionHelp')}</small>
          </div>
          <Button
            className="tenant-primary-action"
            label={isCreate ? t('common.create') : t('common.save')}
            onClick={() => {
              void saveRule();
            }}
            disabled={!canManageRules}
          />
        </div>
      </Dialog>

      <Dialog
        header={editingSourceId ? t('settings.vectorSources.dialog.editTitle') : t('settings.vectorSources.dialog.createTitle')}
        visible={sourceDialogVisible}
        className="tenant-dialog"
        style={{ width: '680px' }}
        onHide={() => setSourceDialogVisible(false)}
      >
        <div className="grid pt-2">
          <div className="col-12 md:col-6">
            <label className="tenant-form-label">{t('settings.vectorSources.dialog.id')}</label>
            <InputText value={sourceForm.id} onChange={(event) => setSourceForm((prev) => ({ ...prev, id: event.target.value }))} className="w-full" />
          </div>
          <div className="col-12 md:col-6">
            <label className="tenant-form-label">{t('settings.vectorSources.dialog.name')}</label>
            <InputText value={sourceForm.name} onChange={(event) => setSourceForm((prev) => ({ ...prev, name: event.target.value }))} className="w-full" />
          </div>
          <div className="col-12 md:col-6">
            <label className="tenant-form-label">{t('settings.vectorSources.dialog.vendor')}</label>
            <InputText value={sourceForm.vendor} onChange={(event) => setSourceForm((prev) => ({ ...prev, vendor: event.target.value }))} className="w-full" />
          </div>
          <div className="col-12 md:col-6">
            <label className="tenant-form-label">{t('settings.vectorSources.dialog.ingestionMode')}</label>
            <Dropdown
              value={sourceForm.ingestionMode}
              options={vectorModeOptions}
              onChange={(event) => setSourceForm((prev) => ({ ...prev, ingestionMode: event.value as IngestionMode }))}
              className="w-full"
            />
          </div>

          {(sourceForm.ingestionMode === 'syslog' || sourceForm.ingestionMode === 'snmp' || sourceForm.ingestionMode === 'http') && (
            <>
              <div className="col-12 md:col-4">
                <label className="tenant-form-label">{t('settings.vectorSources.dialog.address')}</label>
                <InputText value={sourceForm.address} onChange={(event) => setSourceForm((prev) => ({ ...prev, address: event.target.value }))} className="w-full" />
              </div>
              <div className="col-12 md:col-4">
                <label className="tenant-form-label">{t('settings.vectorSources.dialog.port')}</label>
                <InputNumber value={sourceForm.port} min={1} max={65535} useGrouping={false} className="w-full" onValueChange={(event) => setSourceForm((prev) => ({ ...prev, port: event.value ?? 1 }))} />
              </div>
              {sourceForm.ingestionMode === 'syslog' && (
                <div className="col-12 md:col-4">
                  <label className="tenant-form-label">{t('settings.vectorSources.dialog.transport')}</label>
                  <Dropdown
                    value={sourceForm.transport}
                    options={[{ label: 'UDP', value: 'udp' }, { label: 'TCP', value: 'tcp' }]}
                    onChange={(event) => setSourceForm((prev) => ({ ...prev, transport: event.value as 'udp' | 'tcp' }))}
                    className="w-full"
                  />
                </div>
              )}
              {sourceForm.ingestionMode === 'http' && (
                <>
                  <div className="col-12 md:col-6">
                    <label className="tenant-form-label">{t('settings.vectorSources.dialog.path')}</label>
                    <InputText value={sourceForm.path} onChange={(event) => setSourceForm((prev) => ({ ...prev, path: event.target.value }))} className="w-full" />
                  </div>
                  <div className="col-12 md:col-6">
                    <label className="tenant-form-label">{t('settings.vectorSources.dialog.authStrategy')}</label>
                    <Dropdown
                      value={sourceForm.authStrategy}
                      options={[
                        { label: t('settings.vectorSources.auth.none'), value: 'none' },
                        { label: t('settings.vectorSources.auth.token'), value: 'token' },
                        { label: t('settings.vectorSources.auth.basic'), value: 'basic' },
                      ]}
                      onChange={(event) => setSourceForm((prev) => ({ ...prev, authStrategy: event.value as 'none' | 'basic' | 'token' }))}
                      className="w-full"
                    />
                  </div>
                  {sourceForm.authStrategy === 'token' && (
                    <div className="col-12">
                      <label className="tenant-form-label">{t('settings.vectorSources.dialog.authToken')}</label>
                      <InputText type="password" value={sourceForm.authToken} onChange={(event) => setSourceForm((prev) => ({ ...prev, authToken: event.target.value }))} className="w-full" />
                    </div>
                  )}
                  {sourceForm.authStrategy === 'basic' && (
                    <>
                      <div className="col-12 md:col-6">
                        <label className="tenant-form-label">{t('settings.vectorSources.dialog.basicUsername')}</label>
                        <InputText value={sourceForm.basicUsername} onChange={(event) => setSourceForm((prev) => ({ ...prev, basicUsername: event.target.value }))} className="w-full" />
                      </div>
                      <div className="col-12 md:col-6">
                        <label className="tenant-form-label">{t('settings.vectorSources.dialog.basicPassword')}</label>
                        <InputText type="password" value={sourceForm.basicPassword} onChange={(event) => setSourceForm((prev) => ({ ...prev, basicPassword: event.target.value }))} className="w-full" />
                      </div>
                    </>
                  )}
                </>
              )}
            </>
          )}

          {sourceForm.ingestionMode === 'cmd' && (
            <>
              <div className="col-12 md:col-8">
                <label className="tenant-form-label">{t('settings.vectorSources.dialog.command')}</label>
                <InputText value={sourceForm.command} onChange={(event) => setSourceForm((prev) => ({ ...prev, command: event.target.value }))} className="w-full" />
              </div>
              <div className="col-12 md:col-4">
                <label className="tenant-form-label">{t('settings.vectorSources.dialog.intervalSeconds')}</label>
                <InputNumber value={sourceForm.intervalSeconds} min={1} max={86400} useGrouping={false} className="w-full" onValueChange={(event) => setSourceForm((prev) => ({ ...prev, intervalSeconds: event.value ?? 1 }))} />
              </div>
            </>
          )}

          {sourceForm.ingestionMode === 'file' && (
            <div className="col-12">
              <label className="tenant-form-label">{t('settings.vectorSources.dialog.includePatterns')}</label>
              <InputText value={sourceForm.includePatternsText} onChange={(event) => setSourceForm((prev) => ({ ...prev, includePatternsText: event.target.value }))} className="w-full" />
            </div>
          )}

          {sourceForm.ingestionMode === 'kafka' && (
            <>
              <div className="col-12 md:col-4">
                <label className="tenant-form-label">{t('settings.vectorSources.dialog.bootstrapServers')}</label>
                <InputText value={sourceForm.bootstrapServers} onChange={(event) => setSourceForm((prev) => ({ ...prev, bootstrapServers: event.target.value }))} className="w-full" />
              </div>
              <div className="col-12 md:col-4">
                <label className="tenant-form-label">{t('settings.vectorSources.dialog.topic')}</label>
                <InputText value={sourceForm.topic} onChange={(event) => setSourceForm((prev) => ({ ...prev, topic: event.target.value }))} className="w-full" />
              </div>
              <div className="col-12 md:col-4">
                <label className="tenant-form-label">{t('settings.vectorSources.dialog.groupId')}</label>
                <InputText value={sourceForm.groupId} onChange={(event) => setSourceForm((prev) => ({ ...prev, groupId: event.target.value }))} className="w-full" />
              </div>
            </>
          )}

          <div className="col-12">
            <div className="flex align-items-center gap-3 mt-2">
              <InputSwitch checked={sourceForm.enabled} onChange={(event) => setSourceForm((prev) => ({ ...prev, enabled: Boolean(event.value) }))} />
              <span>{sourceForm.enabled ? t('common.active') : t('common.inactive')}</span>
            </div>
          </div>

          <div className="col-12">
            <Button
              className="tenant-primary-action"
              label={editingSourceId ? t('common.save') : t('common.create')}
              onClick={saveSourceLocally}
              disabled={!canManageRules}
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default SettingsPage;
