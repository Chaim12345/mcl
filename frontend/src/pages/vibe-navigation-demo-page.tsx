import React from 'react';
import { VibeMainLayout } from '@/components/layout/vibe-main-layout';
import { VibeNavigationDemo } from '@/components/demo/vibe-navigation-demo';

export function VibeNavigationDemoPage() {
  return (
    <VibeMainLayout>
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Vibe Navigation Components Demo</h1>
          <p className="text-muted-foreground mt-2">
            Demonstration of enhanced navigation components using Vibe Design System with the new Vibe-based layout
          </p>
        </div>
        <VibeNavigationDemo />
      </div>
    </VibeMainLayout>
  );
}