import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';

import { AuthGuard } from '@/components/auth/auth-guard';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BoardHeader } from '@/components/board/board-header';
import { BoardTableDnd } from '@/components/board/board-table-dnd';
import { ItemDetailModal } from '@/components/board/item-detail-modal';
import { useBoardStore } from '@/stores/board-store';
import { boardService } from '@/services/board-service';
import { useRealTimeSync } from '@/hooks/use-real-time-sync';
import { useToast } from '@/hooks/use-toast';
import { ConnectionStatus } from '@/components/real-time';

export function BoardPageDnd() {
    const { boardId } = useParams<{ boardId: string }>();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { currentBoard, setCurrentBoard, updateItem, moveItem } = useBoardStore();
    const [selectedItemId, setSelectedItemId] = useState<string | null>(
        searchParams.get('itemId')
    );

    // Fetch board details
    const { data: board, isLoading, error } = useQuery({
        queryKey: ['board', boardId],
        queryFn: () => boardId ? boardService.getBoard(boardId) : null,
        enabled: !!boardId,
    });

    // Handle success and error cases with useEffect
    useEffect(() => {
        if (board) {
            setCurrentBoard(board);
        }
    }, [board, setCurrentBoard]);

    useEffect(() => {
        if (error) {
            navigate('/dashboard');
        }
    }, [error, navigate]);

    // Set up real-time sync
    const { isConnected } = useRealTimeSync({
        boardId,
        onItemUpdate: (data) => {
            if (data.boardId === boardId) {
                // Update the item in the store
                if (data.type === 'item_updated' && data.itemId && data.changes) {
                    updateItem(data.itemId, data.changes);

                    // Show toast notification
                    toast({
                        title: 'Item Updated',
                        description: `${data.user?.firstName || 'Someone'} updated an item`,
                    });

                    // Invalidate query to refresh data
                    queryClient.invalidateQueries({ queryKey: ['board', boardId] });
                }
            }
        },
        onItemMove: (data) => {
            if (data.boardId === boardId) {
                // Update item position in the store
                moveItem(data.itemId, data.fromPosition, data.toPosition);

                // Show toast for item moved by another user
                if (data.user?.id !== localStorage.getItem('userId')) {
                    toast({
                        title: 'Item Moved',
                        description: `${data.user?.firstName || 'Someone'} moved an item`,
                    });
                }
            }
        },
        onUserJoined: (data) => {
            if (data.boardId === boardId) {
                toast({
                    title: 'User Joined',
                    description: `${data.user?.firstName || 'Someone'} joined the board`,
                    variant: 'default',
                });
            }
        },
        onUserLeft: (data) => {
            if (data.boardId === boardId) {
                toast({
                    title: 'User Left',
                    description: `${data.user?.firstName || 'Someone'} left the board`,
                    variant: 'default',
                });
            }
        },
    });

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
                            <div className="flex items-center justify-between mb-4">
                                <BoardHeader board={displayBoard} />
                                <ConnectionStatus showLabel={true} className="ml-auto mr-4" />
                            </div>
                            <BoardTableDnd
                                board={displayBoard}
                                onOpenItemDetail={handleOpenItemDetail}
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