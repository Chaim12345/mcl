# Vibe Component Wrapper Architecture

This directory contains wrapper components that integrate Monday.com's Vibe Design System with our existing React application. The wrapper architecture provides backward compatibility with existing Shadcn/ui components while exposing Vibe's advanced features.

## Architecture Overview

### Base Wrapper Pattern

All Vibe wrapper components follow a consistent pattern:

1. **Backward Compatibility**: Existing component props are mapped to Vibe equivalents
2. **Enhanced Features**: Vibe-specific props are exposed for advanced use cases
3. **Type Safety**: Full TypeScript support with proper prop interfaces
4. **Consistent API**: Common props (className, data-testid, id) work across all components

### Component Structure

```
components/vibe/
├── base-vibe-wrapper.tsx      # Base wrapper utilities and HOC
├── vibe-theme-provider.tsx    # Theme management
├── vibe-button.tsx           # Button wrapper
├── vibe-text-field.tsx       # TextField wrapper
├── vibe-dropdown.tsx         # Dropdown wrapper
├── vibe-modal.tsx            # Modal wrapper
├── vibe-avatar.tsx           # Avatar wrapper
├── vibe-demo.tsx             # Demo component
├── index.ts                  # Component exports
└── README.md                 # This documentation
```

## Available Components

### VibeButton

Enhanced button component with backward compatibility for Shadcn Button props.

```tsx
import { VibeButton } from '@/components/vibe';

// Shadcn compatibility
<VibeButton variant="primary" size="lg">Click me</VibeButton>

// Vibe-specific features
<VibeButton 
  kind="primary" 
  color="positive" 
  loading={true}
  leftIcon={<Icon />}
>
  Save Changes
</VibeButton>
```

**Key Features:**
- Maps Shadcn variants to Vibe kinds
- Supports loading states and icons
- Enhanced accessibility props
- Success state support

### VibeTextField

Text input component with dual onChange signature support.

```tsx
import { VibeTextField } from '@/components/vibe';

// Basic usage
<VibeTextField 
  placeholder="Enter text"
  value={value}
  onChange={(newValue) => setValue(newValue)}
/>

// With validation
<VibeTextField
  title="Email Address"
  type="email"
  validation={{
    status: 'error',
    text: 'Please enter a valid email'
  }}
  required
/>
```

**Key Features:**
- Supports both Vibe and Shadcn onChange signatures
- Built-in validation display
- Loading states and icons
- Character count support

### VibeDropdown

Simplified dropdown component with easy option management.

```tsx
import { VibeDropdown } from '@/components/vibe';

const options = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
];

<VibeDropdown
  options={options}
  value={selectedValue}
  onChange={(value) => setSelectedValue(value)}
  searchable
  placeholder="Select an option"
/>
```

**Key Features:**
- Simplified option interface
- Multi-select support
- Searchable options
- Clear button support

### VibeModal

Modal component with simplified API for common use cases.

```tsx
import { VibeModal } from '@/components/vibe';

<VibeModal
  open={isOpen}
  onClose={() => setIsOpen(false)}
  size="medium"
  title="Modal Title"
>
  <p>Modal content goes here</p>
</VibeModal>
```

**Key Features:**
- Simplified open/close API
- Auto-generated IDs
- Focus management
- Alert modal support

### VibeAvatar

Avatar component with automatic type detection.

```tsx
import { VibeAvatar } from '@/components/vibe';

// Image avatar
<VibeAvatar src="/user-avatar.jpg" size="large" />

// Text avatar
<VibeAvatar text="JD" backgroundColor="primary" />

// Icon avatar
<VibeAvatar icon={<UserIcon />} size="medium" />
```

**Key Features:**
- Automatic type detection
- Badge support
- Custom colors and sizes
- Tooltip integration

## Migration Guide

### Step 1: Import Wrapper Components

Replace existing component imports:

```tsx
// Before
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// After
import { VibeButton, VibeTextField } from '@/components/vibe';
```

### Step 2: Update Component Usage

Most existing props will work without changes:

```tsx
// Before
<Button variant="primary" size="lg" disabled={loading}>
  Submit
</Button>

// After (backward compatible)
<VibeButton variant="primary" size="lg" disabled={loading}>
  Submit
</VibeButton>

// Enhanced (using Vibe features)
<VibeButton kind="primary" size="large" loading={loading}>
  Submit
</VibeButton>
```

### Step 3: Leverage Vibe Features

Gradually adopt Vibe-specific features:

```tsx
// Add loading states
<VibeButton loading={isSubmitting}>Submit</VibeButton>

// Add icons
<VibeButton leftIcon={<SaveIcon />}>Save</VibeButton>

// Use success states
<VibeButton success={saved} successText="Saved!">Save</VibeButton>
```

## Utilities

### Prop Mapping

The `vibe-wrapper-utils.ts` file provides utilities for mapping between component prop formats:

```tsx
import { mapButtonProps, componentMappings } from '@/lib/vibe-wrapper-utils';

// Check if a component has been migrated
const isMigrated = isComponentMigrated('Button');

// Mark a component as migrated
markComponentMigrated('Button');
```

### Base Wrapper HOC

For creating new wrapper components:

```tsx
import { createVibeWrapper } from '@/components/vibe/base-vibe-wrapper';

const VibeNewComponent = createVibeWrapper({
  componentName: 'NewComponent',
  vibeComponent: NewVibeComponent,
  propMapper: (props) => ({ ...props, kind: props.variant }),
  defaultProps: { size: 'medium' }
});
```

## Best Practices

1. **Gradual Migration**: Migrate components one at a time
2. **Preserve Existing APIs**: Maintain backward compatibility where possible
3. **Leverage Vibe Features**: Gradually adopt Vibe-specific enhancements
4. **Type Safety**: Use TypeScript interfaces for all wrapper components
5. **Testing**: Test both old and new prop formats
6. **Documentation**: Document any breaking changes or new features

## Testing

Each wrapper component should be tested with:

1. **Backward Compatibility**: Existing prop formats work
2. **Vibe Features**: New Vibe-specific props work correctly
3. **Event Handling**: Event callbacks work with both signatures
4. **Accessibility**: ARIA attributes and keyboard navigation
5. **Visual Regression**: Components render correctly

## Contributing

When adding new wrapper components:

1. Follow the established pattern in `base-vibe-wrapper.tsx`
2. Provide backward compatibility for existing props
3. Document new Vibe-specific features
4. Add comprehensive TypeScript types
5. Include usage examples in this README
6. Write tests for both compatibility and new features