import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Eye, 
  ChevronDown, 
  Save, 
  Star, 
  Plus, 
  Check, 
  Share2, 
  Trash2, 
  Copy, 
  MoreHorizontal,
  Settings
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';
import { useViewStore } from '@/stores/view-store';
import { useFilterStore } from '@/stores/filter-store';
import { ViewDefinition } from '@/types/filter';
import { getSavedViews, getDefaultView, setDefaultView as setDefaultViewService, deleteView } from '@/services/view-service';
import { SaveViewDialog } from './save-view-dialog';
import { useToast } from '@/hooks/use-toast';

interface ViewSelectorProps {
  boardId: string;
  onViewChange?: (view: ViewDefinition) => void;
}

export function ViewSelector({ boardId, onViewChange }: ViewSelectorProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { views, currentView, defaultView, setViews, setCurrentView, setDefaultView, removeView } = useViewStore();
  const { activeFilter } = useFilterStore();
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  
  // Fetch saved views
  const { data: viewsData } = useQuery({
    queryKey: ['views', boardId],
    queryFn: () => getSavedViews(boardId, { includeShared: true }),
    enabled: !!boardId,
  });

  // Update views when data changes
  useEffect(() => {
    if (viewsData) {
      setViews(viewsData);
    }
  }, [viewsData, setViews]);
  
  // Fetch default view
  const { data: defaultViewData } = useQuery({
    queryKey: ['default-view', boardId],
    queryFn: () => getDefaultView(boardId, { useGlobal: true }),
    enabled: !!boardId,
  });

  // Update default view when data changes
  useEffect(() => {
    if (defaultViewData) {
      setDefaultView(defaultViewData);
    }
  }, [defaultViewData, setDefaultView]);
  
  // Set current view to default view on initial load
  useEffect(() => {
    if (defaultViewData && typeof defaultViewData === 'object' && 'name' in defaultViewData && !currentView) {
      setCurrentView(defaultViewData as ViewDefinition);
      if (onViewChange) {
        onViewChange(defaultViewData as ViewDefinition);
      }
    }
  }, [defaultViewData, currentView, setCurrentView, onViewChange]);
  
  const handleViewClick = (view: ViewDefinition) => {
    setCurrentView(view);
    if (onViewChange) {
      onViewChange(view);
    }
  };
  
  const handleSetDefault = async (viewId: string) => {
    try {
      await setDefaultViewService(viewId, boardId);
      
      // Update the default view
      const view = views.find(v => v.id === viewId);
      if (view) {
        setDefaultView(view);
      }
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['default-view', boardId] });
      
      toast({
        title: 'Default view updated',
        description: 'The default view has been updated successfully.',
      });
    } catch (error) {
      console.error('Error setting default view:', error);
      toast({
        title: 'Error',
        description: 'Failed to set default view.',
        variant: 'destructive',
      });
    }
  };
  
  const handleDeleteView = async (viewId: string) => {
    try {
      await deleteView(viewId);
      
      // Remove from local state
      removeView(viewId);
      
      // If current view is deleted, set to default or null
      if (currentView?.id === viewId) {
        setCurrentView(defaultView);
      }
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['views', boardId] });
      
      toast({
        title: 'View deleted',
        description: 'The view has been deleted successfully.',
      });
    } catch (error) {
      console.error('Error deleting view:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete view.',
        variant: 'destructive',
      });
    }
  };
  
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Eye className="h-4 w-4 mr-2" />
            {currentView ? currentView.name : 'Default View'}
            <ChevronDown className="h-4 w-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Saved Views</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {views.length > 0 ? (
            views.map((view) => (
              <DropdownMenuItem 
                key={view.id} 
                onClick={() => handleViewClick(view)}
                className="flex items-center justify-between"
              >
                <div className="flex items-center">
                  {view.isDefault && <Star className="h-4 w-4 mr-2 text-yellow-500" />}
                  {!view.isDefault && <Eye className="h-4 w-4 mr-2" />}
                  <span>{view.name}</span>
                </div>
                
                {currentView?.id === view.id && (
                  <Check className="h-4 w-4 ml-2" />
                )}
                
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="ml-auto">
                    <MoreHorizontal className="h-4 w-4" />
                  </DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem onClick={() => view.id && handleSetDefault(view.id)}>
                        <Star className="h-4 w-4 mr-2" />
                        Set as Default
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Share2 className="h-4 w-4 mr-2" />
                        Share View
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Settings className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => view.id && handleDeleteView(view.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
              </DropdownMenuItem>
            ))
          ) : (
            <div className="px-2 py-4 text-center text-sm text-muted-foreground">
              No saved views
            </div>
          )}
          
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setIsSaveDialogOpen(true)}>
            <Save className="h-4 w-4 mr-2" />
            Save Current View
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      <SaveViewDialog 
        open={isSaveDialogOpen} 
        onOpenChange={setIsSaveDialogOpen}
        boardId={boardId}
        filter={activeFilter}
      />
    </>
  );
}