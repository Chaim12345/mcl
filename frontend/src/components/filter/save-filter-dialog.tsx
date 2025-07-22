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
import { useFilterStore } from '@/stores/filter-store';
import { FilterGroup } from '@/types/filter';
import { saveFilter } from '@/services/filter-service';

interface SaveFilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boardId: string;
  filter?: FilterGroup;
}

export function SaveFilterDialog({ 
  open, 
  onOpenChange, 
  boardId,
  filter
}: SaveFilterDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { activeFilter, addSavedFilter } = useFilterStore();
  
  const [name, setName] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: 'Filter name required',
        description: 'Please enter a name for your filter.',
        variant: 'destructive',
      });
      return;
    }
    
    const filterToSave = filter || activeFilter;
    
    if (!filterToSave || filterToSave.conditions.length === 0) {
      toast({
        title: 'No filter conditions',
        description: 'Please add at least one filter condition.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      setIsSaving(true);
      
      const savedFilter = await saveFilter(boardId, {
        name: name.trim(),
        filter: filterToSave,
        isDefault
      });
      
      addSavedFilter(savedFilter);
      queryClient.invalidateQueries({ queryKey: ['saved-filters', boardId] });
      
      toast({
        title: 'Filter saved',
        description: 'Your filter has been saved successfully.',
      });
      
      onOpenChange(false);
      setName('');
      setIsDefault(false);
    } catch (error) {
      console.error('Error saving filter:', error);
      toast({
        title: 'Failed to save filter',
        description: 'There was an error saving your filter. Please try again.',
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
          <DialogTitle>Save Filter</DialogTitle>
          <DialogDescription>
            Save your current filter for quick access later.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="filter-name">Filter Name</Label>
            <Input
              id="filter-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter a name for your filter"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="default-filter"
              checked={isDefault}
              onCheckedChange={setIsDefault}
            />
            <Label htmlFor="default-filter">Set as default filter</Label>
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
            {isSaving ? 'Saving...' : 'Save Filter'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}