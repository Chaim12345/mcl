import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BoardItem } from '@/types';
import { boardService } from '@/services/board-service';
import { useToast } from '@/hooks/use-toast';

export function useBoardDnd(boardId: string, items: BoardItem[] | undefined) {
  const [isDragging, setIsDragging] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Optimistic update for item reordering
  const moveItemMutation = useMutation({
    mutationFn: async (itemIds: string[]) => {
      return boardService.reorderBoardItems(boardId, itemIds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boardItems'] });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['boardItems'] });
      toast({
        title: "Error",
        description: "Failed to reorder items",
        variant: "destructive",
      });
    }
  });
  
  // Optimistic update for item status change
  const updateItemStatusMutation = useMutation({
    mutationFn: async ({ itemId, columnId, value }: { itemId: string; columnId: string; value: any }) => {
      return boardService.updateItemField(itemId, columnId, value);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boardItems'] });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['boardItems'] });
      toast({
        title: "Error",
        description: "Failed to update item status",
        variant: "destructive",
      });
    }
  });
  
  // Move item in the array (optimistic UI update)
  const moveItem = useCallback((dragIndex: number, hoverIndex: number) => {
    if (!items) return;
    
    // Create a copy of the items array
    const updatedItems = [...items];
    
    // Remove the dragged item
    const draggedItem = updatedItems[dragIndex];
    
    // Remove the item from its original position
    updatedItems.splice(dragIndex, 1);
    
    // Insert the item at the new position
    updatedItems.splice(hoverIndex, 0, draggedItem);
    
    // Update the cache optimistically
    queryClient.setQueryData(['boardItems', boardId], updatedItems);
  }, [items, boardId, queryClient]);
  
  // Handle drag end - persist the new order
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    
    // Get the current items from the cache
    const currentItems = queryClient.getQueryData<BoardItem[]>(['boardItems', boardId]);
    
    if (currentItems) {
      // Extract the item IDs in the new order
      const itemIds = currentItems.map(item => item.id);
      
      // Persist the new order
      moveItemMutation.mutate(itemIds);
    }
  }, [boardId, moveItemMutation, queryClient]);
  
  // Handle item drop on a status column
  const handleStatusDrop = useCallback((itemId: string, statusId: string) => {
    if (!items) return;
    
    // Find the status column
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    
    // Find the status column in the item's field values
    const statusFieldValue = item.fieldValues.find(fv => {
      // We need to find the column ID that corresponds to a status type column
      // This is a bit tricky without having the columns data here
      // For now, we'll assume the status value is an object with a statusId property
      const value = fv.value;
      return typeof value === 'object' && value !== null && 'statusId' in value;
    });
    
    if (statusFieldValue) {
      // Update the status
      updateItemStatusMutation.mutate({
        itemId,
        columnId: statusFieldValue.columnId,
        value: { statusId }
      });
    }
  }, [items, updateItemStatusMutation]);
  
  return {
    isDragging,
    setIsDragging,
    moveItem,
    handleDragEnd,
    handleStatusDrop
  };
}