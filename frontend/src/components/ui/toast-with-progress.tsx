import React, { useEffect, useState } from 'react';
import { 
  Toast, 
  ToastClose, 
  ToastDescription, 
  ToastTitle 
} from '@/components/ui/toast';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';

interface ToastWithProgressProps {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  duration?: number;
  variant?: 'default' | 'destructive' | 'success' | 'warning' | 'info';
  onComplete?: () => void;
}

export function ToastWithProgress({
  id,
  title,
  description,
  duration = 5000,
  variant = 'default',
  onComplete,
}: ToastWithProgressProps) {
  const { dismiss } = useToast();
  const [progress, setProgress] = useState(0);
  const [startTime] = useState(Date.now());
  const [animationFrameId, setAnimationFrameId] = useState<number | null>(null);

  // Update progress based on elapsed time
  useEffect(() => {
    const updateProgress = () => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / duration) * 100, 100);
      
      setProgress(newProgress);
      
      if (newProgress < 100) {
        const frameId = requestAnimationFrame(updateProgress);
        setAnimationFrameId(frameId);
      } else {
        if (onComplete) {
          onComplete();
        }
        dismiss(id);
      }
    };
    
    const frameId = requestAnimationFrame(updateProgress);
    setAnimationFrameId(frameId);
    
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [startTime, duration, dismiss, id, onComplete]);
  
  // Get indicator color based on variant
  const getIndicatorColor = () => {
    switch (variant) {
      case 'destructive':
        return 'bg-destructive';
      case 'success':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'info':
        return 'bg-blue-500';
      default:
        return 'bg-primary';
    }
  };
  
  return (
    <Toast variant={variant}>
      <div className="grid gap-1">
        {title && <ToastTitle>{title}</ToastTitle>}
        {description && <ToastDescription>{description}</ToastDescription>}
      </div>
      <ToastClose onClick={() => dismiss(id)} />
      <div className="absolute bottom-0 left-0 right-0">
        <Progress 
          value={progress} 
          className="h-1 rounded-none" 
          indicatorColor={getIndicatorColor()}
        />
      </div>
    </Toast>
  );
}