/**
 * Vibe Design Tokens and Spacing System
 * Centralized design tokens for consistent styling across the application
 */

// Vibe Spacing System (based on 4px grid)
export const vibeSpacing = {
  // Base spacing units
  xs: '4px',    // 0.25rem
  sm: '8px',    // 0.5rem
  md: '12px',   // 0.75rem
  lg: '16px',   // 1rem
  xl: '20px',   // 1.25rem
  xxl: '24px',  // 1.5rem
  xxxl: '32px', // 2rem
  
  // Component-specific spacing
  component: {
    padding: {
      xs: '4px 8px',
      sm: '8px 12px',
      md: '12px 16px',
      lg: '16px 20px',
      xl: '20px 24px',
    },
    margin: {
      xs: '4px',
      sm: '8px',
      md: '12px',
      lg: '16px',
      xl: '20px',
    },
    gap: {
      xs: '4px',
      sm: '8px',
      md: '12px',
      lg: '16px',
      xl: '20px',
    }
  }
};

// Vibe Typography Scale
export const vibeTypography = {
  fontSize: {
    xs: '12px',
    sm: '14px',
    md: '16px',
    lg: '18px',
    xl: '20px',
    xxl: '24px',
    xxxl: '32px',
  },
  lineHeight: {
    tight: '1.2',
    normal: '1.5',
    relaxed: '1.75',
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  }
};

// Vibe Border Radius
export const vibeBorderRadius = {
  none: '0',
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  full: '9999px',
};

// Vibe Shadows
export const vibeShadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
};

// Vibe Z-Index Scale
export const vibeZIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modal: 1040,
  popover: 1050,
  tooltip: 1060,
  toast: 1070,
};

// CSS Custom Properties Generator
export const generateVibeTokensCSS = () => {
  const tokens = {
    // Spacing
    ...Object.entries(vibeSpacing).reduce((acc, [key, value]) => {
      if (typeof value === 'string') {
        acc[`--vibe-spacing-${key}`] = value;
      }
      return acc;
    }, {} as Record<string, string>),
    
    // Typography
    ...Object.entries(vibeTypography.fontSize).reduce((acc, [key, value]) => {
      acc[`--vibe-font-size-${key}`] = value;
      return acc;
    }, {} as Record<string, string>),
    
    ...Object.entries(vibeTypography.lineHeight).reduce((acc, [key, value]) => {
      acc[`--vibe-line-height-${key}`] = value;
      return acc;
    }, {} as Record<string, string>),
    
    ...Object.entries(vibeTypography.fontWeight).reduce((acc, [key, value]) => {
      acc[`--vibe-font-weight-${key}`] = value;
      return acc;
    }, {} as Record<string, string>),
    
    // Border radius
    ...Object.entries(vibeBorderRadius).reduce((acc, [key, value]) => {
      acc[`--vibe-border-radius-${key}`] = value;
      return acc;
    }, {} as Record<string, string>),
    
    // Shadows
    ...Object.entries(vibeShadows).reduce((acc, [key, value]) => {
      acc[`--vibe-shadow-${key}`] = value;
      return acc;
    }, {} as Record<string, string>),
    
    // Z-index
    ...Object.entries(vibeZIndex).reduce((acc, [key, value]) => {
      acc[`--vibe-z-index-${key}`] = value.toString();
      return acc;
    }, {} as Record<string, string>),
  };
  
  return Object.entries(tokens)
    .map(([key, value]) => `${key}: ${value};`)
    .join('\n  ');
};

// Utility functions for consistent styling
export const getVibeSpacing = (size: keyof typeof vibeSpacing) => {
  return `var(--vibe-spacing-${size}, ${vibeSpacing[size]})`;
};

export const getVibeFontSize = (size: keyof typeof vibeTypography.fontSize) => {
  return `var(--vibe-font-size-${size}, ${vibeTypography.fontSize[size]})`;
};

export const getVibeBorderRadius = (size: keyof typeof vibeBorderRadius) => {
  return `var(--vibe-border-radius-${size}, ${vibeBorderRadius[size]})`;
};

export const getVibeShadow = (size: keyof typeof vibeShadows) => {
  return `var(--vibe-shadow-${size}, ${vibeShadows[size]})`;
};

// WCAG 2.1 AA Compliant Color Utilities
export const vibeAccessibleColors = {
  // High contrast ratios for text
  textOnLight: {
    primary: '#1a1b23',     // 16.94:1 contrast ratio
    secondary: '#323338',   // 12.63:1 contrast ratio
    tertiary: '#676879',    // 4.54:1 contrast ratio
  },
  textOnDark: {
    primary: '#ffffff',     // 21:1 contrast ratio
    secondary: '#f1f2f4',   // 18.5:1 contrast ratio
    tertiary: '#d1d5db',    // 12.6:1 contrast ratio
  },
  // Focus indicators
  focus: {
    light: '#0073ea',       // 4.5:1 minimum contrast
    dark: '#4dabf7',        // 4.5:1 minimum contrast
  }
};

export default {
  spacing: vibeSpacing,
  typography: vibeTypography,
  borderRadius: vibeBorderRadius,
  shadows: vibeShadows,
  zIndex: vibeZIndex,
  accessibleColors: vibeAccessibleColors,
  generateTokensCSS: generateVibeTokensCSS,
  getSpacing: getVibeSpacing,
  getFontSize: getVibeFontSize,
  getBorderRadius: getVibeBorderRadius,
  getShadow: getVibeShadow,
};