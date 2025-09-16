import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Settings,
  Users,
  ChevronRight,
  ChevronLeft,
  PlusCircle,
  Star,
} from 'lucide-react';

import { VibeBox, VibeFlex, VibeMenu, VibeMenuItem, VibeMenuDivider, VibeMenuTitle, VibeButton, VibeLoadingSpinner } from '@/components/vibe';
import { Heading, Text, IconButton, Tooltip } from '@vibe/core';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';

import { useWorkspaceStore } from '@/stores/workspace-store';

// Icon wrapper to convert Lucide icons to Vibe SubIcon format
const createVibeIcon = (LucideIcon: any) => {
  const VibeIcon: React.FC<any> = (props) => <LucideIcon {...props} />;
  return VibeIcon;
};
import { useBoardStore } from '@/stores/board-store';
import { boardService } from '@/services/board-service';
import { CreateBoardDialog } from '@/components/board/create-board-dialog';

interface VibeSidebarProps {
  className?: string;
}

export function VibeSidebar({ className }: VibeSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [boardsExpanded, setBoardsExpanded] = useState(true);
  const [isCreateBoardDialogOpen, setIsCreateBoardDialogOpen] = useState(false);
  const location = useLocation();
  const { currentWorkspace } = useWorkspaceStore();
  const { boards, setBoards, favoriteBoards, setFavoriteBoards } = useBoardStore();
  
  // Fetch boards if we have a current workspace
  const { data: fetchedBoards, isLoading: isLoadingBoards } = useQuery({
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
  const { data: fetchedFavorites, isLoading: isLoadingFavorites } = useQuery({
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
    <VibeBox
      border
      borderColor="layoutBorderColor"
      backgroundColor="primaryBackgroundColor"
      className={cn(
        'flex flex-col border-r transition-all duration-300 ease-in-out',
        collapsed ? 'w-16' : 'w-64',
        className
      )}
    >
      {/* Header */}
      <VibeFlex
        align="center"
        justify={collapsed ? 'center' : 'space-between'}
        className="h-14 border-b px-4 py-2"
      >
        {!collapsed && (
          <Heading type="h3" color="primary">
            PMP
          </Heading>
        )}
        <Tooltip content={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          <IconButton
            icon={createVibeIcon(collapsed ? ChevronRight : ChevronLeft)}
            size="small"
            kind="tertiary"
            onClick={() => setCollapsed(!collapsed)}
          />
        </Tooltip>
      </VibeFlex>
      
      {/* Navigation Content */}
      <VibeBox scrollable className="flex-1">
        <VibeBox className="py-2">
          {/* Main Navigation */}
          <VibeMenu size="medium" className="px-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              
              return (
                <VibeMenuItem
                  key={item.href}
                  title={collapsed ? undefined : item.name}
                  icon={item.icon}
                  selected={isActive}
                  onClick={() => window.location.href = item.href}
                  tooltipContent={collapsed ? item.name : undefined}
                  tooltipPosition="right"
                  className={cn(
                    'mb-1',
                    isActive && 'bg-primary text-primary-foreground'
                  )}
                />
              );
            })}
          </VibeMenu>
          
          {!collapsed && (
            <>
              {/* Favorites Section */}
              <VibeBox marginTop="large" paddingX="medium">
                <VibeMenuTitle>
                  <Text type="text2" color="secondary" weight="medium">
                    FAVORITES
                  </Text>
                </VibeMenuTitle>
                <VibeBox marginTop="small">
                  {isLoadingFavorites ? (
                    <VibeFlex justify="center" className="py-2">
                      <VibeLoadingSpinner size="small" />
                    </VibeFlex>
                  ) : displayFavorites.length > 0 ? (
                    <VibeMenu size="small">
                      {displayFavorites.map((board) => (
                        <VibeMenuItem
                          key={board.id}
                          title={
                            <VibeFlex align="center" gap="small">
                              <div 
                                className="w-2 h-2 rounded-full" 
                                style={{ backgroundColor: board.color }}
                              />
                              <Text type="text2" ellipsis>
                                {board.name}
                              </Text>
                              <Star className="h-3 w-3 ml-auto text-yellow-500 fill-yellow-500" />
                            </VibeFlex>
                          }
                          selected={location.pathname === `/boards/${board.id}`}
                          onClick={() => window.location.href = `/boards/${board.id}`}
                          className="h-8"
                        />
                      ))}
                    </VibeMenu>
                  ) : (
                    <Text type="text2" color="secondary" className="px-3 py-2">
                      No favorite boards
                    </Text>
                  )}
                </VibeBox>
              </VibeBox>
              
              {/* Boards Section */}
              <VibeBox marginTop="large" paddingX="medium">
                <Collapsible
                  open={boardsExpanded}
                  onOpenChange={setBoardsExpanded}
                  className="space-y-1"
                >
                  <VibeFlex align="center" justify="space-between">
                    <VibeMenuTitle>
                      <Text type="text2" color="secondary" weight="medium">
                        BOARDS
                      </Text>
                    </VibeMenuTitle>
                    <CollapsibleTrigger asChild>
                      <IconButton
                        icon={createVibeIcon(ChevronRight)}
                        size="xs"
                        kind="tertiary"
                        className={cn(
                          "transition-transform",
                          boardsExpanded && "rotate-90"
                        )}
                      />
                    </CollapsibleTrigger>
                  </VibeFlex>
                  
                  <CollapsibleContent>
                    <VibeBox marginTop="small">
                      {isLoadingBoards ? (
                        <VibeFlex justify="center" className="py-2">
                          <VibeLoadingSpinner size="small" />
                        </VibeFlex>
                      ) : displayBoards.length > 0 ? (
                        <VibeMenu size="small">
                          {displayBoards.map((board) => (
                            <VibeMenuItem
                              key={board.id}
                              title={
                                <VibeFlex align="center" gap="small">
                                  <div 
                                    className="w-2 h-2 rounded-full" 
                                    style={{ backgroundColor: board.color }}
                                  />
                                  <Text type="text2" ellipsis>
                                    {board.name}
                                  </Text>
                                </VibeFlex>
                              }
                              selected={location.pathname === `/boards/${board.id}`}
                              onClick={() => window.location.href = `/boards/${board.id}`}
                              className="h-8"
                            />
                          ))}
                          
                          <VibeMenuItem
                            title={
                              <VibeFlex align="center" gap="small">
                                <PlusCircle className="h-4 w-4" />
                                <Text type="text2" color="secondary">
                                  Add Board
                                </Text>
                              </VibeFlex>
                            }
                            onClick={handleCreateBoard}
                            className="h-8"
                          />
                        </VibeMenu>
                      ) : (
                        <Text type="text2" color="secondary" className="px-3 py-2">
                          No boards found
                        </Text>
                      )}
                    </VibeBox>
                  </CollapsibleContent>
                </Collapsible>
              </VibeBox>
            </>
          )}
        </VibeBox>
      </VibeBox>
      
      {/* Footer */}
      <VibeBox padding="medium" className="mt-auto">
        {!collapsed ? (
          <VibeButton
            kind="primary"
            size="medium"
            onClick={handleCreateBoard}
            className="w-full"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            New Board
          </VibeButton>
        ) : (
          <Tooltip content="New Board">
            <IconButton
              icon={createVibeIcon(PlusCircle)}
              size="medium"
              kind="primary"
              onClick={handleCreateBoard}
            />
          </Tooltip>
        )}
      </VibeBox>
      
      {currentWorkspace && (
        <CreateBoardDialog
          open={isCreateBoardDialogOpen}
          onOpenChange={setIsCreateBoardDialogOpen}
          workspaceId={currentWorkspace.id}
        />
      )}
    </VibeBox>
  );
}