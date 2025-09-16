/**
 * Vibe Design System Configuration
 * This file contains configuration for integrating Monday.com's Vibe components
 */

export interface VibeConfig {
  theme: {
    primaryColor: string;
    secondaryColor: string;
    fontFamily: 'Poppins' | 'Figtree' | 'Roboto';
  };
  components: {
    // Component-specific configurations
    button: {
      defaultSize: 'medium';
      defaultKind: 'primary';
    };
    table: {
      defaultSize: 'medium';
      stickyHeader: boolean;
    };
  };
}

export const defaultVibeConfig: VibeConfig = {
  theme: {
    primaryColor: '#0073ea', // Monday.com blue
    secondaryColor: '#676879', // Monday.com gray
    fontFamily: 'Poppins',
  },
  components: {
    button: {
      defaultSize: 'medium',
      defaultKind: 'primary',
    },
    table: {
      defaultSize: 'medium',
      stickyHeader: true,
    },
  },
};

// Vibe component prop mappings for easier migration
export const vibeComponentMap = {
  // Shadcn to Vibe component mappings
  Button: 'Button',
  Input: 'TextField',
  Select: 'Dropdown',
  Dialog: 'Modal',
  Table: 'Table',
  Avatar: 'Avatar',
  Toast: 'Toast',
  Alert: 'AlertBanner',
  Skeleton: 'Skeleton',
  Loader: 'Loader',
  AttentionBox: 'AttentionBox',
  Box: 'Box',
  Flex: 'Flex',
  Menu: 'Menu',
  Dropdown: 'Dropdown',
  MenuButton: 'MenuButton',
} as const;