import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BoardTableColumn } from '@/components/board/board-table-column';
import { boardService } from '@/services/board-service';
import { BoardColumn } from '@/types';
import { useToast } from '@/hooks/use-toast';

interface BoardTableAddRowProps {
  boardId: string;
  columns: BoardColumn[];
  columnWidths: Record<string, number>;
}

export function BoardTableAddRow({ 
  boardId, 
  columns,
  columnWidths 
}: BoardTableAddRowProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [itemName, setItemName] = useState('');
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const addItemMutation = useMutation({
    mutationFn: (name: string) => 
      boardService.createBoardItem(boardId, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boardItems', boardId] });
      setItemName('');
      setIsAdding(false);
      toast({
        title: "Item created",
        description: "New item has been added successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create new item",
        variant: "destructive",
      });
    }
  });
  
  const handleAddItem = () => {
    if (itemName.trim()) {
      addItemMutation.mutate(itemName.trim());
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddItem();
    } else if (e.key === 'Escape') {
      setIsAdding(false);
      setItemName('');
    }
  };
  
  if (!isAdding) {
    return (
      <div className="flex border-b hover:bg-muted/30 transition-colors">
        {/* Empty checkbox cell */}
        <div className="p-2 border-r w-10" />
        
        <div 
          className="p-2 flex items-center border-r"
          style={{ width: columnWidths['name'] || 250 }}
        >
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-muted-foreground"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Item
          </Button>
        </div>
        
        {/* Empty cells for other columns */}
        {columns.map((column) => (
          <div 
            key={column.id}
            className="p-2 border-r"
            style={{ width: columnWidths[column.id] || 200 }}
          />
        ))}
        
        {/* Empty column for add column button alignment */}
        <div className="p-2 border-r flex-shrink-0" />
      </div>
    );
  }
  
  return (
    <div className="flex border-b bg-muted/30">
      {/* Empty checkbox cell */}
      <div className="p-2 border-r w-10" />
      
      <BoardTableColumn 
        column={{ id: 'name', boardId, name: 'Item', type: 'text', settings: {}, position: 0 }}
        width={columnWidths['name'] || 250}
      >
        <div className="flex gap-2">
          <Input
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            placeholder="Enter item name"
            className="h-8"
            autoFocus
            onKeyDown={handleKeyDown}
          />
          <div className="flex gap-1">
            <Button 
              size="sm" 
              className="h-8" 
              onClick={handleAddItem}
              disabled={!itemName.trim() || addItemMutation.isPending}
            >
              Add
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="h-8" 
              onClick={() => {
                setIsAdding(false);
                setItemName('');
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </BoardTableColumn>
      
      {/* Empty cells for other columns */}
      {columns.map((column) => (
        <BoardTableColumn 
          key={column.id}
          column={column}
          width={columnWidths[column.id] || 200}
        >
          <span className="text-muted-foreground text-sm">Will be empty</span>
        </BoardTableColumn>
      ))}
      
      {/* Empty column for add column button alignment */}
      <div className="p-2 border-r flex-shrink-0" />
    </div>
  );
}