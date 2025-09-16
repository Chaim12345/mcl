/**
 * Lazy-loaded Vibe Advanced Components
 * Components that are loaded on-demand to optimize bundle size
 */

import { createLazyVibeComponent } from '@/lib/vibe-performance';
import { VibeSkeleton } from '@/components/vibe';

// Lazy load VirtualizedGrid
export const VibeVirtualizedGrid = createLazyVibeComponent(
  () => import('@vibe/core').then(module => ({ default: module.VirtualizedGrid })),
  <VibeSkeleton type="rectangle" />
);

// Lazy load VirtualizedList  
export const VibeVirtualizedList = createLazyVibeComponent(
  () => import('@vibe/core').then(module => ({ default: module.VirtualizedList })),
  <VibeSkeleton type="rectangle" />
);

// Lazy load ColorPicker
export const VibeColorPicker = createLazyVibeComponent(
  () => import('@vibe/core').then(module => ({ default: module.ColorPicker })),
  <VibeSkeleton type="rectangle" />
);

// Lazy load Combobox
export const VibeCombobox = createLazyVibeComponent(
  () => import('@vibe/core').then(module => ({ default: module.Combobox })),
  <VibeSkeleton type="rectangle" />
);

// Lazy load MultiStepIndicator
export const VibeMultiStepIndicator = createLazyVibeComponent(
  () => import('@vibe/core').then(module => ({ default: module.MultiStepIndicator })),
  <VibeSkeleton type="rectangle" />
);

// Lazy load BreadcrumbsBar
export const VibeBreadcrumbsBar = createLazyVibeComponent(
  () => import('@vibe/core').then(module => ({ default: module.BreadcrumbsBar })),
  <VibeSkeleton type="rectangle" />
);

// Lazy load Accordion
export const VibeAccordion = createLazyVibeComponent(
  () => import('@vibe/core').then(module => ({ default: module.Accordion })),
  <VibeSkeleton type="rectangle" />
);

// Lazy load Steps
export const VibeSteps = createLazyVibeComponent(
  () => import('@vibe/core').then(module => ({ default: module.Steps })),
  <VibeSkeleton type="rectangle" />
);

// Lazy load Tipseen
export const VibeTipseen = createLazyVibeComponent(
  () => import('@vibe/core').then(module => ({ default: module.Tipseen })),
  <VibeSkeleton type="rectangle" />
);

// Lazy load TransitionView
export const VibeTransitionView = createLazyVibeComponent(
  () => import('@vibe/core').then(module => ({ default: module.TransitionView })),
  <div>Loading transition...</div>
);