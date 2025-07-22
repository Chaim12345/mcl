import { useState, useRef } from 'react';
import { Copy, MoreHorizontal, Trash2, Edit, Check, X, GripVertical } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDrag, useDrop } from 'react-dnd';
import type { Identifier, XYCoord } from 'dnd-core';

import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { BoardTableColumn } from '@/components/board/board-table-column';
import { BoardTableCellRendererDnd } from '@/components/board/board-table-cell-renderer-dnd';
import { BoardColumn, BoardItem } from '@/types';
import { Input } from '@/components/ui/input';
import { boardService } from '@/services/board-service';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ItemTypes, DragItem } from './dnd-types';

interface BoardTableRowProps {
  item: BoardItem;
  columns: BoardColumn[];
  columnWidths: Record<string, number>;
  isSelected: boolean;
  onSelect: (itemId: string, selected: boolean) => void;
  onOpenItemDetail?: (itemId: string) => void;
  index: number;
  moveItem: (dragIndex: number, hoverIndex: number) => void;
  onDragEnd: () => void;
}

export function BoardTableRowDnd({ 
  item, 
  columns,
  columnWidths,
  isSelected,
  onSelect,
  onOpenItemDetail,
  index,
  moveItem,
  onDragEnd
}: BoardTableRowProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(item.name);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const rowRef = useRef<HTMLDivElement>(null);
  
  // Find field value for a specific column
  const getFieldValue = (columnId: string) => {
    const fieldValue = item.fieldValues.find(fv => fv.columnId === columnId);
    return fieldValue ? fieldValue.value : null;
  };

  // Find status column if exists
  const statusColumn = columns.find(col => col.type === 'status');
  const statusValue = statusColumn ? getFieldValue(statusColumn.id) : null;

  // Update item name mutation
  const updateItemMutation = useMutation({
    mutationFn: (name: string) => 
      boardService.updateBoardItem(item.id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boardItems'] });
      setIsEditingName(false);
      toast({
        title: "Item updated",
        description: "Item name has been updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update item name",
        variant: "destructive",
      });
      setEditName(item.name);
      setIsEditingName(false);
    }
  });

  // Delete item mutation
  const deleteItemMutation = useMutation({
    mutationFn: () => boardService.deleteBoardItem(item.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boardItems'] });
      toast({
        title: "Item deleted",
        description: "Item has been deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive",
      });
    }
  });

  // Duplicate item mutation
  const duplicateItemMutation = useMutation({
    mutationFn: () => boardService.createBoardItem(item.boardId, {
      name: `${item.name} (Copy)`,
      fieldValues: item.fieldValues.map(fv => ({
        columnId: fv.columnId,
        value: fv.value
      }))
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boardItems'] });
      toast({
        title: "Item duplicated",
        description: "Item has been duplicated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to duplicate item",
        variant: "destructive",
      });
    }
  });

  const handleSaveName = () => {
    if (editName.trim() !== item.name) {
      updateItemMutation.mutate(editName);
    } else {
      setIsEditingName(false);
    }
  };

  const handleCancelEdit = () => {
    setEditName(item.name);
    setIsEditingName(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveName();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const handleDeleteItem = () => {
    deleteItemMutation.mutate();
  };

  const handleDuplicateItem = () => {
    duplicateItemMutation.mutate();
  };

  const handleRowClick = () => {
    if (onOpenItemDetail) {
      onOpenItemDetail(item.id);
    }
  };

  // Drag and drop functionality
  const [{ isDragging }, drag, preview] = useDrag({
    type: ItemTypes.BOARD_ITEM,
    item: () => {
      return { id: item.id, index, type: ItemTypes.BOARD_ITEM, originalIndex: index, columnId: statusValue };
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    end: (item, monitor) => {
      if (!monitor.didDrop()) {
        // If the item was not dropped in a valid drop target, reset its position
        moveItem(item.index, item.originalIndex);
      }
      onDragEnd();
    },
  });

  const [{ handlerId }, drop] = useDrop<
    DragItem,
    void,
    { handlerId: Identifier | null }
  >({
    accept: ItemTypes.BOARD_ITEM,
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
      };
    },
    hover(item, monitor) {
      if (!rowRef.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;

      // Don't replace items with themselves
      if (dragIndex === hoverIndex) {
        return;
      }

      // Determine rectangle on screen
      const hoverBoundingRect = rowRef.current?.getBoundingClientRect();

      // Get vertical middle
      const hoverMiddleY =
        (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;

      // Determine mouse position
      const clientOffset = monitor.getClientOffset();

      // Get pixels to the top
      const hoverClientY = (clientOffset as XYCoord).y - hoverBoundingRect.top;

      // Only perform the move when the mouse has crossed half of the items height
      // When dragging downwards, only move when the cursor is below 50%
      // When dragging upwards, only move when the cursor is above 50%

      // Dragging downwards
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }

      // Dragging upwards
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }

      // Time to actually perform the action
      moveItem(dragIndex, hoverIndex);

      // Note: we're mutating the monitor item here!
      // Generally it's better to avoid mutations,
      // but it's good here for the sake of performance
      // to avoid expensive index searches.
      item.index = hoverIndex;
    },
  });

  // Initialize drag and drop refs
  const dragDropRef = useRef<HTMLDivElement>(null);
  drag(dragDropRef);
  drop(preview(rowRef));
  
  return (
    <div 
      ref={rowRef}
      className={cn(
        "flex border-b transition-colors group relative",
        isSelected ? "bg-primary/10" : "hover:bg-muted/30",
        isHovered && "bg-muted/30",
        isDragging && "opacity-50 border border-primary"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-handler-id={handlerId}
    >
      {/* Drag handle */}
      <div 
        ref={dragDropRef}
        className="p-2 flex items-center justify-center border-r w-10 cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Selection checkbox */}
      <div className="p-2 flex items-center justify-center border-r w-10">
        <Checkbox 
          checked={isSelected}
          onCheckedChange={(checked) => onSelect(item.id, !!checked)}
          aria-label="Select item"
        />
      </div>

      {/* Item name column */}
      <BoardTableColumn 
        column={{ id: 'name', boardId: item.boardId, name: 'Item', type: 'text', settings: {}, position: 0 }}
        width={columnWidths['name'] || 250}
        className="font-medium"
      >
        <div className="flex items-center justify-between w-full">
          {isEditingName ? (
            <div className="flex items-center gap-1 w-full">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-7 text-sm"
                onKeyDown={handleKeyDown}
                autoFocus
              />
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6" 
                onClick={handleSaveName}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6" 
                onClick={handleCancelEdit}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <span 
                className="truncate cursor-pointer" 
                onClick={handleRowClick}
                title={item.name}
              >
                {item.name}
              </span>
              {isHovered && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 ml-2">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setIsEditingName(true)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Item
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDuplicateItem}>
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate Item
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="text-destructive"
                      onClick={handleDeleteItem}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Item
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </>
          )}
        </div>
      </BoardTableColumn>
      
      {/* Dynamic columns */}
      {columns.map((column) => (
        <BoardTableColumn 
          key={column.id}
          column={column}
          width={columnWidths[column.id] || 200}
        >
          <BoardTableCellRendererDnd
            column={column}
            value={getFieldValue(column.id)}
            itemId={item.id}
            onStatusDrop={column.type === 'status' ? onDragEnd : undefined}
          />
        </BoardTableColumn>
      ))}
      
      {/* Empty column for add column button alignment */}
      <div className="p-2 border-r flex-shrink-0" />
    </div>
  );
}