# Vibe Component Organization Guide

## Architecture Overview

This document outlines the component organization strategy for integrating Monday.com's Vibe Design System with our project management platform.

## Directory Structure

```
src/components/
├── vibe/                           # Vibe wrapper components
│   ├── base-vibe-wrapper.tsx       # Core wrapper architecture
│   ├── vibe-theme-provider.tsx     # Theme management
│   ├── vibe-*.tsx                  # Individual wrapper components
│   └── index.ts                    # Centralized exports
├── ui/                             # Legacy Shadcn components (being phased out)
├── layout/                         # Layout-specific components
├── auth/                           # Authentication components
├── workspace/                      # Business domain components
├── board/                          # Board management components
└── demo/                           # Demo and example components
```

## Component Categories

### 1. Vibe Wrapper Components (`/vibe/`)

**Purpose**: Provide backward compatibility and enhanced functionality for Vibe components.

**Naming Convention**: `Vibe[ComponentName]` (e.g., `VibeButton`, `VibeTextField`)

**Structure**:
```typescript
// vibe-button.tsx
export interface VibeButtonProps extends BaseVibeWrapperProps {
  // Vibe-specific props
  kind?: 'primary' | 'secondary' | 'tertiary';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  
  // Backward compatibility props
  variant?: 'default' | 'destructive' | 'outline';
  disabled?: boolean;
}

const VibeButton = createVibeWrapper<VibeButtonProps, typeof Button>(
  'VibeButton',
  Button,
  propMapper
);
```

**Guidelines**:
- Always extend `BaseVibeWrapperProps`
- Include backward compatibility for Shadcn props
- Use `createVibeWrapper` for consistent behavior
- Export both component and props interface

### 2. Business Logic Components (`/workspace/`, `/board/`, etc.)

**Purpose**: Implement domain-specific functionality using Vibe components.

**Naming Convention**: Descriptive names based on functionality (e.g., `WorkspaceList`, `BoardEditor`)

**Structure**:
```typescript
// workspace/workspace-list.tsx
import { VibeButton, VibeTextField, VibeTable } from '@/components/vibe';

export function WorkspaceList() {
  // Business logic here
  return (
    <div>
      <VibeTextField placeholder="Search workspaces..." />
      <VibeTable>
        {/* Table content */}
      </VibeTable>
      <VibeButton kind="primary">Create Workspace</VibeButton>
    </div>
  );
}
```

**Guidelines**:
- Import Vibe components from `@/components/vibe`
- Focus on business logic, not styling
- Use Vibe design tokens for custom styling
- Compose multiple Vibe components for complex functionality

### 3. Layout Components (`/layout/`)

**Purpose**: Provide application-wide layout structure using Vibe components.

**Examples**: `VibeHeader`, `VibeSidebar`, `VibeMainLayout`

**Guidelines**:
- Use Vibe layout components (`VibeBox`, `VibeFlex`, `VibeMenu`)
- Implement responsive design patterns
- Integrate with theme system

## Component Composition Patterns

### 1. Simple Wrapper Pattern
For basic component enhancement:

```typescript
const VibeButton = createVibeWrapper<VibeButtonProps, typeof Button>(
  'VibeButton',
  Button,
  (props) => ({
    ...mapCommonProps(props),
    kind: props.variant === 'destructive' ? 'secondary' : 'primary'
  })
);
```

### 2. Composite Component Pattern
For complex components combining multiple Vibe components:

```typescript
export function VibeFormField({ 
  label, 
  error, 
  children, 
  required 
}: VibeFormFieldProps) {
  return (
    <VibeBox className="vibe-form-field">
      <VibeLabel required={required}>{label}</VibeLabel>
      {children}
      {error && <VibeText color="negative" size="small">{error}</VibeText>}
    </VibeBox>
  );
}
```

### 3. Higher-Order Component Pattern
For adding common functionality:

```typescript
export function withVibeLoading<T extends object>(
  Component: React.ComponentType<T>
) {
  return function VibeLoadingWrapper(props: T & { loading?: boolean }) {
    const { loading, ...componentProps } = props;
    
    if (loading) {
      return <VibeSkeleton />;
    }
    
    return <Component {...(componentProps as T)} />;
  };
}
```

## When to Use Vibe vs Custom Components

### Use Vibe Components When:
- ✅ Standard UI patterns (buttons, inputs, tables)
- ✅ Consistent styling is needed
- ✅ Accessibility is important
- ✅ Theme integration is required
- ✅ Monday.com-like experience is desired

### Use Custom Components When:
- ✅ Highly specific business logic
- ✅ Complex domain-specific interactions
- ✅ Performance-critical scenarios
- ✅ Vibe component doesn't exist
- ✅ Significant customization needed

## Migration Strategy

### Phase 1: Core Components ✅
- Basic form components (Button, TextField, Checkbox)
- Layout components (Box, Flex, Menu)
- Feedback components (Toast, AlertBanner, Loader)

### Phase 2: Advanced Components ✅
- Table components with sorting/filtering
- Navigation components (Dropdown, MenuButton)
- Modal and dialog components

### Phase 3: Specialized Components
- Date pickers and advanced inputs
- Data visualization components
- Complex interaction patterns

## Best Practices

### 1. Prop Mapping
```typescript
// Good: Clear prop mapping with backward compatibility
const mapProps = (props: VibeButtonProps) => ({
  kind: props.variant === 'destructive' ? 'secondary' : 'primary',
  size: props.size || 'medium',
  loading: props.loading || false,
  disabled: props.disabled || props.loading
});

// Bad: Direct prop passing without mapping
const mapProps = (props: any) => props;
```

### 2. Type Safety
```typescript
// Good: Explicit interfaces with proper typing
export interface VibeTableProps {
  columns: VibeTableColumn[];
  data: unknown[];
  onRowClick?: (row: unknown) => void;
  loading?: boolean;
}

// Bad: Any types or missing interfaces
export interface VibeTableProps {
  columns: any;
  data: any;
  onRowClick?: any;
}
```

### 3. Accessibility
```typescript
// Good: Proper ARIA attributes and semantic HTML
<VibeButton
  ariaLabel="Delete workspace"
  onClick={handleDelete}
  kind="secondary"
>
  <TrashIcon />
</VibeButton>

// Bad: Missing accessibility attributes
<VibeButton onClick={handleDelete}>
  <TrashIcon />
</VibeButton>
```

### 4. Performance
```typescript
// Good: Memoized components for expensive operations
const VibeDataTable = React.memo(function VibeDataTable({ 
  data, 
  columns 
}: VibeDataTableProps) {
  const processedData = useMemo(() => 
    processTableData(data, columns), 
    [data, columns]
  );
  
  return <VibeTable data={processedData} columns={columns} />;
});

// Bad: No memoization for expensive operations
const VibeDataTable = ({ data, columns }) => {
  const processedData = processTableData(data, columns); // Runs on every render
  return <VibeTable data={processedData} columns={columns} />;
};
```

## Testing Strategy

### 1. Unit Tests
- Test wrapper component prop mapping
- Test business logic components
- Test accessibility features

### 2. Integration Tests
- Test component composition
- Test theme integration
- Test responsive behavior

### 3. Visual Regression Tests
- Test component appearance across themes
- Test responsive breakpoints
- Test accessibility states

## Documentation Requirements

### 1. Component Documentation
Each component should include:
- Purpose and use cases
- Props interface with descriptions
- Usage examples
- Accessibility notes
- Migration notes (if replacing Shadcn)

### 2. Storybook Integration
- Interactive component examples
- All prop variations
- Theme variations
- Accessibility testing

## Maintenance Guidelines

### 1. Regular Updates
- Keep Vibe dependencies updated
- Monitor for breaking changes
- Update wrapper components as needed

### 2. Performance Monitoring
- Bundle size impact
- Runtime performance
- Accessibility compliance

### 3. Migration Tracking
- Track component migration progress
- Document breaking changes
- Maintain backward compatibility where possible

## Conclusion

This organization strategy ensures:
- Clear separation of concerns
- Maintainable and scalable architecture
- Consistent user experience
- Easy migration path from existing components
- Future-proof design system integration