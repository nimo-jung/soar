import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Message } from 'primereact/message';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Button } from '@/components/TenantButton';
import api from '../../api';
import { useAuthStore, type TenantWarning } from '../../store/auth.store';
import { useBrandingStore } from '../../store/branding.store';
import { parseJwt } from '../../utils/jwt';
import type { AuthPolicy } from '../../types/auth-policy';
import { formatDateOnly } from '../../utils/date';

interface MasterLoginResponse {
  accessToken: string;
  authSettings: AuthPolicy;
}

interface TenantLoginResponse {
  accessToken: string;
  brandingConfig: Record<string, string> | null;
  authSettings: AuthPolicy;
  tenantWarning: TenantWarning | null;
}

interface MultiTenantStatusResponse {
  isMultiTenantEnabled: boolean;
}

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const setAuth = useAuthStore((s) => s.setAuth);
  const resetBranding = useBrandingStore((s) => s.reset);
  const applyBranding = useBrandingStore((s) => s.applyBranding);

  const [isMultiTenantEnabled, setIsMultiTenantEnabled] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [tenantSlug, setTenantSlug] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tenantWarning, setTenantWarning] = useState<TenantWarning | null>(null);
  const [bootstrapRequired, setBootstrapRequired] = useState(false);
  const [bootstrapPrecheckRequired, setBootstrapPrecheckRequired] = useState(false);
  const [masterBootstrapRequired, setMasterBootstrapRequired] = useState(false);

  const normalizedTenantSlug = tenantSlug.trim().toLowerCase();
  const isMasterEntry = !isMultiTenantEnabled || normalizedTenantSlug === 'system';

  useEffect(() => {
    let cancelled = false;

    const loadStatus = async () => {
      try {
        const response = await api.get<MultiTenantStatusResponse>('/auth/multi-tenant/status');
        if (!cancelled) {
          setIsMultiTenantEnabled(response.data.isMultiTenantEnabled);
        }
      } catch {
        if (!cancelled) {
          setIsMultiTenantEnabled(false);
        }
      } finally {
        if (!cancelled) {
          setStatusLoading(false);
        }
      }
    };

    void loadStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const trimmed = tenantSlug.trim();
    if (!isMultiTenantEnabled || !trimmed) {
      setBootstrapPrecheckRequired(false);
      return;
    }

    const timer = window.setTimeout(() => {
      void checkTenantBootstrapStatus(trimmed);
    }, 350);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isMultiTenantEnabled, tenantSlug]);

  useEffect(() => {
    let cancelled = false;

    const checkMasterBootstrapStatus = async () => {
      if (!isMasterEntry) {
        if (!cancelled) {
          setMasterBootstrapRequired(false);
        }
        return;
      }

      try {
        const response = await api.post<{ requiresBootstrap: boolean }>('/auth/master/bootstrap/status');
        if (!cancelled) {
          setMasterBootstrapRequired(response.data.requiresBootstrap);
        }
      } catch {
        if (!cancelled) {
          setMasterBootstrapRequired(false);
        }
      }
    };

    void checkMasterBootstrapStatus();

    return () => {
      cancelled = true;
    };
  }, [isMasterEntry]);

  const checkTenantExpiry = async (rawSlug: string) => {
    const trimmed = rawSlug.trim();
    if (!trimmed || trimmed.toLowerCase() === 'system') {
      setTenantWarning(null);
      return;
    }

    try {
      const response = await api.get<{ daysRemaining: number | null; expiresAt: string | null }>(
        `/auth/tenant/expiry-status?tenantSlug=${encodeURIComponent(trimmed)}`,
      );

      if (response.data.daysRemaining !== null && response.data.expiresAt !== null) {
        setTenantWarning({
          daysRemaining: response.data.daysRemaining,
          expiresAt: response.data.expiresAt,
        });
      } else {
        setTenantWarning(null);
      }
    } catch {
      // Expiry status check failure should not block login.
    }
  };

  const checkTenantBootstrapStatus = async (rawSlug: string) => {
    const trimmed = rawSlug.trim();
    if (!trimmed || trimmed.toLowerCase() === 'system') {
      setBootstrapPrecheckRequired(false);
      return;
    }

    try {
      const response = await api.get<{ requiresBootstrap: boolean }>(
        `/auth/tenant/bootstrap/status?tenantSlug=${encodeURIComponent(trimmed)}`,
      );
      setBootstrapPrecheckRequired(response.data.requiresBootstrap);
    } catch {
      setBootstrapPrecheckRequired(false);
    }
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

  const handleSubmit = async () => {
    const requiresTenantSlug = isMultiTenantEnabled;

    if (!email.trim() || !password.trim() || (requiresTenantSlug && !normalizedTenantSlug)) {
      setError(t('auth.errorEmpty'));
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    setBootstrapRequired(false);

    const executeTenantLogin = async (forceLogoutExistingSessions: boolean) => {
      return api.post<TenantLoginResponse>('/auth/tenant/login', {
        tenantSlug: normalizedTenantSlug,
        email,
        password,
        forceLogoutExistingSessions,
      });
    };

    try {
      const shouldUseMasterLogin = !isMultiTenantEnabled || normalizedTenantSlug === 'system';

      if (shouldUseMasterLogin) {
        if (masterBootstrapRequired) {
          if (!confirmPassword) {
            setError(t('auth.bootstrap.errorEmpty'));
            return;
          }

          if (password !== confirmPassword) {
            setError(t('auth.bootstrap.errorPasswordConfirm'));
            return;
          }

          await api.post('/auth/master/bootstrap', {
            email,
            password,
          });

          setMasterBootstrapRequired(false);
          setConfirmPassword('');
          setSuccess(t('auth.bootstrap.registered'));
          return;
        }

        const response = await api.post<MasterLoginResponse>('/auth/master/login', {
          email,
          password,
        });

        const payload = parseJwt(response.data.accessToken);
        const sub = typeof payload.sub === 'number' ? payload.sub : Number(payload.sub ?? 0);
        const role = typeof payload.role === 'string' ? payload.role : 'master';
        const payloadEmail = typeof payload.email === 'string' ? payload.email : email;

        setAuth(
          response.data.accessToken,
          {
            sub,
            email: payloadEmail,
            role,
            isMaster: true,
          },
          response.data.authSettings,
          null,
          'master',
        );

        resetBranding();
        navigate('/system');
        return;
      }

      const response = await executeTenantLogin(false);

      const payload = parseJwt(response.data.accessToken);
      const sub = typeof payload.sub === 'number' ? payload.sub : Number(payload.sub ?? 0);
      const role = typeof payload.role === 'string' ? payload.role : 'operator';
      const normalizedTenantId = typeof payload.tenantId === 'string'
        ? payload.tenantId
        : normalizedTenantSlug.replace(/-/g, '_');

      setAuth(
        response.data.accessToken,
        {
          sub,
          tenantId: normalizedTenantId,
          email,
          role,
          isMaster: false,
        },
        response.data.authSettings,
        response.data.tenantWarning,
        'tenant',
      );

      applyBranding(response.data.brandingConfig);
      navigate('/dashboard');
    } catch (requestError: any) {
      const code: string | undefined = requestError?.response?.data?.code;
      const responseMessage = requestError?.response?.data?.message;
      const message = Array.isArray(responseMessage)
        ? responseMessage.join(', ')
        : responseMessage;

      if (code === 'TENANT_BOOTSTRAP_REQUIRED') {
        setBootstrapRequired(true);
        setBootstrapPrecheckRequired(true);
        setError(t('auth.bootstrap.required'));
        return;
      }

      if (code === 'SESSION_LIMIT_EXCEEDED') {
        const confirmed = await requestForceLoginConfirm(message || t('auth.errorInvalid'));

        if (!confirmed) {
          setError(message || t('auth.errorInvalid'));
          return;
        }

        try {
          const forced = await executeTenantLogin(true);

          const payload = parseJwt(forced.data.accessToken);
          const sub = typeof payload.sub === 'number' ? payload.sub : Number(payload.sub ?? 0);
          const role = typeof payload.role === 'string' ? payload.role : 'operator';
          const normalizedTenantId = typeof payload.tenantId === 'string'
            ? payload.tenantId
            : normalizedTenantSlug.replace(/-/g, '_');

          setAuth(
            forced.data.accessToken,
            {
              sub,
              tenantId: normalizedTenantId,
              email,
              role,
              isMaster: false,
            },
            forced.data.authSettings,
            forced.data.tenantWarning,
            'tenant',
          );

          applyBranding(forced.data.brandingConfig);
          navigate('/dashboard');
          return;
        } catch (forcedLoginError: any) {
          const forcedResponseMessage = forcedLoginError?.response?.data?.message;
          const forcedMessage = Array.isArray(forcedResponseMessage)
            ? forcedResponseMessage.join(', ')
            : forcedResponseMessage;
          setError(forcedMessage || t('auth.errorInvalid'));
          return;
        }
      }

      setError(message || t('auth.errorInvalid'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="layout-login-verona">
      <ConfirmDialog />
      <div className="layout-login-left">
        <div className="login-left-content">
          <div className="login-left-logo">
            <i className="pi pi-shield logo-icon" />
            <span className="logo-name">Sniper TMS</span>
          </div>
          <h2>{t('auth.welcome')}</h2>
          <p>{t('auth.subtitle')}</p>
        </div>
      </div>

      <div className="layout-login-right">
        <div className="surface-card border-round-xl shadow-2 p-4 md:p-5 w-full" style={{ maxWidth: 460 }}>
          {error && <Message severity="error" text={error} className="w-full mb-3" />}
          {success && <Message severity="success" text={success} className="w-full mb-3" />}
          {tenantWarning && (
            <Message
              severity="warn"
              className="w-full mb-3"
              text={t('auth.tenantExpirySoon', {
                days: tenantWarning.daysRemaining,
                date: formatDateOnly(tenantWarning.expiresAt),
              })}
            />
          )}
          {(bootstrapPrecheckRequired || bootstrapRequired) && (
            <Message severity="warn" text={t('auth.bootstrap.required')} className="w-full mb-3" />
          )}
          {(isMasterEntry && masterBootstrapRequired) && (
            <Message severity="warn" text={t('auth.bootstrap.notice')} className="w-full mb-3" />
          )}

          <div className="flex flex-column gap-3">
            {isMultiTenantEnabled && (
              <div className="flex flex-column gap-2">
                <label htmlFor="tenantSlug">{t('auth.tenantSlug')}</label>
                <InputText
                  id="tenantSlug"
                  value={tenantSlug}
                  onChange={(event) => setTenantSlug(event.target.value)}
                  onBlur={(event) => {
                    void checkTenantExpiry(event.target.value);
                    void checkTenantBootstrapStatus(event.target.value);
                  }}
                  className="w-full"
                />
              </div>
            )}

            {statusLoading && (
              <Message severity="info" text={t('common.loading')} className="w-full" />
            )}

            <div className="flex flex-column gap-2">
              <label htmlFor="email">{t('common.email')}</label>
              <InputText
                id="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full"
              />
            </div>

            <div className="flex flex-column gap-2">
              <label htmlFor="password">{t('common.password')}</label>
              <Password
                inputId="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                feedback={false}
                toggleMask
                className="w-full"
                inputClassName="w-full"
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    void handleSubmit();
                  }
                }}
              />
            </div>

            {(isMasterEntry && masterBootstrapRequired) && (
              <div className="flex flex-column gap-2">
                <label htmlFor="confirmPassword">{t('auth.bootstrap.confirmPassword')}</label>
                <Password
                  inputId="confirmPassword"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  feedback={false}
                  toggleMask
                  className="w-full"
                  inputClassName="w-full"
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      void handleSubmit();
                    }
                  }}
                />
              </div>
            )}

            <div className="flex flex-column gap-2">
              <Button
                label={(isMasterEntry && masterBootstrapRequired) ? t('auth.bootstrap.submit') : t('common.login')}
                icon={(isMasterEntry && masterBootstrapRequired) ? 'pi pi-check' : 'pi pi-sign-in'}
                disabled={statusLoading}
                loading={loading}
                onClick={() => void handleSubmit()}
              />
              {(isMultiTenantEnabled && !isMasterEntry && !(bootstrapPrecheckRequired || bootstrapRequired)) && (
                <Button
                  type="button"
                  buttonSize="default"
                  text
                  icon="pi pi-unlock"
                  label={t('auth.resetPassword.move')}
                  onClick={() => navigate(`/reset-password?tenantSlug=${encodeURIComponent(tenantSlug)}&email=${encodeURIComponent(email)}`)}
                />
              )}
              {(isMultiTenantEnabled && !isMasterEntry && (bootstrapPrecheckRequired || bootstrapRequired)) && (
                <Button
                  type="button"
                  buttonSize="default"
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
    </div>
  );
};

export default LoginPage;
