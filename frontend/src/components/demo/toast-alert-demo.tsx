import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useEnhancedToast } from '@/hooks/use-enhanced-toast';
import { useConfirmation } from '@/hooks/use-confirmation';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Progress } from '@/components/ui/progress';
import { Loader2 } from 'lucide-react';

export function ToastAlertDemo() {
  const toast = useEnhancedToast();
  const { confirm, confirmationProps } = useConfirmation();
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  const handleShowToast = (variant: 'default' | 'destructive' | 'success' | 'warning' | 'info') => {
    toast.toast({
      title: `${variant.charAt(0).toUpperCase() + variant.slice(1)} Toast`,
      description: `This is a ${variant} toast notification.`,
      variant,
    });
  };
  
  const handleShowProgressToast = () => {
    toast.loading({
      title: 'Loading...',
      description: 'This toast will automatically dismiss after 5 seconds.',
      duration: 5000,
    });
  };
  
  const handleShowConfirmation = async () => {
    const confirmed = await confirm({
      title: 'Are you sure?',
      description: 'This action cannot be undone.',
      confirmText: 'Yes, continue',
      cancelText: 'No, cancel',
    });
    
    if (confirmed) {
      toast.success({
        title: 'Confirmed',
        description: 'You confirmed the action.',
      });
    } else {
      toast.info({
        title: 'Cancelled',
        description: 'You cancelled the action.',
      });
    }
  };
  
  const handleShowDestructiveConfirmation = async () => {
    const confirmed = await confirm({
      title: 'Delete item?',
      description: 'This will permanently delete this item and cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive',
    });
    
    if (confirmed) {
      toast.success({
        title: 'Deleted',
        description: 'The item has been deleted.',
      });
    }
  };
  
  const handleSimulateProgress = async () => {
    setIsLoading(true);
    setProgress(0);
    
    const id = toast.loading({
      title: 'Uploading file...',
      description: 'Please wait while we upload your file.',
      duration: 10000,
    }).id;
    
    // Simulate progress
    for (let i = 0; i <= 100; i += 5) {
      await new Promise(resolve => setTimeout(resolve, 200));
      setProgress(i);
    }
    
    // Dismiss loading toast
    toast.dismiss(id);
    
    // Show success toast
    toast.success({
      title: 'Upload complete',
      description: 'Your file has been uploaded successfully.',
    });
    
    setIsLoading(false);
  };
  
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Toast Notifications</h2>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => handleShowToast('default')}>Default Toast</Button>
          <Button 
            onClick={() => handleShowToast('success')}
            className="bg-green-500 hover:bg-green-600"
          >
            Success Toast
          </Button>
          <Button 
            onClick={() => handleShowToast('destructive')}
            variant="destructive"
          >
            Error Toast
          </Button>
          <Button 
            onClick={() => handleShowToast('warning')}
            className="bg-yellow-500 hover:bg-yellow-600"
          >
            Warning Toast
          </Button>
          <Button 
            onClick={() => handleShowToast('info')}
            className="bg-blue-500 hover:bg-blue-600"
          >
            Info Toast
          </Button>
          <Button onClick={handleShowProgressToast}>Progress Toast</Button>
        </div>
      </div>
      
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Confirmation Dialogs</h2>
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleShowConfirmation}>Show Confirmation</Button>
          <Button 
            onClick={handleShowDestructiveConfirmation}
            variant="destructive"
          >
            Destructive Confirmation
          </Button>
        </div>
      </div>
      
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Progress Indicators</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Button 
              onClick={handleSimulateProgress}
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simulate File Upload
            </Button>
            <div className="w-full max-w-md">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1 text-right">{progress}%</p>
            </div>
          </div>
        </div>
      </div>
      
      <ConfirmationDialog {...confirmationProps} />
    </div>
  );
}