import React from 'react';
import { MultiSelect as PrimeMultiSelect } from 'primereact/multiselect';
import type { MultiSelectProps } from 'primereact/multiselect';
import './AppMultiSelect.css';

export type AppMultiSelectSize = 'dense' | 'compact' | 'default';

export type AppMultiSelectProps = MultiSelectProps & {
  controlSize?: AppMultiSelectSize;
};

export const MultiSelect: React.FC<AppMultiSelectProps> = ({
  controlSize = 'compact',
  className,
  ...props
}) => {
  const mergedClassName = ['app-multiselect', `app-multiselect--${controlSize}`, className]
    .filter(Boolean)
    .join(' ');

  return <PrimeMultiSelect {...props} className={mergedClassName} />;
};

export default MultiSelect;
