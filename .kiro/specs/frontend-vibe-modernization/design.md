# Design Document

## Overview

This design outlines the modernization of the existing React frontend to integrate Monday.com's Vibe Design System while maintaining full compatibility with the existing Go backend. The current frontend has a solid foundation with React 18, TypeScript, Tailwind CSS, and Shadcn/ui components, but needs to be enhanced with Vibe components for a more professional Monday.com-like interface.

The modernization will be implemented as a gradual migration strategy, replacing existing UI components with Vibe equivalents while preserving all business logic, state management, and API integrations. The Go backend provides complete REST APIs for authentication, workspaces, boards, items, comments, activities, and real-time features via WebSocket connections.

## Architecture

### High-Level Architecture

```mermaid
graph TB
    subgraph "Frontend (React + Vibe)"
        A[Vibe Components Layer] --> B[Business Logic Layer]
        B --> C[State Management - Zustand]
        C --> D[API Services Layer]
        D --> E[HTTP Client - Axios]
    end
    
    subgraph "Backend (Go)"
        F[REST API Handlers]
        G[WebSocket Server]
        H[Business Logic]
        I[Database Layer]
    end
    
    E --> F
    B --> G
    F --> H
    G --> H
    H --> I
    
    subgraph "External Dependencies"
        J[@vibe/core]
        K[@vibe/icons]
        L[Existing Libraries]
    end
    
    A --> J
    A --> K
    B --> L
```

### Component Architecture Strategy

The modernization will follow a **Wrapper Component Pattern** where Vibe components are wrapped with business logic to create domain-specific components:

1. **Pure Vibe Components**: Direct usage of @vibe/core components for basic UI elements
2. **Wrapped Vibe Components**: Vibe components enhanced with business logic and custom props
3. **Composite Components**: Complex components combining multiple Vibe components
4. **Legacy Bridge Components**: Temporary components that bridge between old and new systems

### Migration Strategy

**Phase 1: Foundation Setup**
- Install and configure @vibe/core and @vibe/icons
- Set up Vibe theming system alongside existing Tailwind
- Create component mapping documentation
- Establish testing patterns for Vibe components

**Phase 2: Core UI Components**
- Replace basic UI components (buttons, inputs, modals, etc.)
- Migrate layout components (header, sidebar, navigation)
- Update form components and validation patterns

**Phase 3: Domain Components**
- Migrate board table components to Vibe Table
- Update workspace and project management interfaces
- Enhance drag-and-drop with Vibe patterns

**Phase 4: Advanced Features**
- Integrate Vibe's advanced components (filters, search, etc.)
- Optimize performance and bundle size
- Complete testing and documentation

## Components and Interfaces

### Core Component Mapping

| Current Component | Vibe Replacement | Migration Priority |
|-------------------|------------------|-------------------|
| Shadcn Button | Vibe Button | High |
| Shadcn Input | Vibe TextField | High |
| Shadcn Select | Vibe Dropdown | High |
| Shadcn Dialog | Vibe Modal | High |
| Shadcn Table | Vibe Table | Critical |
| Custom Board Table | Vibe Table + Custom Logic | Critical |
| Shadcn Toast | Vibe Toast | Medium |
| Radix Avatar | Vibe Avatar | Medium |
| Custom Sidebar | Vibe Menu + Custom Layout | High |
| Lucide Icons | Vibe Icons | Medium |

### New Component Structure

```typescript
// Example: Wrapped Button Component
interface VibeButtonProps extends ButtonProps {
  variant?: 'primary' | 'secondary' | 'tertiary';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  onClick?: () => void;
}

export const VibeButton: React.FC<VibeButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  loading = false,
  children,
  ...props
}) => {
  return (
    <Button
      kind={variant}
      size={size}
      loading={loading}
      {...props}
    >
      {children}
    </Button>
  );
};
```

### Board Table Architecture

The board table is the most critical component requiring careful migration:

```typescript
// New Vibe-based Board Table Structure
interface VibeBoardTableProps {
  board: Board;
  items: BoardItem[];
  columns: BoardColumn[];
  onItemUpdate: (itemId: string, updates: Partial<BoardItem>) => void;
  onItemMove: (itemId: string, newPosition: number) => void;
  onColumnUpdate: (columnId: string, updates: Partial<BoardColumn>) => void;
}

export const VibeBoardTable: React.FC<VibeBoardTableProps> = ({
  board,
  items,
  columns,
  onItemUpdate,
  onItemMove,
  onColumnUpdate
}) => {
  // Use Vibe Table with custom cell renderers
  // Integrate drag-and-drop functionality
  // Maintain existing business logic
};
```

### Layout Components

```typescript
// Main Layout with Vibe Components
export const VibeMainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="vibe-layout">
      <VibeHeader />
      <div className="vibe-content-wrapper">
        <VibeSidebar />
        <main className="vibe-main-content">
          {children}
        </main>
      </div>
    </div>
  );
};
```

## Data Models

### Vibe Theme Configuration

```typescript
interface VibeThemeConfig {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  fontFamily: 'Poppins' | 'Figtree' | 'Roboto';
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
}
```

### Component Props Extensions

```typescript
// Extended props for Vibe components with business logic
interface VibeBoardItemProps extends TableRowProps {
  item: BoardItem;
  columns: BoardColumn[];
  onUpdate: (updates: Partial<BoardItem>) => void;
  onDelete: () => void;
  isSelected: boolean;
  isDragging: boolean;
}

interface VibeColumnHeaderProps extends TableHeaderProps {
  column: BoardColumn;
  onSort: (direction: 'asc' | 'desc') => void;
  onFilter: (filter: FilterCondition) => void;
  onResize: (width: number) => void;
}
```

### State Management Integration

The existing Zustand stores will be enhanced to work with Vibe components:

```typescript
// Enhanced Board Store for Vibe Integration
interface VibeBoardStore extends BoardStore {
  // Vibe-specific state
  tableConfig: {
    columnWidths: Record<string, number>;
    sortConfig: { columnId: string; direction: 'asc' | 'desc' } | null;
    filterConfig: FilterCondition[];
    selectedRows: string[];
  };
  
  // Vibe-specific actions
  updateTableConfig: (config: Partial<VibeBoardStore['tableConfig']>) => void;
  resetTableConfig: () => void;
}
```

## Error Handling

### Vibe Error Integration

```typescript
// Error handling with Vibe Toast components
interface VibeErrorHandler {
  showError: (error: ApiError) => void;
  showSuccess: (message: string) => void;
  showWarning: (message: string) => void;
  showInfo: (message: string) => void;
}

export const useVibeNotifications = (): VibeErrorHandler => {
  const { addToast } = useToast();
  
  return {
    showError: (error) => {
      addToast({
        type: 'negative',
        content: error.message,
        autoHideDuration: 5000,
      });
    },
    showSuccess: (message) => {
      addToast({
        type: 'positive',
        content: message,
        autoHideDuration: 3000,
      });
    },
    // ... other methods
  };
};
```

### Component Error Boundaries

```typescript
// Vibe-enhanced Error Boundary
export const VibeErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ErrorBoundary
      fallback={({ error, resetError }) => (
        <div className="vibe-error-container">
          <AlertBanner
            type="negative"
            title="Something went wrong"
            text={error.message}
            action={{
              text: "Try again",
              onClick: resetError
            }}
          />
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
};
```

## Testing Strategy

### Component Testing Approach

1. **Unit Tests**: Test individual Vibe wrapper components
2. **Integration Tests**: Test component interactions with business logic
3. **Visual Regression Tests**: Ensure Vibe components render correctly
4. **Accessibility Tests**: Verify WCAG compliance with Vibe components

### Testing Utilities

```typescript
// Custom testing utilities for Vibe components
export const renderWithVibeTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme="light">
      {component}
    </ThemeProvider>
  );
};

export const mockVibeProps = {
  button: {
    kind: 'primary' as const,
    size: 'medium' as const,
  },
  table: {
    columns: [],
    data: [],
  },
  // ... other component mocks
};
```

### Test Coverage Requirements

- **Unit Tests**: 90% coverage for all wrapper components
- **Integration Tests**: 80% coverage for complex components (board table, forms)
- **E2E Tests**: 100% coverage for critical user journeys
- **Visual Tests**: All major UI states captured

### Performance Testing

```typescript
// Performance monitoring for Vibe components
export const useVibePerformance = () => {
  const [metrics, setMetrics] = useState({
    renderTime: 0,
    bundleSize: 0,
    memoryUsage: 0,
  });
  
  useEffect(() => {
    // Monitor component render performance
    // Track bundle size impact
    // Monitor memory usage
  }, []);
  
  return metrics;
};
```

## Implementation Guidelines

### Code Organization

```
frontend/src/
├── components/
│   ├── vibe/                 # Vibe wrapper components
│   │   ├── buttons/
│   │   ├── forms/
│   │   ├── tables/
│   │   └── layout/
│   ├── business/             # Business logic components
│   └── legacy/               # Legacy components (temporary)
├── hooks/
│   ├── vibe/                 # Vibe-specific hooks
│   └── business/             # Business logic hooks
├── styles/
│   ├── vibe-theme.css        # Vibe theme customizations
│   └── vibe-overrides.css    # Component-specific overrides
└── utils/
    └── vibe-helpers.ts       # Vibe utility functions
```

### Development Workflow

1. **Component Analysis**: Identify current component and its Vibe equivalent
2. **Wrapper Creation**: Create Vibe wrapper with business logic
3. **Props Mapping**: Map existing props to Vibe component props
4. **Testing**: Write comprehensive tests for the new component
5. **Integration**: Replace old component with new Vibe component
6. **Validation**: Ensure functionality and styling are preserved

### Performance Considerations

- **Bundle Size**: Monitor impact of adding Vibe components
- **Tree Shaking**: Ensure unused Vibe components are excluded
- **Lazy Loading**: Implement code splitting for large Vibe components
- **Caching**: Leverage Vibe's built-in performance optimizations

### Accessibility Standards

- **WCAG 2.1 AA Compliance**: Ensure all Vibe components meet accessibility standards
- **Keyboard Navigation**: Verify keyboard accessibility for all interactive elements
- **Screen Reader Support**: Test with screen readers for proper ARIA labels
- **Color Contrast**: Ensure sufficient contrast ratios with Vibe's color system

This design provides a comprehensive roadmap for modernizing the frontend with Vibe components while maintaining all existing functionality and ensuring a smooth migration path.