import { useRef } from 'react';
import { useDrop } from 'react-dnd';
import { ItemTypes, DragItem } from './dnd-types';
import { cn } from '@/lib/utils';

interface StatusDropTargetProps {
  statusId: string;
  onItemDrop: (itemId: string, statusId: string) => void;
  children: React.ReactNode;
  className?: string;
}

export function StatusDropTarget({ 
  statusId, 
  onItemDrop, 
  children, 
  className 
}: StatusDropTargetProps) {
  const ref = useRef<HTMLDivElement>(null);
  
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ItemTypes.BOARD_ITEM,
    drop: (item: DragItem) => {
      onItemDrop(item.id, statusId);
      return { statusId };
    },
    canDrop: (item: DragItem) => {
      // Prevent dropping if the item is already in this status column
      return item.columnId !== statusId;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });
  
  drop(ref);
  
  return (
    <div 
      ref={ref} 
      className={cn(
        className,
        isOver && canDrop && "bg-primary/10 border-primary border-2 rounded-md",
        isOver && !canDrop && "bg-destructive/10 border-destructive border-2 rounded-md",
      )}
    >
      {children}
    </div>
  );
}