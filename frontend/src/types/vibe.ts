/**
 * TypeScript type definitions for Vibe Design System components
 * These types extend and enhance the base Vibe component props
 */

import { ComponentProps } from 'react';

// Base Vibe component props that all components should extend
export interface VibeBaseProps {
  className?: string;
  'data-testid'?: string;
}

// Vibe Button component types
export interface VibeButtonProps extends VibeBaseProps {
  kind?: 'primary' | 'secondary' | 'tertiary';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

// Vibe TextField component types
export interface VibeTextFieldProps extends VibeBaseProps {
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: boolean;
  errorText?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  onFocus?: () => void;
}

// Vibe Dropdown component types
export interface VibeDropdownProps extends VibeBaseProps {
  options: Array<{
    value: string | number;
    label: string;
    disabled?: boolean;
  }>;
  value?: string | number;
  placeholder?: string;
  disabled?: boolean;
  searchable?: boolean;
  multi?: boolean;
  onChange?: (value: string | number | Array<string | number>) => void;
}