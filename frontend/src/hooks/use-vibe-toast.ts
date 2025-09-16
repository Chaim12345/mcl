import React from 'react';
import { VibeToastType, VibeToastAction } from '@/components/vibe/vibe-toast';

// Enhanced toast interface using Vibe components
export interface VibeToastOptions {
  type?: VibeToastType;
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: VibeToastAction[];
  autoHideDuration?: number | null;
  loading?: boolean;
  icon?: React.ReactNode;
  hideIcon?: boolean;
  closeable?: boolean;
  onClose?: () => void;
}

interface ToastItem extends VibeToastOptions {
  id: string;
  open: boolean;
}

// Global toast state management
let toastId = 0;
const generateId = () => `vibe-toast-${++toastId}`;

const listeners: Array<(toasts: ToastItem[]) => void> = [];
let toasts: ToastItem[] = [];

const notify = (listeners: Array<(toasts: ToastItem[]) => void>) => {
  listeners.forEach((listener) => listener(toasts));
};

// Toast management functions
const addToast = (options: VibeToastOptions): string => {
  const id = generateId();
  const toast: ToastItem = {
    ...options,
    id,
    open: true,
  };
  
  toasts = [toast, ...toasts].slice(0, 5); // Limit to 5 toasts
  notify(listeners);
  
  // Auto-hide if specified
  if (options.autoHideDuration !== null && options.autoHideDuration !== 0) {
    const duration = options.autoHideDuration || 5000;
    setTimeout(() => {
      dismissToast(id);
    }, duration);
  }
  
  return id;
};

const dismissToast = (id: string) => {
  toasts = toasts.map((toast) =>
    toast.id === id ? { ...toast, open: false } : toast
  );
  notify(listeners);
  
  // Remove after animation
  setTimeout(() => {
    toasts = toasts.filter((toast) => toast.id !== id);
    notify(listeners);
  }, 300);
};

const updateToast = (id: string, options: Partial<VibeToastOptions>) => {
  toasts = toasts.map((toast) =>
    toast.id === id ? { ...toast, ...options } : toast
  );
  notify(listeners);
};

const clearAllToasts = () => {
  toasts = [];
  notify(listeners);
};

// Main hook
export const useVibeToast = () => {
  const [state, setState] = React.useState<ToastItem[]>(toasts);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, []);

  // Convenience methods
  const toast = React.useMemo(() => ({
    // Basic toast function
    show: (options: VibeToastOptions) => addToast(options),
    
    // Convenience methods for different types
    success: (title: React.ReactNode, description?: React.ReactNode, options?: Omit<VibeToastOptions, 'type' | 'title' | 'description'>) =>
      addToast({ ...options, type: 'positive', title, description }),
      
    error: (title: React.ReactNode, description?: React.ReactNode, options?: Omit<VibeToastOptions, 'type' | 'title' | 'description'>) =>
      addToast({ ...options, type: 'negative', title, description }),
      
    warning: (title: React.ReactNode, description?: React.ReactNode, options?: Omit<VibeToastOptions, 'type' | 'title' | 'description'>) =>
      addToast({ ...options, type: 'warning', title, description }),
      
    info: (title: React.ReactNode, description?: React.ReactNode, options?: Omit<VibeToastOptions, 'type' | 'title' | 'description'>) =>
      addToast({ ...options, type: 'normal', title, description }),
      
    loading: (title: React.ReactNode, description?: React.ReactNode, options?: Omit<VibeToastOptions, 'type' | 'title' | 'description' | 'loading'>) =>
      addToast({ ...options, type: 'normal', title, description, loading: true, autoHideDuration: null }),
    
    // Management methods
    dismiss: dismissToast,
    update: updateToast,
    clear: clearAllToasts,
  }), []);

  return {
    toasts: state,
    toast,
  };
};

// Standalone toast functions (for use outside components)
export const vibeToast = {
  show: (options: VibeToastOptions) => addToast(options),
  success: (title: React.ReactNode, description?: React.ReactNode, options?: Omit<VibeToastOptions, 'type' | 'title' | 'description'>) =>
    addToast({ ...options, type: 'positive', title, description }),
  error: (title: React.ReactNode, description?: React.ReactNode, options?: Omit<VibeToastOptions, 'type' | 'title' | 'description'>) =>
    addToast({ ...options, type: 'negative', title, description }),
  warning: (title: React.ReactNode, description?: React.ReactNode, options?: Omit<VibeToastOptions, 'type' | 'title' | 'description'>) =>
    addToast({ ...options, type: 'warning', title, description }),
  info: (title: React.ReactNode, description?: React.ReactNode, options?: Omit<VibeToastOptions, 'type' | 'title' | 'description'>) =>
    addToast({ ...options, type: 'normal', title, description }),
  loading: (title: React.ReactNode, description?: React.ReactNode, options?: Omit<VibeToastOptions, 'type' | 'title' | 'description' | 'loading'>) =>
    addToast({ ...options, type: 'normal', title, description, loading: true, autoHideDuration: null }),
  dismiss: dismissToast,
  update: updateToast,
  clear: clearAllToasts,
};