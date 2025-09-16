import React from 'react';
import { VibeMainLayout } from '@/components/layout/vibe-main-layout';
import { VibeLayoutDemo } from '@/components/demo/vibe-layout-demo';

export function VibeLayoutDemoPage() {
  return (
    <VibeMainLayout>
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Vibe Layout Components Demo</h1>
          <p className="text-muted-foreground mt-2">
            Demonstration of Vibe Design System layout and navigation components with the new Vibe-based layout
          </p>
        </div>
        <VibeLayoutDemo />
      </div>
    </VibeMainLayout>
  );
}