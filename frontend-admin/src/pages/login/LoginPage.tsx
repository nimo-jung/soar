import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Button } from 'primereact/button';
import { Message } from 'primereact/message';
import api from '../../api';
import { useAuthStore } from '../../store/auth.store';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const setToken = useAuthStore((s) => s.setToken);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      setError(t('auth.errorEmpty'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.post<{ accessToken: string }>('/auth/master/login', {
        email,
        password,
      });
      setToken(res.data.accessToken);
      navigate('/tenants');
    } catch {
      setError(t('auth.errorInvalid'));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLogin();
  };

  return (
    <div className="layout-login">
      <div className="layout-login-card">
        <div className="layout-login-logo">
          <i className="pi pi-shield" style={{ fontSize: '2.5rem', color: 'var(--primary-color)' }} />
          <span>{t('auth.title')}</span>
        </div>

        <div className="layout-login-form" onKeyDown={handleKeyDown}>
          {error && <Message severity="error" text={error} className="w-full" />}

          <div className="field">
            <label htmlFor="email">{t('common.email')}</label>
            <InputText
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full"
              placeholder={t('auth.emailPlaceholder')}
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
