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
import { AuthPolicy } from '../../types/auth-policy';

interface TenantJwtPayload {
  sub: number;
  tenantId: string;
  role: string;
}

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
      const res = await api.post<{ accessToken: string; brandingConfig: Record<string, string> | null; authSettings: AuthPolicy }>(
        '/auth/tenant/login',
        { tenantSlug, email, password },
      );
      const rawPayload = parseJwt(res.data.accessToken);
      const payload: TenantJwtPayload = {
        sub: typeof rawPayload.sub === 'number' ? rawPayload.sub : Number(rawPayload.sub ?? 0),
        tenantId: typeof rawPayload.tenantId === 'string' ? rawPayload.tenantId : '',
        role: typeof rawPayload.role === 'string' ? rawPayload.role : '',
      };

      if (!Number.isFinite(payload.sub) || payload.sub <= 0 || !payload.tenantId || !payload.role) {
        throw new Error('Invalid tenant JWT payload');
      }

      setAuth(
        res.data.accessToken,
        { sub: payload.sub, tenantId: payload.tenantId, role: payload.role },
        res.data.authSettings,
      );
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

  const taglineLines = t('auth.tagline').split('\n');

  /* Apply branding gradient variables before mount */
  const gradientStyle = branding.primaryColor
    ? { '--brand-gradient-from': branding.primaryColor, '--brand-gradient-to': branding.primaryColor + '88' } as React.CSSProperties
    : {};

  return (
    <div className="layout-login-verona" style={gradientStyle}>
      <div className="layout-login-left">
        <div className="network-visual" aria-hidden="true">
          <span className="network-grid" />
          <span className="network-ring ring-a" />
          <span className="network-ring ring-b" />
          <span className="network-beam beam-a" />
          <span className="network-beam beam-b" />
          <span className="network-node node-a" />
          <span className="network-node node-c" />
          <span className="network-node node-d" />
        </div>

        <div className="right-cyber-hud" aria-hidden="true">
          <span className="hud-grid" />
          <span className="hud-neural-line line-1" />
          <span className="hud-neural-line line-2" />
          <span className="hud-ai-ping ping-1" />
          <span className="hud-ai-ping ping-2" />
          <span className="hud-link link-a" />
          <span className="hud-link link-b" />
          <span className="hud-node node-a" />
          <span className="hud-node node-b" />
          <span className="hud-node node-c" />
          <span className="hud-icon-badge badge-hacker"><i className="pi pi-user-edit" /></span>
          <span className="hud-icon-badge badge-shield"><i className="pi pi-shield" /></span>
          <span className="hud-icon-badge badge-bug"><i className="pi pi-bug" /></span>
        </div>

        <div className="login-left-content">
          <div className="login-left-logo">
            {branding.logoUrl ? (
              <img src={branding.logoUrl} alt={t('auth.logoAlt')} />
            ) : (
              <i className="pi pi-shield logo-icon" />
            )}
            <span className="logo-name">{branding.companyName ?? 'SOAR'}</span>
          </div>

          <div className="security-signal">{t('auth.securitySignal')}</div>

          <div className="ai-inference-panel" aria-hidden="true">
            <div className="ai-panel-header">
              <i className="pi pi-chart-line" />
              <span className="ai-panel-live-dot" />
              <span>{t('auth.aiPanel.title')}</span>
            </div>
            <div className="ai-panel-item">
              <div className="ai-panel-label-row">
                <span>{t('auth.aiPanel.threatScoreLabel')}</span>
                <strong>{t('auth.aiPanel.threatScoreValue')}</strong>
              </div>
              <span className="ai-panel-bar"><span className="fill fill-threat" /></span>
            </div>
            <div className="ai-panel-item">
              <div className="ai-panel-label-row">
                <span>{t('auth.aiPanel.confidenceLabel')}</span>
                <strong>{t('auth.aiPanel.confidenceValue')}</strong>
              </div>
              <span className="ai-panel-bar"><span className="fill fill-confidence" /></span>
            </div>
            <div className="ai-panel-item">
              <div className="ai-panel-label-row">
                <span>{t('auth.aiPanel.responseLabel')}</span>
                <strong>{t('auth.aiPanel.responseValue')}</strong>
              </div>
              <span className="ai-panel-bar"><span className="fill fill-response" /></span>
            </div>
          </div>

          <p className="login-left-tagline">
            {taglineLines.map((line, i) => (
              <React.Fragment key={i}>
                {line}
                {i < taglineLines.length - 1 && <br />}
              </React.Fragment>
            ))}
          </p>

          <ul className="login-feature-list">
            <li><i className="pi pi-bolt" /><span>{t('auth.features.realtime')}</span></li>
            <li><i className="pi pi-lock" /><span>{t('auth.features.isolation')}</span></li>
            <li><i className="pi pi-sitemap" /><span>{t('auth.features.playbook')}</span></li>
          </ul>
        </div>
      </div>

      <div className="layout-login-right">
        <div className="login-right-content">
          <div className="login-right-header">
            <div className="login-live-status">
              <i className="pi pi-circle-fill" />
              <span>{t('auth.liveGuard')}</span>
            </div>
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
    </div>
  );
};

export default LoginPage;
