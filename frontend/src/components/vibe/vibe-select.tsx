import React from 'react';
import { VibeDropdown, VibeDropdownOption } from './vibe-dropdown';
import { BaseVibeWrapperProps } from './base-vibe-wrapper';

/**
 * Vibe Select Wrapper Props
 * Simplified interface specifically for Select use cases (single selection)
 */
export interface VibeSelectProps extends BaseVibeWrapperProps {
  // Options
  options: VibeDropdownOption[];
  
  // Value control
  value?: string | number;
  defaultValue?: string | number;
  placeholder?: string;
  
  // Behavior
  disabled?: boolean;
  required?: boolean;
  
  // Events
  onValueChange?: (value: string | number | Array<string | number>) => void;
  onOpenChange?: (open: boolean) => void;
  
  // Styling and layout
  size?: 'small' | 'medium' | 'large';
  
  // Form integration
  name?: string;
  
  // Accessibility
  ariaLabel?: string;
}

/**
 * Vibe Select Wrapper Component
 * Specialized wrapper for single-selection use cases, compatible with Radix Select API
 */
export const VibeSelect: React.FC<VibeSelectProps> = ({
  options,
  value,
  defaultValue,
  placeholder,
  disabled = false,
  required = false,
  onValueChange,
  onOpenChange,
  size = 'medium',
  name,
  ariaLabel,
  className,
  'data-testid': dataTestId,
  id,
  ...props
}) => {
  return (
    <VibeDropdown
      options={options}
      value={value}
      defaultValue={defaultValue}
      placeholder={placeholder}
      disabled={disabled}
      required={required}
      multi={false} // Always single selection for Select
      searchable={false} // Typically selects are not searchable
      clearable={false} // Typically selects are not clearable
      size={size}
      onChange={onValueChange}
      className={className}
      {...props}
    />
  );
};

// Re-export related types and components for convenience
export type { VibeDropdownOption as VibeSelectOption };

// Compound component pattern similar to Radix Select
export const VibeSelectRoot = VibeSelect;
export const VibeSelectTrigger = VibeSelect; // For API compatibility
export const VibeSelectContent = React.Fragment; // Placeholder for API compatibility
export const VibeSelectItem = React.Fragment; // Placeholder for API compatibility
export const VibeSelectValue = React.Fragment; // Placeholder for API compatibility