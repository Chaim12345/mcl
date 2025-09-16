# Vibe Design System Migration Guide

## Overview

This guide provides comprehensive instructions for migrating from Shadcn/ui components to Monday.com's Vibe Design System components in our React application.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Component Migration Patterns](#component-migration-patterns)
3. [Wrapper Component Usage](#wrapper-component-usage)
4. [Theme Integration](#theme-integration)
5. [Testing Guidelines](#testing-guidelines)
6. [Performance Considerations](#performance-considerations)
7. [Troubleshooting](#troubleshooting)

## Getting Started

### Prerequisites

- React 18+
- TypeScript 4.9+
- Node.js 16+
- @vibe/core and @vibe/icons packages installed

### Installation

```bash
npm install @vibe/core @vibe/icons
```

### Basic Setup

1. Import Vibe CSS tokens in your main CSS file:
```css
@import '@vibe/core/tokens';
```

2. Wrap your app with VibeThemeProvider:
```tsx
import { VibeThemeProvider } from '@/components/vibe';

function App() {
  return (
    <VibeThemeProvider defaultTheme="system">
      {/* Your app content */}
    </VibeThemeProvider>
  );
}
```

## Component Migration Patterns

### 1. Direct Replacement Pattern

For simple components, replace Shadcn imports with Vibe wrapper imports:

**Before (Shadcn):**
```tsx
import { Button } from '@/components/ui/button';

<Button variant="destructive" size="sm">
  Delete
</Button>
```

**After (Vibe):**
```tsx
import { VibeButton } from '@/components/vibe';

<VibeButton variant="destructive" size="sm">
  Delete
</VibeButton>
```

### 2. Prop Mapping Pattern

Some props need to be mapped to Vibe equivalents:

**Before:**
```tsx
<Button variant="destructive" size="sm">
  Delete
</Button>
```

**After:**
```tsx
<VibeButton kind="secondary" size="small">
  Delete
</VibeButton>
```

### 3. Enhanced Features Pattern

Vibe components offer additional features:

```tsx
<VibeButton 
  kind="primary"
  size="medium"
  loading={isLoading}
  success={isSuccess}
  leftIcon={<SaveIcon />}
>
  Save Changes
</VibeButton>
```

## Wrapper Component Usage

### VibeButton

```tsx
import { VibeButton } from '@/components/vibe';

// Basic usage
<VibeButton kind="primary" size="medium">
  Click me
</VibeButton>

// With loading state
<VibeButton loading={isLoading} disabled={isLoading}>
  Submit
</VibeButton>

// With icons
<VibeButton leftIcon={<PlusIcon />} kind="secondary">
  Add Item
</VibeButton>
```

### VibeTextField

```tsx
import { VibeTextField } from '@/components/vibe';

// Basic usage
<VibeTextField 
  title="Email"
  placeholder="Enter your email"
  type="email"
/>

// With validation
<VibeTextField 
  title="Password"
  type="password"
  validation={{
    status: 'error',
    text: 'Password is required'
  }}
/>

// With icon
<VibeTextField 
  title="Search"
  placeholder="Search items..."
  secondaryIconName="Search"
/>
```

### VibeModal

```tsx
import { VibeModal } from '@/components/vibe';

<VibeModal
  open={isOpen}
  onClose={handleClose}
  title="Edit Item"
  size="medium"
>
  <div>Modal content here</div>
</VibeModal>
```

### VibeTable

```tsx
import { 
  VibeTable, 
  VibeTableHeader, 
  VibeTableBody, 
  VibeTableRow, 
  VibeTableCell 
} from '@/components/vibe';

<VibeTable>
  <VibeTableHeader>
    <VibeTableRow>
      <VibeTableCell>Name</VibeTableCell>
      <VibeTableCell>Status</VibeTableCell>
    </VibeTableRow>
  </VibeTableHeader>
  <VibeTableBody>
    {data.map(item => (
      <VibeTableRow key={item.id}>
        <VibeTableCell>{item.name}</VibeTableCell>
        <VibeTableCell>{item.status}</VibeTableCell>
      </VibeTableRow>
    ))}
  </VibeTableBody>
</VibeTable>
```

## Theme Integration

### Using VibeThemeProvider

```tsx
import { VibeThemeProvider, useVibeTheme } from '@/components/vibe';

function App() {
  return (
    <VibeThemeProvider defaultTheme="system" storageKey="app-theme">
      <MainApp />
    </VibeThemeProvider>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useVibeTheme();
  
  return (
    <VibeButton onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
      Toggle Theme
    </VibeButton>
  );
}
```

### Custom Theme Configuration

```tsx
import { vibeThemeConfig } from '@/lib/vibe-theme-config';

// Custom colors are automatically applied through CSS variables
// Access them in your components:
const customStyles = {
  backgroundColor: 'var(--primary-background-color)',
  color: 'var(--primary-text-color)',
  border: '1px solid var(--border-color)',
};
```

## Testing Guidelines

### Unit Testing

```tsx
import { renderWithProviders } from '@/test/vibe-test-utils';
import { VibeButton } from '@/components/vibe';

test('renders VibeButton correctly', () => {
  renderWithProviders(<VibeButton>Click me</VibeButton>);
  
  const button = screen.getByTestId('vibe-button');
  expect(button).toBeInTheDocument();
  expect(button).toHaveTextContent('Click me');
});
```

### Integration Testing

```tsx
test('form submission with Vibe components', async () => {
  renderWithProviders(<LoginForm />);
  
  const emailField = screen.getByTestId('vibe-textfield');
  const submitButton = screen.getByTestId('vibe-button');
  
  fireEvent.change(emailField, { target: { value: 'test@example.com' } });
  fireEvent.click(submitButton);
  
  await waitFor(() => {
    expect(mockSubmit).toHaveBeenCalledWith({
      email: 'test@example.com'
    });
  });
});
```

### E2E Testing

```typescript
test('complete user journey with Vibe components', async ({ page }) => {
  await page.goto('/login');
  
  await page.locator('[data-testid="vibe-textfield"]').fill('user@example.com');
  await page.locator('[data-testid="vibe-button"]').click();
  
  await expect(page.locator('[data-testid="vibe-toast"]')).toBeVisible();
});
```

## Performance Considerations

### Lazy Loading

Use lazy loading for advanced components:

```tsx
import { VibeVirtualizedGrid } from '@/components/vibe/lazy';

// Component will be loaded on-demand
<VibeVirtualizedGrid data={largeDataset} />
```

### Bundle Optimization

Import only what you need:

```tsx
// Good - specific imports
import { VibeButton, VibeTextField } from '@/components/vibe';

// Avoid - importing everything
import * as Vibe from '@/components/vibe';
```

### Performance Monitoring

```tsx
import { useVibePerformance } from '@/components/vibe';

function MyComponent() {
  const { measureRender } = useVibePerformance();
  
  useEffect(() => {
    measureRender('MyComponent', () => {
      // Component render logic
    });
  }, []);
}
```

## Troubleshooting

### Common Issues

#### 1. Component Not Rendering

**Problem:** Vibe component doesn't appear
**Solution:** Ensure VibeThemeProvider wraps your app

```tsx
// Make sure this is at the root level
<VibeThemeProvider>
  <App />
</VibeThemeProvider>
```

#### 2. Styling Issues

**Problem:** Components don't match design
**Solution:** Import Vibe CSS tokens

```css
/* In your main CSS file */
@import '@vibe/core/tokens';
```

#### 3. TypeScript Errors

**Problem:** Type errors with Vibe props
**Solution:** Use proper Vibe prop types

```tsx
import { VibeButtonProps } from '@/components/vibe';

const buttonProps: VibeButtonProps = {
  kind: 'primary', // Not 'variant'
  size: 'medium',  // Not 'md'
};
```

#### 4. Theme Not Applying

**Problem:** Theme changes don't take effect
**Solution:** Check theme provider configuration

```tsx
<VibeThemeProvider 
  defaultTheme="system"
  storageKey="vibe-ui-theme" // Ensure unique key
>
  <App />
</VibeThemeProvider>
```

### Performance Issues

#### 1. Slow Rendering

**Problem:** Components render slowly
**Solution:** Use performance optimization utilities

```tsx
import { createMemoizedVibeComponent } from '@/lib/vibe-performance';

const OptimizedVibeTable = createMemoizedVibeComponent(VibeTable);
```

#### 2. Large Bundle Size

**Problem:** Bundle size increased significantly
**Solution:** Use lazy loading and tree shaking

```tsx
// Use lazy components for large/advanced features
import { VibeVirtualizedList } from '@/components/vibe/lazy';

// Import only needed components
import { VibeButton, VibeTextField } from '@/components/vibe';
```

### Migration Checklist

- [ ] Install @vibe/core and @vibe/icons packages
- [ ] Import Vibe CSS tokens
- [ ] Wrap app with VibeThemeProvider
- [ ] Replace Shadcn components with Vibe wrappers
- [ ] Update prop names to match Vibe conventions
- [ ] Test component functionality
- [ ] Verify theme switching works
- [ ] Check accessibility compliance
- [ ] Validate performance metrics
- [ ] Update tests to use Vibe test utilities

## Best Practices

1. **Gradual Migration**: Migrate components incrementally
2. **Test Thoroughly**: Test each migrated component
3. **Use Wrappers**: Leverage our wrapper components for consistency
4. **Follow Patterns**: Use established migration patterns
5. **Monitor Performance**: Keep an eye on bundle size and render performance
6. **Maintain Accessibility**: Ensure WCAG compliance is maintained
7. **Document Changes**: Update component documentation

## Support

For additional help with Vibe migration:

1. Check the [Vibe Documentation](https://vibe.monday.com)
2. Review our [Component Organization Guide](./COMPONENT_ORGANIZATION.md)
3. Use our [Testing Utilities](../src/test/vibe-test-utils.tsx)
4. Refer to [Performance Guidelines](./PERFORMANCE_GUIDE.md)

## Version History

- v1.0.0 - Initial migration guide
- v1.1.0 - Added performance optimization section
- v1.2.0 - Enhanced troubleshooting guide