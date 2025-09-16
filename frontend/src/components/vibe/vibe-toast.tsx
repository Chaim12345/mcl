import React from 'react';
import { Toast, ToastButton, ToastLink } from '@vibe/core';
import { createVibeWrapper } from './base-vibe-wrapper';
import { mapCommonProps } from '../../lib/vibe-wrapper-utils';

// Vibe Toast types
export type VibeToastType = 'normal' | 'positive' | 'negative' | 'warning' | 'dark';

export interface VibeToastAction {
  type: 'button' | 'link';
  text: string;
  onClick?: () => void;
  href?: string;
}

export interface VibeToastProps {
  // Core props
  open?: boolean;
  type?: VibeToastType;
  children?: React.ReactNode;
  
  // Actions and behavior
  actions?: VibeToastAction[];
  action?: React.ReactElement; // For backward compatibility
  closeable?: boolean;
  autoHideDuration?: number | null;
  
  // Loading and visual
  loading?: boolean;
  icon?: React.ReactNode;
  hideIcon?: boolean;
  
  // Event handlers
  onClose?: () => void;
  onOpenChange?: (open: boolean) => void;
  
  // Accessibility
  closeButtonAriaLabel?: string;
  
  // Standard props
  className?: string;
  id?: string;
  dataTestId?: string;
  
  // Backward compatibility with Shadcn toast
  title?: React.ReactNode;
  description?: React.ReactNode;
  variant?: 'default' | 'destructive';
  withProgress?: boolean;
}

const VibeToast = createVibeWrapper<VibeToastProps>({
  componentName: 'VibeToast',
  vibeComponent: Toast,
  propMapper: (props: VibeToastProps) => {
    const {
      // Extract custom props
      title,
      description,
      variant,
      withProgress,
      actions,
      onOpenChange,
      ...vibeProps
    } = props;

    // Map Shadcn variants to Vibe types
    const mappedType = variant === 'destructive' ? 'negative' : (vibeProps.type || 'normal');

    // Handle onOpenChange for backward compatibility
    const handleClose = () => {
      if (onOpenChange) {
        onOpenChange(false);
      }
      if (vibeProps.onClose) {
        vibeProps.onClose();
      }
    };

    // Render actions if provided
    const renderActions = () => {
      if (!actions || actions.length === 0) return undefined;
      
      return actions.map((action: VibeToastAction, index: number) => {
        if (action.type === 'button') {
          return (
            <ToastButton key={index} onClick={action.onClick}>
              {action.text}
            </ToastButton>
          );
        } else if (action.type === 'link') {
          return (
            <ToastLink key={index} href={action.href}>
              {action.text}
            </ToastLink>
          );
        }
        return null;
      });
    };

    // Build content
    const content = () => {
      if (title || description) {
        return (
          <div>
            {title && <div className="font-medium">{title}</div>}
            {description && <div className="text-sm opacity-90">{description}</div>}
          </div>
        );
      }
      return vibeProps.children;
    };

    return {
      ...mapCommonProps(vibeProps),
      type: mappedType,
      onClose: handleClose,
      actions: renderActions(),
      children: content(),
    };
  }
});

export default VibeToast;