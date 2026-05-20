import React, { useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { Message } from 'primereact/message';
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
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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
    setError('');

    try {
      const response = await api.get<ProductInfoResponse>('/admin/product-info');
      setData(response.data);
    } catch (loadError: any) {
      const responseMessage = loadError?.response?.data?.message;
      const message = Array.isArray(responseMessage) ? responseMessage.join(', ') : responseMessage;
      setError(message || t('productInfo.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    void loadData();
  }, []);

  const handleOpenUploadDialog = () => {
    setSelectedFile(null);
    setShowUploadDialog(true);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError(t('productInfo.upload.fileRequired'));
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      await api.post('/admin/product-info/license/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSuccess(t('productInfo.upload.success'));
      setShowUploadDialog(false);
      await loadData();
    } catch (uploadError: any) {
      const responseMessage = uploadError?.response?.data?.message;
      const message = Array.isArray(responseMessage) ? responseMessage.join(', ') : responseMessage;
      setError(message || t('productInfo.upload.failed'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="">
      <div className="page-header mb-4">
        <div>
          <h1 className="m-0">{t('productInfo.title')}</h1>
          <p className="m-0 mt-2 text-color-secondary">{t('productInfo.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            icon="pi pi-refresh"
            severity="secondary"
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
            onClick={handleOpenUploadDialog}
          />
        </div>
      </div>

      {error && <Message severity="error" text={error} className="w-full mb-3" />}
      {success && <Message severity="success" text={success} className="w-full mb-3" />}

      <div className="grid">
        <div className="col-12 lg:col-6">
          <Card title={t('productInfo.product.title')}>
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
          <Card title={t('productInfo.license.title')}>
            {data.license ? (
              <div className="flex flex-column gap-3">
                <div><strong>{t('productInfo.license.licenseKey')}:</strong> {data.license.licenseKey}</div>
                <div><strong>{t('productInfo.license.expiresAt')}:</strong> {formatDateTimeSeconds(data.license.expiresAt)}</div>
                <div><strong>{t('productInfo.license.nicMacAddress')}:</strong> {data.license.nicMacAddress ?? '-'}</div>
                <div><strong>{t('productInfo.license.createdAt')}:</strong> {formatDateTimeSeconds(data.license.createdAt)}</div>
                <div><strong>{t('productInfo.license.updatedAt')}:</strong> {formatDateTimeSeconds(data.license.updatedAt)}</div>
              </div>
            ) : (
              <Message severity="warn" text={t('productInfo.license.empty')} className="w-full" />
            )}
          </Card>
        </div>
      </div>

      <Dialog
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
