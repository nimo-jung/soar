import React from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from '@/components/AdminButton';

interface ActionConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  icon?: string;
  severity?: 'warn' | 'danger' | 'info';
  width?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const severityStyles = (severity: 'warn' | 'danger' | 'info') => {
  if (severity === 'danger') {
    return {
      borderColor: '#fca5a5',
      backgroundColor: '#fef2f2',
      textColor: '#7f1d1d',
      iconBg: '#fee2e2',
      iconColor: '#b91c1c',
      confirmClassName: 'p-button-danger',
    };
  }

  if (severity === 'warn') {
    return {
      borderColor: '#fcd34d',
      backgroundColor: '#fffbeb',
      textColor: '#78350f',
      iconBg: '#fef3c7',
      iconColor: '#b45309',
      confirmClassName: 'p-button-warning',
    };
  }

  return {
    borderColor: '#93c5fd',
    backgroundColor: '#eff6ff',
    textColor: '#1e3a8a',
    iconBg: '#dbeafe',
    iconColor: '#1d4ed8',
    confirmClassName: 'p-button-info',
  };
};

const ActionConfirmDialog: React.FC<ActionConfirmDialogProps> = ({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  icon = 'pi pi-exclamation-triangle',
  severity = 'warn',
  width = '460px',
  onConfirm,
  onCancel,
}) => {
  const styles = severityStyles(severity);

  return (
    <Dialog
      visible={visible}
      header={title}
      style={{ width, maxWidth: '96vw' }}
      onHide={onCancel}
      footer={(
        <div className="flex justify-content-end gap-2">
          <Button label={cancelLabel} outlined onClick={onCancel} />
          <Button label={confirmLabel} className={styles.confirmClassName} onClick={onConfirm} />
        </div>
      )}
    >
      <div
        className="border-1 border-round-lg p-3"
        style={{
          borderColor: styles.borderColor,
          backgroundColor: styles.backgroundColor,
          color: styles.textColor,
        }}
      >
        <div className="flex align-items-start gap-3">
          <span
            className="inline-flex align-items-center justify-content-center border-circle w-2-5rem h-2-5rem"
            style={{
              backgroundColor: styles.iconBg,
              color: styles.iconColor,
            }}
            aria-hidden
          >
            <i className={`${icon} text-lg`} />
          </span>
          <p className="m-0 line-height-3" style={{ color: 'inherit' }}>{message}</p>
        </div>
      </div>
    </Dialog>
  );
};

export default ActionConfirmDialog;
