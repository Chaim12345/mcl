import React from 'react';
import { Modal } from '@vibe/core/next';
import { BaseVibeWrapperProps } from './base-vibe-wrapper';

/**
 * Vibe Modal Wrapper Props
 * Simplified interface for common modal use cases
 */
export interface VibeModalProps extends BaseVibeWrapperProps {
  // Core modal props
  open: boolean;
  onClose: (event?: any) => void;
  
  // Modal configuration
  size?: 'small' | 'medium' | 'large' | 'full-view';
  title?: string;
  closeButtonAriaLabel?: string;
  alertModal?: boolean;
  autoFocus?: boolean;
  
  // Content
  children: React.ReactNode;
  
  // Advanced props
  container?: any;
  zIndex?: number;
  style?: React.CSSProperties;
  renderHeaderAction?: any;
  
  // Accessibility
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
}

/**
 * Vibe Modal Wrapper Component
 * Provides a simplified interface for the Vibe Modal with common patterns
 */
export const VibeModal: React.FC<VibeModalProps> = ({
  open,
  onClose,
  size = 'medium',
  title,
  closeButtonAriaLabel,
  alertModal = false,
  autoFocus = true,
  children,
  container,
  zIndex,
  style,
  renderHeaderAction,
  className,
  'data-testid': dataTestId,
  id,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
  ...props
}) => {
  // Generate unique ID if not provided
  const modalId = id || `vibe-modal-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <Modal
      id={modalId}
      show={open}
      onClose={onClose}
      size={size}
      closeButtonAriaLabel={closeButtonAriaLabel}
      alertModal={alertModal}
      autoFocus={autoFocus}
      container={container}
      zIndex={zIndex}
      style={style}
      renderHeaderAction={renderHeaderAction}
      className={className}
      data-testid={dataTestId}
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
      {...props}
    >
      {children}
    </Modal>
  );
};