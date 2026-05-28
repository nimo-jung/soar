import React, { useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Message } from 'primereact/message';
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

const DEFAULT_FORM: RuleForm = {
  name: '',
  ruleDefinition: '{"fieldMappings": {}}',
  logSourceType: '',
  priority: 0,
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

  useEffect(() => {
    void loadRules();
  }, []);

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
                  size="small"
                  icon="pi pi-pencil"
                  label={t('settings.parsingRules.table.editBtn')}
                  onClick={() => openEditDialog(row)}
                  disabled={!canManageRules}
                />
                <Button
                  size="small"
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

      <Dialog
        header={isCreate ? t('settings.parsingRules.dialog.createTitle') : t('settings.parsingRules.dialog.editTitle')}
        visible={dialogVisible}
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
    </div>
  );
};

export default SettingsPage;
