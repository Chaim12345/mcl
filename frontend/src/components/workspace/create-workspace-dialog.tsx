import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';

import { VibeButton, VibeModal, VibeTextField } from '@/components/vibe';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useVibeToast } from '@/hooks/use-vibe-toast';
import { workspaceService } from '@/services/workspace-service';
import { useWorkspaceStore } from '@/stores/workspace-store';

const formSchema = z.object({
  name: z.string().min(3, {
    message: 'Workspace name must be at least 3 characters.',
  }),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateWorkspaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateWorkspaceDialog({ open, onOpenChange }: CreateWorkspaceDialogProps) {
  const { toast } = useVibeToast();
  const queryClient = useQueryClient();
  const { addWorkspace, setCurrentWorkspace } = useWorkspaceStore();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });
  
  const createWorkspaceMutation = useMutation({
    mutationFn: workspaceService.createWorkspace,
    onSuccess: (workspace) => {
      addWorkspace(workspace);
      setCurrentWorkspace(workspace);
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      toast.success(
        'Workspace created',
        `${workspace.name} has been created successfully.`
      );
      form.reset();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(
        'Failed to create workspace',
        'There was an error creating your workspace. Please try again.'
      );
    },
  });
  
  function onSubmit(values: FormValues) {
    createWorkspaceMutation.mutate(values);
  }
  
  return (
    <VibeModal 
      open={open} 
      onClose={() => onOpenChange(false)}
      size="medium"
      className="sm:max-w-[525px]"
    >
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Create Workspace</h2>
          <p className="text-sm text-gray-600">
            Create a new workspace for your team to collaborate on projects.
          </p>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <VibeTextField 
                      {...field}
                      title="Workspace Name"
                      placeholder="My Workspace"
                      size="medium"
                      validation={form.formState.errors.name ? {
                        status: 'error',
                        text: form.formState.errors.name.message
                      } : undefined}
                    />
                  </FormControl>
                  <FormDescription>
                    This is the name of your workspace.
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
                    Optional description for your workspace.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end space-x-3 pt-4">
              <VibeButton
                type="button"
                kind="secondary"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </VibeButton>
              <VibeButton 
                type="submit"
                kind="primary"
                loading={createWorkspaceMutation.isPending}
                disabled={createWorkspaceMutation.isPending}
              >
                Create Workspace
              </VibeButton>
            </div>
          </form>
        </Form>
      </div>
    </VibeModal>
  );
}