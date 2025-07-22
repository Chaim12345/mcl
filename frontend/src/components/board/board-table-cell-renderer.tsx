import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, CheckCircle2, Circle, Clock, Tag, User } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { boardService } from '@/services/board-service';
import { BoardColumn } from '@/types';

interface BoardTableCellRendererProps {
  column: BoardColumn;
  value: any;
  itemId: string;
}

export function BoardTableCellRenderer({ 
  column, 
  value,
  itemId 
}: BoardTableCellRendererProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState<any>(value);
  const queryClient = useQueryClient();
  
  const updateFieldMutation = useMutation({
    mutationFn: (newValue: any) => 
      boardService.updateItemField(itemId, column.id, newValue),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boardItems'] });
      setIsEditing(false);
    },
  });
  
  const handleSave = () => {
    updateFieldMutation.mutate(editValue);
  };
  
  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };
  
  const handleDoubleClick = () => {
    setIsEditing(true);
  };
  
  // Render different field types
  const renderFieldValue = () => {
    if (isEditing) {
      return renderEditField();
    }
    
    switch (column.type) {
      case 'text':
        return <span className="truncate">{value || '-'}</span>;
        
      case 'status':
        if (!value) return <span className="text-muted-foreground">No status</span>;
        
        const statusColors: Record<string, string> = {
          'todo': 'bg-gray-200 text-gray-800',
          'in-progress': 'bg-blue-200 text-blue-800',
          'done': 'bg-green-200 text-green-800',
          'blocked': 'bg-red-200 text-red-800',
        };
        
        return (
          <Badge 
            variant="outline" 
            className={statusColors[value.toLowerCase()] || 'bg-gray-200 text-gray-800'}
          >
            {value}
          </Badge>
        );
        
      case 'people':
        if (!value || !value.length) return <span className="text-muted-foreground">Unassigned</span>;
        
        return (
          <div className="flex -space-x-2 overflow-hidden">
            {value.map((person: any, index: number) => (
              <Avatar key={person.id || index} className="h-6 w-6 border-2 border-background">
                <AvatarImage src={person.avatarUrl} alt={person.name} />
                <AvatarFallback className="text-xs">
                  {person.name.split(' ').map((n: string) => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
        );
        
      case 'date':
        if (!value) return <span className="text-muted-foreground">No date</span>;
        
        return (
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
            <span>{new Date(value).toLocaleDateString()}</span>
          </div>
        );
        
      case 'tags':
        if (!value || !value.length) return <span className="text-muted-foreground">No tags</span>;
        
        return (
          <div className="flex flex-wrap gap-1">
            {value.map((tag: string, index: number) => (
              <Badge key={index} variant="outline" className="bg-gray-100">
                {tag}
              </Badge>
            ))}
          </div>
        );
        
      case 'number':
        return <span>{value !== null && value !== undefined ? value : '-'}</span>;
        
      default:
        return <span className="text-muted-foreground">Unsupported field type</span>;
    }
  };
  
  // Render edit field based on type
  const renderEditField = () => {
    switch (column.type) {
      case 'text':
        return (
          <div className="flex gap-2">
            <Input
              value={editValue || ''}
              onChange={(e) => setEditValue(e.target.value)}
              className="h-8"
              autoFocus
            />
            <div className="flex gap-1">
              <Button size="sm" className="h-8" onClick={handleSave}>Save</Button>
              <Button size="sm" variant="outline" className="h-8" onClick={handleCancel}>Cancel</Button>
            </div>
          </div>
        );
        
      case 'status':
        const statusOptions = column.settings.options || [
          'Todo', 'In Progress', 'Done', 'Blocked'
        ];
        
        return (
          <div className="flex gap-2">
            <Select 
              value={editValue || ''} 
              onValueChange={setEditValue}
              onOpenChange={(open) => !open && handleSave()}
            >
              <SelectTrigger className="h-8 w-[180px]">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option: string) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
        
      // Add other field type editors as needed
      
      default:
        return <span>Editing not supported for this field type</span>;
    }
  };
  
  return (
    <div 
      className="w-full h-full"
      onDoubleClick={handleDoubleClick}
    >
      {renderFieldValue()}
    </div>
  );
}