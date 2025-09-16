import React from 'react';
import { Skeleton } from '@vibe/core';
import { createVibeWrapper } from './base-vibe-wrapper';
import { mapCommonProps } from '@/lib/vibe-wrapper-utils';

// Vibe Skeleton types
export type VibeSkeletonType = 'circle' | 'rectangle' | 'text';
export type VibeSkeletonSize = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'small' | 'custom';

export interface VibeSkeletonProps {
  // Core props
  type?: VibeSkeletonType;
  size?: VibeSkeletonSize;
  width?: number;
  height?: number;
  fullWidth?: boolean;
  
  // Styling
  wrapperClassName?: string;
  
  // Standard props
  className?: string;
  id?: string;
  'data-testid'?: string;
  
  // Backward compatibility with Shadcn Skeleton
  children?: React.ReactNode;
}

const VibeSkeleton = createVibeWrapper<VibeSkeletonProps>({
  componentName: 'VibeSkeleton',
  vibeComponent: Skeleton,
  propMapper: (props) => {
    const {
      // Extract any custom props if needed
      children,
      ...vibeProps
    } = props;

    // Default to rectangle type if not specified
    const skeletonType = vibeProps.type || 'rectangle';
    
    // If children are provided (Shadcn pattern), ignore them since Vibe Skeleton doesn't use children
    // The Vibe Skeleton is self-contained and renders based on type, size, width, height

    return {
      ...mapCommonProps(vibeProps),
      type: skeletonType,
    };
  }
});

// Convenience components for common skeleton patterns
export const VibeSkeletonText: React.FC<{ lines?: number; className?: string }> = ({ 
  lines = 1, 
  className 
}) => (
  <div className={className}>
    {Array.from({ length: lines }, (_, i) => (
      <VibeSkeleton
        key={i}
        type="text"
        size="p"
        fullWidth
        className={i < lines - 1 ? "mb-2" : ""}
      />
    ))}
  </div>
);

export const VibeSkeletonCard: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`space-y-3 ${className || ''}`}>
    <VibeSkeleton type="rectangle" height={200} fullWidth />
    <div className="space-y-2">
      <VibeSkeleton type="text" size="h3" width={200} />
      <VibeSkeleton type="text" size="p" fullWidth />
      <VibeSkeleton type="text" size="p" width={300} />
    </div>
  </div>
);

export const VibeSkeletonAvatar: React.FC<{ size?: number; className?: string }> = ({ 
  size = 40, 
  className 
}) => (
  <VibeSkeleton
    type="circle"
    width={size}
    height={size}
    className={className}
  />
);

export default VibeSkeleton;