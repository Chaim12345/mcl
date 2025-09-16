/**
 * Vibe Performance Optimization Utilities
 * Tools and utilities for optimizing Vibe component performance
 */

import React from 'react';

// Bundle size monitoring
export interface BundleSizeMetrics {
  vibeCore: number;
  vibeIcons: number;
  wrapperComponents: number;
  total: number;
}

// Performance monitoring hook
export function useVibePerformance() {
  const [metrics, setMetrics] = React.useState<{
    renderTime: number;
    componentCount: number;
    memoryUsage: number;
  }>({
    renderTime: 0,
    componentCount: 0,
    memoryUsage: 0
  });

  const measureRender = React.useCallback((componentName: string, renderFn: () => void) => {
    const startTime = performance.now();
    renderFn();
    const endTime = performance.now();
    
    setMetrics(prev => ({
      ...prev,
      renderTime: endTime - startTime,
      componentCount: prev.componentCount + 1
    }));
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`${componentName} render time: ${endTime - startTime}ms`);
    }
  }, []);

  return { metrics, measureRender };
}

/**
 * Creates a lazy-loaded Vibe component with proper TypeScript support
 * 
 * @template T - The component type to lazy load
 * @param importFn - Function that returns a promise resolving to the component
 * @param fallback - Optional loading fallback element
 * @returns A lazy-loaded component with ref forwarding
 * 
 * @example
 * ```typescript
 * const LazyTable = createLazyVibeComponent(
 *   () => import('@vibe/core').then(m => ({ default: m.Table })),
 *   <Skeleton height={200} />
 * );
 * ```
 */
export function createLazyVibeComponent<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback: React.ReactElement = React.createElement("div", null, "Loading...")
) {
  const LazyComponent = React.lazy(importFn);
  
  return React.forwardRef<React.ElementRef<T>, React.ComponentProps<T>>((props, ref) => (
    <React.Suspense fallback={fallback}>
      <LazyComponent {...props} ref={ref} />
    </React.Suspense>
  ));
}

// Memoization utilities for Vibe components
export function createMemoizedVibeComponent<T extends React.ComponentType<any>>(
  Component: T,
  areEqual?: (prevProps: Readonly<React.ComponentProps<T>>, nextProps: Readonly<React.ComponentProps<T>>) => boolean
) {
  return React.memo(Component as React.FunctionComponent<React.ComponentProps<T>>, areEqual) as T;
}

// Tree shaking optimization - only import what's needed
export const optimizedVibeImports = {
  // Core components (most commonly used)
  core: [
    'Button',
    'TextField', 
    'Box',
    'Flex',
    'Text',
    'Heading'
  ],
  
  // Form components
  forms: [
    'Checkbox',
    'Toggle',
    'Dropdown',
    'DatePicker',
    'NumberField',
    'TextArea'
  ],
  
  // Layout components
  layout: [
    'Menu',
    'MenuItem',
    'Modal',
    'Dialog',
    'Divider'
  ],
  
  // Data display
  data: [
    'Table',
    'TableContainer',
    'TableHeader',
    'TableBody',
    'TableRow',
    'TableCell',
    'Avatar',
    'Badge',
    'Chips'
  ],
  
  // Feedback components
  feedback: [
    'Toast',
    'AlertBanner',
    'Loader',
    'Skeleton',
    'LinearProgressBar'
  ],
  
  // Advanced components (lazy load these)
  advanced: [
    'VirtualizedGrid',
    'VirtualizedList',
    'ColorPicker',
    'Combobox',
    'MultiStepIndicator'
  ]
};

// Code splitting configuration
export const vibeCodeSplitConfig = {
  // Components to lazy load
  lazyComponents: [
    'VirtualizedGrid',
    'VirtualizedList',
    'ColorPicker',
    'Combobox',
    'MultiStepIndicator',
    'BreadcrumbsBar'
  ],
  
  // Bundle size thresholds (in KB)
  thresholds: {
    warning: 500,
    error: 1000
  }
};

// Bundle size monitoring configuration
interface MonitorConfig {
  enableInProduction?: boolean;
  reportInterval?: number;
  maxComponents?: number;
}

interface BundleMetrics {
  totalSize: number;
  vibeSize: number;
  unusedComponents: string[];
  usedComponents: string[];
}

class BundleSizeMonitor {
  private usedComponents = new Set<string>();
  private performanceObserver?: PerformanceObserver;
  private metrics: BundleMetrics = { 
    totalSize: 0, 
    vibeSize: 0, 
    unusedComponents: [], 
    usedComponents: [] 
  };

  constructor(private config: MonitorConfig = {}) {
    this.init();
  }

  private init() {
    if (this.config.enableInProduction || process.env.NODE_ENV === 'development') {
      this.setupPerformanceObserver();
      this.trackResourceLoading();
    }
  }

  private setupPerformanceObserver() {
    if ('PerformanceObserver' in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name.includes('vibe')) {
            this.trackVibeComponent(entry);
          }
        }
      });
      this.performanceObserver.observe({ entryTypes: ['resource'] });
    }
  }

  private trackResourceLoading() {
    // Report bundle analysis after specified interval
    const interval = this.config.reportInterval || 5000;
    setTimeout(() => {
      this.reportBundleAnalysis();
    }, interval);
  }

  private trackVibeComponent(entry: PerformanceEntry) {
    const componentName = this.extractComponentName(entry.name);
    if (componentName) {
      this.usedComponents.add(componentName);
      this.updateMetrics();
    }
  }

  private extractComponentName(resourceName: string): string | null {
    const match = resourceName.match(/vibe.*?([A-Z][a-zA-Z]+)/);
    return match ? match[1] : null;
  }

  private updateMetrics() {
    this.metrics.usedComponents = Array.from(this.usedComponents);
    this.metrics.unusedComponents = optimizedVibeImports.advanced.filter(
      component => !this.usedComponents.has(component)
    );
  }

  private reportBundleAnalysis() {
    if (process.env.NODE_ENV === 'development') {
      console.group('Vibe Bundle Analysis');
      console.log('Used components:', this.metrics.usedComponents);
      console.log('Unused components (can be tree-shaken):', this.metrics.unusedComponents);
      console.log('Bundle optimization potential:', 
        `${this.metrics.unusedComponents.length}/${this.metrics.usedComponents.length + this.metrics.unusedComponents.length} components unused`
      );
      console.groupEnd();
    }
  }

  trackComponent(componentName: string) {
    this.usedComponents.add(componentName);
    this.updateMetrics();
  }

  getMetrics(): BundleMetrics {
    return { ...this.metrics };
  }

  dispose() {
    this.performanceObserver?.disconnect();
  }
}

// Performance monitoring for bundle size
export function monitorBundleSize(config?: MonitorConfig) {
  return new BundleSizeMonitor(config);
}

// Optimize Vibe component props for performance
export function optimizeVibeProps<T extends Record<string, any>>(props: T): T {
  // Remove undefined props to reduce object size
  const optimized = {} as T;
  
  for (const [key, value] of Object.entries(props)) {
    if (value !== undefined) {
      optimized[key as keyof T] = value;
    }
  }
  
  return optimized;
}

// Virtual scrolling utility for large lists
export function useVibeVirtualization(
  items: any[],
  itemHeight: number,
  containerHeight: number
) {
  const [scrollTop, setScrollTop] = React.useState(0);
  
  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.min(
    visibleStart + Math.ceil(containerHeight / itemHeight) + 1,
    items.length
  );
  
  const visibleItems = items.slice(visibleStart, visibleEnd);
  const totalHeight = items.length * itemHeight;
  const offsetY = visibleStart * itemHeight;
  
  return {
    visibleItems,
    totalHeight,
    offsetY,
    setScrollTop
  };
}

// Performance debugging utilities
export const vibePerformanceDebug = {
  logComponentRender: (componentName: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`Vibe component loaded: ${componentName}`);
    }
  },
  
  measureComponentSize: (componentName: string, element: HTMLElement) => {
    if (process.env.NODE_ENV === 'development') {
      const rect = element.getBoundingClientRect();
      console.log(`${componentName} size:`, {
        width: rect.width,
        height: rect.height,
        area: rect.width * rect.height
      });
    }
  },
  
  trackMemoryUsage: () => {
    if (process.env.NODE_ENV === 'development') {
      // Use modern Performance API instead of deprecated memory property
      if ('measureUserAgentSpecificMemory' in performance) {
        (performance as any).measureUserAgentSpecificMemory().then((result: any) => {
          console.log('Memory usage:', {
            used: Math.round(result.bytes / 1048576) + ' MB',
            breakdown: result.breakdown
          });
        }).catch(() => {
          // Fallback to basic memory tracking
          console.log('Memory tracking not available in this environment');
        });
      } else if ('memory' in performance) {
        const memory = (performance as any).memory;
        console.log('Memory usage:', {
          used: Math.round(memory.usedJSHeapSize / 1048576) + ' MB',
          total: Math.round(memory.totalJSHeapSize / 1048576) + ' MB',
          limit: Math.round(memory.jsHeapSizeLimit / 1048576) + ' MB'
        });
      } else {
        console.log('Memory tracking not available in this browser');
      }
    }
  }
};

export default {
  useVibePerformance,
  createLazyVibeComponent,
  createMemoizedVibeComponent,
  optimizedVibeImports,
  vibeCodeSplitConfig,
  monitorBundleSize,
  optimizeVibeProps,
  useVibeVirtualization,
  vibePerformanceDebug
};