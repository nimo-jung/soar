import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { useTranslation } from 'react-i18next';
import api from '../api';
import { useAuthStore } from '../store/auth.store';
import { useBrandingStore } from '../store/branding.store';
import { parseJwt } from '../utils/jwt';
import { AuthPolicy } from '../types/auth-policy';

const WARNING_THRESHOLD_MS = 70_000;
const AUTO_EXTEND_COOLDOWN_MS = 15_000;
const AUTO_EXTEND_REMAINING_MS = 120_000;
const SESSION_VALIDATE_INTERVAL_MS = 10_000;

function readTokenRemainingMs(token: string): number {
  const payload = parseJwt(token);
  const exp = typeof payload.exp === 'number' ? payload.exp : Number(payload.exp ?? 0);

  if (!Number.isFinite(exp) || exp <= 0) {
    return -1;
  }

  return exp * 1000 - Date.now();
}

const SessionTimeoutManager: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.accessToken);
  const authSettings = useAuthStore((s) => s.authSettings);
  const replaceToken = useAuthStore((s) => s.replaceToken);
  const setAuthSettings = useAuthStore((s) => s.setAuthSettings);
  const logout = useAuthStore((s) => s.logout);
  const resetBranding = useBrandingStore((s) => s.reset);

  const tokenRef = useRef<string | null>(token);
  const authSettingsRef = useRef<AuthPolicy | null>(authSettings);
  const warningVisibleRef = useRef(false);
  const lastExtendAtRef = useRef(0);
  const extendingRef = useRef(false);

  const [warningVisible, setWarningVisible] = useState(false);
  const [remainingMs, setRemainingMs] = useState(0);
  const [extending, setExtending] = useState(false);

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  useEffect(() => {
    authSettingsRef.current = authSettings;
  }, [authSettings]);

  useEffect(() => {
    warningVisibleRef.current = warningVisible;
  }, [warningVisible]);

  const forceLogout = () => {
    resetBranding();
    logout();
    navigate('/login');
  };

  const extendSession = async () => {
    const currentToken = tokenRef.current;
    if (!currentToken || extendingRef.current) {
      return false;
    }

    extendingRef.current = true;
    setExtending(true);

    try {
      const response = await api.post<{ accessToken: string; authSettings: AuthPolicy }>('/auth/session/extend');
      replaceToken(response.data.accessToken);
      setAuthSettings(response.data.authSettings);
      setWarningVisible(false);
      return true;
    } catch {
      forceLogout();
      return false;
    } finally {
      lastExtendAtRef.current = Date.now();
      extendingRef.current = false;
      setExtending(false);
    }
  };

  useEffect(() => {
    const onActivity = () => {
      const currentToken = tokenRef.current;
      const settings = authSettingsRef.current;

      if (!currentToken || !settings || settings.autoLogoutTimeoutMinutes === 0 || warningVisibleRef.current) {
        return;
      }

      const remaining = readTokenRemainingMs(currentToken);
      if (remaining <= 0) {
        return;
      }

      if (remaining > AUTO_EXTEND_REMAINING_MS) {
        return;
      }

      if (Date.now() - lastExtendAtRef.current < AUTO_EXTEND_COOLDOWN_MS) {
        return;
      }

      void extendSession();
    };

    const events: Array<keyof WindowEventMap> = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((eventName) => window.addEventListener(eventName, onActivity, { passive: true }));

    return () => {
      events.forEach((eventName) => window.removeEventListener(eventName, onActivity));
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!tokenRef.current || !authSettingsRef.current) {
        setWarningVisible(false);
        setRemainingMs(0);
        return;
      }

      if (authSettingsRef.current.autoLogoutTimeoutMinutes === 0) {
        setWarningVisible(false);
        setRemainingMs(0);
        return;
      }

      const remaining = readTokenRemainingMs(tokenRef.current);
      setRemainingMs(Math.max(remaining, 0));

      if (remaining <= 0) {
        forceLogout();
        return;
      }

      if (remaining <= WARNING_THRESHOLD_MS) {
        setWarningVisible(true);
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const validateSession = async () => {
      if (!tokenRef.current || !authSettingsRef.current) {
        return;
      }

      if (document.visibilityState !== 'visible') {
        return;
      }

      if (extendingRef.current) {
        return;
      }

      try {
        await api.post('/auth/session/validate');
      } catch {
        // 401 인터셉터가 로그인 페이지로 이동 처리한다.
      }
    };

    const intervalId = window.setInterval(() => {
      void validateSession();
    }, SESSION_VALIDATE_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void validateSession();
      }
    };

    document.addEventListener('visibilitychange', onVisible);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const remainingText = useMemo(() => {
    const totalSeconds = Math.max(Math.floor(remainingMs / 1000), 0);
    const minutes = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, '0');
    const seconds = (totalSeconds % 60)
      .toString()
      .padStart(2, '0');

    return `${minutes}:${seconds}`;
  }, [remainingMs]);

  return (
    <Dialog
      header={t('sessionTimeout.dialogTitle')}
      visible={warningVisible}
      onHide={() => undefined}
      closable={false}
      draggable={false}
      resizable={false}
      style={{ width: '420px' }}
      footer={(
        <div className="flex justify-content-end gap-2">
          <Button
            label={t('sessionTimeout.logoutNow')}
            severity="secondary"
            onClick={forceLogout}
          />
          <Button
            label={t('sessionTimeout.extendSession')}
            icon="pi pi-refresh"
            loading={extending}
            onClick={() => {
              void extendSession();
            }}
          />
        </div>
      )}
    >
      <p className="m-0 mb-3">{t('sessionTimeout.dialogMessage')}</p>
      <p className="m-0 text-lg font-semibold">{t('sessionTimeout.remainingLabel', { time: remainingText })}</p>
    </Dialog>
  );
};

export default SessionTimeoutManager;
