import React, { useRef, useState, useEffect } from 'react';
import { useDrop } from 'react-dnd';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ArrowDown, ArrowUp, Target, CheckCircle2, XCircle } from 'lucide-react';
import { ItemTypes, DragItem } from './dnd-types';
import { cn } from '@/lib/utils';

interface DropZoneProps {
  onDrop: (item: DragItem, position?: 'before' | 'after' | 'into') => void;
  canDrop?: (item: DragItem) => boolean;
  dropPosition?: 'before' | 'after' | 'into';
  className?: string;
  children?: React.ReactNode;
  showDropIndicator?: boolean;
  dropMessage?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'status' | 'reorder' | 'section';
}

export function EnhancedDropZone({
  onDrop,
  canDrop = () => true,
  dropPosition = 'into',
  className,
  children,
  showDropIndicator = true,
  dropMessage,
  size = 'md',
  variant = 'reorder'
}: DropZoneProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [dropPreview, setDropPreview] = useState<{ x: number; y: number } | null>(null);

  const [{ isOver, isOverCurrent, canDropHere, draggedItem }, drop] = useDrop({
    accept: ItemTypes.BOARD_ITEM,
    drop: (item: DragItem) => {
      onDrop(item, dropPosition);
      return { dropPosition };
    },
    canDrop: canDrop,
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      isOverCurrent: monitor.isOver({ shallow: true }),
      canDropHere: monitor.canDrop(),
      draggedItem: monitor.getItem(),
    }),
  });

  // Track mouse position for drop preview
  useEffect(() => {
    if (!isOver || !ref.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = ref.current?.getBoundingClientRect();
      if (rect) {
        setDropPreview({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
    };

    const handleMouseLeave = () => {
      setDropPreview(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [isOver]);

  drop(ref);

  const sizeClasses = {
    sm: 'min-h-[40px] p-2',
    md: 'min-h-[60px] p-4',
    lg: 'min-h-[80px] p-6',
  };

  const getDropIndicatorStyle = () => {
    switch (variant) {
      case 'status':
        return isOver && canDropHere
          ? 'bg-blue-50 border-blue-300 border-2 border-dashed'
          : isOver && !canDropHere
          ? 'bg-red-50 border-red-300 border-2 border-dashed'
          : 'border-2 border-transparent';
      case 'section':
        return isOver && canDropHere
          ? 'bg-green-50 border-green-300 border-2 border-dashed'
          : isOver && !canDropHere
          ? 'bg-red-50 border-red-300 border-2 border-dashed'
          : 'border-2 border-transparent';
      default:
        return isOver && canDropHere
          ? 'bg-primary/10 border-primary border-2 border-dashed'
          : isOver && !canDropHere
          ? 'bg-destructive/10 border-destructive border-2 border-dashed'
          : 'border-2 border-transparent';
    }
  };

  const getDropMessage = () => {
    if (dropMessage) return dropMessage;
    
    if (!canDropHere && isOver) {
      return 'Cannot drop here';
    }
    
    switch (variant) {
      case 'status':
        return `Move to ${dropPosition === 'into' ? 'this status' : dropPosition}`;
      case 'section':
        return `Drop to add to section`;
      default:
        return `Drop to ${dropPosition === 'into' ? 'move here' : `place ${dropPosition}`}`;
    }
  };

  const getDropIcon = () => {
    if (!canDropHere && isOver) {
      return <XCircle className="h-5 w-5 text-destructive" />;
    }
    
    if (canDropHere && isOver) {
      return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    }
    
    switch (dropPosition) {
      case 'before':
        return <ArrowUp className="h-4 w-4 text-muted-foreground" />;
      case 'after':
        return <ArrowDown className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Target className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div
      ref={ref}
      className={cn(
        'relative transition-all duration-200 rounded-md',
        sizeClasses[size],
        getDropIndicatorStyle(),
        className
      )}
    >
      {children}

      {/* Drop overlay with feedback */}
      <AnimatePresence>
        {showDropIndicator && isOverCurrent && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={cn(
              'absolute inset-0 rounded-md flex items-center justify-center',
              'backdrop-blur-sm',
              canDropHere
                ? 'bg-primary/20 text-primary-foreground'
                : 'bg-destructive/20 text-destructive-foreground'
            )}
          >
            <motion.div
              initial={{ y: 10 }}
              animate={{ y: 0 }}
              className="flex flex-col items-center gap-2 text-center"
            >
              <motion.div
                animate={{ 
                  scale: canDropHere ? [1, 1.1, 1] : [1, 0.9, 1],
                  rotate: canDropHere ? [0, 5, -5, 0] : [0, -5, 5, 0]
                }}
                transition={{ 
                  duration: 0.5, 
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                {getDropIcon()}
              </motion.div>
              <span className="text-sm font-medium">
                {getDropMessage()}
              </span>
              {draggedItem && (
                <span className="text-xs opacity-75">
                  "Item {draggedItem.id}"
                </span>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drop position indicator for reordering */}
      {dropPosition !== 'into' && isOverCurrent && canDropHere && (
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          exit={{ opacity: 0, scaleX: 0 }}
          className={cn(
            'absolute left-0 right-0 h-0.5 bg-primary z-10',
            dropPosition === 'before' ? 'top-0 -translate-y-0.5' : 'bottom-0 translate-y-0.5'
          )}
        />
      )}

      {/* Cursor position indicator */}
      {dropPreview && isOverCurrent && canDropHere && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            position: 'absolute',
            left: dropPreview.x - 8,
            top: dropPreview.y - 8,
            pointerEvents: 'none',
            zIndex: 50,
          }}
          className="w-4 h-4 rounded-full bg-primary shadow-lg"
        />
      )}
    </div>
  );
}

// Enhanced drop zone for specific use cases

interface StatusDropZoneProps {
  statusId: string;
  statusName: string;
  onItemDrop: (itemId: string, statusId: string) => void;
  children: React.ReactNode;
  className?: string;
  itemCount?: number;
}

export function StatusDropZone({
  statusId,
  statusName,
  onItemDrop,
  children,
  className,
  itemCount = 0
}: StatusDropZoneProps) {
  return (
    <EnhancedDropZone
      onDrop={(item) => onItemDrop(item.id, statusId)}
      canDrop={(item) => item.columnId !== statusId}
      variant="status"
      dropMessage={`Move to ${statusName}`}
      className={className}
    >
      {children}
      
      {/* Empty state indicator */}
      {itemCount === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <Plus className="h-8 w-8 mb-2 opacity-50" />
          <span className="text-sm">Drop items here</span>
        </div>
      )}
    </EnhancedDropZone>
  );
}

interface ReorderDropZoneProps {
  index: number;
  position: 'before' | 'after';
  onReorder: (dragIndex: number, hoverIndex: number, position: 'before' | 'after') => void;
  className?: string;
  showWhenActive?: boolean;
}

export function ReorderDropZone({
  index,
  position,
  onReorder,
  className,
  showWhenActive = true
}: ReorderDropZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ 
        height: (isDragActive && showWhenActive) ? 'auto' : 0,
        opacity: (isDragActive && showWhenActive) ? 1 : 0
      }}
      className="overflow-hidden"
    >
      <EnhancedDropZone
        onDrop={(item) => onReorder(item.index, index, position)}
        dropPosition={position}
        variant="reorder"
        size="sm"
        className={cn('mx-2 my-1', className)}
        showDropIndicator={true}
      />
    </motion.div>
  );
}

// Hook for enhanced drag and drop functionality
export function useDragDropFeedback() {
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    draggedItem: any;
    dropTargets: string[];
  }>({
    isDragging: false,
    draggedItem: null,
    dropTargets: [],
  });

  const startDrag = (item: any, availableTargets: string[] = []) => {
    setDragState({
      isDragging: true,
      draggedItem: item,
      dropTargets: availableTargets,
    });
  };

  const endDrag = () => {
    setDragState({
      isDragging: false,
      draggedItem: null,
      dropTargets: [],
    });
  };

  return {
    dragState,
    startDrag,
    endDrag,
  };
} 