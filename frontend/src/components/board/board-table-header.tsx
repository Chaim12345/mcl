import { ChevronDown, ChevronUp, Plus, ArrowUpDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { BoardColumn } from '@/types';

interface BoardTableHeaderProps {
  columns: BoardColumn[];
  columnWidths: Record<string, number>;
  onResizeStart: (columnId: string, e: React.MouseEvent) => void;
}

export function BoardTableHeader({ 
  columns, 
  columnWidths,
  onResizeStart 
}: BoardTableHeaderProps) {
  return (
    <>
      {/* Item name column */}
      <div 
        className="flex items-center p-2 font-medium border-r"
        style={{ width: columnWidths['name'] || 250 }}
      >
        <span className="flex-1 truncate">Item</span>
        <div className="flex items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <ArrowUpDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Sort A-Z</DropdownMenuItem>
              <DropdownMenuItem>Sort Z-A</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Edit Column</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div 
            className="w-1 h-6 cursor-col-resize"
            onMouseDown={(e) => onResizeStart('name', e)}
          />
        </div>
      </div>
      
      {/* Dynamic columns */}
      {columns.map((column) => (
        <div 
          key={column.id}
          className="flex items-center p-2 font-medium border-r"
          style={{ width: columnWidths[column.id] || 200 }}
        >
          <span className="flex-1 truncate">{column.name}</span>
          <div className="flex items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <ArrowUpDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Sort Ascending</DropdownMenuItem>
                <DropdownMenuItem>Sort Descending</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Hide Column</DropdownMenuItem>
                <DropdownMenuItem>Edit Column</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <div 
              className="w-1 h-6 cursor-col-resize"
              onMouseDown={(e) => onResizeStart(column.id, e)}
            />
          </div>
        </div>
      ))}
      
      {/* Add column button */}
      <div className="flex items-center p-2 border-r">
        <Button variant="ghost" size="sm" className="h-7">
          <Plus className="h-4 w-4 mr-1" />
          Add Column
        </Button>
      </div>
    </>
  );
}