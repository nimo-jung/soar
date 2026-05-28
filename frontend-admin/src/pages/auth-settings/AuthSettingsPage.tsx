import React, { useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Dialog } from 'primereact/dialog';
import { InputNumber } from 'primereact/inputnumber';
import { useTranslation } from 'react-i18next';
import api from '../../api';
import type { AuthPolicy } from '../../types/auth-policy';

interface ResultDialogState {
  visible: boolean;
  title: string;
  message: string;
}

const AuthSettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resultDialog, setResultDialog] = useState<ResultDialogState>({
    visible: false,
    title: '',
    message: '',
  });
  const [form, setForm] = useState<AuthPolicy>({
    maxLoginFailures: 3,
    lockMinutes: 5,
    maxConcurrentSessions: 1,
    autoLogoutTimeoutMinutes: 5,
  });

  const invalidMaxLoginFailures = useMemo(() => (
    form.maxLoginFailures < 1 || form.maxLoginFailures > 5
  ), [form.maxLoginFailures]);

  const invalidLockMinutes = useMemo(() => (
    form.lockMinutes < 3 || form.lockMinutes > 30
  ), [form.lockMinutes]);

  const invalidMaxConcurrentSessions = useMemo(() => (
    form.maxConcurrentSessions < 1 || form.maxConcurrentSessions > 5
  ), [form.maxConcurrentSessions]);

  const invalidTimeout = useMemo(() => {
    const timeout = form.autoLogoutTimeoutMinutes;
    return timeout !== 0 && (timeout < 1 || timeout > 30);
  }, [form.autoLogoutTimeoutMinutes]);

  const hasInvalidForm = invalidMaxLoginFailures
    || invalidLockMinutes
    || invalidMaxConcurrentSessions
    || invalidTimeout;

  const openResultDialog = (title: string, message: string) => {
    setResultDialog({
      visible: true,
      title,
      message,
    });
  };

  const extractApiMessage = (error: unknown): string => {
    const rawMessage = (error as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
    if (typeof rawMessage === 'string') {
      return rawMessage;
    }
    if (Array.isArray(rawMessage)) {
      return rawMessage.filter((item): item is string => typeof item === 'string').join(', ');
    }
    return '';
  };

  const loadSettings = async () => {
    setLoading(true);
    try {
      const response = await api.get<AuthPolicy>('/admin/auth-settings');
      setForm(response.data);
    } catch (loadError: unknown) {
      const message = extractApiMessage(loadError) || t('authSettings.loadFailed');
      openResultDialog(t('authSettings.resultDialog.failedTitle'), message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSettings();
  }, []);

  const handleSave = async () => {
    if (hasInvalidForm) {
      return;
    }

    setSaving(true);
    try {
      const response = await api.patch<AuthPolicy>('/admin/auth-settings', form);
      setForm(response.data);
      openResultDialog(t('authSettings.resultDialog.successTitle'), t('authSettings.saveSuccess'));
    } catch (saveError: unknown) {
      const message = extractApiMessage(saveError) || t('authSettings.saveFailed');
      openResultDialog(t('authSettings.resultDialog.failedTitle'), message);
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
      <Dialog
        visible={resultDialog.visible}
        header={resultDialog.title}
        style={{ width: '420px', maxWidth: '96vw' }}
        onHide={() => setResultDialog((prev) => ({ ...prev, visible: false }))}
        footer={(
          <div className="flex justify-content-end">
            <Button
              label={t('common.confirm')}
              onClick={() => setResultDialog((prev) => ({ ...prev, visible: false }))}
            />
          </div>
        )}
      >
        <p className="m-0">{resultDialog.message}</p>
      </Dialog>

      <Card className="admin-card monitoring-panel-card" style={{ maxWidth: '760px' }}>
        <div className="grid">
          <div className="col-12">
            <label htmlFor="max-login-failures" className="admin-form-label">{t('authSettings.maxLoginFailures.label')}</label>
            <InputNumber
              id="max-login-failures"
              value={form.maxLoginFailures}
              useGrouping={false}
              className="w-full"
              onValueChange={(event) => {
                const nextValue = event.value;
                if (typeof nextValue === 'number' && Number.isFinite(nextValue)) {
                  setForm((prev) => ({ ...prev, maxLoginFailures: nextValue }));
                }
              }}
              disabled={loading}
              invalid={invalidMaxLoginFailures}
            />
            {invalidMaxLoginFailures && (
              <small className="p-error block mt-1">{t('authSettings.validation.maxLoginFailures')}</small>
            )}
            <small className="text-color-secondary">{t('authSettings.maxLoginFailures.help')}</small>
          </div>

          <div className="col-12">
            <label htmlFor="lock-minutes" className="admin-form-label">{t('authSettings.lockMinutes.label')}</label>
            <InputNumber
              id="lock-minutes"
              value={form.lockMinutes}
              useGrouping={false}
              className="w-full"
              onValueChange={(event) => {
                const nextValue = event.value;
                if (typeof nextValue === 'number' && Number.isFinite(nextValue)) {
                  setForm((prev) => ({ ...prev, lockMinutes: nextValue }));
                }
              }}
              disabled={loading}
              invalid={invalidLockMinutes}
            />
            {invalidLockMinutes && (
              <small className="p-error block mt-1">{t('authSettings.validation.lockMinutes')}</small>
            )}
            <small className="text-color-secondary">{t('authSettings.lockMinutes.help')}</small>
          </div>

          <div className="col-12">
            <label htmlFor="max-concurrent-sessions" className="admin-form-label">{t('authSettings.maxConcurrentSessions.label')}</label>
            <InputNumber
              id="max-concurrent-sessions"
              value={form.maxConcurrentSessions}
              useGrouping={false}
              className="w-full"
              onValueChange={(event) => {
                const nextValue = event.value;
                if (typeof nextValue === 'number' && Number.isFinite(nextValue)) {
                  setForm((prev) => ({ ...prev, maxConcurrentSessions: nextValue }));
                }
              }}
              disabled={loading}
              invalid={invalidMaxConcurrentSessions}
            />
            {invalidMaxConcurrentSessions && (
              <small className="p-error block mt-1">{t('authSettings.validation.maxConcurrentSessions')}</small>
            )}
            <small className="text-color-secondary">{t('authSettings.maxConcurrentSessions.help')}</small>
          </div>

          <div className="col-12">
            <label htmlFor="auto-logout-timeout" className="admin-form-label">{t('authSettings.autoLogoutTimeoutMinutes.label')}</label>
            <InputNumber
              id="auto-logout-timeout"
              value={form.autoLogoutTimeoutMinutes}
              useGrouping={false}
              className="w-full"
              onValueChange={(event) => {
                const nextValue = event.value;
                if (typeof nextValue === 'number' && Number.isFinite(nextValue)) {
                  setForm((prev) => ({ ...prev, autoLogoutTimeoutMinutes: nextValue }));
                }
              }}
              disabled={loading}
              invalid={invalidTimeout}
            />
            {invalidTimeout && (
              <small className="p-error block mt-1">{t('authSettings.validation.autoLogoutTimeoutMinutes')}</small>
            )}
            <small className="text-color-secondary">{t('authSettings.autoLogoutTimeoutMinutes.help')}</small>
          </div>
        </div>

        <div className="flex justify-content-end mt-4">
          <Button
            label={t('common.save')}
            icon="pi pi-save"
            onClick={() => {
              void handleSave();
            }}
            loading={saving}
            disabled={loading || hasInvalidForm}
          />
        </div>
      </Card>
    </div>
  );
};

export default AuthSettingsPage;
