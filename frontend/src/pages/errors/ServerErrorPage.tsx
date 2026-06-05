import React, { useMemo } from 'react';
import { Button } from '@/components/TenantButton';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

const ServerErrorPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const statusCode = useMemo(() => {
    const search = new URLSearchParams(location.search);
    return search.get('status');
  }, [location.search]);

  const errorMessage = useMemo(() => {
    const search = new URLSearchParams(location.search);
    return search.get('message') ?? '';
  }, [location.search]);

  const fromPath = useMemo(() => {
    const search = new URLSearchParams(location.search);
    const from = search.get('from') ?? '';

    if (!from.startsWith('/') || from.startsWith('/server-error')) {
      return '';
    }

    return from;
  }, [location.search]);

  return (
    <div className="layout-login-verona">
      <div className="layout-login-right" style={{ width: '100%', maxWidth: '720px', margin: '0 auto' }}>
        <div className="login-card">
          <div className="flex align-items-center gap-2 mb-3">
            <i className="pi pi-exclamation-triangle" style={{ color: 'var(--orange-400)', fontSize: '1.25rem' }} />
            <h2 className="m-0">{t('serverError.title')}</h2>
          </div>

          <p className="m-0 text-color-secondary line-height-3">{t('serverError.description')}</p>
          {statusCode && (
            <p className="mt-3 mb-0 text-color-secondary">{t('serverError.statusCode', { code: statusCode })}</p>
          )}

          {import.meta.env.DEV && errorMessage && (
            <div
              className="mt-3 p-3 border-round"
              style={{
                backgroundColor: 'color-mix(in srgb, #ef4444 12%, var(--surface-card))',
                border: '1px solid color-mix(in srgb, #ef4444 42%, var(--surface-border))',
              }}
            >
              <div className="font-semibold mb-2">{t('serverError.devMessageTitle')}</div>
              <pre className="m-0 white-space-pre-wrap" style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                {errorMessage}
              </pre>
            </div>
          )}

          <div className="flex gap-2 mt-4 justify-content-end">
            {fromPath && (
              <Button
                label={t('serverError.goBack')}
                icon="pi pi-arrow-left"
                severity="secondary"
                text
                onClick={() => navigate(fromPath)}
              />
            )}
            <Button
              label={t('serverError.goDashboard')}
              icon="pi pi-home"
              severity="secondary"
              outlined
              onClick={() => navigate('/dashboard')}
            />
            <Button
              label={t('serverError.retry')}
              icon="pi pi-refresh"
              onClick={() => window.location.reload()}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServerErrorPage;
