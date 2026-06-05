import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/TenantButton';
import { InputNumber } from 'primereact/inputnumber';
import { Message } from 'primereact/message';
import { useTranslation } from 'react-i18next';
import api from '../../api';
import { AuthPolicy } from '../../types/auth-policy';

const AuthSettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState<AuthPolicy>({
    maxLoginFailures: 3,
    lockMinutes: 5,
    maxConcurrentSessions: 1,
    autoLogoutTimeoutMinutes: 5,
  });

  const invalidTimeout = useMemo(() => {
    const timeout = form.autoLogoutTimeoutMinutes;
    return timeout !== 0 && (timeout < 1 || timeout > 30);
  }, [form.autoLogoutTimeoutMinutes]);

  const loadSettings = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get<AuthPolicy>('/api/auth-settings');
      setForm(response.data);
    } catch (loadError: any) {
      const responseMessage = loadError?.response?.data?.message;
      const message = Array.isArray(responseMessage) ? responseMessage.join(', ') : responseMessage;
      setError(message || t('authSettings.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSettings();
  }, []);

  const handleSave = async () => {
    setError('');
    setSuccess('');

    if (invalidTimeout) {
      setError(t('authSettings.validation.autoLogoutTimeoutMinutes'));
      return;
    }

    setSaving(true);
    try {
      const response = await api.patch<AuthPolicy>('/api/auth-settings', form);
      setForm(response.data);
      setSuccess(t('authSettings.saveSuccess'));
    } catch (saveError: any) {
      const responseMessage = saveError?.response?.data?.message;
      const message = Array.isArray(responseMessage) ? responseMessage.join(', ') : responseMessage;
      setError(message || t('authSettings.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="tenant-page">
      <div className="tenant-page-header">
        <div>
          <h1 className="tenant-page-title">{t('authSettings.title')}</h1>
          <p className="tenant-page-subtitle">{t('authSettings.description')}</p>
        </div>
      </div>

      {error && <Message severity="error" text={error} className="w-full mb-3" />}
      {success && <Message severity="success" text={success} className="w-full mb-3" />}

      <div className="tenant-card p-4" style={{ maxWidth: '700px' }}>
        <div className="grid">
          <div className="col-12 md:col-6">
            <label htmlFor="max-login-failures" className="tenant-form-label">
              {t('authSettings.maxLoginFailures.label')}
            </label>
            <InputNumber
              id="max-login-failures"
              value={form.maxLoginFailures}
              min={1}
              max={5}
              useGrouping={false}
              className="w-full"
              onValueChange={(event) => setForm((prev) => ({ ...prev, maxLoginFailures: event.value ?? 1 }))}
              disabled={loading}
            />
            <small className="text-color-secondary">{t('authSettings.maxLoginFailures.help')}</small>
          </div>

          <div className="col-12 md:col-6">
            <label htmlFor="lock-minutes" className="tenant-form-label">
              {t('authSettings.lockMinutes.label')}
            </label>
            <InputNumber
              id="lock-minutes"
              value={form.lockMinutes}
              min={3}
              max={30}
              useGrouping={false}
              className="w-full"
              onValueChange={(event) => setForm((prev) => ({ ...prev, lockMinutes: event.value ?? 3 }))}
              disabled={loading}
            />
            <small className="text-color-secondary">{t('authSettings.lockMinutes.help')}</small>
          </div>

          <div className="col-12 md:col-6">
            <label htmlFor="max-concurrent-sessions" className="tenant-form-label">
              {t('authSettings.maxConcurrentSessions.label')}
            </label>
            <InputNumber
              id="max-concurrent-sessions"
              value={form.maxConcurrentSessions}
              min={1}
              max={5}
              useGrouping={false}
              className="w-full"
              onValueChange={(event) => setForm((prev) => ({ ...prev, maxConcurrentSessions: event.value ?? 1 }))}
              disabled={loading}
            />
            <small className="text-color-secondary">{t('authSettings.maxConcurrentSessions.help')}</small>
          </div>

          <div className="col-12 md:col-6">
            <label htmlFor="auto-logout-timeout" className="tenant-form-label">
              {t('authSettings.autoLogoutTimeoutMinutes.label')}
            </label>
            <InputNumber
              id="auto-logout-timeout"
              value={form.autoLogoutTimeoutMinutes}
              min={0}
              max={30}
              useGrouping={false}
              className="w-full"
              onValueChange={(event) => setForm((prev) => ({ ...prev, autoLogoutTimeoutMinutes: event.value ?? 0 }))}
              disabled={loading}
            />
            <small className="text-color-secondary">{t('authSettings.autoLogoutTimeoutMinutes.help')}</small>
          </div>
        </div>

        <div className="flex justify-content-end mt-4">
          <Button
            className="tenant-primary-action"
            label={t('common.save')}
            icon="pi pi-save"
            onClick={() => {
              void handleSave();
            }}
            loading={saving}
            disabled={loading}
          />
        </div>
      </div>
    </div>
  );
};

export default AuthSettingsPage;
