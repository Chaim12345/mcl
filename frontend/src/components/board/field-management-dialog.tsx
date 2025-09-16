import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  X, 
  GripVertical, 
  Settings, 
  Type, 
  Hash, 
  Calendar, 
  Users, 
  Tag, 
  Mail, 
  Link, 
  AlignLeft,
  CheckSquare,
  Flag as Priority,
  ToggleLeft,
  Save,
  Trash2
} from 'lucide-react';
// import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
// TODO: Install @hello-pangea/dnd dependency
const DragDropContext = ({ children }: any) => <div>{children}</div>;
const Droppable = ({ children }: any) => children({ droppableProps: {}, innerRef: () => {} });
const Draggable = ({ children }: any) => children({ draggableProps: {}, dragHandleProps: {}, innerRef: () => {} });

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// import { Separator } from '@/components/ui/separator';
// TODO: Create or import Separator component
const Separator = ({ className }: any) => <hr className={`border-gray-200 ${className}`} />;
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { useToast } from '@/hooks/use-toast';
import { boardService } from '@/services/board-service';
import { BoardColumn } from '@/types';
import { cn } from '@/lib/utils';

interface FieldType {
  id: BoardColumn['type'];
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  configurable: string[];
  defaultSettings: Record<string, any>;
}

const FIELD_TYPES: FieldType[] = [
  {
    id: 'text',
    label: 'Text',
    icon: Type,
    description: 'Single line text input',
    configurable: ['required', 'maxLength', 'minLength', 'placeholder'],
    defaultSettings: { maxLength: 255 }
  },
  {
    id: 'multiline',
    label: 'Long Text',
    icon: AlignLeft,
    description: 'Multi-line text area',
    configurable: ['required', 'maxLength', 'minLength', 'placeholder'],
    defaultSettings: { maxLength: 2000 }
  },
  {
    id: 'email',
    label: 'Email',
    icon: Mail,
    description: 'Email address input with validation',
    configurable: ['required'],
    defaultSettings: {}
  },
  {
    id: 'url',
    label: 'URL',
    icon: Link,
    description: 'Web URL input with validation',
    configurable: ['required'],
    defaultSettings: {}
  },
  {
    id: 'number',
    label: 'Number',
    icon: Hash,
    description: 'Numeric input with optional unit',
    configurable: ['required', 'min', 'max', 'step', 'unit'],
    defaultSettings: { step: 1 }
  },
  {
    id: 'checkbox',
    label: 'Checkbox',
    icon: CheckSquare,
    description: 'True/false checkbox',
    configurable: ['defaultValue'],
    defaultSettings: { defaultValue: false }
  },
  {
    id: 'status',
    label: 'Status',
    icon: ToggleLeft,
    description: 'Select from predefined status options',
    configurable: ['options', 'defaultValue'],
    defaultSettings: { 
      options: ['Todo', 'In Progress', 'Done'],
      defaultValue: 'Todo'
    }
  },
  {
    id: 'priority',
    label: 'Priority',
    icon: Priority,
    description: 'Priority level selection',
    configurable: ['options', 'defaultValue'],
    defaultSettings: { 
      options: ['Low', 'Medium', 'High', 'Urgent'],
      defaultValue: 'Medium'
    }
  },
  {
    id: 'date',
    label: 'Date',
    icon: Calendar,
    description: 'Date picker',
    configurable: ['required', 'defaultValue'],
    defaultSettings: {}
  },
  {
    id: 'people',
    label: 'People',
    icon: Users,
    description: 'User assignment field',
    configurable: ['multiple', 'required'],
    defaultSettings: { multiple: true }
  },
  {
    id: 'tags',
    label: 'Tags',
    icon: Tag,
    description: 'Comma-separated tags',
    configurable: ['maxTags', 'predefinedTags'],
    defaultSettings: { maxTags: 10 }
  }
];

interface FieldManagementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  boardId: string;
  columns: BoardColumn[];
}

export function FieldManagementDialog({
  isOpen,
  onClose,
  boardId,
  columns
}: FieldManagementDialogProps) {
  const [localColumns, setLocalColumns] = useState<BoardColumn[]>([]);
  const [activeTab, setActiveTab] = useState('fields');
  const [editingColumn, setEditingColumn] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Initialize local columns when dialog opens
  useEffect(() => {
    if (isOpen) {
      setLocalColumns([...columns]);
    }
  }, [isOpen, columns]);

  // Save columns mutation
  const saveColumnsMutation = useMutation({
    mutationFn: async (updatedColumns: BoardColumn[]) => {
      // Save all column changes
      const promises = updatedColumns.map(column => 
        boardService.updateBoardColumn(column.id, column)
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boardColumns', boardId] });
      toast({
        title: "Fields updated",
        description: "Board fields have been updated successfully",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "Failed to update board fields",
        variant: "destructive",
      });
    }
  });

  // Add new column mutation
  const addColumnMutation = useMutation({
    mutationFn: (newColumn: Omit<BoardColumn, 'id'>) => 
      boardService.createBoardColumn(boardId, newColumn),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['boardColumns', boardId] });
      setLocalColumns(prev => [...prev, data as BoardColumn]);
      toast({
        title: "Field added",
        description: "New field has been added successfully",
      });
    },
    onError: () => {
      toast({
        title: "Add failed",
        description: "Failed to add new field",
        variant: "destructive",
      });
    }
  });

  // Delete column mutation
  const deleteColumnMutation = useMutation({
    mutationFn: (columnId: string) => 
      boardService.deleteBoardColumn(columnId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boardColumns', boardId] });
      toast({
        title: "Field deleted",
        description: "Field has been deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Delete failed",
        description: "Failed to delete field",
        variant: "destructive",
      });
    }
  });

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(localColumns);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update positions
    const updatedItems = items.map((item, index) => ({
      ...item,
      position: index
    }));

    setLocalColumns(updatedItems);
  };

  const handleAddField = (fieldType: BoardColumn['type']) => {
    const fieldTypeData = FIELD_TYPES.find(ft => ft.id === fieldType);
    if (!fieldTypeData) return;

    const newColumn: Omit<BoardColumn, 'id'> = {
      boardId,
      name: fieldTypeData.label,
      type: fieldType,
      settings: { ...fieldTypeData.defaultSettings },
      position: localColumns.length
    };

    addColumnMutation.mutate(newColumn);
  };

  const handleUpdateColumn = (columnId: string, updates: Partial<BoardColumn>) => {
    setLocalColumns(prev => 
      prev.map(col => 
        col.id === columnId ? { ...col, ...updates } : col
      )
    );
  };

  const handleDeleteColumn = (columnId: string) => {
    setLocalColumns(prev => prev.filter(col => col.id !== columnId));
    deleteColumnMutation.mutate(columnId);
    setDeleteConfirm(null);
  };

  const handleSaveChanges = () => {
    saveColumnsMutation.mutate(localColumns);
  };

  const renderFieldSettings = (column: BoardColumn) => {
    const fieldType = FIELD_TYPES.find(ft => ft.id === column.type);
    if (!fieldType) return null;

    return (
      <div className="space-y-4">
        {fieldType.configurable.includes('required') && (
          <div className="flex items-center space-x-2">
            <Switch
              checked={column.settings.required || false}
              onCheckedChange={(checked) => 
                handleUpdateColumn(column.id, {
                  settings: { ...column.settings, required: checked }
                })
              }
            />
            <Label>Required field</Label>
          </div>
        )}

        {fieldType.configurable.includes('placeholder') && (
          <div className="space-y-2">
            <Label>Placeholder text</Label>
            <Input
              value={column.settings.placeholder || ''}
              onChange={(e) => 
                handleUpdateColumn(column.id, {
                  settings: { ...column.settings, placeholder: e.target.value }
                })
              }
              placeholder="Enter placeholder text"
            />
          </div>
        )}

        {fieldType.configurable.includes('maxLength') && (
          <div className="space-y-2">
            <Label>Maximum length</Label>
            <Input
              type="number"
              value={column.settings.maxLength || ''}
              onChange={(e) => 
                handleUpdateColumn(column.id, {
                  settings: { ...column.settings, maxLength: parseInt(e.target.value) || undefined }
                })
              }
              placeholder="Maximum characters"
            />
          </div>
        )}

        {fieldType.configurable.includes('minLength') && (
          <div className="space-y-2">
            <Label>Minimum length</Label>
            <Input
              type="number"
              value={column.settings.minLength || ''}
              onChange={(e) => 
                handleUpdateColumn(column.id, {
                  settings: { ...column.settings, minLength: parseInt(e.target.value) || undefined }
                })
              }
              placeholder="Minimum characters"
            />
          </div>
        )}

        {fieldType.configurable.includes('min') && (
          <div className="space-y-2">
            <Label>Minimum value</Label>
            <Input
              type="number"
              value={column.settings.min !== undefined ? column.settings.min : ''}
              onChange={(e) => 
                handleUpdateColumn(column.id, {
                  settings: { ...column.settings, min: e.target.value ? parseFloat(e.target.value) : undefined }
                })
              }
              placeholder="Minimum value"
            />
          </div>
        )}

        {fieldType.configurable.includes('max') && (
          <div className="space-y-2">
            <Label>Maximum value</Label>
            <Input
              type="number"
              value={column.settings.max !== undefined ? column.settings.max : ''}
              onChange={(e) => 
                handleUpdateColumn(column.id, {
                  settings: { ...column.settings, max: e.target.value ? parseFloat(e.target.value) : undefined }
                })
              }
              placeholder="Maximum value"
            />
          </div>
        )}

        {fieldType.configurable.includes('step') && (
          <div className="space-y-2">
            <Label>Step size</Label>
            <Input
              type="number"
              value={column.settings.step || ''}
              onChange={(e) => 
                handleUpdateColumn(column.id, {
                  settings: { ...column.settings, step: parseFloat(e.target.value) || 1 }
                })
              }
              placeholder="Step increment"
            />
          </div>
        )}

        {fieldType.configurable.includes('unit') && (
          <div className="space-y-2">
            <Label>Unit</Label>
            <Input
              value={column.settings.unit || ''}
              onChange={(e) => 
                handleUpdateColumn(column.id, {
                  settings: { ...column.settings, unit: e.target.value }
                })
              }
              placeholder="e.g., hours, kg, $"
            />
          </div>
        )}

        {fieldType.configurable.includes('options') && (
          <div className="space-y-2">
            <Label>Options (one per line)</Label>
            <Textarea
              value={(column.settings.options || []).join('\n')}
              onChange={(e) => {
                const options = e.target.value.split('\n').filter(Boolean);
                handleUpdateColumn(column.id, {
                  settings: { ...column.settings, options }
                });
              }}
              placeholder="Option 1&#10;Option 2&#10;Option 3"
              className="min-h-[100px]"
            />
          </div>
        )}

        {fieldType.configurable.includes('defaultValue') && (
          <div className="space-y-2">
            <Label>Default value</Label>
            {column.type === 'checkbox' ? (
              <Switch
                checked={column.settings.defaultValue || false}
                onCheckedChange={(checked) => 
                  handleUpdateColumn(column.id, {
                    settings: { ...column.settings, defaultValue: checked }
                  })
                }
              />
            ) : column.type === 'status' || column.type === 'priority' ? (
              <Select
                value={column.settings.defaultValue || ''}
                onValueChange={(value) => 
                  handleUpdateColumn(column.id, {
                    settings: { ...column.settings, defaultValue: value }
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select default value" />
                </SelectTrigger>
                <SelectContent>
                  {(column.settings.options || []).map((option: string) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={column.settings.defaultValue || ''}
                onChange={(e) => 
                  handleUpdateColumn(column.id, {
                    settings: { ...column.settings, defaultValue: e.target.value }
                  })
                }
                placeholder="Default value"
              />
            )}
          </div>
        )}

        {fieldType.configurable.includes('multiple') && (
          <div className="flex items-center space-x-2">
            <Switch
              checked={column.settings.multiple !== false}
              onCheckedChange={(checked) => 
                handleUpdateColumn(column.id, {
                  settings: { ...column.settings, multiple: checked }
                })
              }
            />
            <Label>Allow multiple selections</Label>
          </div>
        )}

        {fieldType.configurable.includes('maxTags') && (
          <div className="space-y-2">
            <Label>Maximum tags</Label>
            <Input
              type="number"
              value={column.settings.maxTags || ''}
              onChange={(e) => 
                handleUpdateColumn(column.id, {
                  settings: { ...column.settings, maxTags: parseInt(e.target.value) || 10 }
                })
              }
              placeholder="Maximum number of tags"
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Manage Board Fields</DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="fields">Current Fields</TabsTrigger>
              <TabsTrigger value="add">Add New Field</TabsTrigger>
            </TabsList>

            <TabsContent value="fields" className="space-y-4">
              <ScrollArea className="h-[500px]">
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="columns">
                    {(provided: any) => (
                      <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                        {localColumns.map((column, index) => (
                          <Draggable key={column.id} draggableId={column.id} index={index}>
                            {(provided: any) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className="border rounded-lg p-4 bg-card"
                              >
                                <div className="flex items-center gap-3">
                                  <div
                                    {...provided.dragHandleProps}
                                    className="text-muted-foreground hover:text-foreground cursor-grab"
                                  >
                                    <GripVertical className="h-4 w-4" />
                                  </div>
                                  
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      {React.createElement(
                                        FIELD_TYPES.find(ft => ft.id === column.type)?.icon || Type,
                                        { className: "h-4 w-4" }
                                      )}
                                      <Input
                                        value={column.name}
                                        onChange={(e) => handleUpdateColumn(column.id, { name: e.target.value })}
                                        className="font-medium border-none p-0 h-auto focus-visible:ring-0"
                                      />
                                      <Badge variant="outline">
                                        {FIELD_TYPES.find(ft => ft.id === column.type)?.label}
                                      </Badge>
                                    </div>

                                    {editingColumn === column.id && (
                                      <div className="mt-3 p-3 bg-muted rounded-md">
                                        {renderFieldSettings(column)}
                                        <div className="flex gap-2 mt-4">
                                          <Button
                                            size="sm"
                                            onClick={() => setEditingColumn(null)}
                                          >
                                            Done
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => 
                                        setEditingColumn(editingColumn === column.id ? null : column.id)
                                      }
                                    >
                                      <Settings className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => setDeleteConfirm(column.id)}
                                      className="text-destructive hover:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="add" className="space-y-4">
              <ScrollArea className="h-[500px]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {FIELD_TYPES.map((fieldType) => (
                    <div
                      key={fieldType.id}
                      className="border rounded-lg p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => handleAddField(fieldType.id)}
                    >
                      <div className="flex items-start gap-3">
                        <fieldType.icon className="h-5 w-5 mt-0.5 text-primary" />
                        <div className="flex-1">
                          <h4 className="font-medium">{fieldType.label}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {fieldType.description}
                          </p>
                        </div>
                        <Plus className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSaveChanges} disabled={saveColumnsMutation.isPending}>
              {saveColumnsMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Field</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this field? This action cannot be undone and will remove all data in this field from existing items.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDeleteColumn(deleteConfirm)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Field
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
} 