import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { Loader2, Save, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { workspaceService } from '@/services/workspace-service';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { Workspace } from '@/types';
import { useNavigate } from 'react-router-dom';

const formSchema = z.object({
  name: z.string().min(3, {
    message: 'Workspace name must be at least 3 characters.',
  }),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface WorkspaceSettingsProps {
  workspace: Workspace;
}

export function WorkspaceSettings({ workspace }: WorkspaceSettingsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { updateWorkspace, removeWorkspace } = useWorkspaceStore();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: workspace.name,
      description: workspace.description || '',
    },
  });
  
  const updateWorkspaceMutation = useMutation({
    mutationFn: (data: FormValues) => workspaceService.updateWorkspace(workspace.id, data),
    onSuccess: (updatedWorkspace) => {
      updateWorkspace(updatedWorkspace);
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      queryClient.invalidateQueries({ queryKey: ['workspace', workspace.id] });
      toast({
        title: 'Workspace updated',
        description: 'Your workspace settings have been updated successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to update workspace',
        description: 'There was an error updating your workspace. Please try again.',
        variant: 'destructive',
      });
    },
  });
  
  const deleteWorkspaceMutation = useMutation({
    mutationFn: () => workspaceService.deleteWorkspace(workspace.id),
    onSuccess: () => {
      removeWorkspace(workspace.id);
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      toast({
        title: 'Workspace deleted',
        description: `${workspace.name} has been deleted successfully.`,
      });
      navigate('/dashboard');
    },
    onError: (error) => {
      toast({
        title: 'Failed to delete workspace',
        description: 'There was an error deleting your workspace. Please try again.',
        variant: 'destructive',
      });
    },
  });
  
  function onSubmit(values: FormValues) {
    updateWorkspaceMutation.mutate(values);
  }
  
  function handleDelete() {
    deleteWorkspaceMutation.mutate();
  }
  
  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Workspace Name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormDescription>
                  The name of your workspace visible to all members.
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
                    placeholder="Describe the purpose of this workspace"
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  A brief description of what this workspace is used for.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="flex justify-between pt-4">
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" type="button">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Workspace
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the
                    "{workspace.name}" workspace and all of its boards, items, and data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleteWorkspaceMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            
            <Button 
              type="submit"
              disabled={updateWorkspaceMutation.isPending || !form.formState.isDirty}
            >
              {updateWorkspaceMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {!updateWorkspaceMutation.isPending && (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Changes
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}