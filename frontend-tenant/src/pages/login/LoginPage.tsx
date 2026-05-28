import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Button } from 'primereact/button';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Message } from 'primereact/message';
import api from '../../api';
import { useAuthStore } from '../../store/auth.store';
import type { TenantWarning } from '../../store/auth.store';
import { useBrandingStore } from '../../store/branding.store';
import { parseJwt } from '../../utils/jwt';
import { AuthPolicy } from '../../types/auth-policy';
import { formatDateOnly } from '../../utils/date';

interface TenantJwtPayload {
  sub: number;
  tenantId: string;
  role: string;
}

const LOCKOUT_STORAGE_KEY = 'tms_tenant_lockout';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const accessToken = useAuthStore((s) => s.accessToken);
  const setAuth = useAuthStore((s) => s.setAuth);
  const applyBranding = useBrandingStore((s) => s.applyBranding);
  const branding = useBrandingStore((s) => s.branding);
  const resetBranding = useBrandingStore((s) => s.reset);

  const [tenantSlug, setTenantSlug] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [tenantWarning, setTenantWarning] = useState<TenantWarning | null>(null);
  const [bootstrapRequired, setBootstrapRequired] = useState(false);
  const [lockSecondsRemaining, setLockSecondsRemaining] = useState<number>(0);
  const lockTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearLockTimer = useCallback(() => {
    if (lockTimerRef.current !== null) {
      clearInterval(lockTimerRef.current);
      lockTimerRef.current = null;
    }
  }, []);

  const formatLockClock = useCallback((totalSeconds: number): string => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }, []);

  const startLockCountdown = useCallback(
    (lockedUntilIso: string) => {
      clearLockTimer();
      setSuccess('');
      localStorage.setItem(LOCKOUT_STORAGE_KEY, lockedUntilIso);

      const tick = () => {
        const remaining = Math.ceil((new Date(lockedUntilIso).getTime() - Date.now()) / 1000);
        if (remaining <= 0) {
          clearLockTimer();
          localStorage.removeItem(LOCKOUT_STORAGE_KEY);
          setLockSecondsRemaining(0);
          setError('');
          setSuccess(t('auth.lockReleased'));
        } else {
          setSuccess('');
          setLockSecondsRemaining(remaining);
          setError(
            t('auth.errorLocked', {
              clock: formatLockClock(remaining),
            }),
          );
        }
      };

      tick();
      lockTimerRef.current = setInterval(tick, 1000);
    },
    [clearLockTimer, formatLockClock, t],
  );

  const checkTenantLockStatus = useCallback(
    async (rawTenantSlug: string, rawEmail: string) => {
      const tenantSlug = rawTenantSlug.trim();
      const email = rawEmail.trim();
      if (!tenantSlug || !email) {
        return;
      }

      try {
        const res = await api.get<{ locked: boolean; lockedUntil: string | null }>(
          `/auth/tenant/lock-status?tenantSlug=${encodeURIComponent(tenantSlug)}&email=${encodeURIComponent(email)}`,
        );
        if (res.data.locked && res.data.lockedUntil) {
          startLockCountdown(res.data.lockedUntil);
        }
      } catch {
        // 잠금 상태 조회 실패는 로그인 흐름에 영향을 주지 않는다.
      }
    },
    [startLockCountdown],
  );

  React.useEffect(() => {
    if (!accessToken) {
      resetBranding();
    }
  }, [accessToken, resetBranding]);

  React.useEffect(() => {
    const stored = localStorage.getItem(LOCKOUT_STORAGE_KEY);
    if (stored) {
      const remaining = Math.ceil((new Date(stored).getTime() - Date.now()) / 1000);
      if (remaining > 0) {
        startLockCountdown(stored);
      } else {
        localStorage.removeItem(LOCKOUT_STORAGE_KEY);
      }
    }

    return () => {
      clearLockTimer();
    };
  }, [startLockCountdown, clearLockTimer]);

  const checkTenantExpiry = async (slug: string) => {
    const trimmed = slug.trim();
    if (!trimmed) {
      setTenantWarning(null);
      return;
    }
    try {
      const res = await api.get<{ daysRemaining: number | null; expiresAt: string | null }>(
        `/auth/tenant/expiry-status?tenantSlug=${encodeURIComponent(trimmed)}`,
      );
      if (res.data.daysRemaining !== null && res.data.expiresAt !== null) {
        setTenantWarning({ daysRemaining: res.data.daysRemaining, expiresAt: res.data.expiresAt });
      } else {
        setTenantWarning(null);
      }
    } catch {
      // 만료 상태 조회 실패는 로그인 흐름에 영향을 주지 않는다.
    }
  };

  const handleLogin = async () => {
    if (!tenantSlug || !email || !password) {
      setError(t('auth.errorEmpty'));
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    setBootstrapRequired(false);

    const executeLogin = async (forceLogoutExistingSessions: boolean) => {
      return api.post<{
        accessToken: string;
        brandingConfig: Record<string, string> | null;
        authSettings: AuthPolicy;
        tenantWarning: TenantWarning | null;
      }>(
        '/auth/tenant/login',
        { tenantSlug, email, password, forceLogoutExistingSessions },
      );
    };

    const requestForceLoginConfirm = async (message: string): Promise<boolean> => {
      return new Promise((resolve) => {
        confirmDialog({
          header: t('common.confirm'),
          message: `${message}\n\n${t('auth.sessionLimitConfirm')}`,
          icon: 'pi pi-exclamation-triangle',
          acceptLabel: t('common.confirm'),
          rejectLabel: t('common.cancel'),
          accept: () => resolve(true),
          reject: () => resolve(false),
          onHide: () => resolve(false),
        });
      });
    };

    try {
      const res = await executeLogin(false);
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
        res.data.tenantWarning,
      );
      applyBranding(res.data.brandingConfig);
      navigate('/dashboard');
    } catch (loginError: any) {
      const data = loginError?.response?.data;
      const lockedUntil: string | undefined = data?.lockedUntil;
      const code: string | undefined = data?.code;
      const responseMessage = data?.message;
      const message = Array.isArray(responseMessage) ? responseMessage.join(', ') : responseMessage;
      if (lockedUntil) {
        startLockCountdown(lockedUntil);
      } else if (code === 'TENANT_BOOTSTRAP_REQUIRED') {
        setBootstrapRequired(true);
        setError(t('auth.bootstrap.required'));
      } else if (code === 'SESSION_LIMIT_EXCEEDED') {
        const confirmed = await requestForceLoginConfirm(message || t('auth.errorInvalid'));

        if (!confirmed) {
          setError(message || t('auth.errorInvalid'));
          return;
        }

        try {
          const forced = await executeLogin(true);
          const rawPayload = parseJwt(forced.data.accessToken);
          const payload: TenantJwtPayload = {
            sub: typeof rawPayload.sub === 'number' ? rawPayload.sub : Number(rawPayload.sub ?? 0),
            tenantId: typeof rawPayload.tenantId === 'string' ? rawPayload.tenantId : '',
            role: typeof rawPayload.role === 'string' ? rawPayload.role : '',
          };

          if (!Number.isFinite(payload.sub) || payload.sub <= 0 || !payload.tenantId || !payload.role) {
            throw new Error('Invalid tenant JWT payload');
          }

          setAuth(
            forced.data.accessToken,
            { sub: payload.sub, tenantId: payload.tenantId, role: payload.role },
            forced.data.authSettings,
            forced.data.tenantWarning,
          );
          applyBranding(forced.data.brandingConfig);
          navigate('/dashboard');
        } catch (forcedLoginError: any) {
          const forcedData = forcedLoginError?.response?.data;
          const forcedMessage = Array.isArray(forcedData?.message)
            ? forcedData.message.join(', ')
            : forcedData?.message;
          setError(forcedMessage || t('auth.errorInvalid'));
        }
      } else {
        setError(message || t('auth.errorInvalid'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (lockSecondsRemaining > 0) return;
    if (e.key === 'Enter') handleLogin();
  };

  const taglineLines = t('auth.tagline').split('\n');

  /* Apply branding gradient variables before mount */
  const gradientStyle = branding.primaryColor
    ? { '--brand-gradient-from': branding.primaryColor, '--brand-gradient-to': branding.primaryColor + '88' } as React.CSSProperties
    : {};

  return (
    <div className="layout-login-verona" style={gradientStyle}>
      <ConfirmDialog />
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
            <span className="logo-name">{branding.companyName ?? 'TMS'}</span>
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
            <p>{branding.companyName ?? 'TMS'} {t('auth.subtitle')}</p>
          </div>

          <div className="login-form" onKeyDown={handleKeyDown}>
            {error && <Message severity={lockSecondsRemaining > 0 ? 'warn' : 'error'} text={error} className="w-full" />}
            {success && <Message severity="success" text={success} className="w-full" />}
            {tenantWarning && (
              <Message
                severity="warn"
                className="w-full"
                text={t('auth.tenantExpirySoon', {
                  days: tenantWarning.daysRemaining,
                  date: formatDateOnly(tenantWarning.expiresAt),
                })}
              />
            )}

            <div className="field">
              <label htmlFor="tenant-slug">{t('auth.tenantSlug')}</label>
              <InputText
                id="tenant-slug"
                value={tenantSlug}
                onChange={(e) => setTenantSlug(e.target.value)}
                onBlur={(e) => {
                  void checkTenantExpiry(e.target.value);
                  void checkTenantLockStatus(e.target.value, email);
                }}
                className="w-full"
                placeholder={t('auth.tenantSlugPlaceholder')}
                autoComplete="organization"
                disabled={lockSecondsRemaining > 0}
              />
            </div>

            <div className="field">
              <label htmlFor="email">{t('common.email')}</label>
              <InputText
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={(e) => void checkTenantLockStatus(tenantSlug, e.target.value)}
                className="w-full"
                autoComplete="username"
                disabled={lockSecondsRemaining > 0}
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
                disabled={lockSecondsRemaining > 0}
              />
            </div>

            <Button
              label={t('auth.submit')}
              icon="pi pi-sign-in"
              onClick={handleLogin}
              loading={loading}
              disabled={lockSecondsRemaining > 0}
              className="w-full"
            />
            {bootstrapRequired && (
              <Button
                type="button"
                className="w-full"
                outlined
                icon="pi pi-user-plus"
                label={t('auth.bootstrap.move')}
                onClick={() => navigate(`/bootstrap?tenantSlug=${encodeURIComponent(tenantSlug)}&email=${encodeURIComponent(email)}`)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
