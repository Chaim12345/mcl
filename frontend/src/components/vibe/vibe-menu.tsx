import React from 'react';
import { Menu, MenuItem, MenuDivider, MenuTitle } from '@vibe/core';
import { createVibeWrapper } from './base-vibe-wrapper';
import { mapCommonProps } from '@/lib/vibe-wrapper-utils';

// Vibe Menu types
export type VibeMenuSize = 'xxs' | 'xs' | 'small' | 'medium' | 'large';

export interface VibeMenuProps {
  // Core props
  size?: VibeMenuSize;
  children?: React.ReactNode;
  
  // Behavior
  isVisible?: boolean;
  focusOnMount?: boolean;
  focusItemIndex?: number;
  focusItemIndexOnMount?: number;
  isSubMenu?: boolean;
  useDocumentEventListeners?: boolean;
  shouldScrollMenu?: boolean;
  
  // Event handlers
  onItemFocus?: (index: number) => void;
  onClose?: (option: any) => void;
  
  // Accessibility
  ariaLabel?: string;
  ariaDescribedBy?: string;
  tabIndex?: number;
  
  // Standard props
  className?: string;
  id?: string;
  'data-testid'?: string;
}

const VibeMenu = createVibeWrapper<VibeMenuProps>({
  componentName: 'VibeMenu',
  vibeComponent: Menu,
  propMapper: (props) => {
    return {
      ...mapCommonProps(props),
    };
  }
});

// Vibe MenuItem types
export interface VibeMenuItemProps {
  // Core props
  title?: string | React.ReactElement;
  label?: any;
  icon?: any;
  iconType?: 'svg' | 'font' | 'src';
  iconBackgroundColor?: string;
  children?: React.ReactNode;
  
  // State
  disabled?: boolean;
  disableReason?: string;
  selected?: boolean;
  
  // Event handlers
  onClick?: (event: any) => void;
  onMouseEnter?: (event: React.MouseEvent) => void;
  onMouseLeave?: (event: React.MouseEvent) => void;
  
  // Tooltip
  tooltipContent?: string;
  tooltipPosition?: 'top' | 'right' | 'bottom' | 'left';
  tooltipShowDelay?: number;
  
  // Advanced props
  splitMenuItem?: boolean;
  submenuPosition?: 'right' | 'left';
  
  // Accessibility
  'aria-label'?: string;
  
  // Standard props
  className?: string;
  id?: string;
  'data-testid'?: string;
}

const VibeMenuItem = createVibeWrapper<VibeMenuItemProps>({
  componentName: 'VibeMenuItem',
  vibeComponent: MenuItem,
  propMapper: (props) => {
    return {
      ...mapCommonProps(props),
    };
  }
});

// Menu Divider wrapper
export interface VibeMenuDividerProps {
  className?: string;
  id?: string;
  'data-testid'?: string;
}

const VibeMenuDivider = createVibeWrapper<VibeMenuDividerProps>({
  componentName: 'VibeMenuDivider',
  vibeComponent: MenuDivider,
  propMapper: (props) => {
    return {
      ...mapCommonProps(props),
    };
  }
});

// Menu Title wrapper
export interface VibeMenuTitleProps {
  children?: React.ReactNode;
  className?: string;
  id?: string;
  'data-testid'?: string;
}

const VibeMenuTitle = createVibeWrapper<VibeMenuTitleProps>({
  componentName: 'VibeMenuTitle',
  vibeComponent: MenuTitle,
  propMapper: (props) => {
    return {
      ...mapCommonProps(props),
    };
  }
});

export { VibeMenu, VibeMenuItem, VibeMenuDivider, VibeMenuTitle };
export default VibeMenu;