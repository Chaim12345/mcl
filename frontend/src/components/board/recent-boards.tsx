import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { CalendarDays, Loader2 } from 'lucide-react';

import { boardService } from '@/services/board-service';
import { useBoardStore } from '@/stores/board-store';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export function RecentBoards() {
  const { setRecentBoards } = useBoardStore();
  
  const { data: recentBoards, isLoading } = useQuery({
    queryKey: ['boards', 'recent'],
    queryFn: boardService.getRecentBoards,
  });

  // Update store when data changes
  useEffect(() => {
    if (recentBoards) {
      setRecentBoards(recentBoards);
    }
  }, [recentBoards, setRecentBoards]);
  
  // Mock data for recent boards
  const mockRecentBoards = [
    {
      id: '1',
      name: 'Marketing Campaign',
      color: '#0073ea',
      workspaceId: '1',
      createdBy: '1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '2',
      name: 'Product Roadmap',
      color: '#00c875',
      workspaceId: '1',
      createdBy: '1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '3',
      name: 'Sprint Planning',
      color: '#a25ddc',
      workspaceId: '1',
      createdBy: '1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
  
  const displayBoards = recentBoards || [];
  
  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-full" />
      </div>
    );
  }
  
  if (!displayBoards.length) {
    return (
      <div className="text-center py-4">
        <p className="text-muted-foreground text-sm">No recent boards</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-3">
      {displayBoards.map((board) => (
        <Link to={`/boards/${board.id}`} key={board.id}>
          <div className="flex items-center gap-3 p-2 rounded-md hover:bg-accent transition-colors">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: board.color }}
            />
            <div className="flex-1">
              <p className="font-medium">{board.name}</p>
            </div>
            <div className="text-xs text-muted-foreground flex items-center">
              <CalendarDays className="h-3 w-3 mr-1" />
              {new Date(board.updatedAt).toLocaleDateString()}
            </div>
          </div>
        </Link>
      ))}
      
      <div className="pt-2">
        <Button asChild variant="ghost" size="sm" className="w-full justify-start">
          <Link to="/workspaces">
            View all boards
          </Link>
        </Button>
      </div>
    </div>
  );
}