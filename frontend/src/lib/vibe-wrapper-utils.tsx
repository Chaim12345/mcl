/**
 * Vibe Component Wrapper Utilities
 * Utility functions for mapping between existing component props and Vibe component props
 */

import { ButtonProps as ShadcnButtonProps } from '../components/ui/button';
import { InputProps as ShadcnInputProps } from '../components/ui/input';

// Prop mapping utilities
export const mapButtonProps = (shadcnProps: ShadcnButtonProps) => {
  const { variant, size, disabled, className, onClick, children, ...rest } = shadcnProps;
  
  // Map Shadcn variants to Vibe kinds
  const kindMap = {
    default: 'primary',
    destructive: 'primary', // Will use color prop for destructive
    outline: 'secondary',
    secondary: 'secondary',
    ghost: 'tertiary',
    link: 'tertiary',
  } as const;

  // Map Shadcn sizes to Vibe sizes
  const sizeMap = {
    default: 'medium',
    sm: 'small',
    lg: 'large',
    icon: 'medium',
  } as const;

  return {
    kind: kindMap[variant || 'default'] || 'primary',
    size: sizeMap[size || 'default'] || 'medium',
    color: variant === 'destructive' ? 'negative' : 'primary',
    disabled: disabled || false,
    className,
    onClick,
    children,
    ...rest,
  };
};

export const mapInputProps = (shadcnProps: ShadcnInputProps) => {
  const { type, placeholder, disabled, className, onChange, onBlur, onFocus, value, ...rest } = shadcnProps;
  
  return {
    type: type || 'text',
    placeholder: placeholder || '',
    disabled: disabled || false,
    className,
    value,
    onChange: onChange ? (newValue: string) => {
      // Create synthetic event for compatibility
      const syntheticEvent = {
        target: { value: newValue },
        currentTarget: { value: newValue },
      } as React.ChangeEvent<HTMLInputElement>;
      onChange(syntheticEvent);
    } : undefined,
    onBlur,
    onFocus,
    ...rest,
  };
};

// Common props mapping utility
export const mapCommonProps = (props: any) => {
  const { className, id, dataTestId, ...rest } = props;
  return {
    className,
    id,
    'data-testid': dataTestId,
    ...rest,
  };
};

// Component mapping registry
export const componentMappings = {
  // UI Components
  'Button': 'VibeButton',
  'Input': 'VibeTextField', 
  'Select': 'VibeSelect',
  'Checkbox': 'VibeCheckbox',
  'Switch': 'VibeToggle',
  'Dialog': 'VibeModal',
  'AlertDialog': 'VibeModal',
  'Avatar': 'VibeAvatar',
  'Badge': 'VibeBadge',
  'Toast': 'VibeToast',
  'Alert': 'VibeAlertBanner',
  'Skeleton': 'VibeSkeleton',
  'Box': 'VibeBox',
  'Flex': 'VibeFlex',
  'Menu': 'VibeMenu',
  'Dropdown': 'VibeDropdownNext',
  'MenuButton': 'VibeMenuButton',
  'Progress': 'VibeLinearProgressBar',
  'Tabs': 'VibeTabs',
  'Tooltip': 'VibeTooltip',
  'Table': 'VibeTable',
  'TableHeader': 'VibeTableHeader',
  'TableBody': 'VibeTableBody',
  'TableRow': 'VibeTableRow',
  'TableCell': 'VibeTableCell',
  'Popover': 'VibePopover',
  'Card': 'VibeBox',
  'Label': 'VibeLabel',
  'Textarea': 'VibeTextArea',
} as const;

// Migration status tracking
export const migrationStatus = {
  completed: ['Button', 'Input', 'Checkbox', 'Switch', 'Dialog', 'Toast', 'Alert', 'Skeleton', 'Box', 'Flex', 'Menu', 'Dropdown', 'Avatar', 'MenuButton', 'Badge', 'Progress', 'Tabs', 'Tooltip', 'Table', 'TableHeader', 'TableBody', 'TableRow', 'TableCell'] as string[],
  inProgress: ['Select'] as string[],
  pending: ['Popover', 'Card', 'Label', 'Textarea'] as string[],
};

// Utility to check if a component has been migrated
export const isComponentMigrated = (componentName: string): boolean => {
  return migrationStatus.completed.includes(componentName);
};

// Utility to mark a component as migrated
export const markComponentMigrated = (componentName: string): void => {
  if (!migrationStatus.completed.includes(componentName)) {
    migrationStatus.completed.push(componentName);
    migrationStatus.pending = migrationStatus.pending.filter(name => name !== componentName);
    migrationStatus.inProgress = migrationStatus.inProgress.filter(name => name !== componentName);
  }
};

// Migration helper functions
export const getMigrationProgress = () => {
  const total = migrationStatus.completed.length + migrationStatus.inProgress.length + migrationStatus.pending.length;
  const completed = migrationStatus.completed.length;
  return {
    completed,
    total,
    percentage: Math.round((completed / total) * 100),
    remaining: total - completed,
  };
};

// Component usage finder (for migration planning)
export const findComponentUsage = (componentName: string) => {
  // This would be used with a build tool or script to find component usage
  return {
    component: componentName,
    vibeEquivalent: componentMappings[componentName as keyof typeof componentMappings],
    migrated: isComponentMigrated(componentName),
    // In a real implementation, this would scan files for usage
    usageCount: 0,
    files: [] as string[],
  };
};