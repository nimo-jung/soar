import React, { useEffect, useMemo, useState } from 'react';
import { Card } from 'primereact/card';
import { InputNumber } from 'primereact/inputnumber';
import { InputSwitch } from 'primereact/inputswitch';
import { Message } from 'primereact/message';
import { Button } from '@/components/TenantButton';
import { useTranslation } from 'react-i18next';
import api from '@/api';
import type { AdminAuthSettings } from '@/types/auth-policy';

const defaultForm: AdminAuthSettings = {
  maxLoginFailures: 3,
  lockMinutes: 5,
  maxConcurrentSessions: 1,
  autoLogoutTimeoutMinutes: 5,
  isMultiTenantEnabled: true,
};

const AuthSettingsSystemPage: React.FC = () => {
  const { t } = useTranslation();
  const [form, setForm] = useState<AdminAuthSettings>(defaultForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isInvalid = useMemo(() => {
    if (form.maxLoginFailures < 1 || form.maxLoginFailures > 10) return true;
    if (form.lockMinutes < 1 || form.lockMinutes > 120) return true;
    if (form.maxConcurrentSessions < 1 || form.maxConcurrentSessions > 20) return true;
    if (form.autoLogoutTimeoutMinutes < 0 || form.autoLogoutTimeoutMinutes > 720) return true;
    return false;
  }, [form]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get<AdminAuthSettings>('/admin/auth-settings');
      setForm(response.data);
    } catch (requestError: any) {
      const message = Array.isArray(requestError?.response?.data?.message)
        ? requestError.response.data.message.join(', ')
        : requestError?.response?.data?.message;
      setError(message || t('authSettings.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async () => {
    if (isInvalid) {
      setError(t('authSettings.validation.rangeValues'));
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const response = await api.patch<AdminAuthSettings>('/admin/auth-settings', form);
      setForm(response.data);
      setSuccess(t('authSettings.saveSuccess'));
    } catch (requestError: any) {
      const message = Array.isArray(requestError?.response?.data?.message)
        ? requestError.response.data.message.join(', ')
        : requestError?.response?.data?.message;
      setError(message || t('authSettings.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">{t('authSettings.title')}</h1>
          <p className="admin-page-subtitle">{t('authSettings.description')}</p>
        </div>
      </div>

      <Card className="admin-card monitoring-panel-card" style={{ maxWidth: '760px' }}>
        {error && <Message severity="error" text={error} className="w-full mb-3" />}
        {success && <Message severity="success" text={success} className="w-full mb-3" />}

        <div className="grid formgrid">
          <div className="col-12 md:col-6">
            <label className="block mb-2">{t('authSettings.multiTenantMode.label')}</label>
            <InputSwitch
              checked={form.isMultiTenantEnabled}
              onChange={(event) => setForm((prev) => ({ ...prev, isMultiTenantEnabled: Boolean(event.value) }))}
              disabled={loading || saving}
            />
          </div>

          <div className="col-12 md:col-6">
            <label className="block mb-2">{t('authSettings.maxLoginFailures.label')}</label>
            <InputNumber
              value={form.maxLoginFailures}
              onValueChange={(event) => setForm((prev) => ({ ...prev, maxLoginFailures: Number(event.value ?? 0) }))}
              min={1}
              max={10}
              useGrouping={false}
              disabled={loading || saving}
              className="w-full"
            />
          </div>

          <div className="col-12 md:col-6">
            <label className="block mb-2">{t('authSettings.lockMinutes.label')}</label>
            <InputNumber
              value={form.lockMinutes}
              onValueChange={(event) => setForm((prev) => ({ ...prev, lockMinutes: Number(event.value ?? 0) }))}
              min={1}
              max={120}
              useGrouping={false}
              disabled={loading || saving}
              className="w-full"
            />
          </div>

          <div className="col-12 md:col-6">
            <label className="block mb-2">{t('authSettings.maxConcurrentSessions.label')}</label>
            <InputNumber
              value={form.maxConcurrentSessions}
              onValueChange={(event) => setForm((prev) => ({ ...prev, maxConcurrentSessions: Number(event.value ?? 0) }))}
              min={1}
              max={20}
              useGrouping={false}
              disabled={loading || saving}
              className="w-full"
            />
          </div>

          <div className="col-12 md:col-6">
            <label className="block mb-2">{t('authSettings.autoLogoutTimeoutMinutes.label')}</label>
            <InputNumber
              value={form.autoLogoutTimeoutMinutes}
              onValueChange={(event) => setForm((prev) => ({ ...prev, autoLogoutTimeoutMinutes: Number(event.value ?? 0) }))}
              min={0}
              max={720}
              useGrouping={false}
              disabled={loading || saving}
              className="w-full"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          <Button label={t('common.refresh')} icon="pi pi-refresh" severity="secondary" onClick={() => void load()} loading={loading} />
          <Button label={t('common.save')} icon="pi pi-save" onClick={() => void save()} loading={saving} disabled={loading || isInvalid} />
        </div>
      </Card>
    </div>
  );
};

export default AuthSettingsSystemPage;
