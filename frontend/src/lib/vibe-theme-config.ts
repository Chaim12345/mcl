/**
 * Vibe Theme Configuration
 * Custom theme configurations using Vibe's color tokens and design system
 */

// Vibe color tokens and theme configuration
export const vibeThemeConfig = {
  name: 'project-management-theme',
  light: {
    // Primary colors
    'primary-color': '#0073ea',
    'primary-hover-color': '#005bb5',
    'primary-selected-color': '#004a94',
    
    // Secondary colors
    'secondary-color': '#676879',
    'secondary-hover-color': '#5a5b6a',
    'secondary-selected-color': '#4d4e5c',
    
    // Success colors
    'positive-color': '#00c875',
    'positive-hover-color': '#00a866',
    'positive-selected-color': '#008a56',
    
    // Error colors
    'negative-color': '#e2445c',
    'negative-hover-color': '#d63651',
    'negative-selected-color': '#c92845',
    
    // Warning colors
    'warning-color': '#fdab3d',
    'warning-hover-color': '#fc9f2a',
    'warning-selected-color': '#fb9316',
    
    // Background colors
    'primary-background-color': '#ffffff',
    'secondary-background-color': '#f6f7fb',
    'tertiary-background-color': '#ecedf5',
    
    // Text colors
    'primary-text-color': '#323338',
    'secondary-text-color': '#676879',
    'tertiary-text-color': '#9699a6',
    
    // Border colors
    'border-color': '#d0d4e4',
    'border-color-ui': '#c5c7d0',
    
    // Surface colors
    'surface-color': '#ffffff',
    'surface-color-medium': '#f6f7fb',
    'surface-color-light': '#fafbff',
    
    // Interactive colors
    'hover-color': '#f0f3ff',
    'selected-color': '#e6f0ff',
    'focus-color': '#0073ea',
  },
  dark: {
    // Primary colors
    'primary-color': '#4dabf7',
    'primary-hover-color': '#339af0',
    'primary-selected-color': '#228be6',
    
    // Secondary colors
    'secondary-color': '#9ca3af',
    'secondary-hover-color': '#6b7280',
    'secondary-selected-color': '#4b5563',
    
    // Success colors
    'positive-color': '#51cf66',
    'positive-hover-color': '#40c057',
    'positive-selected-color': '#37b24d',
    
    // Error colors
    'negative-color': '#ff6b6b',
    'negative-hover-color': '#ff5252',
    'negative-selected-color': '#f03e3e',
    
    // Warning colors
    'warning-color': '#ffd43b',
    'warning-hover-color': '#ffcc02',
    'warning-selected-color': '#fab005',
    
    // Background colors
    'primary-background-color': '#1a1b23',
    'secondary-background-color': '#2c2d35',
    'tertiary-background-color': '#3e3f47',
    
    // Text colors
    'primary-text-color': '#ffffff',
    'secondary-text-color': '#d1d5db',
    'tertiary-text-color': '#9ca3af',
    
    // Border colors
    'border-color': '#4b5563',
    'border-color-ui': '#374151',
    
    // Surface colors
    'surface-color': '#2c2d35',
    'surface-color-medium': '#3e3f47',
    'surface-color-light': '#4b5563',
    
    // Interactive colors
    'hover-color': '#374151',
    'selected-color': '#4b5563',
    'focus-color': '#4dabf7',
  }
};

// CSS custom properties for theme integration
export const generateThemeCSS = (theme: 'light' | 'dark') => {
  const colors = vibeThemeConfig[theme];
  
  return Object.entries(colors)
    .map(([key, value]) => `--${key}: ${value};`)
    .join('\n  ');
};

// Theme-aware utility functions
export const getThemeColor = (colorName: string, theme: 'light' | 'dark') => {
  return vibeThemeConfig[theme][colorName as keyof typeof vibeThemeConfig.light];
};

// Predefined theme variants for specific use cases
export const themeVariants = {
  // High contrast theme for accessibility
  highContrast: {
    name: 'high-contrast-theme',
    light: {
      ...vibeThemeConfig.light,
      'primary-text-color': '#000000',
      'secondary-text-color': '#333333',
      'border-color': '#000000',
      'focus-color': '#ff0000',
    },
    dark: {
      ...vibeThemeConfig.dark,
      'primary-text-color': '#ffffff',
      'secondary-text-color': '#cccccc',
      'border-color': '#ffffff',
      'focus-color': '#ffff00',
    }
  },
  
  // Compact theme for dense layouts
  compact: {
    name: 'compact-theme',
    light: vibeThemeConfig.light,
    dark: vibeThemeConfig.dark,
    // Additional spacing and sizing overrides would go here
  }
};

export default vibeThemeConfig;