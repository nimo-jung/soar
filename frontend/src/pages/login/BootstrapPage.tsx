import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Button } from '@/components/TenantButton';
import { Message } from 'primereact/message';
import api from '../../api';

const BootstrapPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();

  const defaultTenantSlug = useMemo(() => searchParams.get('tenantSlug') ?? '', [searchParams]);
  const defaultEmail = useMemo(() => searchParams.get('email') ?? '', [searchParams]);
  const defaultInvitationToken = useMemo(
    () => searchParams.get('invitationToken') ?? searchParams.get('token') ?? '',
    [searchParams],
  );

  const [tenantSlug, setTenantSlug] = useState(defaultTenantSlug);
  const [invitationToken, setInvitationToken] = useState(defaultInvitationToken);
  const [email, setEmail] = useState(defaultEmail);
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!tenantSlug || !invitationToken || !email || !displayName || !password) {
      setError(t('auth.bootstrap.errorEmpty'));
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await api.post('/auth/tenant/bootstrap', {
        tenantSlug,
        invitationToken,
        email,
        displayName,
        password,
      });

      setSuccess(t('auth.bootstrap.success'));

      window.setTimeout(() => {
        navigate(`/login?tenantSlug=${encodeURIComponent(tenantSlug)}&email=${encodeURIComponent(email)}`);
      }, 800);
    } catch {
      setError(t('auth.bootstrap.errorFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="layout-login-verona layout-login-bootstrap">
      <div className="layout-login-right">
        <div className="login-right-content">
          <div className="login-right-header">
            <h2>{t('auth.bootstrap.title')}</h2>
            <p>{t('auth.bootstrap.subtitle')}</p>
          </div>

          <div className="login-form">
            {error && <Message severity="error" text={error} className="w-full" />}
            {success && <Message severity="success" text={success} className="w-full" />}

            <div className="field">
              <label htmlFor="tenantSlug">{t('auth.tenantSlug')}</label>
              <InputText id="tenantSlug" value={tenantSlug} onChange={(e) => setTenantSlug(e.target.value)} className="w-full" />
            </div>

            <div className="field">
              <label htmlFor="invitationToken">{t('auth.bootstrap.invitationToken')}</label>
              <InputText id="invitationToken" value={invitationToken} onChange={(e) => setInvitationToken(e.target.value)} className="w-full" />
            </div>

            <div className="field">
              <label htmlFor="email">{t('common.email')}</label>
              <InputText id="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full" />
            </div>

            <div className="field">
              <label htmlFor="displayName">{t('users.dialog.displayName')}</label>
              <InputText id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full" />
            </div>

            <div className="field">
              <label htmlFor="password">{t('common.password')}</label>
              <Password
                inputId="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
                buttonSize="default"
                label={t('auth.bootstrap.goLogin')}
                onClick={() => navigate('/login')}
              />
              <Button
                type="button"
                className="w-full"
                buttonSize="default"
                label={t('auth.bootstrap.submit')}
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

export default BootstrapPage;
