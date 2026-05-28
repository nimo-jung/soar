import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Button } from 'primereact/button';
import { Message } from 'primereact/message';
import api from '../../api';

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();

  const defaultTenantSlug = useMemo(() => searchParams.get('tenantSlug') ?? '', [searchParams]);
  const defaultEmail = useMemo(() => searchParams.get('email') ?? '', [searchParams]);
  const defaultResetToken = useMemo(() => searchParams.get('resetToken') ?? '', [searchParams]);

  const [tenantSlug, setTenantSlug] = useState(defaultTenantSlug);
  const [email, setEmail] = useState(defaultEmail);
  const [resetToken, setResetToken] = useState(defaultResetToken);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!tenantSlug || !email || !resetToken || !newPassword || !confirmPassword) {
      setError(t('auth.resetPassword.errorEmpty'));
      return;
    }

    if (newPassword.length < 8) {
      setError(t('auth.resetPassword.errorPasswordTooShort'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t('auth.resetPassword.errorPasswordMismatch'));
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await api.post('/auth/tenant/password/reset', {
        tenantSlug,
        resetToken,
        email,
        newPassword,
      });

      setSuccess(t('auth.resetPassword.success'));

      window.setTimeout(() => {
        navigate(`/login?tenantSlug=${encodeURIComponent(tenantSlug)}&email=${encodeURIComponent(email)}`);
      }, 800);
    } catch {
      setError(t('auth.resetPassword.errorFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="layout-login-verona layout-login-reset">
      <div className="layout-login-right">
        <div className="login-right-content">
          <div className="login-right-header">
            <h2>{t('auth.resetPassword.title')}</h2>
            <p>{t('auth.resetPassword.subtitle')}</p>
          </div>

          <div className="login-form">
            {error && <Message severity="error" text={error} className="w-full" />}
            {success && <Message severity="success" text={success} className="w-full" />}

            <div className="field">
              <label htmlFor="tenantSlug">{t('auth.tenantSlug')}</label>
              <InputText id="tenantSlug" value={tenantSlug} onChange={(e) => setTenantSlug(e.target.value)} className="w-full" />
            </div>

            <div className="field">
              <label htmlFor="email">{t('common.email')}</label>
              <InputText id="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full" />
            </div>

            <div className="field">
              <label htmlFor="resetToken">{t('auth.resetPassword.token')}</label>
              <InputText id="resetToken" value={resetToken} onChange={(e) => setResetToken(e.target.value)} className="w-full" />
            </div>

            <div className="field">
              <label htmlFor="newPassword">{t('auth.resetPassword.newPassword')}</label>
              <Password
                inputId="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full"
                inputClassName="w-full"
                feedback={false}
                toggleMask
              />
              <small className="text-color-secondary">{t('auth.resetPassword.passwordPolicy')}</small>
            </div>

            <div className="field">
              <label htmlFor="confirmPassword">{t('auth.resetPassword.confirmPassword')}</label>
              <Password
                inputId="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full"
                inputClassName="w-full"
                feedback={false}
                toggleMask
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                outlined
                className="w-full"
                label={t('auth.resetPassword.goLogin')}
                onClick={() => navigate('/login')}
              />
              <Button
                type="button"
                className="w-full"
                label={t('auth.resetPassword.submit')}
                icon="pi pi-check"
                loading={loading}
                onClick={handleSubmit}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
