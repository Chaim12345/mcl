import { Link, useParams } from 'react-router-dom';
import { ThemeToggle } from '@/components/theme-toggle';
import { VibeUserNav } from '@/components/layout/vibe-user-nav';
import { VibeWorkspaceSelector } from '@/components/layout/vibe-workspace-selector';
import { SearchBar } from '@/components/search';
import { NotificationCenter } from '@/components/notifications';
import { VibeBox, VibeFlex } from '@/components/vibe';
import { Heading } from '@vibe/core';
import { cn } from '@/lib/utils';

interface VibeHeaderProps {
  className?: string;
}

export function VibeHeader({ className }: VibeHeaderProps) {
  const { boardId } = useParams<{ boardId: string }>();
  
  return (
    <VibeBox
      elementType="header"
      border
      borderColor="layoutBorderColor"
      backgroundColor="primaryBackgroundColor"
      className={cn('border-b', className)}
    >
      <VibeFlex
        direction="row"
        align="center"
        justify="space-between"
        gap="medium"
        style={{ height: '64px' }}
        className="px-4"
      >
        {/* Logo/Brand */}
        <VibeFlex align="center" gap="medium">
          <Link to="/" className="hidden md:block">
            <Heading type="h3" color="primary">
              PMP
            </Heading>
          </Link>
          
          <VibeWorkspaceSelector />
        </VibeFlex>
        
        {/* Right side navigation */}
        <VibeFlex align="center" gap="medium">
          <VibeBox className="hidden md:block">
            <SearchBar 
              boardId={boardId} 
              placeholder="Search items... (⌘K)"
              className="w-[200px] lg:w-[300px]"
            />
          </VibeBox>
          
          <NotificationCenter />
          
          <ThemeToggle />
          
          <VibeUserNav />
        </VibeFlex>
      </VibeFlex>
    </VibeBox>
  );
}