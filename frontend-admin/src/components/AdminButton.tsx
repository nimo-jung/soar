import React from 'react';
import { Button as PrimeButton } from 'primereact/button';
import type { ButtonProps } from 'primereact/button';
import './AdminButton.css';

export type AdminButtonSize = 'dense' | 'compact' | 'default';

export type AdminButtonProps = ButtonProps & {
  buttonSize?: AdminButtonSize;
};

export const Button: React.FC<AdminButtonProps> = ({
  buttonSize,
  size,
  label,
  children,
  className,
  ...props
}) => {
  const resolvedButtonSize: AdminButtonSize =
    buttonSize ?? ((props.icon && !label && !children) ? 'dense' : 'compact');
  const resolvedSize = size ?? (resolvedButtonSize === 'default' ? undefined : 'small');
  const mergedClassName = ['admin-btn', `admin-btn--${resolvedButtonSize}`, className]
    .filter(Boolean)
    .join(' ');
  return <PrimeButton {...props} label={label} size={resolvedSize} className={mergedClassName}>{children}</PrimeButton>;
};

export default Button;