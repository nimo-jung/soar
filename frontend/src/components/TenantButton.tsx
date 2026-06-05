import React from 'react';
import { Button as PrimeButton } from 'primereact/button';
import type { ButtonProps } from 'primereact/button';
import './TenantButton.css';

export type TenantButtonSize = 'dense' | 'compact' | 'default';

export type TenantButtonProps = ButtonProps & {
  buttonSize?: TenantButtonSize;
};

export const Button: React.FC<TenantButtonProps> = ({
  buttonSize,
  size,
  label,
  children,
  className,
  ...props
}) => {
  const resolvedButtonSize: TenantButtonSize =
    buttonSize ?? ((props.icon && !label && !children) ? 'dense' : 'compact');
  const resolvedSize = size ?? (resolvedButtonSize === 'default' ? undefined : 'small');
  const mergedClassName = ['tenant-btn', `tenant-btn--${resolvedButtonSize}`, className]
    .filter(Boolean)
    .join(' ');
  return <PrimeButton {...props} label={label} size={resolvedSize} className={mergedClassName}>{children}</PrimeButton>;
};

export default Button;