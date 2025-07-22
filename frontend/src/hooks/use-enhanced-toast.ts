import { useToast } from '@/hooks/use-toast';
import { ToastActionElement } from '@/components/ui/toast';
import { v4 as uuidv4 } from 'uuid';

interface ToastOptions {
  title?: string;
  description?: string;
  action?: ToastActionElement;
  variant?: 'default' | 'destructive' | 'success' | 'warning' | 'info';
  duration?: number;
  withProgress?: boolean;
}

export function useEnhancedToast() {
  const { toast, dismiss } = useToast();
  
  const showToast = ({
    title,
    description,
    action,
    variant = 'default',
    duration = 5000,
    withProgress = false,
  }: ToastOptions) => {
    const id = uuidv4();
    
    if (withProgress) {
      // For progress toasts, we'll use a custom component
      // This is handled in the Toaster component
      return toast({
        title,
        description,
        action,
        variant,
        duration,
        withProgress: true,
      });
    } else {
      // For regular toasts, use the standard behavior
      return toast({
        title,
        description,
        action,
        variant,
      });
    }
  };
  
  const showSuccess = (options: Omit<ToastOptions, 'variant'>) => {
    return showToast({ ...options, variant: 'success' });
  };
  
  const showError = (options: Omit<ToastOptions, 'variant'>) => {
    return showToast({ ...options, variant: 'destructive' });
  };
  
  const showWarning = (options: Omit<ToastOptions, 'variant'>) => {
    return showToast({ ...options, variant: 'warning' });
  };
  
  const showInfo = (options: Omit<ToastOptions, 'variant'>) => {
    return showToast({ ...options, variant: 'info' });
  };
  
  const showLoading = (options: Omit<ToastOptions, 'variant' | 'withProgress'>) => {
    return showToast({
      ...options,
      variant: 'default',
      withProgress: true,
      duration: options.duration || 10000, // Default to 10 seconds for loading toasts
    });
  };
  
  return {
    toast: showToast,
    success: showSuccess,
    error: showError,
    warning: showWarning,
    info: showInfo,
    loading: showLoading,
    dismiss,
  };
}