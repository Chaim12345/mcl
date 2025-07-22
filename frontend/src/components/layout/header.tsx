import { Link, useParams } from 'react-router-dom';
import { ThemeToggle } from '@/components/theme-toggle';
import { UserNav } from '@/components/layout/user-nav';
import { WorkspaceSelector } from '@/components/layout/workspace-selector';
import { SearchBar } from '@/components/search';
import { NotificationCenter } from '@/components/notifications';
import { cn } from '@/lib/utils';

interface HeaderProps {
  className?: string;
}

export function Header({ className }: HeaderProps) {
  const { boardId } = useParams<{ boardId: string }>();
  return (
    <header className={cn('border-b bg-background', className)}>
      <div className="flex h-16 items-center px-4 gap-4">
        <Link to="/" className="font-bold text-xl hidden md:block">
          PMP
        </Link>
        
        <WorkspaceSelector />
        
        <div className="ml-auto flex items-center gap-4">
          <div className="hidden md:block">
            <SearchBar 
              boardId={boardId} 
              placeholder="Search items... (⌘K)"
              className="w-[200px] lg:w-[300px]"
            />
          </div>
          
          <NotificationCenter />
          
          <ThemeToggle />
          
          <UserNav />
        </div>
      </div>
    </header>
  );
}