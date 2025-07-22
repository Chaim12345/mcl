import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';

import { boardService } from '@/services/board-service';
import { useBoardStore } from '@/stores/board-store';
import { Skeleton } from '@/components/ui/skeleton';

export function FavoriteBoards() {
  const { setFavoriteBoards } = useBoardStore();
  
  const { data: favoriteBoards, isLoading } = useQuery({
    queryKey: ['boards', 'favorites'],
    queryFn: boardService.getFavorites,
  });

  // Update store when data changes
  useEffect(() => {
    if (favoriteBoards) {
      setFavoriteBoards(favoriteBoards);
    }
  }, [favoriteBoards, setFavoriteBoards]);
  
  // Mock data for favorite boards
  const mockFavoriteBoards = [
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
  ];
  
  const displayBoards = favoriteBoards || [];
  
  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-full" />
      </div>
    );
  }
  
  if (!displayBoards.length) {
    return (
      <div className="text-center py-4">
        <p className="text-muted-foreground text-sm">No favorite boards</p>
        <p className="text-xs text-muted-foreground mt-1">
          Star boards to add them to your favorites
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-2">
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
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
          </div>
        </Link>
      ))}
    </div>
  );
}