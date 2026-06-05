import React from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from '@/components/TenantButton';

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
      borderColor: 'color-mix(in srgb, #ef4444 45%, var(--surface-border))',
      backgroundColor: 'color-mix(in srgb, #ef4444 12%, var(--surface-card))',
      textColor: 'color-mix(in srgb, #ef4444 72%, var(--text-color))',
      iconBg: 'color-mix(in srgb, #ef4444 18%, var(--surface-card))',
      iconColor: 'color-mix(in srgb, #ef4444 82%, var(--text-color))',
      confirmClassName: 'p-button-danger',
    };
  }

  if (severity === 'warn') {
    return {
      borderColor: 'color-mix(in srgb, #f59e0b 48%, var(--surface-border))',
      backgroundColor: 'color-mix(in srgb, #f59e0b 12%, var(--surface-card))',
      textColor: 'color-mix(in srgb, #f59e0b 72%, var(--text-color))',
      iconBg: 'color-mix(in srgb, #f59e0b 18%, var(--surface-card))',
      iconColor: 'color-mix(in srgb, #d97706 80%, var(--text-color))',
      confirmClassName: 'p-button-warning',
    };
  }

  return {
    borderColor: 'color-mix(in srgb, #3b82f6 42%, var(--surface-border))',
    backgroundColor: 'color-mix(in srgb, #3b82f6 12%, var(--surface-card))',
    textColor: 'color-mix(in srgb, #3b82f6 70%, var(--text-color))',
    iconBg: 'color-mix(in srgb, #3b82f6 18%, var(--surface-card))',
    iconColor: 'color-mix(in srgb, #2563eb 80%, var(--text-color))',
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
  const toneClassName = `tenant-dialog-tone tenant-dialog-tone--${severity}`;

  return (
    <Dialog
      visible={visible}
      header={title}
      className={`tenant-dialog ${toneClassName}`}
      style={{ width, maxWidth: '96vw' }}
      onHide={onCancel}
      footer={(
        <div className="flex justify-content-end gap-2">
          <Button label={cancelLabel} buttonSize="default" outlined onClick={onCancel} />
          <Button label={confirmLabel} buttonSize="default" className={styles.confirmClassName} onClick={onConfirm} />
        </div>
      )}
    >
      <div
        className="tenant-dialog-panel border-1 border-round-lg p-3"
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
