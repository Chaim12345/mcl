import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Calendar,
  Settings,
  Users,
  ChevronRight,
  ChevronLeft,
  PlusCircle,
  Star,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { useBoardStore } from '@/stores/board-store';
import { boardService } from '@/services/board-service';
import { CreateBoardDialog } from '@/components/board/create-board-dialog';

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [boardsExpanded, setBoardsExpanded] = useState(true);
  const [isCreateBoardDialogOpen, setIsCreateBoardDialogOpen] = useState(false);
  const location = useLocation();
  const { currentWorkspace } = useWorkspaceStore();
  const { boards, setBoards, favoriteBoards, setFavoriteBoards } = useBoardStore();
  
  // Fetch boards if we have a current workspace
  const { data: fetchedBoards, isLoading: isLoadingBoards  } = useQuery({
    queryKey: ['boards', currentWorkspace?.id],
    queryFn: () => currentWorkspace ? boardService.getBoards(currentWorkspace.id) : Promise.resolve([]),
    enabled: !!currentWorkspace,
  
  });

  // Update store when data changes
  useEffect(() => {
    if (fetchedBoards) {
      setBoards(fetchedBoards);
    }
  }, [fetchedBoards, setBoards]);
  
  // Fetch favorite boards
  const { data: fetchedFavorites, isLoading: isLoadingFavorites  } = useQuery({
    queryKey: ['boards', 'favorites'],
    queryFn: boardService.getFavorites,
  
  });

  // Update store when data changes
  useEffect(() => {
    if (fetchedFavorites) {
      setFavoriteBoards(fetchedFavorites);
    }
  }, [fetchedFavorites, setFavoriteBoards]);
  
  // Mock boards for development
  const mockBoards = [
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
  
  const displayBoards = boards.length > 0 ? boards : mockBoards;
  const displayFavorites = favoriteBoards.length > 0 ? favoriteBoards : mockBoards.slice(0, 2);
  
  const navItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      name: 'Workspaces',
      href: '/workspaces',
      icon: <Users className="h-5 w-5" />,
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: <Settings className="h-5 w-5" />,
    },
  ];
  
  const handleCreateBoard = () => {
    if (currentWorkspace) {
      setIsCreateBoardDialogOpen(true);
    }
  };
  
  return (
    <div
      className={cn(
        'flex flex-col border-r bg-background transition-all duration-300 ease-in-out',
        collapsed ? 'w-16' : 'w-64',
        className
      )}
    >
      <div className="flex h-14 items-center px-3 border-b">
        {!collapsed && (
          <span className="text-xl font-bold">
            PMP
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={cn('ml-auto')}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="py-2">
          <nav className="grid gap-1 px-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              
              return collapsed ? (
                <TooltipProvider key={item.href}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        to={item.href}
                        className={cn(
                          'flex h-10 w-10 items-center justify-center rounded-md',
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-accent hover:text-accent-foreground'
                        )}
                      >
                        {item.icon}
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      {item.name}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    'flex h-10 items-center rounded-md px-3 text-sm font-medium',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  {item.icon}
                  <span className="ml-3">{item.name}</span>
                </Link>
              );
            })}
          </nav>
          
          {!collapsed && (
            <>
              <div className="mt-6 px-3">
                <h3 className="text-xs font-medium text-muted-foreground mb-2">FAVORITES</h3>
                <div className="space-y-1">
                  {isLoadingFavorites ? (
                    <div className="flex items-center justify-center py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : displayFavorites.length > 0 ? (
                    displayFavorites.map((board) => (
                      <Link
                        key={board.id}
                        to={`/boards/${board.id}`}
                        className={cn(
                          'flex h-8 items-center rounded-md px-3 text-sm',
                          location.pathname === `/boards/${board.id}`
                            ? 'bg-accent text-accent-foreground font-medium'
                            : 'hover:bg-accent/50 hover:text-accent-foreground'
                        )}
                      >
                        <div 
                          className="w-2 h-2 rounded-full mr-2" 
                          style={{ backgroundColor: board.color }}
                        />
                        <span className="truncate">{board.name}</span>
                        <Star className="h-3 w-3 ml-auto text-yellow-500 fill-yellow-500" />
                      </Link>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground px-3 py-2">No favorite boards</p>
                  )}
                </div>
              </div>
              
              <div className="mt-6 px-3">
                <Collapsible
                  open={boardsExpanded}
                  onOpenChange={setBoardsExpanded}
                  className="space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-medium text-muted-foreground">BOARDS</h3>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <ChevronRight className={cn(
                          "h-4 w-4 transition-transform",
                          boardsExpanded && "rotate-90"
                        )} />
                        <span className="sr-only">Toggle boards</span>
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                  
                  <CollapsibleContent className="space-y-1">
                    {isLoadingBoards ? (
                      <div className="flex items-center justify-center py-2">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : displayBoards.length > 0 ? (
                      displayBoards.map((board) => (
                        <Link
                          key={board.id}
                          to={`/boards/${board.id}`}
                          className={cn(
                            'flex h-8 items-center rounded-md px-3 text-sm',
                            location.pathname === `/boards/${board.id}`
                              ? 'bg-accent text-accent-foreground font-medium'
                              : 'hover:bg-accent/50 hover:text-accent-foreground'
                          )}
                        >
                          <div 
                            className="w-2 h-2 rounded-full mr-2" 
                            style={{ backgroundColor: board.color }}
                          />
                          <span className="truncate">{board.name}</span>
                        </Link>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground px-3 py-2">No boards found</p>
                    )}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-muted-foreground hover:text-foreground"
                      onClick={handleCreateBoard}
                    >
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add Board
                    </Button>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </>
          )}
        </div>
      </ScrollArea>
      
      <div className="mt-auto p-4">
        {!collapsed ? (
          <Button className="w-full justify-start" onClick={handleCreateBoard}>
            <PlusCircle className="mr-2 h-4 w-4" />
            New Board
          </Button>
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" className="w-10 h-10" onClick={handleCreateBoard}>
                  <PlusCircle className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                New Board
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      
      {currentWorkspace && (
        <CreateBoardDialog
          open={isCreateBoardDialogOpen}
          onOpenChange={setIsCreateBoardDialogOpen}
          workspaceId={currentWorkspace.id}
        />
      )}
    </div>
  );
}