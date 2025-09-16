import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, Copy, Plus, Trash2 } from 'lucide-react';
import { FilterGroup, SortDefinition } from '@/types/filter';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BoardTableHeader } from '@/components/board/board-table-header';
import { BoardTableRow } from '@/components/board/board-table-row';
import { BoardTableAddRow } from '@/components/board/board-table-add-row';
import { cn } from '@/lib/utils';
import { boardService } from '@/services/board-service';
import { Board, BoardColumn, BoardItem } from '@/types';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface BoardTableProps {
  board: Board;
  onOpenItemDetail?: (itemId: string) => void;
  filter?: FilterGroup | null;
  sorts?: SortDefinition[];
}

export function BoardTable({ board, onOpenItemDetail, filter, sorts }: BoardTableProps) {
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [tableWidth, setTableWidth] = useState<number>(0);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [resizingColumnId, setResizingColumnId] = useState<string | null>(null);
  const [startX, setStartX] = useState<number>(0);
  const [startWidth, setStartWidth] = useState<number>(0);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch board columns and items
  const { data: columns, isLoading: isLoadingColumns } = useQuery({
    queryKey: ['boardColumns', board.id],
    queryFn: () => boardService.getBoardColumns(board.id),
    enabled: !!board.id,
  });

  const { data: items, isLoading: isLoadingItems } = useQuery({
    queryKey: ['boardItems', board.id, filter, sorts],
    queryFn: async () => {
      if (filter && filter.conditions.length > 0) {
        // Use filter service to get filtered items
        const { applyFilter } = await import('@/services/filter-service');
        return applyFilter(board.id, filter, sorts);
      }
      return boardService.getBoardItems(board.id);
    },
    enabled: !!board.id,
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async () => {
      const promises = Array.from(selectedItems).map(itemId =>
        boardService.deleteBoardItem(itemId)
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boardItems'] });
      setSelectedItems(new Set());
      toast({
        title: "Items deleted",
        description: `${selectedItems.size} items have been deleted successfully`,
      });
      setIsDeleteDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete selected items",
        variant: "destructive",
      });
      setIsDeleteDialogOpen(false);
    }
  });

  // Bulk duplicate mutation
  const bulkDuplicateMutation = useMutation({
    mutationFn: async () => {
      if (!items) return [];

      const selectedItemsData = items.filter(item => selectedItems.has(item.id));
      const promises = selectedItemsData.map(item =>
        boardService.createBoardItem(board.id, {
          name: `${item.name} (Copy)`,
          fieldValues: item.fieldValues.map(fv => ({
            columnId: fv.columnId,
            value: fv.value
          }))
        })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boardItems'] });
      setSelectedItems(new Set());
      toast({
        title: "Items duplicated",
        description: `${selectedItems.size} items have been duplicated successfully`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to duplicate selected items",
        variant: "destructive",
      });
    }
  });

  // Initialize column widths
  useEffect(() => {
    if (columns && columns.length > 0) {
      const initialWidths: Record<string, number> = {};
      const defaultWidth = 200;

      columns.forEach((column) => {
        // Set different widths based on column type
        let width = defaultWidth;
        switch (column.type) {
          case 'text':
            width = 250;
            break;
          case 'status':
            width = 150;
            break;
          case 'people':
            width = 180;
            break;
          case 'date':
            width = 150;
            break;
          case 'tags':
            width = 200;
            break;
          case 'number':
            width = 120;
            break;
          default:
            width = defaultWidth;
        }
        initialWidths[column.id] = width;
      });

      setColumnWidths(initialWidths);
    }
  }, [columns]);

  // Update table width when window resizes
  useEffect(() => {
    const updateTableWidth = () => {
      if (tableContainerRef.current) {
        setTableWidth(tableContainerRef.current.offsetWidth);
      }
    };

    updateTableWidth();
    window.addEventListener('resize', updateTableWidth);

    return () => {
      window.removeEventListener('resize', updateTableWidth);
    };
  }, []);

  // Handle column resize
  const handleResizeStart = (columnId: string, e: React.MouseEvent) => {
    setIsResizing(true);
    setResizingColumnId(columnId);
    setStartX(e.clientX);
    setStartWidth(columnWidths[columnId] || 200);

    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  };

  const handleResizeMove = (e: MouseEvent) => {
    if (isResizing && resizingColumnId) {
      const diff = e.clientX - startX;
      const newWidth = Math.max(100, startWidth + diff); // Minimum width of 100px

      setColumnWidths((prev) => ({
        ...prev,
        [resizingColumnId]: newWidth,
      }));
    }
  };

  const handleResizeEnd = () => {
    setIsResizing(false);
    setResizingColumnId(null);

    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
  };

  // Calculate total table width based on column widths
  const getTotalTableWidth = () => {
    if (!columns) return 0;

    // Add 10px for the selection checkbox column
    return columns.reduce((total, column) => {
      return total + (columnWidths[column.id] || 200);
    }, 10);
  };

  // Handle item selection
  const handleSelectItem = (itemId: string, selected: boolean) => {
    const newSelectedItems = new Set(selectedItems);

    if (selected) {
      newSelectedItems.add(itemId);
    } else {
      newSelectedItems.delete(itemId);
    }

    setSelectedItems(newSelectedItems);
  };

  // Handle select all items
  const handleSelectAll = (selected: boolean) => {
    if (selected && items) {
      const allItemIds = new Set(items.map(item => item.id));
      setSelectedItems(allItemIds);
    } else {
      setSelectedItems(new Set());
    }
  };

  // Handle bulk delete
  const handleBulkDelete = () => {
    setIsDeleteDialogOpen(true);
  };

  // Handle bulk duplicate
  const handleBulkDuplicate = () => {
    bulkDuplicateMutation.mutate();
  };

  const isLoading = isLoadingColumns || isLoadingItems;
  const allSelected = items && items.length > 0 && selectedItems.size === items.length;
  const someSelected = selectedItems.size > 0 && (!items || selectedItems.size < items.length);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  if (!columns || columns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4 border rounded-md p-6">
        <p className="text-muted-foreground">This board has no columns yet.</p>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Column
        </Button>
      </div>
    );
  }

  return (
    <>
      <div
        ref={tableContainerRef}
        className="border rounded-md overflow-hidden"
        style={{ cursor: isResizing ? 'col-resize' : 'default' }}
        role="region"
        aria-label={`Board table for ${board.name}`}
      >
        {/* Bulk actions toolbar */}
        {selectedItems.size > 0 && (
          <div
            className="bg-primary/10 p-2 flex items-center justify-between border-b"
            role="toolbar"
            aria-label={`Bulk actions for ${selectedItems.size} selected items`}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium" id="selected-count">
                {selectedItems.size} items selected
              </span>
            </div>
            <div className="flex items-center gap-2" role="group" aria-labelledby="selected-count">
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkDuplicate}
                disabled={bulkDuplicateMutation.isPending}
                aria-label={`Duplicate ${selectedItems.size} selected items`}
              >
                <Copy className="h-4 w-4 mr-1" aria-hidden="true" />
                Duplicate
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleBulkDelete}
                disabled={bulkDeleteMutation.isPending}
                aria-label={`Delete ${selectedItems.size} selected items`}
              >
                <Trash2 className="h-4 w-4 mr-1" aria-hidden="true" />
                Delete
              </Button>
            </div>
          </div>
        )}

        <ScrollArea className="h-[calc(100vh-220px)]">
          <div className="relative">
            {/* Table Header */}
            <div className="flex border-b bg-muted/50 sticky top-0 z-10" role="rowgroup">
              {/* Selection checkbox header */}
              <div className="p-2 flex items-center justify-center border-r w-10" role="columnheader">
                <Checkbox
                  checked={allSelected ? true : someSelected ? "indeterminate" : false}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all items"
                  aria-describedby="select-all-description"
                />
                <span id="select-all-description" className="sr-only">Select all items in this board</span>
              </div>

              <BoardTableHeader
                columns={columns}
                columnWidths={columnWidths}
                onResizeStart={handleResizeStart}
              />
            </div>

            {/* Table Body */}
            <div className="relative" role="rowgroup">
              {items && items.length > 0 ? (
                <>
                  <div role="table" aria-label={`Items in ${board.name}`}>
                    {items.map((item, index) => (
                      <BoardTableRow
                        key={item.id}
                        item={item}
                        columns={columns}
                        columnWidths={columnWidths}
                        isSelected={selectedItems.has(item.id)}
                        onSelect={handleSelectItem}
                        onOpenItemDetail={onOpenItemDetail}
                        index={index}
                        moveItem={() => {}} // Placeholder for drag functionality
                        onDragEnd={() => {}} // Placeholder for drag functionality
                      />
                    ))}
                  </div>
                </>
              ) : (
                <div
                  className="flex items-center justify-center h-32 text-muted-foreground"
                  role="status"
                  aria-live="polite"
                >
                  No items in this board yet.
                </div>
              )}

              {/* Add new row */}
              <BoardTableAddRow
                boardId={board.id}
                columns={columns}
                columnWidths={columnWidths}
              />
            </div>
          </div>

          {/* Ensure the table has a minimum width */}
          <div
            style={{
              width: `${Math.max(tableWidth, getTotalTableWidth() + 10)}px`, // Add 10px for selection column
              height: '1px'
            }}
            aria-hidden="true"
          />
        </ScrollArea>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will delete {selectedItems.size} selected items. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => bulkDeleteMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}