import React, { useRef, useState } from 'react';
import { Button } from '@/components/AdminButton';
import { Card } from 'primereact/card';
import { Dialog } from 'primereact/dialog';
import api from '../../api';
import { useTranslation } from 'react-i18next';
import { formatDateTimeSeconds } from '../../utils/date';

interface ProductInfo {
  productName: string;
  productVersion: string;
  releaseVersion: string;
  buildInfo: string;
}

interface LicenseInfo {
  id: number;
  licenseKey: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  nicMacAddress: string | null;
}

interface ProductInfoResponse {
  product: ProductInfo;
  license: LicenseInfo | null;
}

const ProductInfoPage: React.FC = () => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [resultDialog, setResultDialog] = useState({
    visible: false,
    title: '',
    message: '',
  });
  const [data, setData] = useState<ProductInfoResponse>({
    product: {
      productName: '-',
      productVersion: '-',
      releaseVersion: '-',
      buildInfo: '-',
    },
    license: null,
  });

  const loadData = async () => {
    setLoading(true);

    try {
      const response = await api.get<ProductInfoResponse>('/admin/product-info');
      setData(response.data);
    } catch (loadError: unknown) {
      const rawMessage = (loadError as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
      const message = Array.isArray(rawMessage)
        ? rawMessage.filter((item): item is string => typeof item === 'string').join(', ')
        : (typeof rawMessage === 'string' ? rawMessage : '');
      setResultDialog({
        visible: true,
        title: t('productInfo.resultDialog.failedTitle'),
        message: message || t('productInfo.loadFailed'),
      });
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    void loadData();
  }, []);

  const handleOpenUploadDialog = () => {
    setSelectedFile(null);
    setShowValidation(false);
    setShowUploadDialog(true);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setShowValidation(true);
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);

    setUploading(true);

    try {
      await api.post('/admin/product-info/license/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResultDialog({
        visible: true,
        title: t('productInfo.resultDialog.successTitle'),
        message: t('productInfo.upload.success'),
      });
      setShowUploadDialog(false);
      await loadData();
    } catch (uploadError: unknown) {
      const rawMessage = (uploadError as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
      const message = Array.isArray(rawMessage)
        ? rawMessage.filter((item): item is string => typeof item === 'string').join(', ')
        : (typeof rawMessage === 'string' ? rawMessage : '');
      setResultDialog({
        visible: true,
        title: t('productInfo.resultDialog.failedTitle'),
        message: message || t('productInfo.upload.failed'),
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">{t('productInfo.title')}</h1>
          <p className="admin-page-subtitle">{t('productInfo.subtitle')}</p>
        </div>
        <div className="admin-actions-row">
          <Button
            type="button"
            icon="pi pi-refresh"
            label={t('common.refresh')}
            outlined
            onClick={() => {
              void loadData();
            }}
            loading={loading}
          />
          <Button
            type="button"
            icon="pi pi-upload"
            label={t('productInfo.upload.button')}
            outlined
            onClick={handleOpenUploadDialog}
          />
        </div>
      </div>

      <Dialog
        className="tenant-dialog"
        visible={resultDialog.visible}
        header={resultDialog.title}
        style={{ width: '460px', maxWidth: '96vw' }}
        onHide={() => setResultDialog((prev) => ({ ...prev, visible: false }))}
        footer={(
          <div className="flex justify-content-end">
            <Button label={t('common.confirm')} onClick={() => setResultDialog((prev) => ({ ...prev, visible: false }))} />
          </div>
        )}
      >
        <p className="m-0 line-height-3" style={{ color: 'var(--text-color)' }}>{resultDialog.message}</p>
      </Dialog>

      <div className="grid">
        <div className="col-12 lg:col-6">
          <Card title={t('productInfo.product.title')} className="admin-card monitoring-panel-card">
            <div className="flex flex-column gap-3">
              <div><strong>{t('productInfo.product.productName')}:</strong> {data.product.productName}</div>
              <div><strong>{t('productInfo.product.productVersion')}:</strong> {data.product.productVersion}</div>
              <div><strong>{t('productInfo.product.releaseVersion')}:</strong> {data.product.releaseVersion}</div>
              <div><strong>{t('productInfo.product.buildInfo')}:</strong> {data.product.buildInfo}</div>
              <small className="text-color-secondary">{t('productInfo.product.readOnly')}</small>
            </div>
          </Card>
        </div>

        <div className="col-12 lg:col-6">
          <Card title={t('productInfo.license.title')} className="admin-card monitoring-panel-card">
            {data.license ? (
              <div className="flex flex-column gap-3">
                <div><strong>{t('productInfo.license.licenseKey')}:</strong> {data.license.licenseKey}</div>
                <div><strong>{t('productInfo.license.expiresAt')}:</strong> {formatDateTimeSeconds(data.license.expiresAt)}</div>
                <div><strong>{t('productInfo.license.nicMacAddress')}:</strong> {data.license.nicMacAddress ?? '-'}</div>
                <div><strong>{t('productInfo.license.createdAt')}:</strong> {formatDateTimeSeconds(data.license.createdAt)}</div>
                <div><strong>{t('productInfo.license.updatedAt')}:</strong> {formatDateTimeSeconds(data.license.updatedAt)}</div>
              </div>
            ) : (
              <p className="text-color-secondary m-0">{t('productInfo.license.empty')}</p>
            )}
          </Card>
        </div>
      </div>

      <Dialog
        className="tenant-dialog"
        header={t('productInfo.upload.dialogTitle')}
        visible={showUploadDialog}
        style={{ width: '460px' }}
        onHide={() => setShowUploadDialog(false)}
      >
        <div className="flex flex-column gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".lic,.txt,.json"
            onChange={(event) => {
              const nextFile = event.target.files?.[0] ?? null;
              setSelectedFile(nextFile);
            }}
          />
          {showValidation && !selectedFile && <small className="p-error">{t('productInfo.upload.fileRequired')}</small>}
          <small className="text-color-secondary">{t('productInfo.upload.help')}</small>
          <div className="flex justify-content-end gap-2">
            <Button
              type="button"
              label={t('common.cancel')}
              severity="secondary"
              outlined
              onClick={() => setShowUploadDialog(false)}
            />
            <Button
              type="button"
              label={t('productInfo.upload.submit')}
              icon="pi pi-check"
              loading={uploading}
              onClick={() => {
                void handleUpload();
              }}
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default ProductInfoPage;
