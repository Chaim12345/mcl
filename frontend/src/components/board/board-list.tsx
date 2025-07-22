import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { CalendarDays, Grid, List, Loader2, Plus, Search, Star } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { CreateBoardDialog } from '@/components/board/create-board-dialog';
import { Board } from '@/types';

// Mock service for boards - will be replaced with actual service
const boardService = {
  getBoards: (workspaceId: string): Promise<Board[]> => {
    // Mock data
    return Promise.resolve([
      {
        id: '1',
        workspaceId,
        name: 'Marketing Campaign',
        description: 'Q3 marketing campaign planning and execution',
        color: '#0073ea',
        createdBy: '1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: '2',
        workspaceId,
        name: 'Product Roadmap',
        description: 'Product feature planning and development tracking',
        color: '#00c875',
        createdBy: '1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: '3',
        workspaceId,
        name: 'Sprint Planning',
        description: 'Current sprint tasks and progress',
        color: '#a25ddc',
        createdBy: '1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);
  },
};

interface BoardListProps {
  workspaceId: string;
}

export function BoardList({ workspaceId }: BoardListProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  const { data: boards, isLoading } = useQuery({
    queryKey: ['boards', workspaceId],
    queryFn: () => boardService.getBoards(workspaceId),
  });
  
  // Filter boards based on search query
  const filteredBoards = boards?.filter(board => 
    board.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (board.description && board.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search boards..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-muted rounded-md p-1 flex">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="h-4 w-4" />
              <span className="sr-only">Grid view</span>
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
              <span className="sr-only">List view</span>
            </Button>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Board
          </Button>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredBoards && filteredBoards.length > 0 ? (
        <div className={viewMode === 'grid' 
          ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' 
          : 'space-y-2'
        }>
          {filteredBoards.map((board) => (
            viewMode === 'grid' ? (
              <Link to={`/boards/${board.id}`} key={board.id}>
                <Card className="h-full overflow-hidden hover:border-primary/50 transition-colors">
                  <div 
                    className="h-3" 
                    style={{ backgroundColor: board.color }}
                  />
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-lg">{board.name}</h3>
                        {board.description && (
                          <p className="text-muted-foreground text-sm line-clamp-2 mt-1">
                            {board.description}
                          </p>
                        )}
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                        <Star className="h-4 w-4" />
                        <span className="sr-only">Favorite</span>
                      </Button>
                    </div>
                  </CardContent>
                  <CardFooter className="p-4 pt-0 text-xs text-muted-foreground">
                    <div className="flex items-center">
                      <CalendarDays className="h-3 w-3 mr-1" />
                      <span>
                        Updated {new Date(board.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </CardFooter>
                </Card>
              </Link>
            ) : (
              <Link to={`/boards/${board.id}`} key={board.id}>
                <div className="flex items-center justify-between p-3 rounded-md border hover:border-primary/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: board.color }}
                    />
                    <div>
                      <h3 className="font-medium">{board.name}</h3>
                      {board.description && (
                        <p className="text-muted-foreground text-sm line-clamp-1">
                          {board.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-muted-foreground">
                      Updated {new Date(board.updatedAt).toLocaleDateString()}
                    </span>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                      <Star className="h-4 w-4" />
                      <span className="sr-only">Favorite</span>
                    </Button>
                  </div>
                </div>
              </Link>
            )
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-muted p-3 mb-3">
            <Grid className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium">No boards found</h3>
          <p className="text-muted-foreground mt-1 mb-4 max-w-md">
            {searchQuery 
              ? `No boards match your search "${searchQuery}"`
              : "Create your first board to get started"
            }
          </p>
          {!searchQuery && (
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Board
            </Button>
          )}
        </div>
      )}
      
      <CreateBoardDialog 
        open={isCreateDialogOpen} 
        onOpenChange={setIsCreateDialogOpen}
        workspaceId={workspaceId}
      />
    </div>
  );
}