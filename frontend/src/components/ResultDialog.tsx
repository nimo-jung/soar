import React from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from '@/components/TenantButton';

export type ResultDialogTone = 'info' | 'success' | 'warn' | 'error';

interface ResultDialogProps {
  visible: boolean;
  title: string;
  message: string;
  onHide: () => void;
  confirmLabel: string;
  tone?: ResultDialogTone;
  icon?: string;
  actionRequiredTitle?: string;
  actionItems?: string[];
  width?: string;
}

const toneColors = (tone: ResultDialogTone) => {
  if (tone === 'error') {
    return {
      borderColor: 'color-mix(in srgb, #ef4444 45%, var(--surface-border))',
      backgroundColor: 'color-mix(in srgb, #ef4444 12%, var(--surface-card))',
      textColor: 'color-mix(in srgb, #ef4444 72%, var(--text-color))',
      iconBg: 'color-mix(in srgb, #ef4444 18%, var(--surface-card))',
      iconColor: 'color-mix(in srgb, #ef4444 82%, var(--text-color))',
      dividerColor: 'color-mix(in srgb, #ef4444 32%, var(--surface-border))',
      bulletColor: 'color-mix(in srgb, #ef4444 82%, var(--text-color))',
    };
  }

  if (tone === 'warn') {
    return {
      borderColor: 'color-mix(in srgb, #f59e0b 48%, var(--surface-border))',
      backgroundColor: 'color-mix(in srgb, #f59e0b 12%, var(--surface-card))',
      textColor: 'color-mix(in srgb, #f59e0b 72%, var(--text-color))',
      iconBg: 'color-mix(in srgb, #f59e0b 18%, var(--surface-card))',
      iconColor: 'color-mix(in srgb, #d97706 80%, var(--text-color))',
      dividerColor: 'color-mix(in srgb, #f59e0b 35%, var(--surface-border))',
      bulletColor: 'color-mix(in srgb, #d97706 80%, var(--text-color))',
    };
  }

  if (tone === 'success') {
    return {
      borderColor: 'color-mix(in srgb, #22c55e 45%, var(--surface-border))',
      backgroundColor: 'color-mix(in srgb, #22c55e 12%, var(--surface-card))',
      textColor: 'color-mix(in srgb, #22c55e 68%, var(--text-color))',
      iconBg: 'color-mix(in srgb, #22c55e 18%, var(--surface-card))',
      iconColor: 'color-mix(in srgb, #16a34a 82%, var(--text-color))',
      dividerColor: 'color-mix(in srgb, #22c55e 30%, var(--surface-border))',
      bulletColor: 'color-mix(in srgb, #16a34a 82%, var(--text-color))',
    };
  }

  return {
    borderColor: 'color-mix(in srgb, #3b82f6 42%, var(--surface-border))',
    backgroundColor: 'color-mix(in srgb, #3b82f6 12%, var(--surface-card))',
    textColor: 'color-mix(in srgb, #3b82f6 70%, var(--text-color))',
    iconBg: 'color-mix(in srgb, #3b82f6 18%, var(--surface-card))',
    iconColor: 'color-mix(in srgb, #2563eb 80%, var(--text-color))',
    dividerColor: 'color-mix(in srgb, #3b82f6 28%, var(--surface-border))',
    bulletColor: 'color-mix(in srgb, #2563eb 80%, var(--text-color))',
  };
};

const defaultIcon = (tone: ResultDialogTone): string => {
  if (tone === 'error') {
    return 'pi pi-times-circle';
  }
  if (tone === 'warn') {
    return 'pi pi-exclamation-triangle';
  }
  if (tone === 'success') {
    return 'pi pi-check-circle';
  }
  return 'pi pi-info-circle';
};

const ResultDialog: React.FC<ResultDialogProps> = ({
  visible,
  title,
  message,
  onHide,
  confirmLabel,
  tone = 'info',
  icon,
  actionRequiredTitle,
  actionItems = [],
  width = '460px',
}) => {
  const colors = toneColors(tone);
  const toneClassName = `tenant-dialog-tone tenant-dialog-tone--${tone}`;

  return (
    <Dialog
      visible={visible}
      header={title}
      className={`tenant-dialog ${toneClassName}`}
      style={{ width, maxWidth: '96vw' }}
      onHide={onHide}
      footer={(
        <div className="flex justify-content-end">
          <Button label={confirmLabel} buttonSize="default" onClick={onHide} />
        </div>
      )}
    >
      <div
        className="tenant-dialog-panel border-1 border-round-lg p-3"
        style={{
          borderColor: colors.borderColor,
          backgroundColor: colors.backgroundColor,
          color: colors.textColor,
        }}
      >
        <div className="flex align-items-start gap-3">
          <span
            className="inline-flex align-items-center justify-content-center border-circle w-2-5rem h-2-5rem"
            style={{
              backgroundColor: colors.iconBg,
              color: colors.iconColor,
            }}
            aria-hidden
          >
            <i className={`${icon ?? defaultIcon(tone)} text-lg`} />
          </span>
          <div className="flex-1">
            {actionRequiredTitle && (tone === 'error' || tone === 'warn') && (
              <p className="m-0 font-semibold mb-2" style={{ color: 'inherit' }}>{actionRequiredTitle}</p>
            )}
            <p className="m-0 line-height-3" style={{ color: 'inherit' }}>{message}</p>
          </div>
        </div>
        {actionItems.length > 0 && (
          <div className="mt-3 pt-2 border-top-1" style={{ borderColor: colors.dividerColor }}>
            {actionItems.map((actionItem) => (
              <div key={actionItem} className="flex align-items-start gap-2 mb-2">
                <i className="pi pi-arrow-right mt-1" style={{ color: colors.bulletColor }} aria-hidden />
                <span className="line-height-3" style={{ color: 'inherit' }}>{actionItem}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Dialog>
  );
};

export default ResultDialog;
