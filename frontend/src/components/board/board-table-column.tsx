import React from 'react';
import { BoardColumn as BoardColumnType } from '@/types';
import { cn } from '@/lib/utils';

interface BoardTableColumnProps {
  column: BoardColumnType;
  width: number;
  children: React.ReactNode;
  className?: string;
}

export function BoardTableColumn({ 
  column, 
  width, 
  children,
  className 
}: BoardTableColumnProps) {
  return (
    <div 
      className={cn("p-2 border-r", className)}
      style={{ width: width || 200 }}
    >
      {children}
    </div>
  );
}