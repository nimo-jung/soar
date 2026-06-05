import React, { useEffect, useState } from 'react';
import { Button } from '@/components/AdminButton';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { useTranslation } from 'react-i18next';
import api from '../../api';
import CommonDataTable from '../../components/CommonDataTable';
import { formatDateTimeSeconds } from '../../utils/date';

interface VectorApplyHistoryItem {
  id: string;
  attemptedAt: string;
  configVersion: number;
  applyStatus: 'APPLIED' | 'FAILED';
  message: string;
  configPath: string;
  renderedBytes: number;
  reloadAttempted: boolean;
  reloadSucceeded: boolean;
}

const VectorApplyHistoryPage: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<VectorApplyHistoryItem[]>([]);

  const extractApiMessage = (error: unknown): string => {
    const rawMessage = (error as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
    if (typeof rawMessage === 'string') {
      return rawMessage;
    }
    if (Array.isArray(rawMessage)) {
      return rawMessage.filter((item): item is string => typeof item === 'string').join(', ');
    }
    return '';
  };

  const load = async () => {
    setLoading(true);
    try {
      const response = await api.get<VectorApplyHistoryItem[]>('/admin/vector-settings/apply-history');
      setRows(response.data);
    } catch (error) {
      // 페이지 내에서 불필요한 모달 대신 콘솔/빈표시로 처리한다.
      // 상세 오류는 개발자 도구에서 확인할 수 있다.
      // eslint-disable-next-line no-console
      console.error(extractApiMessage(error) || t('vectorApplyHistory.loadFailed'));
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">{t('vectorApplyHistory.title')}</h1>
          <p className="admin-page-subtitle">{t('vectorApplyHistory.description')}</p>
        </div>
        <Button
          label={t('common.refresh')}
          icon="pi pi-refresh"
          severity="secondary"
          outlined
          onClick={() => {
            void load();
          }}
          disabled={loading}
        />
      </div>

      <div className="admin-card tenant-table-shell p-3">
        <CommonDataTable value={rows} loading={loading} paginator rows={10} className="admin-table p-datatable-sm">
          <Column field="attemptedAt" header={t('vectorApplyHistory.table.attemptedAt')} body={(row: VectorApplyHistoryItem) => formatDateTimeSeconds(row.attemptedAt)} />
          <Column field="configVersion" header={t('vectorApplyHistory.table.configVersion')} />
          <Column
            field="applyStatus"
            header={t('vectorApplyHistory.table.status')}
            body={(row: VectorApplyHistoryItem) => (
              <Tag
                value={row.applyStatus}
                severity={row.applyStatus === 'APPLIED' ? 'success' : 'danger'}
              />
            )}
          />
          <Column
            field="reloadSucceeded"
            header={t('vectorApplyHistory.table.reload')}
            body={(row: VectorApplyHistoryItem) => (
              <Tag
                value={row.reloadSucceeded ? t('vectorApplyHistory.reloadSucceeded') : t('vectorApplyHistory.reloadNotSucceeded')}
                severity={row.reloadSucceeded ? 'success' : 'warning'}
              />
            )}
          />
          <Column field="renderedBytes" header={t('vectorApplyHistory.table.size')} />
          <Column field="configPath" header={t('vectorApplyHistory.table.path')} />
          <Column field="message" header={t('vectorApplyHistory.table.message')} />
        </CommonDataTable>
      </div>
    </div>
  );
};

export default VectorApplyHistoryPage;
