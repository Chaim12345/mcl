import React from 'react';
import { Dropdown } from '@vibe/core/next';

/**
 * Vibe Dropdown Wrapper Component
 * Wraps the @vibe/core/next Dropdown with simplified props for common use cases
 */
export interface VibeDropdownOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface VibeDropdownProps {
  options: VibeDropdownOption[];
  value?: string | number | Array<string | number>;
  defaultValue?: string | number | Array<string | number>;
  placeholder?: string;
  disabled?: boolean;
  searchable?: boolean;
  multi?: boolean;
  clearable?: boolean;
  size?: 'small' | 'medium' | 'large';
  error?: boolean;
  helperText?: string;
  label?: string;
  required?: boolean;
  className?: string;
  'data-testid'?: string;
  
  // Event handlers
  onChange?: (value: string | number | Array<string | number>) => void;
  onBlur?: () => void;
  onFocus?: (event: React.FocusEvent<HTMLDivElement>) => void;
}

export const VibeDropdown: React.FC<VibeDropdownProps> = ({
  options,
  value,
  defaultValue,
  placeholder,
  disabled = false,
  searchable = false,
  multi = false,
  clearable = false,
  size = 'medium',
  error = false,
  helperText,
  label,
  required = false,
  className,
  'data-testid': dataTestId,
  onChange,
  onBlur,
  onFocus,
  ...props
}) => {
  // Transform simple options to Vibe's expected format
  const vibeOptions = options.map(option => ({
    id: option.value.toString(),
    label: option.label,
    value: option.value,
    disabled: option.disabled || false,
  }));

  // Handle value changes
  const handleChange = (selectedOption: any) => {
    if (!onChange) return;
    
    if (multi) {
      // Multi-select: extract values from array of options
      const values = Array.isArray(selectedOption) 
        ? selectedOption.map(opt => opt.value)
        : [];
      onChange(values);
    } else {
      // Single select: extract value from single option
      const singleValue = selectedOption ? selectedOption.value : '';
      onChange(singleValue);
    }
  };

  // Transform current value to Vibe's expected format
  const getVibeValue = () => {
    if (!value) return undefined;
    
    if (multi) {
      const valueArray = Array.isArray(value) ? value : [value];
      return vibeOptions.filter(opt => valueArray.includes(opt.value));
    } else {
      return vibeOptions.find(opt => opt.value === value);
    }
  };

  return (
    <Dropdown
      options={vibeOptions}
      value={getVibeValue()}

      placeholder={placeholder}
      disabled={disabled}
      searchable={searchable}
      multi={multi}
      clearable={clearable}
      size={size}
      error={error}
      helperText={helperText}
      label={label}
      required={required}
      className={className}
      data-testid={dataTestId}
      onChange={handleChange}
      onBlur={onBlur}
      onFocus={onFocus}
      {...props}
    />
  );
};