import React from 'react';
import { Toggle } from '@vibe/core';
import { BaseVibeWrapperProps } from './base-vibe-wrapper';

/**
 * Vibe Toggle Wrapper Props
 * Compatible with Radix Switch while exposing Vibe Toggle features
 */
export interface VibeToggleProps extends BaseVibeWrapperProps {
  // Core toggle props (mapped from Switch props)
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  
  // Form props
  name?: string;
  value?: string;
  
  // Vibe-specific props
  size?: 'small' | 'medium';
  areLabelsHidden?: boolean;
  onOverrideText?: string;
  offOverrideText?: string;
  
  // Events (supporting both Switch and Toggle signatures)
  onChange?: ((checked: boolean) => void) | ((value: boolean, event: React.ChangeEvent<HTMLInputElement>) => void);
  
  // Accessibility
  ariaLabel?: string;
  ariaControls?: string;
  
  // Styling
  toggleSelectedClassName?: string;
  
  // Focus
  tabIndex?: number;
}

/**
 * Vibe Toggle Wrapper Component
 * Replaces Radix Switch with Vibe Toggle, maintaining backward compatibility
 */
export const VibeToggle: React.FC<VibeToggleProps> = ({
  checked,
  defaultChecked,
  disabled = false,
  name,
  value,
  size = 'medium',
  areLabelsHidden = false,
  onOverrideText = 'On',
  offOverrideText = 'Off',
  onChange,
  ariaLabel,
  ariaControls,
  toggleSelectedClassName,
  tabIndex,
  className,
  'data-testid': dataTestId,
  id,
  ...props
}) => {
  // Handle onChange to support both Switch and Toggle signatures
  const handleChange = (value: boolean, event: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange) {
      if (onChange.length === 1) {
        // Switch signature: (checked: boolean) => void
        (onChange as (checked: boolean) => void)(value);
      } else {
        // Toggle signature: (value: boolean, event: ChangeEvent) => void
        (onChange as (value: boolean, event: React.ChangeEvent<HTMLInputElement>) => void)(value, event);
      }
    }
  };

  return (
    <Toggle
      isSelected={checked}
      isDefaultSelected={defaultChecked}
      disabled={disabled}
      name={name}
      value={value}
      size={size}
      areLabelsHidden={areLabelsHidden}
      onOverrideText={onOverrideText}
      offOverrideText={offOverrideText}
      onChange={handleChange}
      ariaLabel={ariaLabel}
      ariaControls={ariaControls}
      toggleSelectedClassName={toggleSelectedClassName}
      className={className}
      data-testid={dataTestId}
      id={id}
      {...props}
    />
  );
};