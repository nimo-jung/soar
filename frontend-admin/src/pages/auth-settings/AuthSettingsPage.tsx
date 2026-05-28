import React, { useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Dialog } from 'primereact/dialog';
import { InputNumber } from 'primereact/inputnumber';
import { InputSwitch } from 'primereact/inputswitch';
import { useTranslation } from 'react-i18next';
import api from '../../api';
import type { AdminAuthSettings } from '../../types/auth-policy';
import ResultDialog, { type ResultDialogTone } from '../../components/ResultDialog';

interface ResultDialogState {
  visible: boolean;
  title: string;
  message: string;
  icon: string;
  tone: ResultDialogTone;
  actionItems: string[];
}

interface TenantForModeCheck {
  slug: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'DELETED';
}

const AuthSettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resultDialog, setResultDialog] = useState<ResultDialogState>({
    visible: false,
    title: '',
    message: '',
    icon: 'pi pi-info-circle',
    tone: 'info',
    actionItems: [],
  });
  const [multiTenantConfirmVisible, setMultiTenantConfirmVisible] = useState(false);
  const [pendingMultiTenantValue, setPendingMultiTenantValue] = useState<boolean | null>(null);
  const [nonSystemEnabledTenantCount, setNonSystemEnabledTenantCount] = useState(0);
  const [form, setForm] = useState<AdminAuthSettings>({
    maxLoginFailures: 3,
    lockMinutes: 5,
    maxConcurrentSessions: 1,
    autoLogoutTimeoutMinutes: 5,
    isMultiTenantEnabled: false,
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

  const openResultDialog = (
    title: string,
    message: string,
    options?: Partial<Pick<ResultDialogState, 'icon' | 'tone' | 'actionItems'>>,
  ) => {
    setResultDialog({
      visible: true,
      title,
      message,
      icon: options?.icon ?? 'pi pi-info-circle',
      tone: options?.tone ?? 'info',
      actionItems: options?.actionItems ?? [],
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
      const [settingsRes, tenantsRes] = await Promise.all([
        api.get<AdminAuthSettings>('/admin/auth-settings'),
        api.get<TenantForModeCheck[]>('/admin/tenants'),
      ]);

      setForm(settingsRes.data);
      const count = tenantsRes.data.filter((tenant) => (
        tenant.slug.trim().toLowerCase() !== 'system'
        && (tenant.status === 'ACTIVE' || tenant.status === 'SUSPENDED')
      )).length;
      setNonSystemEnabledTenantCount(count);
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
      const response = await api.patch<AdminAuthSettings>('/admin/auth-settings', form);
      setForm(response.data);
      openResultDialog(t('authSettings.resultDialog.successTitle'), t('authSettings.saveSuccess'));
    } catch (saveError: unknown) {
      const message = extractApiMessage(saveError) || t('authSettings.saveFailed');
      openResultDialog(t('authSettings.resultDialog.failedTitle'), message);
    } finally {
      setSaving(false);
    }
  };

  const requestMultiTenantToggle = (nextValue: boolean) => {
    if (nextValue === form.isMultiTenantEnabled) {
      return;
    }

    if (!nextValue && nonSystemEnabledTenantCount > 0) {
      openResultDialog(
        t('authSettings.multiTenantMode.disableBlockedTitle'),
        t('authSettings.multiTenantMode.disableBlockedMessage', { count: nonSystemEnabledTenantCount }),
        {
          icon: 'pi pi-exclamation-triangle',
          tone: 'error',
          actionItems: [
            t('authSettings.multiTenantMode.requiredActionDeleteTenants', { count: nonSystemEnabledTenantCount }),
            t('authSettings.multiTenantMode.requiredActionRetryDisable'),
          ],
        },
      );
      return;
    }

    setPendingMultiTenantValue(nextValue);
    setMultiTenantConfirmVisible(true);
  };

  const closeMultiTenantConfirm = () => {
    setPendingMultiTenantValue(null);
    setMultiTenantConfirmVisible(false);
  };

  const confirmMultiTenantToggle = () => {
    if (pendingMultiTenantValue === null) {
      closeMultiTenantConfirm();
      return;
    }

    setForm((prev) => ({ ...prev, isMultiTenantEnabled: pendingMultiTenantValue }));
    closeMultiTenantConfirm();
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
        visible={multiTenantConfirmVisible}
        header={t('authSettings.multiTenantMode.confirmTitle')}
        style={{ width: '460px', maxWidth: '96vw' }}
        onHide={closeMultiTenantConfirm}
        footer={(
          <div className="flex justify-content-end gap-2">
            <Button
              label={t('common.cancel')}
              severity="secondary"
              text
              onClick={closeMultiTenantConfirm}
            />
            <Button
              label={t('common.confirm')}
              onClick={confirmMultiTenantToggle}
            />
          </div>
        )}
      >
        <p className="m-0 line-height-3">
          {pendingMultiTenantValue
            ? t('authSettings.multiTenantMode.confirmMessageEnable')
            : t('authSettings.multiTenantMode.confirmMessageDisable', { count: nonSystemEnabledTenantCount })}
        </p>
      </Dialog>

      <ResultDialog
        visible={resultDialog.visible}
        title={resultDialog.title}
        message={resultDialog.message}
        tone={resultDialog.tone}
        icon={resultDialog.icon}
        actionRequiredTitle={t('authSettings.multiTenantMode.actionRequiredTitle')}
        actionItems={resultDialog.actionItems}
        confirmLabel={t('common.confirm')}
        onHide={() => setResultDialog((prev) => ({ ...prev, visible: false }))}
        width="420px"
      />

      <Card className="admin-card monitoring-panel-card" style={{ maxWidth: '760px' }}>
        <div className="grid">
          <div className="col-12">
            <label htmlFor="multi-tenant-enabled" className="admin-form-label">{t('authSettings.multiTenantMode.label')}</label>
            <div className="flex align-items-center gap-3 mt-2">
              <InputSwitch
                id="multi-tenant-enabled"
                checked={form.isMultiTenantEnabled}
                onChange={(event) => requestMultiTenantToggle(Boolean(event.value))}
                disabled={loading}
              />
              <span className="font-medium">
                {form.isMultiTenantEnabled
                  ? t('authSettings.multiTenantMode.enabled')
                  : t('authSettings.multiTenantMode.disabled')}
              </span>
            </div>
            <small className="text-color-secondary block mt-2">{t('authSettings.multiTenantMode.help')}</small>
            <small className="text-color-secondary block mt-1">
              {form.isMultiTenantEnabled
                ? t('authSettings.multiTenantMode.impactEnabled')
                : t('authSettings.multiTenantMode.impactDisabled')}
            </small>
            {!form.isMultiTenantEnabled && nonSystemEnabledTenantCount > 0 && (
              <small className="p-error block mt-1">
                {t('authSettings.multiTenantMode.nonSystemTenantWarning', { count: nonSystemEnabledTenantCount })}
              </small>
            )}
          </div>

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
