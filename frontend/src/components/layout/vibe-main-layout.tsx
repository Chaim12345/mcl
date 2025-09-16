import { ReactNode } from 'react';
import { VibeHeader } from '@/components/layout/vibe-header';
import { VibeSidebar } from '@/components/layout/vibe-sidebar';
import { VibeBox, VibeFlex } from '@/components/vibe';

interface VibeMainLayoutProps {
  children: ReactNode;
}

export function VibeMainLayout({ children }: VibeMainLayoutProps) {
  return (
    <VibeFlex
      direction="row"
      className="min-h-screen bg-primary"
    >
      <VibeSidebar />
      <VibeFlex direction="column" className="flex-1">
        <VibeHeader />
        <VibeBox
          elementType="main"
          className="flex-1"
          padding="large"
          backgroundColor="primaryBackgroundColor"
        >
          {children}
        </VibeBox>
      </VibeFlex>
    </VibeFlex>
  );
}