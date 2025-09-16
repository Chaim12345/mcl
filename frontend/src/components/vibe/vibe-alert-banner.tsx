import React from 'react';
import { AlertBanner, AlertBannerText, AlertBannerButton, AlertBannerLink } from '@vibe/core';
import { createVibeWrapper } from './base-vibe-wrapper';
import { mapCommonProps } from '@/lib/vibe-wrapper-utils';

// Vibe AlertBanner types
export type VibeAlertBannerBackgroundColor = 'primary' | 'positive' | 'negative' | 'dark' | 'warning';

export interface VibeAlertBannerAction {
  type: 'button' | 'link';
  text: string;
  onClick?: () => void;
  href?: string;
}

export interface VibeAlertBannerProps {
  // Core props
  backgroundColor?: VibeAlertBannerBackgroundColor;
  children?: React.ReactNode;
  
  // Actions and behavior
  actions?: VibeAlertBannerAction[];
  isCloseHidden?: boolean;
  onClose?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  
  // Accessibility
  ariaLabel?: string;
  closeButtonAriaLabel?: string;
  
  // Standard props
  className?: string;
  id?: string;
  'data-testid'?: string;
  
  // Backward compatibility with Shadcn Alert
  variant?: 'default' | 'destructive';
  title?: React.ReactNode;
  description?: React.ReactNode;
}

const VibeAlertBanner = createVibeWrapper<VibeAlertBannerProps>({
  componentName: 'VibeAlertBanner',
  vibeComponent: AlertBanner,
  propMapper: (props) => {
    const {
      // Extract custom props
      variant,
      title,
      description,
      actions,
      ...vibeProps
    } = props;

    // Map Shadcn variants to Vibe background colors
    const mappedBackgroundColor = variant === 'destructive' 
      ? 'negative' 
      : (vibeProps.backgroundColor || 'primary');

    // Render actions if provided
    const renderActions = () => {
      if (!actions || actions.length === 0) return undefined;
      
      return actions.map((action: any, index: number) => {
        if (action.type === 'button') {
          return (
            <AlertBannerButton key={index} onClick={action.onClick}>
              {action.text}
            </AlertBannerButton>
          );
        } else if (action.type === 'link') {
          return (
            <AlertBannerLink key={index} href={action.href} text={action.text} />
          );
        }
        return null;
      });
    };

    // Build content
    const content = () => {
      if (title || description) {
        return (
          <>
            {title && (
              <AlertBannerText className="font-medium" text={title} />
            )}
            {description && (
              <AlertBannerText className={title ? "mt-1" : ""} text={description} />
            )}
            {renderActions()}
          </>
        );
      }
      return (
        <>
          <AlertBannerText text={vibeProps.children as string} />
          {renderActions()}
        </>
      );
    };

    return {
      ...mapCommonProps(vibeProps),
      backgroundColor: mappedBackgroundColor,
      children: content(),
    };
  }
});

export default VibeAlertBanner;