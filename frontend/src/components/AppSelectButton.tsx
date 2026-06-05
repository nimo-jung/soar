import React from 'react';
import { SelectButton as PrimeSelectButton } from 'primereact/selectbutton';
import type { SelectButtonProps } from 'primereact/selectbutton';
import './AppSelectButton.css';

export type AppSelectButtonSize = 'dense' | 'compact' | 'default';

export type AppSelectButtonProps = SelectButtonProps & {
  buttonSize?: AppSelectButtonSize;
};

export const SelectButton: React.FC<AppSelectButtonProps> = ({
  buttonSize = 'compact',
  className,
  ...props
}) => {
  const mergedClassName = ['app-select-btn', `app-select-btn--${buttonSize}`, className]
    .filter(Boolean)
    .join(' ');

  return <PrimeSelectButton {...props} className={mergedClassName} />;
};

export default SelectButton;
