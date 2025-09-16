import React from 'react';
import { VibeButton, VibeDropdownNext, VibeMenuButton } from '@/components/vibe';
import { useVibeTheme } from './vibe-theme-provider';
import { Sun, Moon, Monitor, Palette } from 'lucide-react';

export interface VibeThemeSwitcherProps {
  variant?: 'button' | 'dropdown' | 'menu';
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  className?: string;
}

const themeOptions = [
  {
    value: 'light' as const,
    label: 'Light',
    icon: Sun,
    description: 'Light theme'
  },
  {
    value: 'dark' as const,
    label: 'Dark', 
    icon: Moon,
    description: 'Dark theme'
  },
  {
    value: 'system' as const,
    label: 'System',
    icon: Monitor,
    description: 'Follow system preference'
  }
];

export function VibeThemeSwitcher({ 
  variant = 'dropdown',
  size = 'medium',
  showLabel = false,
  className 
}: VibeThemeSwitcherProps) {
  const { theme, effectiveTheme, setTheme, toggleTheme } = useVibeTheme();

  const currentTheme = themeOptions.find(option => option.value === theme);
  const CurrentIcon = currentTheme?.icon || Palette;

  if (variant === 'button') {
    return (
      <VibeButton
        kind="tertiary"
        size={size}
        onClick={toggleTheme}
        className={className}
        ariaLabel={`Switch theme (current: ${currentTheme?.label})`}
      >
        <CurrentIcon className="h-4 w-4" />
        {showLabel && <span className="ml-2">{currentTheme?.label}</span>}
      </VibeButton>
    );
  }

  if (variant === 'menu') {
    return (
      <VibeMenuButton
        size={size}
        className={className}
        ariaLabel="Theme settings"
        menuItems={themeOptions.map(option => ({
          id: option.value,
          title: option.label,
          icon: option.icon,
          description: option.description,
          selected: theme === option.value,
          onClick: () => setTheme(option.value)
        }))}
      >
        <CurrentIcon className="h-4 w-4" />
        {showLabel && <span className="ml-2">Theme</span>}
      </VibeMenuButton>
    );
  }

  // Default dropdown variant
  return (
    <VibeDropdownNext
      value={theme}
      onChange={(value) => setTheme(value as any)}
      options={themeOptions.map(option => ({
        value: option.value,
        label: option.label,
        icon: <option.icon className="h-4 w-4" />,
        description: option.description
      }))}
      size={size}
      className={className}
      placeholder="Select theme"
      searchable={false}
      clearable={false}
    />
  );
}

export default VibeThemeSwitcher;