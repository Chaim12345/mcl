/**
 * Vibe Component Testing Utilities
 * Custom testing utilities for Vibe wrapper components
 */

import React from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { vi } from 'vitest';
import { VibeThemeProvider } from '../components/vibe/vibe-theme-provider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock Vibe core components for testing
export const mockVibeComponents = {
  Button: vi.fn(({ children, onClick, ...props }) => (
    <button onClick={onClick} {...props} data-testid="vibe-button">
      {children}
    </button>
  )),
  TextField: vi.fn(({ value, onChange, ...props }) => (
    <input 
      value={value} 
      onChange={(e) => onChange?.(e.target.value)} 
      {...props} 
      data-testid="vibe-textfield"
    />
  )),
  Dropdown: vi.fn(({ value, onChange, options, ...props }) => (
    <select 
      value={value} 
      onChange={(e) => onChange?.(e.target.value)} 
      {...props}
      data-testid="vibe-dropdown"
    >
      {options?.map((option: any) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )),
  Modal: vi.fn(({ children, open, onClose, ...props }) => 
    open ? (
      <div {...props} data-testid="vibe-modal">
        <button onClick={onClose} data-testid="modal-close">×</button>
        {children}
      </div>
    ) : null
  ),
  Avatar: vi.fn(({ src, text, ...props }) => (
    <div {...props} data-testid="vibe-avatar">
      {src ? <img src={src} alt="avatar" /> : text}
    </div>
  )),
  Checkbox: vi.fn(({ checked, onChange, label, ...props }) => (
    <label>
      <input 
        type="checkbox" 
        checked={checked} 
        onChange={(e) => onChange?.(e)} 
        {...props}
        data-testid="vibe-checkbox"
      />
      {label}
    </label>
  )),
  Toggle: vi.fn(({ checked, onChange, ...props }) => (
    <input 
      type="checkbox" 
      checked={checked} 
      onChange={(e) => onChange?.(e)} 
      {...props}
      data-testid="vibe-toggle"
    />
  )),
  Toast: vi.fn(({ children, type, open, ...props }) => 
    open ? (
      <div {...props} data-testid="vibe-toast" data-type={type}>
        {children}
      </div>
    ) : null
  ),
  AlertBanner: vi.fn(({ children, backgroundColor, ...props }) => (
    <div {...props} data-testid="vibe-alert-banner" data-background={backgroundColor}>
      {children}
    </div>
  )),
  Skeleton: vi.fn(({ type, ...props }) => (
    <div {...props} data-testid="vibe-skeleton" data-type={type}>
      Loading...
    </div>
  )),
  Loader: vi.fn(({ size, ...props }) => (
    <div {...props} data-testid="vibe-loader" data-size={size}>
      Loading...
    </div>
  )),
  Box: vi.fn(({ children, ...props }) => (
    <div {...props} data-testid="vibe-box">
      {children}
    </div>
  )),
  Flex: vi.fn(({ children, direction, ...props }) => (
    <div {...props} data-testid="vibe-flex" data-direction={direction}>
      {children}
    </div>
  )),
  Menu: vi.fn(({ children, ...props }) => (
    <div {...props} data-testid="vibe-menu">
      {children}
    </div>
  )),
  MenuItem: vi.fn(({ children, onClick, ...props }) => (
    <div {...props} data-testid="vibe-menu-item" onClick={onClick}>
      {children}
    </div>
  )),
  Table: vi.fn(({ children, ...props }) => (
    <table {...props} data-testid="vibe-table">
      {children}
    </table>
  )),
  TableHeader: vi.fn(({ children, ...props }) => (
    <thead {...props} data-testid="vibe-table-header">
      {children}
    </thead>
  )),
  TableBody: vi.fn(({ children, ...props }) => (
    <tbody {...props} data-testid="vibe-table-body">
      {children}
    </tbody>
  )),
  TableRow: vi.fn(({ children, ...props }) => (
    <tr {...props} data-testid="vibe-table-row">
      {children}
    </tr>
  )),
  TableCell: vi.fn(({ children, ...props }) => (
    <td {...props} data-testid="vibe-table-cell">
      {children}
    </td>
  )),
  ThemeProvider: vi.fn(({ children }) => <div>{children}</div>),
};

// Mock the @vibe/core module
vi.mock('@vibe/core', () => mockVibeComponents);

// Test wrapper with providers
interface TestWrapperProps {
  children: React.ReactNode;
  theme?: 'light' | 'dark' | 'system';
}

function TestWrapper({ children, theme = 'light' }: TestWrapperProps) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <VibeThemeProvider defaultTheme={theme}>
        {children}
      </VibeThemeProvider>
    </QueryClientProvider>
  );
}

// Custom render function with providers
export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & {
    theme?: 'light' | 'dark' | 'system';
  }
): RenderResult {
  const { theme, ...renderOptions } = options || {};
  
  return render(ui, {
    wrapper: ({ children }) => (
      <TestWrapper theme={theme}>{children}</TestWrapper>
    ),
    ...renderOptions,
  });
}

// Vibe component testing utilities
export const vibeTestUtils = {
  // Create mock props for different Vibe components
  createButtonProps: (overrides = {}) => ({
    kind: 'primary' as const,
    size: 'medium' as const,
    loading: false,
    disabled: false,
    ...overrides,
  }),

  createTextFieldProps: (overrides = {}) => ({
    title: 'Test Field',
    placeholder: 'Enter text',
    size: 'medium' as const,
    disabled: false,
    ...overrides,
  }),

  createDropdownProps: (overrides = {}) => ({
    options: [
      { value: 'option1', label: 'Option 1' },
      { value: 'option2', label: 'Option 2' },
    ],
    placeholder: 'Select option',
    size: 'medium' as const,
    ...overrides,
  }),

  createModalProps: (overrides = {}) => ({
    open: true,
    onClose: vi.fn(),
    title: 'Test Modal',
    ...overrides,
  }),

  createAvatarProps: (overrides = {}) => ({
    size: 'medium' as const,
    text: 'AB',
    ...overrides,
  }),

  // Assertion helpers
  expectVibeComponent: (element: HTMLElement, componentType: string) => {
    expect(element).toHaveAttribute('data-testid', `vibe-${componentType}`);
  },

  expectVibeProps: (mockFn: any, expectedProps: any) => {
    expect(mockFn).toHaveBeenCalledWith(
      expect.objectContaining(expectedProps),
      expect.any(Object)
    );
  },

  // Event simulation helpers
  simulateVibeEvent: {
    click: (element: HTMLElement) => {
      element.click();
    },
    
    change: (element: HTMLInputElement, value: string) => {
      element.value = value;
      element.dispatchEvent(new Event('change', { bubbles: true }));
    },
    
    keyDown: (element: HTMLElement, key: string) => {
      element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    },
  },

  // Theme testing helpers
  testWithThemes: (testFn: (theme: 'light' | 'dark') => void) => {
    ['light', 'dark'].forEach((theme) => {
      testFn(theme as 'light' | 'dark');
    });
  },

  // Accessibility testing helpers
  expectAccessibleComponent: (element: HTMLElement) => {
    // Check for basic accessibility attributes
    const hasAriaLabel = element.hasAttribute('aria-label');
    const hasAriaLabelledBy = element.hasAttribute('aria-labelledby');
    const hasRole = element.hasAttribute('role');
    
    expect(hasAriaLabel || hasAriaLabelledBy || hasRole).toBe(true);
  },

  // Performance testing helpers
  measureRenderTime: async (renderFn: () => void) => {
    const start = performance.now();
    renderFn();
    const end = performance.now();
    return end - start;
  },
};

// Custom matchers for Vibe components
export const vibeMatchers = {
  toHaveVibeProps: (received: any, expected: any) => {
    const pass = Object.keys(expected).every(key => 
      received.props && received.props[key] === expected[key]
    );
    
    return {
      pass,
      message: () => 
        pass 
          ? `Expected component not to have Vibe props ${JSON.stringify(expected)}`
          : `Expected component to have Vibe props ${JSON.stringify(expected)}`,
    };
  },

  toBeVibeComponent: (received: any, componentType: string) => {
    const pass = received.type?.displayName?.includes('Vibe') || 
                  received.props?.['data-testid']?.includes('vibe');
    
    return {
      pass,
      message: () => 
        pass 
          ? `Expected element not to be a Vibe component`
          : `Expected element to be a Vibe ${componentType} component`,
    };
  },
};

export default {
  renderWithProviders,
  vibeTestUtils,
  vibeMatchers,
  mockVibeComponents,
};