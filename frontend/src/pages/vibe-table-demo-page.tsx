import React from 'react';
import { VibeMainLayout } from '@/components/layout/vibe-main-layout';
import { VibeTableDemo } from '@/components/demo/vibe-table-demo';

export function VibeTableDemoPage() {
  return (
    <VibeMainLayout>
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Vibe Table Components Demo</h1>
          <p className="text-muted-foreground mt-2">
            Demonstration of Vibe Table components with sorting, selection, custom renderers, and various table features
          </p>
        </div>
        <VibeTableDemo />
      </div>
    </VibeMainLayout>
  );
}