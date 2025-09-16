import React from 'react';
import { MenuButton } from '@vibe/core';
import { createVibeWrapper } from './base-vibe-wrapper';
import { mapCommonProps } from '@/lib/vibe-wrapper-utils';

// Vibe MenuButton types
export type VibeMenuButtonSize = 'xxs' | 'xs' | 'small' | 'medium' | 'large';

export interface VibeMenuButtonProps {
  // Core props
  children?: React.ReactNode;
  component?: React.ReactNode;
  text?: string;
  size?: VibeMenuButtonSize;
  
  // State
  active?: boolean;
  open?: boolean;
  disabled?: boolean;
  
  // Dialog positioning
  dialogPosition?: 'left' | 'left-start' | 'left-end' | 'right' | 'right-start' | 'right-end' | 'top' | 'top-start' | 'top-end' | 'bottom' | 'bottom-start' | 'bottom-end';
  dialogOffset?: { main: number; secondary: number };
  dialogPaddingSize?: 'small' | 'medium' | 'large' | 'none';
  startingEdge?: string;
  zIndex?: number;
  
  // Event handlers
  onClick?: (event: React.MouseEvent) => void;
  onMenuShow?: () => void;
  onMenuHide?: () => void;
  
  // Tooltip
  tooltipContent?: string;
  tooltipPosition?: 'left' | 'right' | 'top' | 'bottom';
  tooltipTriggers?: any;
  tooltipProps?: any;
  tooltipReferenceClassName?: string;
  showTooltipOnlyOnTriggerElement?: boolean;
  
  // Advanced behavior
  closeMenuOnItemClick?: boolean;
  closeDialogOnContentClick?: boolean;
  removeTabCloseTrigger?: boolean;
  hideWhenReferenceHidden?: boolean;
  
  // Dialog customization
  dialogClassName?: string;
  openDialogComponentClassName?: string;
  dialogShowTriggerIgnoreClass?: string | string[];
  dialogHideTriggerIgnoreClass?: string | string[];
  dialogContainerSelector?: string;
  
  // Component positioning
  componentPosition?: 'start' | 'end';
  triggerElement?: React.ElementType;
  
  // Accessibility
  ariaLabel?: string;
  ariaControls?: string;
  
  // Standard props
  className?: string;
  id?: string;
  'data-testid'?: string;
}

const VibeMenuButton = createVibeWrapper<VibeMenuButtonProps>({
  componentName: 'VibeMenuButton',
  vibeComponent: MenuButton,
  propMapper: (props) => {
    // MenuButton passes through all props directly
    return {
      ...mapCommonProps(props),
    };
  }
});

export default VibeMenuButton;