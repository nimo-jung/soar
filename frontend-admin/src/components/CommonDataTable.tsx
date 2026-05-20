import React from 'react';
import { DataTable, type DataTableProps } from 'primereact/datatable';
import { useTranslation } from 'react-i18next';

type CommonDataTableProps = DataTableProps<any>;

const CommonDataTable: React.FC<CommonDataTableProps> = ({
  emptyMessage,
  rowHover,
  stripedRows,
  size,
  className,
  ...rest
}) => {
  const { t } = useTranslation();
  const mergedClassName = ['common-data-table', 'admin-table', className].filter(Boolean).join(' ');

  return (
    <DataTable
      {...rest}
      className={mergedClassName}
      rowHover={rowHover ?? true}
      stripedRows={stripedRows ?? true}
      size={size ?? 'normal'}
      emptyMessage={emptyMessage ?? t('common.noDataFound')}
    />
  );
};

export default CommonDataTable;
