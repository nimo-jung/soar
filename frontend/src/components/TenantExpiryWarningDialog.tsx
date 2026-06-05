import React, { useEffect, useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from '@/components/TenantButton';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/auth.store';
import { formatDateOnly } from '../utils/date';

const SESSION_KEY = 'tenant_expiry_warning_shown';

const TenantExpiryWarningDialog: React.FC = () => {
  const { t } = useTranslation();
  const tenantWarning = useAuthStore((s) => s.tenantWarning);
  const accessToken = useAuthStore((s) => s.accessToken);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    if (!tenantWarning) return;
    if (sessionStorage.getItem(SESSION_KEY) === 'true') return;

    setVisible(true);
  }, [accessToken, tenantWarning]);

  const handleConfirm = () => {
    sessionStorage.setItem(SESSION_KEY, 'true');
    setVisible(false);
  };

  if (!tenantWarning) return null;

  const footer = (
    <Button
      label={t('common.confirm')}
      icon="pi pi-check"
      onClick={handleConfirm}
      autoFocus
    />
  );

  return (
    <Dialog
      visible={visible}
      className="tenant-dialog"
      header={
        <span className="flex align-items-center gap-2">
          <i className="pi pi-exclamation-triangle text-yellow-400" />
          {t('tenantWarning.dialogTitle')}
        </span>
      }
      footer={footer}
      onHide={handleConfirm}
      style={{ width: '30rem' }}
      modal
      closable={false}
    >
      <p className="m-0 line-height-3">
        {t('tenantWarning.dialogBody', {
          days: tenantWarning.daysRemaining,
          date: formatDateOnly(tenantWarning.expiresAt),
        })}
      </p>
    </Dialog>
  );
};

export default TenantExpiryWarningDialog;
