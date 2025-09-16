import React from 'react';
import { Checkbox } from '@vibe/core';
import { BaseVibeWrapperProps } from './base-vibe-wrapper';

/**
 * Vibe Checkbox Wrapper Props
 * Compatible with Radix Checkbox while exposing Vibe features
 */
export interface VibeCheckboxProps extends BaseVibeWrapperProps {
  // Core checkbox props
  checked?: boolean;
  defaultChecked?: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  
  // Form props
  name?: string;
  value?: string;
  
  // Labels and accessibility
  label?: any;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  
  // Events
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  
  // Styling
  checkboxClassName?: string;
  labelClassName?: string;
  
  // Focus
  autoFocus?: boolean;
  tabIndex?: number;
}

/**
 * Vibe Checkbox Wrapper Component
 * Provides backward compatibility with Radix Checkbox while using Vibe's Checkbox
 */
export const VibeCheckbox: React.FC<VibeCheckboxProps> = ({
  checked,
  defaultChecked,
  indeterminate = false,
  disabled = false,
  name = '',
  value = '',
  label,
  ariaLabel,
  ariaLabelledBy,
  onChange,
  checkboxClassName,
  labelClassName,
  autoFocus,
  tabIndex,
  className,
  'data-testid': dataTestId,
  id,
  ...props
}) => {
  return (
    <Checkbox
      checked={checked}
      defaultChecked={defaultChecked}
      indeterminate={indeterminate}
      disabled={disabled}
      name={name}
      value={value}
      label={label}
      ariaLabel={ariaLabel}
      ariaLabelledBy={ariaLabelledBy}
      onChange={onChange}
      checkboxClassName={checkboxClassName}
      labelClassName={labelClassName}
      autoFocus={autoFocus}
      tabIndex={tabIndex}
      className={className}
      data-testid={dataTestId}
      id={id}
      {...props}
    />
  );
};