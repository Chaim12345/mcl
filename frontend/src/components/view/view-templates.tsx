import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Layout, 
  Plus, 
  Check, 
  Calendar, 
  List, 
  Kanban, 
  BarChart, 
  Clock, 
  Loader2 
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useViewStore } from '@/stores/view-store';
import { getViewTemplates, createViewFromTemplate } from '@/services/view-service';
import { cn } from '@/lib/utils';

interface ViewTemplatesProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boardId: string;
}

export function ViewTemplates({ open, onOpenChange, boardId }: ViewTemplatesProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { addView, setCurrentView } = useViewStore();
  
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  // Fetch view templates
  const { data: templates, isLoading } = useQuery({
    queryKey: ['view-templates', activeCategory],
    queryFn: () => getViewTemplates({
      category: activeCategory === 'all' ? undefined : activeCategory
    }),
    enabled: open,
  });
  
  const handleCreateFromTemplate = async () => {
    if (!selectedTemplateId) {
      toast({
        title: 'No template selected',
        description: 'Please select a template to continue.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      setIsCreating(true);
      
      const template = templates?.find(t => t.id === selectedTemplateId);
      if (!template) return;
      
      const newView = await createViewFromTemplate(
        selectedTemplateId,
        boardId,
        template.name
      );
      
      addView(newView);
      setCurrentView(newView);
      
      queryClient.invalidateQueries({ queryKey: ['views', boardId] });
      
      toast({
        title: 'View created',
        description: 'Your view has been created successfully.',
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating view from template:', error);
      toast({
        title: 'Failed to create view',
        description: 'There was an error creating your view. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };
  
  const getTemplateIcon = (templateId: string) => {
    if (templateId.includes('list')) return <List className="h-5 w-5" />;
    if (templateId.includes('kanban')) return <Kanban className="h-5 w-5" />;
    if (templateId.includes('calendar')) return <Calendar className="h-5 w-5" />;
    if (templateId.includes('chart')) return <BarChart className="h-5 w-5" />;
    if (templateId.includes('timeline')) return <Clock className="h-5 w-5" />;
    return <Layout className="h-5 w-5" />;
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>View Templates</DialogTitle>
          <DialogDescription>
            Choose a template to create a new view for your board.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="all" value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="list">List</TabsTrigger>
            <TabsTrigger value="kanban">Kanban</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="chart">Charts</TabsTrigger>
          </TabsList>
        </Tabs>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="h-[300px] mt-4">
            <div className="grid grid-cols-2 gap-4">
              {templates && templates.length > 0 ? (
                templates.map((template) => (
                  <div
                    key={template.id}
                    className={cn(
                      "flex flex-col p-4 border rounded-md cursor-pointer hover:border-primary transition-colors",
                      selectedTemplateId === template.id && "border-primary bg-primary/5"
                    )}
                    onClick={() => template.id && setSelectedTemplateId(template.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getTemplateIcon(template.id || '')}
                        <h3 className="font-medium">{template.name}</h3>
                      </div>
                      {selectedTemplateId === template.id && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {(template as any).description || 'A custom view template'}
                    </p>
                  </div>
                ))
              ) : (
                <div className="col-span-2 py-8 text-center">
                  <p className="text-muted-foreground">No templates found</p>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
        
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleCreateFromTemplate}
            disabled={!selectedTemplateId || isCreating}
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Create View
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}