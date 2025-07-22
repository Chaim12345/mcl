import { useState, useCallback } from 'react';

interface OptimisticUpdateOptions<T> {
  onUpdate: (data: T) => Promise<any>;
  onSuccess?: (result: any) => void;
  onError?: (error: Error, originalData: T) => void;
  onSettled?: () => void;
}

export function useOptimisticUpdate<T>({
  onUpdate,
  onSuccess,
  onError,
  onSettled,
}: OptimisticUpdateOptions<T>) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const update = useCallback(
    async (data: T, optimisticUpdateFn?: () => void) => {
      setIsUpdating(true);
      setError(null);
      
      // Apply optimistic update immediately if provided
      if (optimisticUpdateFn) {
        optimisticUpdateFn();
      }
      
      try {
        const result = await onUpdate(data);
        
        if (onSuccess) {
          onSuccess(result);
        }
        
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('An unknown error occurred');
        setError(error);
        
        if (onError) {
          onError(error, data);
        }
        
        throw error;
      } finally {
        setIsUpdating(false);
        
        if (onSettled) {
          onSettled();
        }
      }
    },
    [onUpdate, onSuccess, onError, onSettled]
  );
  
  return {
    update,
    isUpdating,
    error,
  };
}