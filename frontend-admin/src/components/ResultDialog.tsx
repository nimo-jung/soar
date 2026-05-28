import React from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';

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
      borderColor: '#fca5a5',
      backgroundColor: '#fef2f2',
      textColor: '#7f1d1d',
      iconBg: '#fee2e2',
      iconColor: '#b91c1c',
      dividerColor: '#fecaca',
      bulletColor: '#dc2626',
    };
  }

  if (tone === 'warn') {
    return {
      borderColor: '#fcd34d',
      backgroundColor: '#fffbeb',
      textColor: '#78350f',
      iconBg: '#fef3c7',
      iconColor: '#b45309',
      dividerColor: '#fde68a',
      bulletColor: '#d97706',
    };
  }

  if (tone === 'success') {
    return {
      borderColor: '#86efac',
      backgroundColor: '#f0fdf4',
      textColor: '#14532d',
      iconBg: '#dcfce7',
      iconColor: '#15803d',
      dividerColor: '#bbf7d0',
      bulletColor: '#16a34a',
    };
  }

  return {
    borderColor: '#93c5fd',
    backgroundColor: '#eff6ff',
    textColor: '#1e3a8a',
    iconBg: '#dbeafe',
    iconColor: '#1d4ed8',
    dividerColor: '#bfdbfe',
    bulletColor: '#2563eb',
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

  return (
    <Dialog
      visible={visible}
      header={title}
      style={{ width, maxWidth: '96vw' }}
      onHide={onHide}
      footer={(
        <div className="flex justify-content-end">
          <Button label={confirmLabel} onClick={onHide} />
        </div>
      )}
    >
      <div
        className="border-1 border-round-lg p-3"
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
