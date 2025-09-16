/**
 * Vibe Design System Components Export
 * Central export point for all Vibe wrapper components and utilities
 */

// Theme Provider and Utilities
export { VibeThemeProvider, useVibeTheme } from './vibe-theme-provider';
export { VibeThemeSwitcher, type VibeThemeSwitcherProps } from './vibe-theme-switcher';

// Base Wrapper Architecture
export { 
  createVibeWrapper, 
  createPropMapper, 
  commonPropTransforms,
  type BaseVibeWrapperProps,
  type VibeWrapperConfig 
} from './base-vibe-wrapper';

// Wrapper Components
export { VibeBadge, type VibeBadgeProps } from './vibe-badge';
export { VibeButton, type VibeButtonProps } from './vibe-button';
export { VibeTextField, type VibeTextFieldProps } from './vibe-text-field';
export { VibeDropdown, type VibeDropdownProps, type VibeDropdownOption } from './vibe-dropdown';
export { VibeModal, type VibeModalProps } from './vibe-modal';
export { default as VibeAvatar, type VibeAvatarProps } from './vibe-avatar';
export { VibeCheckbox, type VibeCheckboxProps } from './vibe-checkbox';
export { VibeToggle, type VibeToggleProps } from './vibe-toggle';
export { VibeSelect, type VibeSelectProps, type VibeSelectOption, VibeSelectRoot, VibeSelectTrigger, VibeSelectContent, VibeSelectItem, VibeSelectValue } from './vibe-select';

// Notification and Feedback Components
export { default as VibeToast, type VibeToastProps, type VibeToastType, type VibeToastAction } from './vibe-toast';
export { default as VibeAlertBanner, type VibeAlertBannerProps, type VibeAlertBannerAction } from './vibe-alert-banner';
export { default as VibeSkeleton, type VibeSkeletonProps, type VibeSkeletonType, type VibeSkeletonSize, VibeSkeletonText, VibeSkeletonCard, VibeSkeletonAvatar } from './vibe-skeleton';
export { default as VibeLoader, type VibeLoaderProps, type VibeLoaderSize, type VibeLoaderColor, VibeLoadingSpinner, VibeLoadingOverlay, VibeInlineLoader } from './vibe-loader';
export { default as VibeNotification, type VibeNotificationProps, type VibeNotificationType, type VibeNotificationAction } from './vibe-notification-system';
export { default as VibeToaster, type VibeToasterProps } from './vibe-toaster';

// Layout and Navigation Components
export { default as VibeBox, type VibeBoxProps, type VibeBoxSize, type VibeBoxBackgroundColor, type VibeBoxTextColor, type VibeBoxBorderColor, type VibeBoxRounded, type VibeBoxShadow } from './vibe-box';
export { default as VibeFlex, type VibeFlexProps, type VibeFlexDirection, type VibeFlexJustify, type VibeFlexAlign, type VibeFlexGap } from './vibe-flex';
export { VibeMenu, VibeMenuItem, VibeMenuDivider, VibeMenuTitle, type VibeMenuProps, type VibeMenuItemProps, type VibeMenuDividerProps, type VibeMenuTitleProps, type VibeMenuSize } from './vibe-menu';

// Enhanced Navigation Components
export { default as VibeDropdownNext, type VibeDropdownProps as VibeDropdownNextProps, type VibeDropdownOption as VibeDropdownNextOption, type VibeDropdownSize, type VibeDropdownDirection } from './vibe-dropdown-next';
export { default as VibeMenuButton, type VibeMenuButtonProps, type VibeMenuButtonSize } from './vibe-menu-button';

// Table Components
export { 
  VibeTable, 
  VibeTableHeader, 
  VibeTableBody, 
  VibeTableRow, 
  VibeTableCell, 
  VibeTableHeaderCell, 
  VibeTableContainer,
  type VibeTableProps,
  type VibeTableHeaderProps,
  type VibeTableBodyProps,
  type VibeTableRowProps,
  type VibeTableCellProps,
  type VibeTableHeaderCellProps,
  type VibeTableContainerProps,
  type VibeTableColumn,
  type VibeTableSize
} from './vibe-table';

// Composite Components
export * from './composite';

// Lazy-loaded Advanced Components
export * from './lazy';

// Demo Component
export { VibeDemo } from './vibe-demo';

// Core Vibe Components (optimized for tree shaking)
export {
  // Essential components (always imported)
  Button,
  TextField,
  Box,
  Flex,
  Text,
  Heading,
  
  // Form components
  Checkbox,
  Toggle,
  Dropdown,
  DatePicker,
  NumberField,
  TextArea,
  Label,
  
  // Layout components
  Menu,
  MenuItem,
  MenuButton,
  Modal,
  Dialog,
  Divider,
  
  // Data display
  Table,
  TableContainer,
  TableHeader,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
  Avatar,
  Badge,
  Chips,
  
  // Feedback components
  Toast,
  AlertBanner,
  Loader,
  Skeleton,
  LinearProgressBar,
  
  // Common utilities
  Icon,
  Tooltip,
  Search,
  EmptyState
} from '@vibe/core';

// Advanced components (lazy loaded when needed)
export type {
  // Advanced component types for lazy loading
  VirtualizedGridProps,
  VirtualizedListProps,
  ColorPickerProps,
  ComboboxProps,
  MultiStepIndicatorProps
} from '@vibe/core';

// Vibe Icons Re-export
export * from '@vibe/icons';

// Utility Functions
export {
  mapButtonProps,
  mapInputProps,
  componentMappings,
  migrationStatus,
  isComponentMigrated,
  markComponentMigrated
} from '../../lib/vibe-wrapper-utils';

// Performance Utilities
export {
  useVibePerformance,
  createLazyVibeComponent,
  createMemoizedVibeComponent,
  optimizeVibeProps,
  useVibeVirtualization,
  vibePerformanceDebug
} from '../../lib/vibe-performance';