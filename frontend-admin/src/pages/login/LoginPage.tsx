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
import type { LicenseWarning } from '../../store/auth.store';
import { AuthPolicy } from '../../types/auth-policy';
import { formatDateOnly } from '../../utils/date';

const LOCKOUT_STORAGE_KEY = 'soar_admin_lockout';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [bootstrapRequired, setBootstrapRequired] = useState<boolean | null>(null);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showBootstrapNoticeInline, setShowBootstrapNoticeInline] = useState(false);
  const [licenseWarning, setLicenseWarning] = useState<LicenseWarning | null>(null);
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

  const checkMasterLockStatus = useCallback(
    async (rawEmail: string) => {
      const normalized = rawEmail.trim();
      if (!normalized) {
        return;
      }

      try {
        const res = await api.get<{ locked: boolean; lockedUntil: string | null }>(
          `/auth/master/lock-status?email=${encodeURIComponent(normalized)}`,
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
  const loginTitle = t('auth.title');
  const titlePrefix = loginTitle.slice(0, -1);
  const titleLastChar = loginTitle.slice(-1);

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

  React.useEffect(() => {
    const checkBootstrap = async () => {
      try {
        const response = await api.post<{ requiresBootstrap: boolean }>('/auth/master/bootstrap/status');
        setBootstrapRequired(response.data.requiresBootstrap);
      } catch {
        setBootstrapRequired(false);
      }
    };

    const checkLicenseStatus = async () => {
      try {
        const response = await api.get<{ daysRemaining: number | null; expiresAt: string | null }>(
          '/auth/license/status',
        );
        if (response.data.daysRemaining !== null && response.data.expiresAt !== null) {
          setLicenseWarning({
            daysRemaining: response.data.daysRemaining,
            expiresAt: response.data.expiresAt,
          });
        }
      } catch {
        // 라이선스 상태 조회 실패 시 무시 (로그인 흐름에 영향 없음)
      }
    };

    void checkBootstrap();
    void checkLicenseStatus();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      setError(t('auth.errorEmpty'));
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');

    const executeLogin = async (forceLogoutExistingSessions: boolean) => {
      return api.post<{
        accessToken: string;
        authSettings: AuthPolicy;
        licenseWarning: LicenseWarning | null;
      }>('/auth/master/login', {
        email,
        password,
        forceLogoutExistingSessions,
      });
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
      setAuth(res.data.accessToken, res.data.authSettings, res.data.licenseWarning);
      navigate('/tenants');
    } catch (loginError: any) {
      const data = loginError?.response?.data;
      const lockedUntil: string | undefined = data?.lockedUntil;
      const code: string | undefined = data?.code;
      const responseMessage = data?.message;
      const message = Array.isArray(responseMessage) ? responseMessage.join(', ') : responseMessage;

      if (lockedUntil) {
        startLockCountdown(lockedUntil);
      } else if (code === 'SESSION_LIMIT_EXCEEDED') {
        const confirmed = await requestForceLoginConfirm(message || t('auth.errorInvalid'));

        if (!confirmed) {
          setError(message || t('auth.errorInvalid'));
          return;
        }

        try {
          const forced = await executeLogin(true);
          setAuth(forced.data.accessToken, forced.data.authSettings, forced.data.licenseWarning);
          navigate('/tenants');
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

  const handleBootstrap = async () => {
    if (!email || !password || !confirmPassword) {
      setError(t('auth.bootstrap.errorEmpty'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('auth.bootstrap.errorPasswordConfirm'));
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post<{ success: true; demoLicenseCreated?: boolean }>(
        '/auth/master/bootstrap',
        { email, password },
      );
      setSuccess(t('auth.bootstrap.registered'));
      setBootstrapRequired(false);
      setConfirmPassword('');
      if (response.data.demoLicenseCreated) {
        setShowBootstrapNoticeInline(true);
      }
    } catch (bootstrapError: any) {
      const responseMessage = bootstrapError?.response?.data?.message;
      const message = Array.isArray(responseMessage) ? responseMessage.join(', ') : responseMessage;
      setError(message || t('auth.bootstrap.registerFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (lockSecondsRemaining > 0) return;
    if (e.key === 'Enter') {
      if (bootstrapRequired) {
        void handleBootstrap();
      } else {
        void handleLogin();
      }
    }
  };

  return (
    <div className="layout-login">
      <ConfirmDialog />
      <div className="layout-login-card">
        <div className="layout-login-logo">
          <span className="layout-login-logo-icon">
            <i className="pi pi-shield" />
          </span>
          <div className="layout-login-heading">
            <span className="layout-login-title" data-text={loginTitle}>
              <span>{titlePrefix}</span>
              <span className="layout-login-title-last">{titleLastChar}</span>
            </span>
          </div>
        </div>
        <div className="layout-login-form" onKeyDown={handleKeyDown}>
          {error && <Message severity={lockSecondsRemaining > 0 ? 'warn' : 'error'} text={error} className="w-full" />}
          {success && <Message severity="success" text={success} className="w-full" />}
          {licenseWarning && (
            <Message
              severity="warn"
              className="w-full"
              text={t('auth.licenseExpirySoon', {
                days: licenseWarning.daysRemaining,
                date: formatDateOnly(licenseWarning.expiresAt),
              })}
            />
          )}
          {showBootstrapNoticeInline && (
            <Message severity="warn" text={t('auth.bootstrap.noticeDialogBody')} className="w-full" />
          )}

          {bootstrapRequired && (
            <Message severity="warn" text={t('auth.bootstrap.notice')} className="w-full" />
          )}

          <div className="field">
            <label htmlFor="email">{t('common.email')}</label>
            <InputText
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={(e) => void checkMasterLockStatus(e.target.value)}
              className="w-full"
              placeholder={t('auth.emailPlaceholder')}
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
              autoComplete={bootstrapRequired ? 'new-password' : 'current-password'}
              disabled={lockSecondsRemaining > 0}
            />
          </div>

          {bootstrapRequired && (
            <>
              <div className="field">
                <label htmlFor="confirmPassword">{t('auth.bootstrap.confirmPassword')}</label>
                <Password
                  inputId="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full"
                  inputClassName="w-full"
                  feedback={false}
                  toggleMask
                  autoComplete="new-password"
                  disabled={lockSecondsRemaining > 0}
                />
              </div>
              <small className="text-color-secondary">{t('auth.bootstrap.passwordPolicy')}</small>
            </>
          )}

          <Button
            label={bootstrapRequired ? t('auth.bootstrap.submit') : t('auth.submit')}
            icon={bootstrapRequired ? 'pi pi-user-plus' : 'pi pi-sign-in'}
            onClick={bootstrapRequired ? handleBootstrap : handleLogin}
            loading={loading}
            disabled={bootstrapRequired === null || lockSecondsRemaining > 0}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
