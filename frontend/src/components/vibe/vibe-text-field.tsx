import React from 'react';
import { TextField } from '@vibe/core';
import { mapInputProps } from '../../lib/vibe-wrapper-utils';
import { InputProps } from '@/components/ui/input';

/**
 * Vibe TextField Wrapper Component
 * Wraps the @vibe/core TextField with compatibility for existing Input props
 */
export interface VibeTextFieldProps extends Omit<InputProps, 'onChange' | 'size'> {
  // Vibe-specific props
  title?: string;
  validation?: {
    status?: 'error' | 'success';
    text?: string;
  };
  iconName?: any;
  secondaryIconName?: any;
  loading?: boolean;
  size?: 'small' | 'medium' | 'large';
  showCharCount?: boolean;
  maxLength?: number;
  debounceRate?: number;
  onIconClick?: () => void;
  ariaLabel?: string;
  
  // Enhanced onChange to support both signatures
  onChange?: ((value: string, event?: any) => void) | ((event: React.ChangeEvent<HTMLInputElement>) => void);
}

export const VibeTextField: React.FC<VibeTextFieldProps> = ({
  title,
  validation,
  iconName,
  secondaryIconName,
  loading = false,
  size = 'small',
  showCharCount = false,
  maxLength,
  debounceRate = 0,
  onIconClick,
  ariaLabel,
  onChange,
  className,
  'data-testid': dataTestId,
  ...props
}) => {
  // Handle onChange to support both Vibe and Shadcn signatures
  const handleChange = (value: string, event?: any) => {
    if (onChange) {
      // Check if onChange expects the new Vibe signature or old Shadcn signature
      if (onChange.length === 1 || (onChange.length === 2 && typeof onChange === 'function')) {
        // Vibe signature: (value: string, event?: any) => void
        (onChange as (value: string, event?: any) => void)(value, event);
      } else {
        // Shadcn signature: (event: React.ChangeEvent<HTMLInputElement>) => void
        const syntheticEvent = {
          target: { value },
          currentTarget: { value },
        } as React.ChangeEvent<HTMLInputElement>;
        (onChange as (event: React.ChangeEvent<HTMLInputElement>) => void)(syntheticEvent);
      }
    }
  };

  return (
    <TextField
      title={title}
      validation={validation}
      iconName={iconName}
      secondaryIconName={secondaryIconName}
      loading={loading}
      size={size}
      showCharCount={showCharCount}
      maxLength={maxLength}
      debounceRate={debounceRate}
      onChange={handleChange}
      className={className}
      data-testid={dataTestId}
      {...props}
    />
  );
};