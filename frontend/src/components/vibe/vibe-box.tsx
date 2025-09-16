import React from 'react';
import { Box } from '@vibe/core';
import { createVibeWrapper } from './base-vibe-wrapper';
import { mapCommonProps } from '@/lib/vibe-wrapper-utils';

// Vibe Box types
export type VibeBoxSize = 'small' | 'medium' | 'xs' | 'large' | 'xl' | 'xxl' | 'xxxl' | 'auto';
export type VibeBoxBackgroundColor = 'primaryBackgroundColor' | 'secondaryBackgroundColor' | 'greyBackgroundColor' | 'allgreyBackgroundColor' | 'invertedColorBackground';
export type VibeBoxTextColor = 'primaryTextColor' | 'textColorOnInverted' | 'secondaryTextColor';
export type VibeBoxBorderColor = 'uiBorderColor' | 'layoutBorderColor';
export type VibeBoxRounded = 'big' | 'small' | 'medium';
export type VibeBoxShadow = 'small' | 'medium' | 'xs' | 'large';

export interface VibeBoxProps {
  // Core props
  elementType?: string;
  children?: React.ReactNode;
  disabled?: boolean;
  
  // Border and styling
  border?: boolean;
  borderColor?: VibeBoxBorderColor;
  rounded?: VibeBoxRounded;
  shadow?: VibeBoxShadow;
  
  // Spacing
  margin?: VibeBoxSize;
  marginX?: VibeBoxSize;
  marginY?: VibeBoxSize;
  marginTop?: VibeBoxSize;
  marginEnd?: VibeBoxSize;
  marginBottom?: VibeBoxSize;
  marginStart?: VibeBoxSize;
  
  padding?: VibeBoxSize;
  paddingX?: VibeBoxSize;
  paddingY?: VibeBoxSize;
  paddingTop?: VibeBoxSize;
  paddingEnd?: VibeBoxSize;
  paddingBottom?: VibeBoxSize;
  paddingStart?: VibeBoxSize;
  
  // Colors
  backgroundColor?: VibeBoxBackgroundColor;
  textColor?: VibeBoxTextColor;
  
  // Behavior
  scrollable?: boolean;
  
  // Standard props
  style?: React.CSSProperties;
  className?: string;
  id?: string;
  'data-testid'?: string;
  
  // Event handlers
  onClick?: (event: React.MouseEvent) => void;
  onMouseDown?: (event: React.MouseEvent) => void;
}

const VibeBox = createVibeWrapper<VibeBoxProps>({
  componentName: 'VibeBox',
  vibeComponent: Box,
  propMapper: (props) => {
    // Box component passes through all props directly
    return {
      ...mapCommonProps(props),
    };
  }
});

export default VibeBox;