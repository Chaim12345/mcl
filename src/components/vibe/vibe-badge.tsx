import React from 'react';
import { Badge, BadgeProps } from '@vibe/core';
import { createVibeWrapper } from './vibe-wrapper';

export interface VibeBadgeProps extends BadgeProps {
  // Additional custom props can be added here
}

export const VibeBadge = createVibeWrapper({
  component: Badge,
  displayName: 'VibeBadge'
});

export default VibeBadge;