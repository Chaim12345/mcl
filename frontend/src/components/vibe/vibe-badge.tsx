import React from 'react';
import { Badge } from '@vibe/core';
import { BaseVibeWrapperProps } from './base-vibe-wrapper';

export interface VibeBadgeProps extends BaseVibeWrapperProps {
  // Badge-specific props
  anchor?: 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end';
  alignment?: 'rectangular' | 'outside' | 'circular';
  type?: 'indicator' | 'counter';
  color?: 'primary' | 'dark' | 'negative' | 'light' | 'notification';
  count?: number;
  text?: string; // Custom prop for text content
  children?: React.ReactNode;
}

export const VibeBadge: React.FC<VibeBadgeProps> = ({ 
  text, 
  children,
  className,
  'data-testid': dataTestId,
  id,
  anchor,
  alignment,
  type,
  color,
  count
}) => {
  return (
    <Badge 
      className={className}
      data-testid={dataTestId}
      id={id}
      anchor={anchor}
      alignment={alignment}
      type={type}
      color={color}
      count={count}
    >
      {text || children}
    </Badge>
  );
};

export default VibeBadge;