import { useState } from 'react';

interface UseConfirmationOptions {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
}

interface UseConfirmationReturn {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  confirm: (options?: UseConfirmationOptions) => Promise<boolean>;
  confirmationProps: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    confirmText: string;
    cancelText: string;
    onConfirm: () => void;
    onCancel: () => void;
    variant: 'default' | 'destructive';
  };
}

export function useConfirmation(defaultOptions?: UseConfirmationOptions): UseConfirmationReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [resolveRef, setResolveRef] = useState<((value: boolean) => void) | null>(null);
  const [options, setOptions] = useState<UseConfirmationOptions>({
    title: defaultOptions?.title || 'Are you sure?',
    description: defaultOptions?.description || 'This action cannot be undone.',
    confirmText: defaultOptions?.confirmText || 'Confirm',
    cancelText: defaultOptions?.cancelText || 'Cancel',
    variant: defaultOptions?.variant || 'default',
  });
  
  const confirm = (customOptions?: UseConfirmationOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setOptions({
        ...options,
        ...customOptions,
      });
      setResolveRef(() => resolve);
      setIsOpen(true);
    });
  };
  
  const handleConfirm = () => {
    if (resolveRef) {
      resolveRef(true);
      setResolveRef(null);
    }
  };
  
  const handleCancel = () => {
    if (resolveRef) {
      resolveRef(false);
      setResolveRef(null);
    }
  };
  
  return {
    isOpen,
    setIsOpen,
    confirm,
    confirmationProps: {
      open: isOpen,
      onOpenChange: setIsOpen,
      title: options.title || 'Are you sure?',
      description: options.description || 'This action cannot be undone.',
      confirmText: options.confirmText || 'Confirm',
      cancelText: options.cancelText || 'Cancel',
      onConfirm: handleConfirm,
      onCancel: handleCancel,
      variant: options.variant || 'default',
    },
  };
}