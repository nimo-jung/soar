import React, { useEffect, useState } from 'react';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Message } from 'primereact/message';
import { MultiSelect } from 'primereact/multiselect';
import { useTranslation } from 'react-i18next';
import api from '../../api';
import { useAuthStore } from '../../store/auth.store';
import { formatDateTimeSeconds } from '../../utils/date';
import CommonDataTable from '../../components/CommonDataTable';

interface Alert {
  id: number;
  title: string;
  description: string;
  severity: string;
  status: string;
  sourceIp: string;
  createdAt: string;
}

interface AlertNotificationPolicy {
  id: number;
  channels: string[];
  recipients: string[];
}

interface AlertNotificationHistory {
  id: number;
  alertId: number;
  channel: string;
  recipient: string;
  deliveryStatus: string;
  sentAt: string;
}

interface AlertForm {
  title: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  sourceIp: string;
  ruleId: string;
}

const severitySeverity = (s: string) => {
  if (s === 'CRITICAL') return 'danger';
  if (s === 'HIGH') return 'warning';
  if (s === 'MEDIUM') return 'info';
  return 'secondary';
};

const DEFAULT_FORM: AlertForm = {
  title: '',
  description: '',
  severity: 'MEDIUM',
  sourceIp: '',
  ruleId: '',
};

const AlertsPage: React.FC = () => {
  const { t } = useTranslation();
  const currentUser = useAuthStore((state) => state.user);
  const canManageAlerts = currentUser?.role === 'operator' || currentUser?.role === 'analyst';
  const canManagePolicy = currentUser?.role === 'operator';

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [createVisible, setCreateVisible] = useState(false);
  const [form, setForm] = useState<AlertForm>(DEFAULT_FORM);

  const [policyChannels, setPolicyChannels] = useState<string[]>([]);
  const [recipientsInput, setRecipientsInput] = useState('');

  const [history, setHistory] = useState<AlertNotificationHistory[]>([]);

  const severityOptions = [
    { label: 'LOW', value: 'LOW' },
    { label: 'MEDIUM', value: 'MEDIUM' },
    { label: 'HIGH', value: 'HIGH' },
    { label: 'CRITICAL', value: 'CRITICAL' },
  ];

  const statusOptions = [
    { label: 'OPEN', value: 'OPEN' },
    { label: 'IN_PROGRESS', value: 'IN_PROGRESS' },
    { label: 'RESOLVED', value: 'RESOLVED' },
    { label: 'FALSE_POSITIVE', value: 'FALSE_POSITIVE' },
  ];

  const channelOptions = ['EMAIL', 'SLACK', 'SMS'];

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [alertsRes, policyRes, historyRes] = await Promise.all([
        api.get<Alert[]>('/api/alerts'),
        api.get<AlertNotificationPolicy>('/api/alerts/notifications/policy'),
        api.get<AlertNotificationHistory[]>('/api/alerts/notifications/history?limit=50'),
      ]);
      setAlerts(alertsRes.data);
      setPolicyChannels(policyRes.data.channels ?? []);
      setRecipientsInput((policyRes.data.recipients ?? []).join(', '));
      setHistory(historyRes.data);
    } catch (loadError: any) {
      const message = loadError?.response?.data?.message;
      setError(Array.isArray(message) ? message.join(', ') : message || t('alerts.errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const createAlert = async () => {
    try {
      setError('');
      await api.post('/api/alerts', form);
      setCreateVisible(false);
      setForm(DEFAULT_FORM);
      await load();
    } catch (createError: any) {
      const message = createError?.response?.data?.message;
      setError(Array.isArray(message) ? message.join(', ') : message || t('alerts.errors.createFailed'));
    }
  };

  const updateStatus = async (id: number, status: string) => {
    try {
      setError('');
      await api.patch(`/api/alerts/${id}/status`, { status });
      await load();
    } catch (updateError: any) {
      const message = updateError?.response?.data?.message;
      setError(Array.isArray(message) ? message.join(', ') : message || t('alerts.errors.statusFailed'));
    }
  };

  const updatePolicy = async () => {
    try {
      setError('');
      const recipients = recipientsInput
        .split(',')
        .map((value) => value.trim())
        .filter((value) => value.length > 0);

      await api.patch('/api/alerts/notifications/policy', {
        channels: policyChannels,
        recipients,
      });
      await load();
    } catch (updateError: any) {
      const message = updateError?.response?.data?.message;
      setError(Array.isArray(message) ? message.join(', ') : message || t('alerts.errors.policyFailed'));
    }
  };

  return (
    <div className="tenant-page">
      <div className="tenant-page-header">
        <div>
          <h1 className="tenant-page-title">{t('alerts.title')}</h1>
          <p className="tenant-page-subtitle">{t('alerts.description')}</p>
        </div>
        <Button
          className="tenant-primary-action"
          label={t('alerts.createBtn')}
          icon="pi pi-plus"
          onClick={() => setCreateVisible(true)}
          disabled={!canManageAlerts}
        />
      </div>

      {error && <Message severity="error" text={error} className="w-full mb-3" />}

      <div className="tenant-table-shell">
        <CommonDataTable value={alerts} loading={loading} paginator rows={20} className="tenant-table p-datatable-sm">
        <Column field="id" header="ID" style={{ width: '60px' }} />
        <Column field="title" header={t('alerts.table.title')} />
        <Column
          field="severity"
          header={t('alerts.table.severity')}
          body={(row: Alert) => <Tag value={row.severity} severity={severitySeverity(row.severity) as any} />}
        />
        <Column field="status" header={t('common.status')} />
        <Column field="sourceIp" header={t('alerts.table.sourceIp')} />
        <Column
          field="createdAt"
          header={t('alerts.table.occurredAt')}
          body={(row: Alert) => formatDateTimeSeconds(row.createdAt)}
        />
        <Column
          header={t('alerts.table.statusUpdate')}
          body={(row: Alert) => (
            <Dropdown
              value={row.status}
              options={statusOptions}
              onChange={(event) => {
                void updateStatus(row.id, event.value as string);
              }}
              className="w-11rem"
              disabled={!canManageAlerts}
            />
          )}
        />
        </CommonDataTable>
      </div>

      <div className="tenant-card p-4 mt-4">
        <h2 className="m-0 mb-3 text-xl">{t('alerts.policy.title')}</h2>
        <div className="grid">
          <div className="col-12 md:col-6">
            <label htmlFor="policy-channels" className="tenant-form-label">
              {t('alerts.policy.channels')}
            </label>
            <MultiSelect
              id="policy-channels"
              value={policyChannels}
              options={channelOptions.map((channel) => ({ label: channel, value: channel }))}
              onChange={(event) => setPolicyChannels(event.value as string[])}
              optionLabel="label"
              placeholder={t('alerts.policy.channelsPlaceholder')}
              className="w-full"
              disabled={!canManagePolicy}
            />
          </div>
          <div className="col-12 md:col-6">
            <label htmlFor="policy-recipients" className="tenant-form-label">
              {t('alerts.policy.recipients')}
            </label>
            <InputText
              id="policy-recipients"
              value={recipientsInput}
              onChange={(event) => setRecipientsInput(event.target.value)}
              className="w-full"
              disabled={!canManagePolicy}
            />
            <small className="text-color-secondary">{t('alerts.policy.recipientsHelp')}</small>
          </div>
        </div>
        <div className="flex justify-content-end mt-3">
          <Button
            label={t('common.save')}
            icon="pi pi-save"
            onClick={() => {
              void updatePolicy();
            }}
            disabled={!canManagePolicy}
          />
        </div>
      </div>

      <div className="tenant-card p-4 mt-4">
        <h2 className="m-0 mb-3 text-xl">{t('alerts.history.title')}</h2>
        <CommonDataTable value={history} paginator rows={10} className="tenant-table p-datatable-sm">
          <Column field="alertId" header={t('alerts.history.alertId')} />
          <Column field="channel" header={t('alerts.history.channel')} />
          <Column field="recipient" header={t('alerts.history.recipient')} />
          <Column field="deliveryStatus" header={t('alerts.history.deliveryStatus')} />
          <Column
            field="sentAt"
            header={t('alerts.history.sentAt')}
            body={(row: AlertNotificationHistory) => formatDateTimeSeconds(row.sentAt)}
          />
        </CommonDataTable>
      </div>

      <Dialog
        header={t('alerts.dialog.title')}
        visible={createVisible}
        style={{ width: '520px' }}
        onHide={() => setCreateVisible(false)}
      >
        <div className="flex flex-column gap-3 pt-2">
          <div>
            <label htmlFor="alert-title" className="tenant-form-label">{t('alerts.dialog.titleLabel')}</label>
            <InputText
              id="alert-title"
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              className="w-full"
            />
          </div>
          <div>
            <label htmlFor="alert-description" className="tenant-form-label">{t('alerts.dialog.descriptionLabel')}</label>
            <InputTextarea
              id="alert-description"
              rows={4}
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              className="w-full"
            />
          </div>
          <div>
            <label htmlFor="alert-severity" className="tenant-form-label">{t('alerts.dialog.severity')}</label>
            <Dropdown
              id="alert-severity"
              value={form.severity}
              options={severityOptions}
              onChange={(event) => setForm((prev) => ({ ...prev, severity: event.value as AlertForm['severity'] }))}
              className="w-full"
            />
          </div>
          <div>
            <label htmlFor="alert-source-ip" className="tenant-form-label">{t('alerts.dialog.sourceIp')}</label>
            <InputText
              id="alert-source-ip"
              value={form.sourceIp}
              onChange={(event) => setForm((prev) => ({ ...prev, sourceIp: event.target.value }))}
              className="w-full"
            />
          </div>
          <div>
            <label htmlFor="alert-rule-id" className="tenant-form-label">{t('alerts.dialog.ruleId')}</label>
            <InputText
              id="alert-rule-id"
              value={form.ruleId}
              onChange={(event) => setForm((prev) => ({ ...prev, ruleId: event.target.value }))}
              className="w-full"
            />
          </div>
          <Button
            label={t('common.create')}
            onClick={() => {
              void createAlert();
            }}
          />
        </div>
      </Dialog>
    </div>
  );
};

export default AlertsPage;
