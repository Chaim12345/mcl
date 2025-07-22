import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '@/components/ui/toast';
import { ToastWithProgress } from '@/components/ui/toast-with-progress';
import { useToast } from '@/hooks/use-toast';

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, withProgress, duration, ...props }) {
        // Use progress indicator toast if specified
        if (withProgress) {
          return (
            <ToastWithProgress
              key={id}
              id={id}
              title={title}
              description={description}
              duration={duration}
              variant={props.variant as any}
            />
          );
        }
        
        // Otherwise use standard toast
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}