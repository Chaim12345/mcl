import React from 'react';
import { Flex } from '@vibe/core';
import { createVibeWrapper } from './base-vibe-wrapper';
import { mapCommonProps } from '@/lib/vibe-wrapper-utils';

// Vibe Flex types
export type VibeFlexDirection = 'row' | 'column';
export type VibeFlexJustify = 'start' | 'center' | 'end' | 'stretch' | 'space-around' | 'space-between' | 'initial';
export type VibeFlexAlign = 'start' | 'center' | 'end' | 'stretch' | 'initial' | 'baseline';
export type VibeFlexGap = 'xs' | 'small' | 'medium' | 'large' | number;

export interface VibeFlexProps {
  // Core props
  direction?: VibeFlexDirection;
  elementType?: React.ElementType;
  wrap?: boolean;
  children?: React.ReactNode;
  
  // Alignment
  justify?: VibeFlexJustify;
  align?: VibeFlexAlign;
  gap?: VibeFlexGap | number;
  
  // Flex properties
  flex?: string | number;
  
  // Accessibility
  ariaLabel?: string;
  ariaLabelledby?: string;
  tabIndex?: number;
  
  // Event handlers
  onClick?: (event: React.MouseEvent) => void;
  onMouseDown?: (event: React.MouseEvent) => void;
  
  // Standard props
  style?: React.CSSProperties;
  className?: string;
  id?: string;
  'data-testid'?: string;
}

const VibeFlex = createVibeWrapper<VibeFlexProps>({
  componentName: 'VibeFlex',
  vibeComponent: Flex,
  propMapper: (props) => {
    // Flex component passes through all props directly
    return {
      ...mapCommonProps(props),
    };
  }
});

export default VibeFlex;