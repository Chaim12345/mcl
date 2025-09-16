import React from 'react';
import { Loader } from '@vibe/core';
import { createVibeWrapper } from './base-vibe-wrapper';
import { mapCommonProps } from '@/lib/vibe-wrapper-utils';

// Vibe Loader types
export type VibeLoaderSize = 'xs' | 'small' | 'medium' | 'large' | number;
export type VibeLoaderColor = 'primary' | 'secondary' | 'onPrimary' | 'dark';

export interface VibeLoaderProps {
  // Core props
  size?: VibeLoaderSize;
  color?: VibeLoaderColor;
  hasBackground?: boolean;
  
  // Styling
  wrapperClassName?: string;
  
  // Standard props
  className?: string;
  id?: string;
  'data-testid'?: string;
  
  // Additional props for enhanced functionality
  text?: string;
  centered?: boolean;
}

const VibeLoader = createVibeWrapper<VibeLoaderProps>({
  componentName: 'VibeLoader',
  vibeComponent: Loader,
  propMapper: (props) => {
    const {
      // Extract custom props
      text,
      centered,
      ...vibeProps
    } = props;

    // Build the loader component
    const loaderElement = (
      <Loader {...mapCommonProps(vibeProps)} />
    );

    // If text is provided, wrap with text
    if (text) {
      const content = (
        <div className={`flex flex-col items-center gap-2 ${centered ? 'justify-center min-h-[100px]' : ''}`}>
          {loaderElement}
          <span className="text-sm text-muted-foreground">{text}</span>
        </div>
      );
      
      return centered ? (
        <div className="flex items-center justify-center w-full h-full">
          {content}
        </div>
      ) : content;
    }

    // If centered, wrap in centering container
    if (centered) {
      return (
        <div className="flex items-center justify-center w-full h-full">
          {loaderElement}
        </div>
      );
    }

    return loaderElement;
  }
});

// Convenience components for common loading patterns
export const VibeLoadingSpinner: React.FC<{ 
  size?: VibeLoaderSize; 
  className?: string;
  text?: string;
}> = ({ size = 'medium', className, text }) => (
  <VibeLoader
    size={size}
    color="primary"
    text={text}
    centered
    className={className}
  />
);

export const VibeLoadingOverlay: React.FC<{ 
  text?: string;
  className?: string;
}> = ({ text = 'Loading...', className }) => (
  <div className={`fixed inset-0 bg-background/80 backdrop-blur-sm z-50 ${className || ''}`}>
    <VibeLoader
      size="large"
      color="primary"
      text={text}
      centered
    />
  </div>
);

export const VibeInlineLoader: React.FC<{ 
  size?: VibeLoaderSize;
  className?: string;
}> = ({ size = 'small', className }) => (
  <VibeLoader
    size={size}
    color="primary"
    className={`inline-block ${className || ''}`}
  />
);

export default VibeLoader;