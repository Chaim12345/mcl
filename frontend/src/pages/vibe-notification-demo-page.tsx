import React from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { VibeNotificationDemo } from '@/components/demo/vibe-notification-demo';

export function VibeNotificationDemoPage() {
  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Vibe Notification Components Demo</h1>
          <p className="text-muted-foreground mt-2">
            Demonstration of Vibe Design System notification and feedback components
          </p>
        </div>
        <VibeNotificationDemo />
      </div>
    </MainLayout>
  );
}