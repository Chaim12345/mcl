import { useState, useEffect } from 'react';
import { useSocket } from '@/hooks/use-socket';
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
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface ConflictResolutionProps {
  boardId: string;
  itemId: string;
  currentContent: string;
  onResolve: (useRemote: boolean, mergedContent?: string) => void;
}

export function ConflictResolution({ 
  boardId, 
  itemId, 
  currentContent, 
  onResolve 
}: ConflictResolutionProps) {
  const { onBoardUpdate } = useSocket();
  const [conflictDetected, setConflictDetected] = useState(false);
  const [remoteContent, setRemoteContent] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  
  // Listen for updates to the same item
  useEffect(() => {
    const unsubscribe = onBoardUpdate((data) => {
      if (data.boardId === boardId && 
          data.itemId === itemId && 
          data.type === 'item_updated' &&
          data.changes?.content) {
        
        // Detect conflict - remote content is different from local
        if (data.changes.content !== currentContent) {
          setRemoteContent(data.changes.content);
          setConflictDetected(true);
          setShowDialog(true);
        }
      }
    });
    
    return () => {
      unsubscribe();
    };
  }, [boardId, itemId, currentContent, onBoardUpdate]);
  
  // Handle using local version
  const handleUseLocal = () => {
    setShowDialog(false);
    onResolve(false);
  };
  
  // Handle using remote version
  const handleUseRemote = () => {
    setShowDialog(false);
    if (remoteContent) {
      onResolve(true, remoteContent);
    }
  };
  
  // Handle merging versions
  const handleMerge = () => {
    setShowDialog(false);
    
    if (remoteContent) {
      // Simple merge strategy - append remote changes to local
      const mergedContent = `${currentContent}\n\n--- Merged with changes from another user ---\n\n${remoteContent}`;
      onResolve(false, mergedContent);
    }
  };
  
  if (!conflictDetected) {
    return null;
  }

  return (
    <>
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Conflict detected</AlertTitle>
        <AlertDescription>
          Another user has made changes to this content. Please resolve the conflict.
        </AlertDescription>
        <div className="mt-2 flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowDialog(true)}>
            Resolve conflict
          </Button>
        </div>
      </Alert>
      
      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Content conflict detected</AlertDialogTitle>
            <AlertDialogDescription>
              Another user has modified this content while you were editing. 
              How would you like to resolve this conflict?
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="grid grid-cols-2 gap-4 my-4">
            <div className="border rounded p-2">
              <div className="font-medium mb-1">Your version:</div>
              <div className="text-sm max-h-[200px] overflow-auto bg-muted/50 p-2 rounded">
                {currentContent}
              </div>
            </div>
            
            <div className="border rounded p-2">
              <div className="font-medium mb-1">Remote version:</div>
              <div className="text-sm max-h-[200px] overflow-auto bg-muted/50 p-2 rounded">
                {remoteContent}
              </div>
            </div>
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button variant="outline" onClick={handleUseLocal}>
              Keep my version
            </Button>
            <Button variant="outline" onClick={handleMerge}>
              Merge both
            </Button>
            <AlertDialogAction onClick={handleUseRemote}>
              Use their version
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}