import React from 'react';
import { Avatar } from '@vibe/core';
import { createVibeWrapper } from './base-vibe-wrapper';
import { mapCommonProps } from '@/lib/vibe-wrapper-utils';

// Vibe Avatar types
export type VibeAvatarType = 'img' | 'icon' | 'text';
export type VibeAvatarSize = 'xs' | 'small' | 'medium' | 'large';

export interface VibeAvatarProps {
  // Core props
  src?: string;
  text?: string;
  icon?: React.ReactNode;
  type?: VibeAvatarType;
  size?: VibeAvatarSize;
  customSize?: number;
  
  // Styling
  backgroundColor?: string;
  customBackgroundColor?: string;
  square?: boolean;
  withoutBorder?: boolean;
  disabled?: boolean;
  
  // Badge props
  topLeftBadgeProps?: any;
  topRightBadgeProps?: any;
  bottomLeftBadgeProps?: any;
  bottomRightBadgeProps?: any;
  
  // Tooltip
  tooltipProps?: any;
  withoutTooltip?: boolean;
  
  // Event handlers
  onClick?: (event: any, avatarId: string) => void;
  
  // Accessibility
  ariaLabel?: string;
  ariaHidden?: boolean;
  role?: React.AriaRole;
  tabIndex?: number;
  
  // Styling classes
  textClassName?: string;
  avatarContentWrapperClassName?: string;
  
  // Standard props
  className?: string;
  id?: string;
  'data-testid'?: string;
  
  // Backward compatibility with Shadcn Avatar
  alt?: string;
  fallback?: string;
}

const VibeAvatar = createVibeWrapper<VibeAvatarProps>({
  componentName: 'VibeAvatar',
  vibeComponent: Avatar,
  propMapper: (props) => {
    const {
      // Extract custom props for backward compatibility
      alt,
      fallback,
      ...vibeProps
    } = props;

    // Auto-detect type based on props
    let avatarType: VibeAvatarType = 'text';
    if (vibeProps.src) {
      avatarType = 'img';
    } else if (vibeProps.icon) {
      avatarType = 'icon';
    } else if (vibeProps.text || fallback) {
      avatarType = 'text';
    }

    // Use fallback as text if no text is provided
    const displayText = vibeProps.text || fallback;

    // Set up tooltip if ariaLabel is provided and withoutTooltip is not set
    const shouldShowTooltip = !vibeProps.withoutTooltip && (vibeProps.ariaLabel || alt);
    const tooltipContent = vibeProps.ariaLabel || alt;

    return {
      ...mapCommonProps(vibeProps),
      type: vibeProps.type || avatarType,
      text: displayText,
      ariaLabel: vibeProps.ariaLabel || alt,
      tooltipProps: shouldShowTooltip ? {
        content: tooltipContent,
        ...vibeProps.tooltipProps,
      } : vibeProps.tooltipProps,
    };
  }
});

export default VibeAvatar;