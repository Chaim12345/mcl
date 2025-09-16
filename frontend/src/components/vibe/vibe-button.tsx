import React from 'react';
import { Button } from '@vibe/core';
import { ButtonProps as ShadcnButtonProps } from '@/components/ui/button';
import { BaseVibeWrapperProps, commonPropTransforms } from './base-vibe-wrapper';

/**
 * Enhanced Vibe Button Props
 * Combines Shadcn Button props with Vibe-specific enhancements
 */
export interface VibeButtonProps extends BaseVibeWrapperProps, Omit<ShadcnButtonProps, 'asChild' | 'size'> {
  // Vibe-specific props
  kind?: 'primary' | 'secondary' | 'tertiary';
  color?: 'primary' | 'positive' | 'negative' | 'inverted' | 'brand';
  loading?: boolean;
  success?: boolean;
  successText?: string;
  leftIcon?: any;
  rightIcon?: any;
  active?: boolean;
  marginLeft?: boolean;
  marginRight?: boolean;
  // Override size to match Vibe Button sizes
  size?: 'xxs' | 'xs' | 'small' | 'medium' | 'large';
  
  // Accessibility props
  ariaLabel?: string;
  ariaExpanded?: boolean;
  ariaControls?: string;
}

/**
 * Vibe Button Wrapper Component
 * Enhanced wrapper that provides backward compatibility with Shadcn Button
 * while exposing Vibe's advanced features
 */
export const VibeButton: React.FC<VibeButtonProps> = ({
  // Shadcn compatibility props
  variant,
  size = 'medium',
  disabled = false,
  
  // Vibe-specific props
  kind,
  color = 'primary',
  loading = false,
  success = false,
  successText,
  leftIcon,
  rightIcon,
  active = false,
  marginLeft = false,
  marginRight = false,
  
  // Accessibility
  ariaLabel,
  ariaExpanded,
  ariaControls,
  
  // Common props
  className,
  'data-testid': dataTestId,
  id,
  onClick,
  children,
  ...props
}) => {
  // Map Shadcn variant to Vibe kind if kind not explicitly provided
  const resolvedKind = kind || commonPropTransforms.mapVariantToKind(variant || 'default');
  
  // Map Shadcn size to Vibe size
  const resolvedSize = (() => {
    const sizeMap: Record<string, string> = {
      'default': 'medium',
      'sm': 'small',
      'lg': 'large',
      'icon': 'medium',
      'xxs': 'xxs',
      'xs': 'xs',
      'small': 'small',
      'medium': 'medium',
      'large': 'large',
    };
    return sizeMap[size] || 'medium';
  })();
  
  // Handle destructive variant by setting color
  const resolvedColor = variant === 'destructive' ? 'negative' : color;

  return (
    <Button
      kind={resolvedKind as any}
      size={resolvedSize as any}
      color={resolvedColor as any}
      disabled={disabled}
      loading={loading}
      success={success}
      successText={successText}
      leftIcon={leftIcon}
      rightIcon={rightIcon}
      active={active}
      marginLeft={marginLeft}
      marginRight={marginRight}
      ariaLabel={ariaLabel}
      ariaExpanded={ariaExpanded}
      ariaControls={ariaControls}
      className={className}
      data-testid={dataTestId}
      id={id}
      onClick={onClick}
      {...props}
    >
      {children}
    </Button>
  );
};