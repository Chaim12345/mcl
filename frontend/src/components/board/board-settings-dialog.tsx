import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { Check, Loader2, Save } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { boardService } from '@/services/board-service';
import { useBoardStore } from '@/stores/board-store';
import { Board } from '@/types';

const formSchema = z.object({
  name: z.string().min(3, {
    message: 'Board name must be at least 3 characters.',
  }),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, {
    message: 'Please select a valid color.',
  }),
  isPublic: z.boolean().default(false),
  allowComments: z.boolean().default(true),
  enableNotifications: z.boolean().default(true),
  autoSave: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

interface BoardSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  board: Board;
}

export function BoardSettingsDialog({ open, onOpenChange, board }: BoardSettingsDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { updateBoard } = useBoardStore();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: board.name,
      description: board.description || '',
      color: board.color,
      isPublic: false,
      allowComments: true,
      enableNotifications: true,
      autoSave: true,
    },
  });
  
  const updateBoardMutation = useMutation({
    mutationFn: (data: FormValues) => boardService.updateBoard(board.id, {
      name: data.name,
      description: data.description,
      color: data.color,
    }),
    onSuccess: (updatedBoard) => {
      updateBoard(updatedBoard);
      queryClient.invalidateQueries({ queryKey: ['board', board.id] });
      toast({
        title: 'Board updated',
        description: 'Board settings have been updated successfully.',
      });
    },
    onError: () => {
      toast({
        title: 'Failed to update board',
        description: 'There was an error updating the board settings. Please try again.',
        variant: 'destructive',
      });
    },
  });
  
  function onSubmit(values: FormValues) {
    updateBoardMutation.mutate(values);
  }
  
  const colorOptions = [
    '#0073ea', // Blue
    '#00c875', // Green
    '#a25ddc', // Purple
    '#ff642e', // Orange
    '#ffcb00', // Yellow
    '#e2445c', // Red
    '#579bfc', // Light Blue
    '#808080', // Gray
  ];
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Board Settings</DialogTitle>
          <DialogDescription>
            Configure settings for "{board.name}"
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="general" className="mt-2">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="permissions">Permissions</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <TabsContent value="general" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Board Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormDescription>
                        The name of your board visible to all members.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe the purpose of this board"
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        A brief description of what this board is used for.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color</FormLabel>
                      <FormControl>
                        <div className="flex flex-wrap gap-2">
                          {colorOptions.map((color) => (
                            <button
                              key={color}
                              type="button"
                              className={`w-8 h-8 rounded-full flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                                field.value === color ? 'ring-2 ring-ring ring-offset-2' : ''
                              }`}
                              style={{ backgroundColor: color }}
                              onClick={() => field.onChange(color)}
                            >
                              {field.value === color && (
                                <Check className="h-4 w-4 text-white" />
                              )}
                            </button>
                          ))}
                        </div>
                      </FormControl>
                      <FormDescription>
                        Choose a color for your board header.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="autoSave"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Auto Save</FormLabel>
                        <FormDescription>
                          Automatically save changes as they are made.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </TabsContent>
              
              <TabsContent value="permissions" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="isPublic"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Public Board</FormLabel>
                        <FormDescription>
                          Make this board accessible to anyone with the link.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="allowComments"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Allow Comments</FormLabel>
                        <FormDescription>
                          Allow members to add comments to items.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </TabsContent>
              
              <TabsContent value="notifications" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="enableNotifications"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Enable Notifications</FormLabel>
                        <FormDescription>
                          Receive notifications about changes to this board.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <div className="rounded-lg border p-3 shadow-sm">
                  <h3 className="font-medium mb-2">Notification Preferences</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm">Item assignments</label>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm">Comments</label>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm">Status changes</label>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm">Due date reminders</label>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={updateBoardMutation.isPending || !form.formState.isDirty}
                >
                  {updateBoardMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {!updateBoardMutation.isPending && (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}