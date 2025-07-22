import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { Check, Loader2, LayoutGrid } from 'lucide-react';

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
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
  template: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateBoardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
}

// Board templates
const boardTemplates = [
  {
    id: 'blank',
    name: 'Blank',
    description: 'Start from scratch with an empty board',
    icon: <LayoutGrid className="h-8 w-8" />,
  },
  {
    id: 'project',
    name: 'Project Management',
    description: 'Track tasks with status, assignees, and due dates',
    icon: <LayoutGrid className="h-8 w-8" />,
  },
  {
    id: 'sprint',
    name: 'Sprint Planning',
    description: 'Manage sprints with user stories and story points',
    icon: <LayoutGrid className="h-8 w-8" />,
  },
  {
    id: 'kanban',
    name: 'Kanban',
    description: 'Visualize workflow with To Do, In Progress, Done',
    icon: <LayoutGrid className="h-8 w-8" />,
  },
];

export function CreateBoardDialog({ open, onOpenChange, workspaceId }: CreateBoardDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { addBoard } = useBoardStore();
  const [selectedTemplate, setSelectedTemplate] = useState('blank');
  const [currentStep, setCurrentStep] = useState<'template' | 'details'>('template');
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      color: '#0073ea',
      template: 'blank',
    },
  });
  
  const createBoardMutation = useMutation({
    mutationFn: (data: FormValues) => boardService.createBoard(workspaceId, {
      name: data.name,
      description: data.description,
      color: data.color,
    }),
    onSuccess: (board) => {
      addBoard(board);
      queryClient.invalidateQueries({ queryKey: ['boards', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['boards', 'recent'] });
      toast({
        title: 'Board created',
        description: 'Your new board has been created successfully.',
      });
      form.reset();
      setCurrentStep('template');
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: 'Failed to create board',
        description: 'There was an error creating your board. Please try again.',
        variant: 'destructive',
      });
    },
  });
  
  function onSubmit(values: FormValues) {
    createBoardMutation.mutate(values);
  }
  
  function handleTemplateSelect(templateId: string) {
    setSelectedTemplate(templateId);
    form.setValue('template', templateId);
    setCurrentStep('details');
  }
  
  function handleBack() {
    setCurrentStep('template');
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
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        // Reset form when dialog is closed
        setTimeout(() => {
          setCurrentStep('template');
          form.reset();
        }, 300);
      }
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create Board</DialogTitle>
          <DialogDescription>
            Create a new board to organize and track your work.
          </DialogDescription>
        </DialogHeader>
        
        {currentStep === 'template' ? (
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Choose a template</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {boardTemplates.map((template) => (
                <Card 
                  key={template.id}
                  className={`cursor-pointer transition-all hover:border-primary ${
                    selectedTemplate === template.id ? 'border-primary ring-2 ring-primary/20' : ''
                  }`}
                  onClick={() => handleTemplateSelect(template.id)}
                >
                  <CardContent className="p-4 flex flex-col items-center text-center">
                    <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
                      {template.icon}
                    </div>
                    <h4 className="font-medium">{template.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{template.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="My Board" {...field} />
                    </FormControl>
                    <FormDescription>
                      This is the name of your board.
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
                      Optional description for your board.
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
                            onClick={() => {
                              field.onChange(color);
                            }}
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
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                >
                  Back
                </Button>
                <Button 
                  type="submit"
                  disabled={createBoardMutation.isPending}
                >
                  {createBoardMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Create Board
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}