import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Button } from 'primereact/button';
import { Message } from 'primereact/message';
import api from '../../api';
import { useAuthStore } from '../../store/auth.store';
import { useBrandingStore } from '../../store/branding.store';
import { parseJwt } from '../../utils/jwt';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const setAuth = useAuthStore((s) => s.setAuth);
  const applyBranding = useBrandingStore((s) => s.applyBranding);
  const branding = useBrandingStore((s) => s.branding);

  const [tenantSlug, setTenantSlug] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!tenantSlug || !email || !password) {
      setError(t('auth.errorEmpty'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.post<{ accessToken: string; brandingConfig: Record<string, string> | null }>(
        '/auth/tenant/login',
        { tenantSlug, email, password },
      );
      const payload = parseJwt(res.data.accessToken);
      setAuth(res.data.accessToken, { sub: payload.sub, tenantId: payload.tenantId, role: payload.role });
      applyBranding(res.data.brandingConfig);
      navigate('/dashboard');
    } catch {
      setError(t('auth.errorInvalid'));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLogin();
  };

  /* Apply branding gradient variables before mount */
  const gradientStyle = branding.primaryColor
    ? { '--brand-gradient-from': branding.primaryColor, '--brand-gradient-to': branding.primaryColor + '88' } as React.CSSProperties
    : {};

  return (
    <div className="layout-login-verona" style={gradientStyle}>
      {/* ── Left decorative panel ── */}
      <div className="layout-login-left">
        <div className="login-left-content">
          <div className="login-left-logo">
            {branding.logoUrl ? (
              <img src={branding.logoUrl} alt="logo" />
            ) : (
              <i className="pi pi-shield logo-icon" />
            )}
            <span className="logo-name">{branding.companyName ?? 'SOAR'}</span>
          </div>

          <p className="login-left-tagline">
            {t('auth.tagline').split('\n').map((line, i) => (
              <React.Fragment key={i}>{line}{i === 0 && <br />}</React.Fragment>
            ))}
          </p>

          <ul className="login-feature-list">
            <li><i className="pi pi-check-circle" /><span>{t('auth.features.realtime')}</span></li>
            <li><i className="pi pi-check-circle" /><span>{t('auth.features.isolation')}</span></li>
            <li><i className="pi pi-check-circle" /><span>{t('auth.features.playbook')}</span></li>
          </ul>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="layout-login-right">
        <div className="login-right-header">
          <h2>{t('auth.welcome')}</h2>
          <p>{branding.companyName ?? 'SOAR'} {t('auth.subtitle')}</p>
        </div>

        <div className="login-form" onKeyDown={handleKeyDown}>
          {error && <Message severity="error" text={error} className="w-full" />}

          <div className="field">
            <label htmlFor="tenant-slug">{t('auth.tenantSlug')}</label>
            <InputText
              id="tenant-slug"
              value={tenantSlug}
              onChange={(e) => setTenantSlug(e.target.value)}
              className="w-full"
              placeholder={t('auth.tenantSlugPlaceholder')}
              autoComplete="organization"
            />
          </div>

          <div className="field">
            <label htmlFor="email">{t('common.email')}</label>
            <InputText
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full"
              autoComplete="username"
            />
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
              autoComplete="current-password"
            />
          </div>

          <Button
            label={t('auth.submit')}
            icon="pi pi-sign-in"
            onClick={handleLogin}
            loading={loading}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
