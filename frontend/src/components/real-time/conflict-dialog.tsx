import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { diffJson } from 'diff';

interface ConflictDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  localData: any;
  remoteData: any;
  onResolveLocal: () => void;
  onResolveRemote: () => void;
  title?: string;
  description?: string;
}

export function ConflictDialog({
  open,
  onOpenChange,
  localData,
  remoteData,
  onResolveLocal,
  onResolveRemote,
  title = 'Conflict Detected',
  description = 'Changes were made to this item by another user while you were editing. Please choose which version to keep.',
}: ConflictDialogProps) {
  // Generate diff between local and remote data
  const differences = diffJson(remoteData, localData);
  
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-3xl">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Your Changes</h3>
            <div className="border rounded-md p-3 bg-muted/50">
              <ScrollArea className="h-[300px]">
                <pre className="text-xs whitespace-pre-wrap">
                  {JSON.stringify(localData, null, 2)}
                </pre>
              </ScrollArea>
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Server Changes</h3>
            <div className="border rounded-md p-3 bg-muted/50">
              <ScrollArea className="h-[300px]">
                <pre className="text-xs whitespace-pre-wrap">
                  {JSON.stringify(remoteData, null, 2)}
                </pre>
              </ScrollArea>
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Differences</h3>
          <div className="border rounded-md p-3 bg-muted/50">
            <ScrollArea className="h-[150px]">
              <pre className="text-xs">
                {differences.map((part, index) => (
                  <span
                    key={index}
                    className={
                      part.added
                        ? 'bg-green-100 dark:bg-green-900/30'
                        : part.removed
                        ? 'bg-red-100 dark:bg-red-900/30'
                        : ''
                    }
                  >
                    {part.value}
                  </span>
                ))}
              </pre>
            </ScrollArea>
          </div>
        </div>
        
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onResolveRemote}
            className="bg-muted text-foreground hover:bg-muted/80"
          >
            Use Server Version
          </AlertDialogAction>
          <AlertDialogAction onClick={onResolveLocal}>
            Use My Version
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}