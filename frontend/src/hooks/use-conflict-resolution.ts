import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface ConflictResolutionOptions<T> {
  onResolve: (resolution: 'local' | 'remote', localData: T, remoteData: T) => void;
}

export function useConflictResolution<T>({
  onResolve,
}: ConflictResolutionOptions<T>) {
  const [hasConflict, setHasConflict] = useState(false);
  const [localData, setLocalData] = useState<T | null>(null);
  const [remoteData, setRemoteData] = useState<T | null>(null);
  const { toast } = useToast();
  
  const detectConflict = useCallback(
    (local: T, remote: T, compareFields: (keyof T)[]) => {
      // Check if there's a conflict by comparing specified fields
      const conflict = compareFields.some(field => {
        return JSON.stringify(local[field]) !== JSON.stringify(remote[field]);
      });
      
      if (conflict) {
        setHasConflict(true);
        setLocalData(local);
        setRemoteData(remote);
        
        toast({
          title: 'Conflict detected',
          description: 'Another user has made changes to this item. Please resolve the conflict.',
          variant: 'destructive',
        });
        
        return true;
      }
      
      return false;
    },
    [toast]
  );
  
  const resolveConflict = useCallback(
    (resolution: 'local' | 'remote') => {
      if (!localData || !remoteData) {
        return;
      }
      
      onResolve(resolution, localData, remoteData);
      
      setHasConflict(false);
      setLocalData(null);
      setRemoteData(null);
      
      toast({
        title: 'Conflict resolved',
        description: `Changes from ${resolution === 'local' ? 'you' : 'the server'} have been applied.`,
      });
    },
    [localData, remoteData, onResolve, toast]
  );
  
  const resetConflict = useCallback(() => {
    setHasConflict(false);
    setLocalData(null);
    setRemoteData(null);
  }, []);
  
  return {
    hasConflict,
    localData,
    remoteData,
    detectConflict,
    resolveConflict,
    resetConflict,
  };
}