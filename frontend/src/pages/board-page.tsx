import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';

import { AuthGuard } from '@/components/auth/auth-guard';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BoardHeader } from '@/components/board/board-header';
import { BoardTable } from '@/components/board/board-table';
import { ItemDetailModal } from '@/components/board/item-detail-modal';
import { FilterBar } from '@/components/filter';
import { useBoardStore } from '@/stores/board-store';
import { useFilterStore } from '@/stores/filter-store';
import { Board } from '@/types';
import { useViewStore } from '@/stores/view-store';
import { boardService } from '@/services/board-service';
import { getSavedFilters } from '@/services/filter-service';
import { FilterGroup, SortDefinition, ViewDefinition } from '@/types/filter';

export function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const { currentBoard, setCurrentBoard } = useBoardStore();
  const { setSavedFilters } = useFilterStore();
  const { currentView, setCurrentView } = useViewStore();
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterGroup | null>(null);
  const [activeSorts, setActiveSorts] = useState<SortDefinition[] | undefined>();
  
  // Fetch board details
  const { data: board, isLoading, error } = useQuery({
    queryKey: ['board', boardId],
    queryFn: () => boardId ? boardService.getBoard(boardId) : null,
    enabled: !!boardId,
  });

  // Update store when board data changes
  useEffect(() => {
    if (board) {
      setCurrentBoard(board);
    }
  }, [board, setCurrentBoard]);

  // Handle navigation on error
  useEffect(() => {
    if (error) {
      navigate('/dashboard');
    }
  }, [error, navigate]);
  
  // Fetch saved filters
  const { data: savedFilters } = useQuery({
    queryKey: ['saved-filters', boardId],
    queryFn: () => boardId ? getSavedFilters(boardId) : [],
    enabled: !!boardId,
  });

  // Update store when saved filters change
  useEffect(() => {
    if (savedFilters) {
      setSavedFilters(savedFilters);
    }
  }, [savedFilters, setSavedFilters]);
  
  // Handle view change
  const handleViewChange = (view: ViewDefinition) => {
    setCurrentView(view);
    setActiveFilter(view.filter || null);
    setActiveSorts(view.sorts);
  };
  
  // Clear current board on unmount
  useEffect(() => {
    return () => {
      setCurrentBoard(null);
    };
  }, [setCurrentBoard]);
  
  const displayBoard = board || currentBoard;

  const handleOpenItemDetail = (itemId: string) => {
    setSelectedItemId(itemId);
  };

  const handleCloseItemDetail = () => {
    setSelectedItemId(null);
  };
  
  return (
    <AuthGuard>
      <MainLayout>
        <div className="space-y-6">
          {isLoading ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-8 w-[250px]" />
                <Skeleton className="h-10 w-[120px]" />
              </div>
              <Skeleton className="h-[600px] w-full" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
              <p className="text-muted-foreground">Board not found or you don't have access.</p>
              <Button onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </div>
          ) : displayBoard ? (
            <>
              <BoardHeader board={displayBoard as Board} />
              <FilterBar 
                boardId={displayBoard.id || ''} 
                onFilterChange={setActiveFilter}
              />
              <BoardTable 
                board={displayBoard as Board} 
                onOpenItemDetail={handleOpenItemDetail}
                filter={activeFilter}
                sorts={activeSorts}
              />
              {boardId && (
                <ItemDetailModal 
                  itemId={selectedItemId} 
                  boardId={boardId}
                  onClose={handleCloseItemDetail}
                />
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
              <p className="text-muted-foreground">No board selected</p>
              <Button onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </div>
          )}
        </div>
      </MainLayout>
    </AuthGuard>
  );
}