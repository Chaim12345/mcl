import React from 'react';
import { Dropdown } from '@vibe/core/next';
import { createVibeWrapper } from './base-vibe-wrapper';
import { mapCommonProps } from '@/lib/vibe-wrapper-utils';

// Vibe Dropdown types (from @vibe/core/next)
export type VibeDropdownSize = 'small' | 'medium' | 'large';
export type VibeDropdownDirection = 'ltr' | 'rtl' | 'auto';

export interface VibeDropdownOption {
  id: string;
  label: string;
  value: any;
  disabled?: boolean;
  selected?: boolean;
}

export interface VibeDropdownProps {
  // Core props
  options: VibeDropdownOption[];
  placeholder?: string;
  size?: VibeDropdownSize;
  dir?: VibeDropdownDirection;
  
  // Behavior
  searchable?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  error?: boolean;
  required?: boolean;
  clearable?: boolean;
  multi?: boolean;
  multiline?: boolean;
  
  // Menu behavior
  isMenuOpen?: boolean;
  closeMenuOnSelect?: boolean;
  autoFocus?: boolean;
  maxMenuHeight?: number;
  
  // Display
  label?: string;
  helperText?: string;
  noOptionsMessage?: React.ReactNode;
  
  // Values
  value?: VibeDropdownOption | VibeDropdownOption[];
  defaultValue?: VibeDropdownOption | VibeDropdownOption[];
  inputValue?: string;
  
  // Event handlers
  onChange?: (option: VibeDropdownOption | VibeDropdownOption[]) => void;
  onInputChange?: (input: string) => void;
  onOptionSelect?: (option: VibeDropdownOption) => void;
  onOptionRemove?: (option: VibeDropdownOption) => void;
  onMenuOpen?: () => void;
  onMenuClose?: () => void;
  onFocus?: (event: React.FocusEvent<HTMLDivElement>) => void;
  onBlur?: () => void;
  onClear?: () => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  onScroll?: (event: React.UIEvent<HTMLUListElement>) => void;
  
  // Customization
  optionRenderer?: (option: VibeDropdownOption) => React.ReactNode;
  valueRenderer?: (option: VibeDropdownOption) => React.ReactNode;
  menuRenderer?: (props: any) => React.ReactNode;
  filterOption?: (option: VibeDropdownOption, inputValue: string) => boolean;
  
  // Grouping
  withGroupDivider?: boolean;
  stickyGroupTitle?: boolean;
  showSelectedOptions?: boolean;
  
  // Accessibility
  ariaLabel?: string;
  inputAriaLabel?: string;
  menuAriaLabel?: string;
  
  // Styling
  menuWrapperClassName?: string;
  tooltipProps?: any;
  
  // Standard props
  className?: string;
  id?: string;
  'data-testid'?: string;
}

const VibeDropdownNext = createVibeWrapper<VibeDropdownProps>({
  componentName: 'VibeDropdownNext',
  vibeComponent: Dropdown,
  propMapper: (props) => {
    const {
      options,
      onChange,
      onOptionSelect,
      ...vibeProps
    } = props;

    // Transform options to Vibe format
    const vibeOptions = options.map((option: VibeDropdownOption) => ({
      id: option.id,
      label: option.label,
      value: option.value,
      disabled: option.disabled,
      selected: option.selected,
    }));

    // Handle change events
    const handleChange = (selectedOption: any) => {
      if (onChange) {
        onChange(selectedOption);
      }
    };

    const handleOptionSelect = (selectedOption: any) => {
      if (onOptionSelect) {
        onOptionSelect(selectedOption);
      }
    };

    return {
      ...mapCommonProps(vibeProps),
      options: vibeOptions,
      onChange: handleChange,
      onOptionSelect: handleOptionSelect,
    };
  }
});

export default VibeDropdownNext;