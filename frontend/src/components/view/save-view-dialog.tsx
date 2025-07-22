import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useViewStore } from '@/stores/view-store';
import { FilterGroup, SortDefinition } from '@/types/filter';
import { saveView } from '@/services/view-service';

interface SaveViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boardId: string;
  filter?: FilterGroup | null;
  sorts?: SortDefinition[];
}

export function SaveViewDialog({ 
  open, 
  onOpenChange, 
  boardId,
  filter,
  sorts
}: SaveViewDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { addView } = useViewStore();
  
  const [name, setName] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [isShared, setIsShared] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: 'View name required',
        description: 'Please enter a name for your view.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      setIsSaving(true);
      
      const savedView = await saveView(boardId, {
        name: name.trim(),
        filter: filter || undefined,
        sorts: sorts || undefined,
        isDefault,
        isShared
      });
      
      addView(savedView);
      queryClient.invalidateQueries({ queryKey: ['views', boardId] });
      
      if (isDefault) {
        queryClient.invalidateQueries({ queryKey: ['default-view', boardId] });
      }
      
      toast({
        title: 'View saved',
        description: 'Your view has been saved successfully.',
      });
      
      onOpenChange(false);
      setName('');
      setIsDefault(false);
      setIsShared(false);
    } catch (error) {
      console.error('Error saving view:', error);
      toast({
        title: 'Failed to save view',
        description: 'There was an error saving your view. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Save View</DialogTitle>
          <DialogDescription>
            Save your current view configuration for quick access later.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="view-name">View Name</Label>
            <Input
              id="view-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter a name for your view"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="default-view"
              checked={isDefault}
              onCheckedChange={setIsDefault}
            />
            <Label htmlFor="default-view">Set as default view</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="shared-view"
              checked={isShared}
              onCheckedChange={setIsShared}
            />
            <Label htmlFor="shared-view">Share with team members</Label>
          </div>
        </div>
        
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
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save View'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}