import React, { useState } from 'react';
import { VibeButton } from '@/components/vibe/vibe-button';
import { useVibeToast } from '@/hooks/use-vibe-toast';
import VibeAlertBanner from '@/components/vibe/vibe-alert-banner';
import VibeSkeleton, { VibeSkeletonText, VibeSkeletonCard, VibeSkeletonAvatar } from '@/components/vibe/vibe-skeleton';
import VibeLoader, { VibeLoadingSpinner, VibeLoadingOverlay, VibeInlineLoader } from '@/components/vibe/vibe-loader';
import VibeNotification from '@/components/vibe/vibe-notification-system';

export function VibeNotificationDemo() {
  const { toast } = useVibeToast();
  const [showBanner, setShowBanner] = useState(true);
  const [showOverlay, setShowOverlay] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleShowToast = (type: 'normal' | 'positive' | 'negative' | 'warning' | 'dark') => {
    toast.show({
      type,
      title: `${type.charAt(0).toUpperCase() + type.slice(1)} Toast`,
      description: `This is a ${type} toast notification using Vibe components.`,
      actions: [
        {
          type: 'button',
          text: 'Action',
          onClick: () => console.log(`${type} toast action clicked`),
        },
      ],
    });
  };

  const handleShowLoadingToast = () => {
    const id = toast.loading(
      'Processing...',
      'This operation may take a few moments.',
      {
        actions: [
          {
            type: 'button',
            text: 'Cancel',
            onClick: () => {
              toast.dismiss(id);
              toast.info('Operation cancelled');
            },
          },
        ],
      }
    );

    // Simulate completion after 3 seconds
    setTimeout(() => {
      toast.update(id, {
        type: 'positive',
        title: 'Complete!',
        description: 'The operation completed successfully.',
        loading: false,
        autoHideDuration: 3000,
      });
    }, 3000);
  };

  const handleSimulateLoading = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsLoading(false);
    toast.success('Loading simulation complete!');
  };

  const handleShowOverlay = () => {
    setShowOverlay(true);
    setTimeout(() => {
      setShowOverlay(false);
    }, 3000);
  };

  return (
    <div className="space-y-8 p-6">
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Vibe Toast Notifications</h2>
        <div className="flex flex-wrap gap-2">
          <VibeButton onClick={() => handleShowToast('normal')}>
            Normal Toast
          </VibeButton>
          <VibeButton 
            onClick={() => handleShowToast('positive')}
            color="positive"
          >
            Success Toast
          </VibeButton>
          <VibeButton 
            onClick={() => handleShowToast('negative')}
            color="negative"
          >
            Error Toast
          </VibeButton>
          <VibeButton 
            onClick={() => handleShowToast('warning')}
            color="negative"
          >
            Warning Toast
          </VibeButton>
          <VibeButton 
            onClick={() => handleShowToast('dark')}
            color="primary"
          >
            Dark Toast
          </VibeButton>
          <VibeButton onClick={handleShowLoadingToast}>
            Loading Toast
          </VibeButton>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Vibe Alert Banners</h2>
        {showBanner && (
          <VibeAlertBanner
            backgroundColor="primary"
            title="Information"
            description="This is an informational alert banner using Vibe components."
            actions={[
              {
                type: 'button',
                text: 'Learn More',
                onClick: () => toast.info('Learn more clicked'),
              },
              {
                type: 'link',
                text: 'Documentation',
                href: '#',
              },
            ]}
            onClose={() => setShowBanner(false)}
          />
        )}
        
        <VibeAlertBanner
          backgroundColor="warning"
          title="Warning"
          description="This is a warning alert that cannot be dismissed."
          isCloseHidden
        />
        
        <VibeAlertBanner
          backgroundColor="negative"
          title="Error"
          description="Something went wrong. Please try again."
          actions={[
            {
              type: 'button',
              text: 'Retry',
              onClick: () => toast.info('Retry clicked'),
            },
          ]}
        />
        
        {!showBanner && (
          <VibeButton onClick={() => setShowBanner(true)}>
            Show Info Banner Again
          </VibeButton>
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Vibe Loading States</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <VibeButton 
              onClick={handleSimulateLoading}
              loading={isLoading}
            >
              Simulate Loading
            </VibeButton>
            <VibeInlineLoader />
            <span>Inline loader</span>
          </div>
          
          <div className="flex gap-4">
            <VibeButton onClick={handleShowOverlay}>
              Show Loading Overlay
            </VibeButton>
            <VibeLoadingSpinner text="Loading data..." />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Vibe Skeleton Components</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="font-medium">Text Skeletons</h3>
            <VibeSkeletonText lines={3} />
          </div>
          
          <div className="space-y-4">
            <h3 className="font-medium">Avatar Skeleton</h3>
            <div className="flex items-center gap-3">
              <VibeSkeletonAvatar size={48} />
              <div className="flex-1">
                <VibeSkeleton type="text" size="h4" width={120} />
                <VibeSkeleton type="text" size="p" width={200} className="mt-1" />
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="font-medium">Card Skeleton</h3>
            <VibeSkeletonCard />
          </div>
          
          <div className="space-y-4">
            <h3 className="font-medium">Custom Skeletons</h3>
            <div className="space-y-2">
              <VibeSkeleton type="rectangle" width={300} height={20} />
              <VibeSkeleton type="rectangle" width={250} height={20} />
              <VibeSkeleton type="rectangle" width={200} height={20} />
              <VibeSkeleton type="circle" width={60} height={60} />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Vibe Notification System</h2>
        <div className="space-y-4">
          <VibeNotification
            type="info"
            variant="attention"
            title="Attention Box"
            message="This is an attention box notification."
            actions={[
              {
                type: 'link',
                text: 'Learn More',
                href: '#',
              },
            ]}
          />
        </div>
      </div>

      {showOverlay && (
        <VibeLoadingOverlay text="Loading application..." />
      )}
    </div>
  );
}