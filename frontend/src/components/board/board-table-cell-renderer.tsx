import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, CheckCircle2, Circle, Clock, Tag, User, Save, X, Check, CalendarIcon, Hash, Flag as Priority, UserPlus } from 'lucide-react';

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
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { boardService } from '@/services/board-service';
import { BoardColumn } from '@/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface BoardTableCellRendererProps {
  column: BoardColumn;
  value: any;
  itemId: string;
  onEdit?: (columnId: string, isEditing: boolean) => void;
  readOnly?: boolean;
}

export function BoardTableCellRenderer({ 
  column, 
  value,
  itemId,
  onEdit,
  readOnly = false
}: BoardTableCellRendererProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState<any>(value);
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Update edit value when prop value changes
  useEffect(() => {
    setEditValue(value);
  }, [value]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing) {
      const timeout = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        } else if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.select();
        }
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [isEditing]);

  const updateFieldMutation = useMutation({
    mutationFn: (newValue: any) => 
      boardService.updateItemField(itemId, column.id, newValue),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boardItems'] });
      setIsEditing(false);
      setIsSaving(false);
      setValidationError(null);
      onEdit?.(column.id, false);
      toast({
        title: "Field updated",
        description: `${column.name} has been updated successfully`,
      });
    },
    onError: (error: any) => {
      setIsSaving(false);
      setValidationError(error.message || 'Failed to update field');
      toast({
        title: "Update failed",
        description: error.message || 'Failed to update field',
        variant: "destructive",
      });
    }
  });

  const validateField = (newValue: any): string | null => {
    switch (column.type) {
      case 'text':
        if (column.settings?.required && (!newValue || newValue.trim() === '')) {
          return 'This field is required';
        }
        if (column.settings?.maxLength && newValue && newValue.length > column.settings.maxLength) {
          return `Text must be ${column.settings.maxLength} characters or less`;
        }
        if (column.settings?.minLength && newValue && newValue.length < column.settings.minLength) {
          return `Text must be at least ${column.settings.minLength} characters`;
        }
        break;
      case 'number':
        if (newValue !== null && newValue !== undefined && newValue !== '') {
          const num = parseFloat(newValue);
          if (isNaN(num)) {
            return 'Must be a valid number';
          }
          if (column.settings?.min !== undefined && num < column.settings.min) {
            return `Must be at least ${column.settings.min}`;
          }
          if (column.settings?.max !== undefined && num > column.settings.max) {
            return `Must be at most ${column.settings.max}`;
          }
        }
        break;
      case 'email':
        if (newValue && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newValue)) {
          return 'Must be a valid email address';
        }
        break;
      case 'url':
        if (newValue && !/^https?:\/\/.+/.test(newValue)) {
          return 'Must be a valid URL starting with http:// or https://';
        }
        break;
    }
    return null;
  };
  
  const handleSave = () => {
    const error = validateField(editValue);
    if (error) {
      setValidationError(error);
      return;
    }

    setIsSaving(true);
    setValidationError(null);
    updateFieldMutation.mutate(editValue);
  };
  
  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
    setValidationError(null);
    onEdit?.(column.id, false);
  };
  
  const handleStartEdit = () => {
    if (readOnly) return;
    setIsEditing(true);
    setValidationError(null);
    onEdit?.(column.id, true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };
  
  // Render different field types
  const renderFieldValue = () => {
    if (isEditing) {
      return renderEditField();
    }
    
    switch (column.type) {
      case 'text':
      case 'email':
      case 'url':
        return (
          <span 
            className={cn(
              "truncate cursor-pointer hover:bg-muted/50 rounded px-2 py-1 -mx-2 -my-1",
              !readOnly && "hover:bg-muted/30"
            )}
            title={value || 'Click to edit'}
          >
            {value || <span className="text-muted-foreground italic">Click to add {column.type}</span>}
          </span>
        );
        
      case 'multiline':
        return (
          <div 
            className={cn(
              "cursor-pointer hover:bg-muted/50 rounded px-2 py-1 -mx-2 -my-1 min-h-[2rem]",
              !readOnly && "hover:bg-muted/30"
            )}
            title={value || 'Click to edit'}
          >
            {value ? (
              <div className="whitespace-pre-wrap text-sm line-clamp-3">
                {value}
              </div>
            ) : (
              <span className="text-muted-foreground italic">Click to add description</span>
            )}
          </div>
        );
        
      case 'status':
        if (!value) {
          return (
            <span 
              className={cn(
                "text-muted-foreground italic cursor-pointer hover:bg-muted/50 rounded px-2 py-1 -mx-2 -my-1",
                !readOnly && "hover:bg-muted/30"
              )}
            >
              Set status
            </span>
          );
        }
        
        const statusColors: Record<string, string> = {
          'todo': 'bg-gray-100 text-gray-800 border-gray-300',
          'in-progress': 'bg-blue-100 text-blue-800 border-blue-300',
          'in progress': 'bg-blue-100 text-blue-800 border-blue-300',
          'done': 'bg-green-100 text-green-800 border-green-300',
          'completed': 'bg-green-100 text-green-800 border-green-300',
          'blocked': 'bg-red-100 text-red-800 border-red-300',
          'cancelled': 'bg-gray-100 text-gray-800 border-gray-300',
          'on-hold': 'bg-yellow-100 text-yellow-800 border-yellow-300',
          'on hold': 'bg-yellow-100 text-yellow-800 border-yellow-300',
        };
        
        return (
          <Badge 
            variant="outline" 
            className={cn(
              "cursor-pointer hover:opacity-80",
              statusColors[value.toLowerCase()] || 'bg-gray-100 text-gray-800 border-gray-300'
            )}
            title="Click to change status"
          >
            {value}
          </Badge>
        );

      case 'priority':
        if (!value) {
          return (
            <span 
              className={cn(
                "text-muted-foreground italic cursor-pointer hover:bg-muted/50 rounded px-2 py-1 -mx-2 -my-1",
                !readOnly && "hover:bg-muted/30"
              )}
            >
              Set priority
            </span>
          );
        }

        const priorityColors: Record<string, string> = {
          'low': 'bg-blue-100 text-blue-800 border-blue-300',
          'medium': 'bg-yellow-100 text-yellow-800 border-yellow-300',
          'high': 'bg-orange-100 text-orange-800 border-orange-300',
          'urgent': 'bg-red-100 text-red-800 border-red-300',
          'critical': 'bg-red-100 text-red-800 border-red-300',
        };

        return (
          <Badge 
            variant="outline" 
            className={cn(
              "cursor-pointer hover:opacity-80",
              priorityColors[value.toLowerCase()] || 'bg-gray-100 text-gray-800 border-gray-300'
            )}
            title="Click to change priority"
          >
            <Priority className="h-3 w-3 mr-1" />
            {value}
          </Badge>
        );
        
      case 'people':
        if (!value || !value.length) {
          return (
            <span 
              className={cn(
                "text-muted-foreground italic cursor-pointer hover:bg-muted/50 rounded px-2 py-1 -mx-2 -my-1",
                !readOnly && "hover:bg-muted/30"
              )}
            >
              Assign people
            </span>
          );
        }
        
        return (
          <div 
            className="flex -space-x-2 overflow-hidden cursor-pointer hover:opacity-80"
            title={`Assigned to: ${value.map((p: any) => p.name || p.email).join(', ')}`}
          >
            {value.slice(0, 3).map((person: any, index: number) => (
              <Avatar key={person.id || index} className="h-6 w-6 border-2 border-background">
                <AvatarImage src={person.avatarUrl} alt={person.name || person.email} />
                <AvatarFallback className="text-xs">
                  {(person.name || person.email).split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ))}
            {value.length > 3 && (
              <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                <span className="text-xs font-medium">+{value.length - 3}</span>
              </div>
            )}
          </div>
        );
        
      case 'date':
        if (!value) {
          return (
            <span 
              className={cn(
                "text-muted-foreground italic cursor-pointer hover:bg-muted/50 rounded px-2 py-1 -mx-2 -my-1",
                !readOnly && "hover:bg-muted/30"
              )}
            >
              Set date
            </span>
          );
        }
        
        const date = new Date(value);
        const isOverdue = date < new Date() && !['done', 'completed'].includes(
          // Get status from other columns if available
          ''
        );
        
        return (
          <div 
            className={cn(
              "flex items-center cursor-pointer hover:bg-muted/50 rounded px-2 py-1 -mx-2 -my-1",
              isOverdue && "text-red-600",
              !readOnly && "hover:bg-muted/30"
            )}
            title={`${column.name}: ${format(date, 'PPP')}`}
          >
            <CalendarIcon className="h-4 w-4 mr-2 text-muted-foreground" />
            <span>{format(date, 'MMM d, yyyy')}</span>
          </div>
        );
        
      case 'tags':
        if (!value || !value.length) {
          return (
            <span 
              className={cn(
                "text-muted-foreground italic cursor-pointer hover:bg-muted/50 rounded px-2 py-1 -mx-2 -my-1",
                !readOnly && "hover:bg-muted/30"
              )}
            >
              Add tags
            </span>
          );
        }
        
        return (
          <div 
            className="flex flex-wrap gap-1 cursor-pointer hover:opacity-80"
            title="Click to edit tags"
          >
            {value.slice(0, 3).map((tag: string, index: number) => (
              <Badge key={index} variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 text-xs">
                {tag}
              </Badge>
            ))}
            {value.length > 3 && (
              <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-300 text-xs">
                +{value.length - 3}
              </Badge>
            )}
          </div>
        );
        
      case 'number':
        return (
          <span 
            className={cn(
              "cursor-pointer hover:bg-muted/50 rounded px-2 py-1 -mx-2 -my-1",
              !readOnly && "hover:bg-muted/30"
            )}
            title={value !== null && value !== undefined ? String(value) : 'Click to set number'}
          >
            {value !== null && value !== undefined ? (
              <div className="flex items-center">
                <Hash className="h-4 w-4 mr-1 text-muted-foreground" />
                <span>{value}</span>
                {column.settings?.unit && <span className="text-muted-foreground ml-1">{column.settings.unit}</span>}
              </div>
            ) : (
              <span className="text-muted-foreground italic">Set number</span>
            )}
          </span>
        );

      case 'checkbox':
        return (
          <div 
            className="flex items-center cursor-pointer hover:bg-muted/50 rounded px-2 py-1 -mx-2 -my-1"
            onClick={() => !readOnly && handleSave()}
          >
            {value ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="ml-2 text-sm">
              {value ? 'Completed' : 'Not completed'}
            </span>
          </div>
        );
        
      default:
        return <span className="text-muted-foreground">Unsupported field type: {column.type}</span>;
    }
  };
  
  // Render edit field based on type
  const renderEditField = () => {
    const commonInputProps = {
      onKeyDown: handleKeyDown,
      autoFocus: true,
      disabled: isSaving,
    };

    switch (column.type) {
      case 'text':
      case 'email':
      case 'url':
        return (
          <div className="flex flex-col gap-2">
            <Input
              ref={inputRef}
              type={column.type === 'email' ? 'email' : column.type === 'url' ? 'url' : 'text'}
              value={editValue || ''}
              onChange={(e) => setEditValue(e.target.value)}
              className={cn("h-8", validationError && "border-red-500")}
              placeholder={`Enter ${column.name.toLowerCase()}`}
              {...commonInputProps}
            />
            {validationError && (
              <p className="text-sm text-red-600">{validationError}</p>
            )}
            <div className="flex gap-1">
              <Button 
                size="sm" 
                className="h-7" 
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? <Clock className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                className="h-7" 
                onClick={handleCancel}
                disabled={isSaving}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        );

      case 'multiline':
        return (
          <div className="flex flex-col gap-2">
            <Textarea
              ref={textareaRef}
              value={editValue || ''}
              onChange={(e) => setEditValue(e.target.value)}
              className={cn("min-h-[80px] resize-none", validationError && "border-red-500")}
              placeholder={`Enter ${column.name.toLowerCase()}`}
              disabled={isSaving}
            />
            {validationError && (
              <p className="text-sm text-red-600">{validationError}</p>
            )}
            <div className="flex gap-1">
              <Button 
                size="sm" 
                className="h-7" 
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? <Clock className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                className="h-7" 
                onClick={handleCancel}
                disabled={isSaving}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        );
        
      case 'status':
        const statusOptions = column.settings?.options || [
          'Todo', 'In Progress', 'Done', 'Blocked'
        ];
        
        return (
          <Select 
            value={editValue || ''} 
            onValueChange={(value) => {
              setEditValue(value);
              // Auto-save for status changes
              setTimeout(() => {
                setIsSaving(true);
                updateFieldMutation.mutate(value);
              }, 100);
            }}
            onOpenChange={(open) => !open && !isSaving && handleCancel()}
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
        );

      case 'priority':
        const priorityOptions = column.settings?.options || [
          'Low', 'Medium', 'High', 'Urgent'
        ];
        
        return (
          <Select 
            value={editValue || ''} 
            onValueChange={(value) => {
              setEditValue(value);
              // Auto-save for priority changes
              setTimeout(() => {
                setIsSaving(true);
                updateFieldMutation.mutate(value);
              }, 100);
            }}
            onOpenChange={(open) => !open && !isSaving && handleCancel()}
          >
            <SelectTrigger className="h-8 w-[180px]">
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>
            <SelectContent>
              {priorityOptions.map((option: string) => (
                <SelectItem key={option} value={option}>
                  <div className="flex items-center">
                    <Priority className="h-3 w-3 mr-2" />
                    {option}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'number':
        return (
          <div className="flex flex-col gap-2">
            <div className="flex gap-1">
              <Input
                ref={inputRef}
                type="number"
                value={editValue !== null && editValue !== undefined ? editValue : ''}
                onChange={(e) => setEditValue(e.target.value === '' ? null : parseFloat(e.target.value))}
                className={cn("h-8", validationError && "border-red-500")}
                placeholder="Enter number"
                step={column.settings?.step || 'any'}
                min={column.settings?.min}
                max={column.settings?.max}
                {...commonInputProps}
              />
              {column.settings?.unit && (
                <div className="flex items-center px-2 bg-muted rounded text-sm text-muted-foreground">
                  {column.settings.unit}
                </div>
              )}
            </div>
            {validationError && (
              <p className="text-sm text-red-600">{validationError}</p>
            )}
            <div className="flex gap-1">
              <Button 
                size="sm" 
                className="h-7" 
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? <Clock className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                className="h-7" 
                onClick={handleCancel}
                disabled={isSaving}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        );

      case 'date':
        return (
          <Popover open={true} onOpenChange={(open) => !open && handleCancel()}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-8 w-[200px] justify-start">
                <CalendarIcon className="h-4 w-4 mr-2" />
                {editValue ? format(new Date(editValue), 'MMM d, yyyy') : 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={editValue ? new Date(editValue) : undefined}
                onSelect={(date) => {
                  if (date) {
                    setEditValue(date.toISOString());
                    setTimeout(() => {
                      setIsSaving(true);
                      updateFieldMutation.mutate(date.toISOString());
                    }, 100);
                  }
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        );

      case 'tags':
        return (
          <div className="flex flex-col gap-2">
            <Input
              ref={inputRef}
              value={Array.isArray(editValue) ? editValue.join(', ') : (editValue || '')}
              onChange={(e) => {
                const tags = e.target.value.split(',').map(tag => tag.trim()).filter(Boolean);
                setEditValue(tags);
              }}
              className="h-8"
              placeholder="Enter tags separated by commas"
              {...commonInputProps}
            />
            <div className="flex gap-1">
              <Button 
                size="sm" 
                className="h-7" 
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? <Clock className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                className="h-7" 
                onClick={handleCancel}
                disabled={isSaving}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        );
        
      default:
        return <span>Editing not supported for this field type</span>;
    }
  };
  
  return (
    <div 
      className="w-full h-full min-h-[32px] flex items-center"
      onDoubleClick={handleStartEdit}
      onClick={column.type === 'checkbox' ? () => {
        setEditValue(!value);
        setTimeout(() => {
          setIsSaving(true);
          updateFieldMutation.mutate(!value);
        }, 100);
      } : undefined}
    >
      {renderFieldValue()}
    </div>
  );
}