import React, { useMemo } from 'react';
import { Button } from 'primereact/button';
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
    <div className="layout-login">
      <div className="layout-login-card" style={{ maxWidth: '560px', width: '100%' }}>
        <div className="layout-login-header mb-3">
          <i className="pi pi-exclamation-triangle" style={{ color: 'var(--orange-400)' }} />
          <h1>{t('serverError.title')}</h1>
        </div>

        <p className="m-0 text-color-secondary line-height-3">{t('serverError.description')}</p>
        {statusCode && (
          <p className="mt-3 mb-0 text-color-secondary">
            {t('serverError.statusCode', { code: statusCode })}
          </p>
        )}
        {import.meta.env.DEV && errorMessage && (
          <div className="mt-3 p-3 border-round" style={{ backgroundColor: 'rgba(248, 113, 113, 0.12)' }}>
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
            onClick={() => navigate('/tenants')}
          />
          <Button
            label={t('serverError.retry')}
            icon="pi pi-refresh"
            onClick={() => window.location.reload()}
          />
        </div>
      </div>
    </div>
  );
};

export default ServerErrorPage;
