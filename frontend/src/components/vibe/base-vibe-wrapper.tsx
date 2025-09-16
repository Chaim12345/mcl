import React from 'react';

/**
 * Base Vibe Wrapper Interface
 * Common interface that all Vibe wrapper components should implement
 */
export interface BaseVibeWrapperProps {
  className?: string;
  'data-testid'?: string;
  id?: string;
}

/**
 * Base Vibe Wrapper Component
 * Provides common functionality for all Vibe wrapper components
 */
export interface VibeWrapperConfig {
  componentName: string;
  vibeComponent: React.ComponentType<any>;
  propMapper?: (props: any) => any;
  defaultProps?: Record<string, any>;
}

/**
 * Higher-order component factory for creating Vibe wrappers
 * This provides a consistent pattern for wrapping Vibe components
 */
export function createVibeWrapper<TProps extends BaseVibeWrapperProps>(
  config: VibeWrapperConfig
) {
  const { componentName, vibeComponent: VibeComponent, propMapper, defaultProps = {} } = config;
  
  const WrappedComponent = React.forwardRef<any, TProps>((props, ref) => {
    // Apply default props
    const propsWithDefaults = { ...defaultProps, ...props };
    
    // Apply prop mapping if provided
    const mappedProps = propMapper ? propMapper(propsWithDefaults) : propsWithDefaults;
    
    // Extract common props
    const { className, 'data-testid': dataTestId, id, ...vibeProps } = mappedProps;
    
    return (
      <VibeComponent
        ref={ref}
        className={className}
        data-testid={dataTestId}
        id={id}
        {...vibeProps}
      />
    );
  });
  
  WrappedComponent.displayName = `Vibe${componentName}`;
  
  return WrappedComponent;
}

/**
 * Utility for creating consistent prop mappings
 */
export const createPropMapper = <TInputProps, TOutputProps>(
  mappingFn: (props: TInputProps) => TOutputProps
) => mappingFn;

/**
 * Common prop transformations
 */
export const commonPropTransforms = {
  // Map boolean disabled to Vibe's disabled prop
  mapDisabled: (disabled?: boolean) => disabled || false,
  
  // Map size variants
  mapSize: (size?: string) => {
    const sizeMap: Record<string, string> = {
      'sm': 'small',
      'md': 'medium', 
      'lg': 'large',
      'default': 'medium',
    };
    return sizeMap[size || 'default'] || 'medium';
  },
  
  // Map variant to kind (common pattern in Vibe)
  mapVariantToKind: (variant?: string) => {
    const kindMap: Record<string, string> = {
      'default': 'primary',
      'primary': 'primary',
      'secondary': 'secondary',
      'outline': 'secondary',
      'ghost': 'tertiary',
      'link': 'tertiary',
    };
    return kindMap[variant || 'default'] || 'primary';
  },
};