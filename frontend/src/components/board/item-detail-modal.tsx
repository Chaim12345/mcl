import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Save, Trash2, Copy, Calendar, User, Tag, Clock, AlertCircle } from 'lucide-react';
import { CommentThread } from '@/components/comments/comment-thread';
import { ActivityTimeline } from '@/components/activity/activity-timeline';
import { UserPresence } from '@/components/collaboration';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { boardService } from '@/services/board-service';
import { BoardColumn, BoardItem, User as UserType } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { BoardTableCellRenderer } from '@/components/board/board-table-cell-renderer';
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
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';

interface ItemDetailModalProps {
  itemId: string | null;
  boardId: string;
  onClose: () => void;
}

export function ItemDetailModal({ itemId, boardId, onClose }: ItemDetailModalProps) {
  const [itemName, setItemName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({});
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch item details
  const { data: item, isLoading: isLoadingItem } = useQuery({
    queryKey: ['boardItem', itemId],
    queryFn: () => (itemId ? boardService.getBoardItem(itemId) : null),
    enabled: !!itemId,
  });

  // Fetch board columns
  const { data: columns, isLoading: isLoadingColumns } = useQuery({
    queryKey: ['boardColumns', boardId],
    queryFn: () => boardService.getBoardColumns(boardId),
    enabled: !!boardId,
  });

  // Fetch workspace members for people fields
  const { data: workspaceMembers } = useQuery({
    queryKey: ['workspaceMembers', boardId],
    queryFn: async () => {
      const board = await boardService.getBoard(boardId);
      // This is a simplified approach - in a real app, you'd fetch members from the workspace
      return [
        { id: '1', email: 'john@example.com', firstName: 'John', lastName: 'Doe', avatarUrl: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: '2', email: 'jane@example.com', firstName: 'Jane', lastName: 'Smith', avatarUrl: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: '3', email: 'alex@example.com', firstName: 'Alex', lastName: 'Johnson', avatarUrl: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      ] as UserType[];
    },
    enabled: !!boardId,
  });

  // Update item name when data is loaded
  useEffect(() => {
    if (item) {
      setItemName(item.name);
      
      // Initialize field values
      const values: Record<string, any> = {};
      item.fieldValues.forEach(fv => {
        values[fv.columnId] = fv.value;
      });
      setFieldValues(values);
    }
  }, [item]);

  // Update item mutation
  const updateItemMutation = useMutation({
    mutationFn: (name: string) => 
      boardService.updateBoardItem(itemId!, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boardItems'] });
      queryClient.invalidateQueries({ queryKey: ['boardItem', itemId] });
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
      if (item) setItemName(item.name);
      setIsEditingName(false);
    }
  });

  // Update field value mutation
  const updateFieldMutation = useMutation({
    mutationFn: ({ columnId, value }: { columnId: string, value: any }) => 
      boardService.updateItemField(itemId!, columnId, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boardItems'] });
      queryClient.invalidateQueries({ queryKey: ['boardItem', itemId] });
      setEditingField(null);
      toast({
        title: "Field updated",
        description: "Field value has been updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update field value",
        variant: "destructive",
      });
      setEditingField(null);
    }
  });

  // Delete item mutation
  const deleteItemMutation = useMutation({
    mutationFn: () => boardService.deleteBoardItem(itemId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boardItems'] });
      toast({
        title: "Item deleted",
        description: "Item has been deleted successfully",
      });
      onClose();
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
    mutationFn: () => {
      if (!item) return Promise.reject("No item to duplicate");
      return boardService.createBoardItem(boardId, {
        name: `${item.name} (Copy)`,
        fieldValues: item.fieldValues.map(fv => ({
          columnId: fv.columnId,
          value: fv.value
        }))
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boardItems'] });
      toast({
        title: "Item duplicated",
        description: "Item has been duplicated successfully",
      });
      onClose();
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
    if (itemName.trim() && item && itemName.trim() !== item.name) {
      updateItemMutation.mutate(itemName);
    } else {
      setIsEditingName(false);
      if (item) setItemName(item.name);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveName();
    } else if (e.key === 'Escape') {
      setIsEditingName(false);
      if (item) setItemName(item.name);
    }
  };

  const handleFieldEdit = (columnId: string) => {
    setEditingField(columnId);
  };

  const handleFieldSave = (columnId: string, value: any) => {
    setFieldValues(prev => ({ ...prev, [columnId]: value }));
    updateFieldMutation.mutate({ columnId, value });
  };

  const handleFieldCancel = () => {
    setEditingField(null);
  };

  // Find field value for a specific column
  const getFieldValue = (columnId: string) => {
    return fieldValues[columnId] || null;
  };

  const isLoading = isLoadingItem || isLoadingColumns;

  // Render field value based on type
  const renderFieldValue = (column: BoardColumn) => {
    const value = getFieldValue(column.id);
    const isEditing = editingField === column.id;
    
    switch (column.type) {
      case 'text':
        return isEditing ? (
          <div className="flex flex-col gap-2">
            <Input
              value={value || ''}
              onChange={(e) => setFieldValues(prev => ({ ...prev, [column.id]: e.target.value }))}
              className="w-full"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <Button 
                size="sm" 
                onClick={() => handleFieldSave(column.id, fieldValues[column.id])}
              >
                Save
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleFieldCancel}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div 
            className="p-2 min-h-[40px] hover:bg-muted/50 rounded cursor-pointer flex items-center"
            onClick={() => handleFieldEdit(column.id)}
          >
            {value || <span className="text-muted-foreground">Click to add text</span>}
          </div>
        );
        
      case 'status':
        const statusOptions = column.settings?.options || ['Todo', 'In Progress', 'Done', 'Blocked'];
        const statusColors: Record<string, string> = {
          'todo': 'bg-gray-200 text-gray-800',
          'in progress': 'bg-blue-200 text-blue-800',
          'done': 'bg-green-200 text-green-800',
          'blocked': 'bg-red-200 text-red-800',
        };
        
        return isEditing ? (
          <div className="flex flex-col gap-2">
            <Select 
              value={value || ''} 
              onValueChange={(newValue) => handleFieldSave(column.id, newValue)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option: string) => (
                  <SelectItem key={option} value={option}>
                    <div className="flex items-center">
                      <Badge 
                        variant="outline" 
                        className={statusColors[option.toLowerCase()] || 'bg-gray-200 text-gray-800'}
                      >
                        {option}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div 
            className="p-2 min-h-[40px] hover:bg-muted/50 rounded cursor-pointer flex items-center"
            onClick={() => handleFieldEdit(column.id)}
          >
            {value ? (
              <Badge 
                variant="outline" 
                className={statusColors[value.toLowerCase()] || 'bg-gray-200 text-gray-800'}
              >
                {value}
              </Badge>
            ) : (
              <span className="text-muted-foreground">Set status</span>
            )}
          </div>
        );
        
      case 'people':
        return isEditing ? (
          <div className="flex flex-col gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <User className="mr-2 h-4 w-4" />
                  {value && value.length > 0 
                    ? `${value.length} assigned` 
                    : "Assign people"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search people..." />
                  <CommandList>
                    <CommandEmpty>No results found.</CommandEmpty>
                    <CommandGroup>
                      {workspaceMembers?.map((member) => {
                        const isSelected = value?.some((v: any) => v.id === member.id);
                        return (
                          <CommandItem
                            key={member.id}
                            onSelect={() => {
                              let newValue = [...(value || [])];
                              if (isSelected) {
                                newValue = newValue.filter((v: any) => v.id !== member.id);
                              } else {
                                newValue.push({
                                  id: member.id,
                                  name: `${member.firstName} ${member.lastName}`,
                                  avatarUrl: member.avatarUrl
                                });
                              }
                              handleFieldSave(column.id, newValue);
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={member.avatarUrl} />
                                <AvatarFallback>
                                  {member.firstName?.[0]}{member.lastName?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <span>{member.firstName} {member.lastName}</span>
                            </div>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        ) : (
          <div 
            className="p-2 min-h-[40px] hover:bg-muted/50 rounded cursor-pointer flex items-center"
            onClick={() => handleFieldEdit(column.id)}
          >
            {value && value.length > 0 ? (
              <div className="flex -space-x-2 overflow-hidden">
                {value.map((person: any, index: number) => (
                  <Avatar key={person.id || index} className="h-8 w-8 border-2 border-background">
                    <AvatarImage src={person.avatarUrl} alt={person.name} />
                    <AvatarFallback className="text-xs">
                      {person.name.split(' ').map((n: string) => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
            ) : (
              <span className="text-muted-foreground flex items-center">
                <User className="h-4 w-4 mr-2" />
                Unassigned
              </span>
            )}
          </div>
        );
        
      case 'date':
        return isEditing ? (
          <div className="flex flex-col gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <Calendar className="mr-2 h-4 w-4" />
                  {value ? format(new Date(value), 'PPP') : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={value ? new Date(value) : undefined}
                  onSelect={(date) => {
                    handleFieldSave(column.id, date ? date.toISOString() : null);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        ) : (
          <div 
            className="p-2 min-h-[40px] hover:bg-muted/50 rounded cursor-pointer flex items-center"
            onClick={() => handleFieldEdit(column.id)}
          >
            {value ? (
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                <span>{format(new Date(value), 'PPP')}</span>
              </div>
            ) : (
              <span className="text-muted-foreground flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                No date set
              </span>
            )}
          </div>
        );
        
      case 'tags':
        return isEditing ? (
          <div className="flex flex-col gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <Tag className="mr-2 h-4 w-4" />
                  {value && value.length > 0 
                    ? `${value.length} tags` 
                    : "Add tags"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search tags..." />
                  <CommandList>
                    <CommandEmpty>No results found.</CommandEmpty>
                    <CommandGroup>
                      {(column.settings?.tagOptions || ['Bug', 'Feature', 'Improvement', 'Documentation']).map((tag: string) => {
                        const isSelected = value?.includes(tag);
                        return (
                          <CommandItem
                            key={tag}
                            onSelect={() => {
                              let newValue = [...(value || [])];
                              if (isSelected) {
                                newValue = newValue.filter((t) => t !== tag);
                              } else {
                                newValue.push(tag);
                              }
                              handleFieldSave(column.id, newValue);
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <Badge variant={isSelected ? "default" : "outline"}>
                                {tag}
                              </Badge>
                            </div>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        ) : (
          <div 
            className="p-2 min-h-[40px] hover:bg-muted/50 rounded cursor-pointer flex items-center"
            onClick={() => handleFieldEdit(column.id)}
          >
            {value && value.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {value.map((tag: string, index: number) => (
                  <Badge key={index} variant="outline" className="bg-gray-100">
                    {tag}
                  </Badge>
                ))}
              </div>
            ) : (
              <span className="text-muted-foreground flex items-center">
                <Tag className="h-4 w-4 mr-2" />
                No tags
              </span>
            )}
          </div>
        );
        
      case 'number':
        return isEditing ? (
          <div className="flex flex-col gap-2">
            <Input
              type="number"
              value={value || ''}
              onChange={(e) => setFieldValues(prev => ({ ...prev, [column.id]: parseFloat(e.target.value) || null }))}
              className="w-full"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <Button 
                size="sm" 
                onClick={() => handleFieldSave(column.id, fieldValues[column.id])}
              >
                Save
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleFieldCancel}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div 
            className="p-2 min-h-[40px] hover:bg-muted/50 rounded cursor-pointer flex items-center"
            onClick={() => handleFieldEdit(column.id)}
          >
            {value !== null && value !== undefined ? (
              <span>{value}</span>
            ) : (
              <span className="text-muted-foreground">Set number</span>
            )}
          </div>
        );
        
      default:
        return <span className="text-muted-foreground">Unsupported field type</span>;
    }
  };

  return (
    <>
      <Dialog open={!!itemId} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
          <DialogHeader className="flex flex-row items-center justify-between">
            <div className="flex-1">
              {isLoading ? (
                <Skeleton className="h-8 w-[300px]" />
              ) : isEditingName ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    className="text-lg font-semibold"
                    onKeyDown={handleKeyDown}
                    autoFocus
                  />
                  <Button size="sm" variant="ghost" onClick={handleSaveName}>
                    <Save className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <DialogTitle 
                    className="text-xl cursor-pointer hover:underline"
                    onClick={() => setIsEditingName(true)}
                  >
                    {item?.name}
                  </DialogTitle>
                  
                  {/* User presence indicator */}
                  <div className="ml-2">
                    <UserPresence boardId={boardId} />
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => duplicateItemMutation.mutate()}
                disabled={duplicateItemMutation.isPending}
              >
                <Copy className="h-4 w-4 mr-1" />
                Duplicate
              </Button>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => setIsDeleteDialogOpen(true)}
                disabled={deleteItemMutation.isPending}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          {isLoading ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-[400px] w-full" />
            </div>
          ) : (
            <Tabs defaultValue="fields" className="flex-1 flex flex-col">
              <TabsList className="grid grid-cols-3">
                <TabsTrigger value="fields">Fields</TabsTrigger>
                <TabsTrigger value="comments">Comments</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
              </TabsList>
              <TabsContent value="fields" className="flex-1 overflow-hidden">
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4 p-2">
                    {columns?.map((column) => (
                      <div key={column.id} className="space-y-1">
                        <div className="flex justify-between items-center">
                          <Label className="text-sm font-medium">{column.name}</Label>
                          <div className="flex items-center text-xs text-muted-foreground">
                            {column.type === 'text' && <span>Text</span>}
                            {column.type === 'status' && <span>Status</span>}
                            {column.type === 'people' && <span>People</span>}
                            {column.type === 'date' && <span>Date</span>}
                            {column.type === 'tags' && <span>Tags</span>}
                            {column.type === 'number' && <span>Number</span>}
                          </div>
                        </div>
                        <div className="border rounded-md">
                          {renderFieldValue(column)}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
              <TabsContent value="comments" className="flex-1 overflow-hidden">
                <div className="h-[400px]" data-item-id={itemId} data-board-id={boardId}>
                  {itemId && <CommentThread itemId={itemId} />}
                </div>
              </TabsContent>
              <TabsContent value="activity" className="flex-1 overflow-hidden">
                <div className="h-[400px]">
                  {itemId && <ActivityTimeline itemId={itemId} />}
                </div>
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter>
            <div className="text-xs text-muted-foreground">
              Created {item ? new Date(item.createdAt).toLocaleString() : ''}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this item?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the item
              and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                deleteItemMutation.mutate();
                setIsDeleteDialogOpen(false);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}