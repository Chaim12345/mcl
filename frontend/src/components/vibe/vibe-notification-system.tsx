import React from 'react';
import { AttentionBox, AttentionBoxLink } from '@vibe/core';
import VibeToast from './vibe-toast';
import VibeAlertBanner from './vibe-alert-banner';
import { createVibeWrapper } from './base-vibe-wrapper';
import { mapCommonProps } from '@/lib/vibe-wrapper-utils';

// Enhanced notification types
export type VibeNotificationType = 'info' | 'success' | 'warning' | 'error' | 'attention';

export interface VibeNotificationAction {
  type: 'button' | 'link';
  text: string;
  onClick?: () => void;
  href?: string;
}

export interface VibeNotificationProps {
  // Core props
  type?: VibeNotificationType;
  title?: React.ReactNode;
  message?: React.ReactNode;
  children?: React.ReactNode;
  
  // Behavior
  persistent?: boolean;
  dismissible?: boolean;
  autoHide?: boolean;
  autoHideDuration?: number;
  
  // Actions
  actions?: VibeNotificationAction[];
  
  // Event handlers
  onDismiss?: () => void;
  onAction?: (actionIndex: number) => void;
  
  // Styling
  variant?: 'toast' | 'banner' | 'attention';
  className?: string;
  id?: string;
  'data-testid'?: string;
}

// Map notification types to Vibe component types
const mapNotificationTypeToToast = (type: VibeNotificationType) => {
  switch (type) {
    case 'success': return 'positive';
    case 'error': return 'negative';
    case 'warning': return 'warning';
    case 'info': return 'normal';
    case 'attention': return 'dark';
    default: return 'normal';
  }
};

const mapNotificationTypeToBanner = (type: VibeNotificationType) => {
  switch (type) {
    case 'success': return 'positive';
    case 'error': return 'negative';
    case 'warning': return 'warning';
    case 'info': return 'primary';
    case 'attention': return 'dark';
    default: return 'primary';
  }
};

// Main notification component that chooses the right Vibe component
const VibeNotification: React.FC<VibeNotificationProps> = ({
  type = 'info',
  title,
  message,
  children,
  variant = 'toast',
  persistent = false,
  dismissible = true,
  autoHide = true,
  autoHideDuration = 5000,
  actions,
  onDismiss,
  onAction,
  className,
  id,
  'data-testid': dataTestId,
}) => {
  const [isVisible, setIsVisible] = React.useState(true);

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  const handleAction = (actionIndex: number) => {
    onAction?.(actionIndex);
  };

  if (!isVisible) return null;

  const content = children || (
    <div>
      {title && <div className="font-medium">{title}</div>}
      {message && <div className="text-sm">{message}</div>}
    </div>
  );

  // Render as Toast
  if (variant === 'toast') {
    return (
      <VibeToast
        type={mapNotificationTypeToToast(type)}
        open={isVisible}
        closeable={dismissible}
        autoHideDuration={autoHide ? autoHideDuration : null}
        onClose={handleDismiss}
        actions={actions}
        className={className}
        id={id}
        data-testid={dataTestId}
      >
        {content}
      </VibeToast>
    );
  }

  // Render as AlertBanner
  if (variant === 'banner') {
    return (
      <VibeAlertBanner
        backgroundColor={mapNotificationTypeToBanner(type)}
        isCloseHidden={!dismissible}
        onClose={handleDismiss}
        actions={actions}
        className={className}
        id={id}
        data-testid={dataTestId}
      >
        {content}
      </VibeAlertBanner>
    );
  }

  // Render as AttentionBox
  if (variant === 'attention') {
    return (
      <AttentionBox
        className={className}
        id={id}
        data-testid={dataTestId}
      >
        {content}
        {actions && actions.map((action, index) => (
          action.type === 'link' ? (
            <AttentionBoxLink key={index} href={action.href} text={action.text} />
          ) : (
            <button
              key={index}
              onClick={() => {
                action.onClick?.();
                handleAction(index);
              }}
              className="text-primary hover:underline"
            >
              {action.text}
            </button>
          )
        ))}
      </AttentionBox>
    );
  }

  return null;
};

export default VibeNotification;