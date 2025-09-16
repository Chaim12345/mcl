import React from 'react';
import { VibeMainLayout } from '@/components/layout/vibe-main-layout';
import { VibeBoardDemo } from '@/components/demo/vibe-board-demo';

export function VibeBoardDemoPage() {
  return (
    <VibeMainLayout>
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Vibe Board Management Demo</h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive demonstration of board management using Vibe Table components with advanced features like filtering, sorting, bulk operations, and item editing
          </p>
        </div>
        <VibeBoardDemo />
      </div>
    </VibeMainLayout>
  );
}