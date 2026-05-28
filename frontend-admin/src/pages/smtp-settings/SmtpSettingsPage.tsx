import React, { useEffect, useState } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Checkbox } from 'primereact/checkbox';
import { Dialog } from 'primereact/dialog';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { SelectButton } from 'primereact/selectbutton';
import { useTranslation } from 'react-i18next';
import api from '../../api';

type SmtpMode = 'local' | 'external';

interface SmtpSettingsForm {
  smtpMode: SmtpMode;
  smtpHost: string;
  smtpPort: number | null;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPass: string;
  smtpFrom: string;
  tenantBootstrapUrl: string;
  hasSmtpPass: boolean;
  clearSmtpPass: boolean;
}

interface SmtpTestMailResponse {
  success: boolean;
  mode: SmtpMode;
  host: string;
  port: number;
  secure: boolean;
  from: string;
  to: string;
  messageId: string | null;
  response: string | null;
}

interface ResultDialogState {
  visible: boolean;
  title: string;
  message: string;
}

const SmtpSettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingMail, setTestingMail] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [showValidation, setShowValidation] = useState(false);
  const [showTestValidation, setShowTestValidation] = useState(false);
  const [resultDialog, setResultDialog] = useState<ResultDialogState>({
    visible: false,
    title: '',
    message: '',
  });
  const [form, setForm] = useState<SmtpSettingsForm>({
    smtpMode: 'local',
    smtpHost: '',
    smtpPort: 587,
    smtpSecure: false,
    smtpUser: '',
    smtpPass: '',
    smtpFrom: '',
    tenantBootstrapUrl: '',
    hasSmtpPass: false,
    clearSmtpPass: false,
  });

  const modeOptions = [
    { label: t('smtpSettings.mode.local'), value: 'local' as const },
    { label: t('smtpSettings.mode.external'), value: 'external' as const },
  ];

  const isExternalMode = form.smtpMode === 'external';
  const smtpHostMissing = isExternalMode && showValidation && form.smtpHost.trim().length === 0;
  const smtpFromMissing = isExternalMode && showValidation && form.smtpFrom.trim().length === 0;
  const smtpPortInvalid = isExternalMode
    && showValidation
    && (!form.smtpPort || form.smtpPort < 1 || form.smtpPort > 65535);
  const normalizedTestEmail = testEmail.trim().toLowerCase();
  const testEmailMissing = showTestValidation && normalizedTestEmail.length === 0;
  const testEmailInvalid = showTestValidation
    && normalizedTestEmail.length > 0
    && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedTestEmail);
  const canSendTestMail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedTestEmail);

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
      const response = await api.get<SmtpSettingsForm>('/admin/smtp-settings');
      setForm((prev) => ({
        ...prev,
        ...response.data,
        smtpHost: response.data.smtpHost ?? '',
        smtpPort: response.data.smtpPort ?? 587,
        smtpUser: response.data.smtpUser ?? '',
        smtpPass: '',
        smtpFrom: response.data.smtpFrom ?? '',
        tenantBootstrapUrl: response.data.tenantBootstrapUrl ?? '',
        hasSmtpPass: response.data.hasSmtpPass ?? false,
        clearSmtpPass: false,
      }));
    } catch (loadError: unknown) {
      const message = extractApiMessage(loadError) || t('smtpSettings.loadFailed');
      openResultDialog(t('smtpSettings.resultDialog.failedTitle'), message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSettings();
  }, []);

  useEffect(() => {
    if (form.smtpMode === 'local') {
      setShowValidation(false);
    }
  }, [form.smtpMode]);

  const handleSave = async () => {
    setShowValidation(true);

    const smtpHost = form.smtpHost.trim();
    const smtpFrom = form.smtpFrom.trim();
    if (smtpHostMissing || smtpFromMissing) {
      return;
    }

    if (smtpPortInvalid) {
      return;
    }

    setSaving(true);
    try {
      const payload = {
        smtpMode: form.smtpMode,
        smtpHost: smtpHost || undefined,
        smtpPort: form.smtpMode === 'external' ? form.smtpPort : undefined,
        smtpSecure: form.smtpMode === 'external' ? form.smtpSecure : false,
        smtpUser: form.smtpUser.trim() || undefined,
        smtpPass: form.smtpPass.trim() || undefined,
        clearSmtpPass: form.clearSmtpPass,
        smtpFrom: smtpFrom || undefined,
        tenantBootstrapUrl: form.tenantBootstrapUrl.trim() || undefined,
      };

      const response = await api.patch<SmtpSettingsForm>('/admin/smtp-settings', payload);
      setForm((prev) => ({
        ...prev,
        ...response.data,
        smtpHost: response.data.smtpHost ?? '',
        smtpPort: response.data.smtpPort ?? 587,
        smtpUser: response.data.smtpUser ?? '',
        smtpPass: '',
        smtpFrom: response.data.smtpFrom ?? '',
        tenantBootstrapUrl: response.data.tenantBootstrapUrl ?? '',
        hasSmtpPass: response.data.hasSmtpPass ?? false,
        clearSmtpPass: false,
      }));
      openResultDialog(t('smtpSettings.resultDialog.successTitle'), t('smtpSettings.saveSuccess'));
    } catch (saveError: unknown) {
      const message = extractApiMessage(saveError) || t('smtpSettings.saveFailed');
      openResultDialog(t('smtpSettings.resultDialog.failedTitle'), message);
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestMail = async () => {
    setShowTestValidation(true);
    if (testEmailMissing || testEmailInvalid) {
      return;
    }

    setTestingMail(true);
    try {
      const response = await api.post<SmtpTestMailResponse>('/admin/smtp-settings/test', { to: normalizedTestEmail });
      openResultDialog(
        t('smtpSettings.resultDialog.successTitle'),
        t('smtpSettings.test.success', {
          to: response.data.to,
          mode: response.data.mode,
          host: response.data.host,
          port: response.data.port,
        }),
      );
    } catch (testError: unknown) {
      const message = extractApiMessage(testError) || t('smtpSettings.test.failed');
      openResultDialog(t('smtpSettings.resultDialog.failedTitle'), message);
    } finally {
      setTestingMail(false);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">{t('smtpSettings.title')}</h1>
          <p className="admin-page-subtitle">{t('smtpSettings.description')}</p>
        </div>
      </div>
      <Dialog
        visible={resultDialog.visible}
        header={resultDialog.title}
        style={{ width: '460px', maxWidth: '96vw' }}
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
        <p className="m-0 line-height-3" style={{ color: 'var(--text-color, #111827)' }}>{resultDialog.message}</p>
      </Dialog>

      <Card className="admin-card monitoring-panel-card" style={{ maxWidth: '760px' }}>
        <div className="grid">
          <div className="col-12">
            <label htmlFor="smtp-mode" className="admin-form-label">{t('smtpSettings.mode.label')}</label>
            <SelectButton
              id="smtp-mode"
              value={form.smtpMode}
              options={modeOptions}
              onChange={(event) => setForm((prev) => ({ ...prev, smtpMode: event.value as SmtpMode }))}
              disabled={loading}
            />
            <small className="text-color-secondary block mt-2">{t('smtpSettings.mode.help')}</small>
          </div>

          <div className="col-12">
            <label htmlFor="smtp-host" className="admin-form-label">
              {t('smtpSettings.hostLabel')}
              {isExternalMode && <span className="text-red-500 ml-1">*</span>}
            </label>
            <InputText
              id="smtp-host"
              value={form.smtpHost}
              onChange={(event) => setForm((prev) => ({ ...prev, smtpHost: event.target.value }))}
              className="w-full"
              invalid={smtpHostMissing}
              disabled={loading || form.smtpMode === 'local'}
            />
            {smtpHostMissing && <small className="p-error block mt-1">{t('smtpSettings.validation.smtpHostRequired')}</small>}
          </div>

          <div className="col-12 md:col-6">
            <label htmlFor="smtp-port" className="admin-form-label">
              {t('smtpSettings.portLabel')}
              {isExternalMode && <span className="text-red-500 ml-1">*</span>}
            </label>
            <InputNumber
              id="smtp-port"
              value={form.smtpPort}
              min={1}
              max={65535}
              useGrouping={false}
              className="w-full"
              onValueChange={(event) => setForm((prev) => ({ ...prev, smtpPort: event.value ?? 587 }))}
              invalid={smtpPortInvalid}
              disabled={loading || form.smtpMode === 'local'}
            />
            {smtpPortInvalid && <small className="p-error block mt-1">{t('smtpSettings.validation.smtpPort')}</small>}
          </div>

          <div className="col-12 md:col-6">
            <div className="admin-form-label invisible" aria-hidden="true">&nbsp;</div>
            <div className="field-checkbox mb-0">
              <Checkbox
                inputId="smtp-secure"
                checked={form.smtpSecure}
                onChange={(event) => setForm((prev) => ({ ...prev, smtpSecure: event.checked ?? false }))}
                disabled={loading || form.smtpMode === 'local'}
              />
              <label htmlFor="smtp-secure">{t('smtpSettings.secureLabel')}</label>
            </div>
          </div>

          <div className="col-12 md:col-6">
            <label htmlFor="smtp-user" className="admin-form-label">{t('smtpSettings.userLabel')}</label>
            <InputText
              id="smtp-user"
              value={form.smtpUser}
              onChange={(event) => setForm((prev) => ({ ...prev, smtpUser: event.target.value }))}
              className="w-full"
              disabled={loading || form.smtpMode === 'local'}
            />
          </div>

          <div className="col-12 md:col-6">
            <label htmlFor="smtp-pass" className="admin-form-label">{t('smtpSettings.passLabel')}</label>
            <InputText
              id="smtp-pass"
              type="password"
              value={form.smtpPass}
              onChange={(event) => setForm((prev) => ({
                ...prev,
                smtpPass: event.target.value,
                clearSmtpPass: false,
              }))}
              className="w-full"
              disabled={loading || form.smtpMode === 'local'}
              placeholder={t('smtpSettings.passPlaceholder')}
            />
            <small className="text-color-secondary block mt-1">
              {form.hasSmtpPass ? t('smtpSettings.passSaved') : t('smtpSettings.passNotSaved')}
            </small>
            {form.hasSmtpPass && (
              <Button
                className="mt-2"
                type="button"
                outlined
                size="small"
                label={t('smtpSettings.clearPassButton')}
                onClick={() => setForm((prev) => ({ ...prev, smtpPass: '', clearSmtpPass: true }))}
                disabled={loading || form.smtpMode === 'local'}
              />
            )}
          </div>

          <div className="col-12">
            <label htmlFor="smtp-from" className="admin-form-label">
              {t('smtpSettings.fromLabel')}
              {isExternalMode && <span className="text-red-500 ml-1">*</span>}
            </label>
            <InputText
              id="smtp-from"
              value={form.smtpFrom}
              onChange={(event) => setForm((prev) => ({ ...prev, smtpFrom: event.target.value }))}
              className="w-full"
              invalid={smtpFromMissing}
              disabled={loading || form.smtpMode === 'local'}
            />
            {smtpFromMissing && <small className="p-error block mt-1">{t('smtpSettings.validation.smtpFromRequired')}</small>}
          </div>

          <div className="col-12">
            <label htmlFor="tenant-bootstrap-url" className="admin-form-label">{t('smtpSettings.bootstrapUrlLabel')}</label>
            <InputText
              id="tenant-bootstrap-url"
              value={form.tenantBootstrapUrl}
              onChange={(event) => setForm((prev) => ({ ...prev, tenantBootstrapUrl: event.target.value }))}
              className="w-full"
              disabled={loading}
              placeholder={t('smtpSettings.bootstrapUrlPlaceholder')}
            />
            <small className="text-color-secondary">{t('smtpSettings.bootstrapUrlHelp')}</small>
          </div>

          <div className="col-12">
            <label htmlFor="smtp-test-to" className="admin-form-label">{t('smtpSettings.test.toLabel')}</label>
            <InputText
              id="smtp-test-to"
              value={testEmail}
              onChange={(event) => setTestEmail(event.target.value)}
              className="w-full"
              disabled={loading || testingMail}
              placeholder={t('smtpSettings.test.toPlaceholder')}
              invalid={testEmailMissing || testEmailInvalid}
            />
            {testEmailMissing && <small className="p-error block mt-1">{t('smtpSettings.test.validation.toRequired')}</small>}
            {testEmailInvalid && <small className="p-error block mt-1">{t('smtpSettings.test.validation.toInvalid')}</small>}
            <small className="text-color-secondary">{t('smtpSettings.test.help')}</small>
          </div>
        </div>

        <div className="flex justify-content-end mt-4 gap-2">
          <Button
            label={t('smtpSettings.test.sendButton')}
            icon="pi pi-send"
            outlined
            onClick={() => {
              void handleSendTestMail();
            }}
            loading={testingMail}
            disabled={loading || saving || testingMail || !canSendTestMail}
          />
          <Button
            label={t('common.save')}
            icon="pi pi-save"
            onClick={() => {
              void handleSave();
            }}
            loading={saving}
            disabled={loading}
          />
        </div>
      </Card>
    </div>
  );
};

export default SmtpSettingsPage;
