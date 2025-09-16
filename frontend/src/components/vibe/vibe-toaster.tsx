import React from 'react';
import { useVibeToast } from '@/hooks/use-vibe-toast';
import VibeToast from './vibe-toast';

export interface VibeToasterProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  className?: string;
  maxToasts?: number;
}

const VibeToaster: React.FC<VibeToasterProps> = ({
  position = 'top-right',
  className,
  maxToasts = 5,
}) => {
  const { toasts } = useVibeToast();

  const positionClasses = {
    'top-right': 'fixed top-4 right-4 z-50',
    'top-left': 'fixed top-4 left-4 z-50',
    'bottom-right': 'fixed bottom-4 right-4 z-50',
    'bottom-left': 'fixed bottom-4 left-4 z-50',
    'top-center': 'fixed top-4 left-1/2 transform -translate-x-1/2 z-50',
    'bottom-center': 'fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50',
  };

  const visibleToasts = toasts.slice(0, maxToasts);

  if (visibleToasts.length === 0) {
    return null;
  }

  return (
    <div className={`${positionClasses[position]} ${className || ''}`}>
      <div className="flex flex-col gap-2 w-80">
        {visibleToasts.map((toast) => (
          <VibeToast
            key={toast.id}
            {...toast}
          />
        ))}
      </div>
    </div>
  );
};

export default VibeToaster;