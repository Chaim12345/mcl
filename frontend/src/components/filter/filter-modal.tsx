import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  Trash2, 
  Save,
  ArrowDownUp
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useFilterStore } from '@/stores/filter-store';
import { FilterCondition, FilterGroup, FilterOperator, LogicalOperator } from '@/types/filter';
import { FilterConditionRow } from './filter-condition-row';
import { SaveFilterDialog } from './save-filter-dialog';

interface FilterModalProps {
  boardId: string;
}

export function FilterModal({ boardId }: FilterModalProps) {
  const queryClient = useQueryClient();
  const { 
    activeFilter, 
    setActiveFilter, 
    isFilterModalOpen, 
    setIsFilterModalOpen 
  } = useFilterStore();
  
  const [localFilter, setLocalFilter] = useState<FilterGroup>({
    operator: LogicalOperator.AND,
    conditions: []
  });
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  
  // Initialize local filter from active filter
  useEffect(() => {
    if (activeFilter) {
      setLocalFilter(activeFilter);
    } else {
      setLocalFilter({
        operator: LogicalOperator.AND,
        conditions: []
      });
    }
  }, [activeFilter, isFilterModalOpen]);
  
  const handleAddCondition = () => {
    const newCondition: FilterCondition = {
      field: 'title',
      operator: FilterOperator.CONTAINS,
      value: ''
    };
    
    setLocalFilter({
      ...localFilter,
      conditions: [...localFilter.conditions, newCondition]
    });
  };
  
  const handleRemoveCondition = (index: number) => {
    const newConditions = [...localFilter.conditions];
    newConditions.splice(index, 1);
    
    setLocalFilter({
      ...localFilter,
      conditions: newConditions
    });
  };
  
  const handleUpdateCondition = (index: number, condition: FilterCondition) => {
    const newConditions = [...localFilter.conditions];
    newConditions[index] = condition;
    
    setLocalFilter({
      ...localFilter,
      conditions: newConditions
    });
  };
  
  const handleOperatorChange = (operator: LogicalOperator) => {
    setLocalFilter({
      ...localFilter,
      operator
    });
  };
  
  const handleApplyFilter = () => {
    // Only apply if there are conditions
    if (localFilter.conditions.length > 0) {
      setActiveFilter(localFilter);
      queryClient.invalidateQueries({ queryKey: ['board-items', boardId] });
    } else {
      setActiveFilter(null);
    }
    setIsFilterModalOpen(false);
  };
  
  const handleClearFilter = () => {
    setLocalFilter({
      operator: LogicalOperator.AND,
      conditions: []
    });
  };
  
  return (
    <>
      <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Filter Board Items</DialogTitle>
            <DialogDescription>
              Create filters to narrow down your board items. Combine multiple conditions to create complex filters.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm font-medium">Match</span>
              <div className="flex items-center rounded-md border overflow-hidden">
                <Button
                  type="button"
                  variant={localFilter.operator === LogicalOperator.AND ? "secondary" : "ghost"}
                  size="sm"
                  className="rounded-none"
                  onClick={() => handleOperatorChange(LogicalOperator.AND)}
                >
                  All conditions
                </Button>
                <Button
                  type="button"
                  variant={localFilter.operator === LogicalOperator.OR ? "secondary" : "ghost"}
                  size="sm"
                  className="rounded-none"
                  onClick={() => handleOperatorChange(LogicalOperator.OR)}
                >
                  Any condition
                </Button>
              </div>
            </div>
            
            <div className="space-y-3">
              {localFilter.conditions.map((condition, index) => (
                <FilterConditionRow
                  key={index}
                  condition={condition as FilterCondition}
                  onUpdate={(updatedCondition) => handleUpdateCondition(index, updatedCondition)}
                  onRemove={() => handleRemoveCondition(index)}
                />
              ))}
              
              {localFilter.conditions.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  No filter conditions. Add one below.
                </div>
              )}
              
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full mt-2"
                onClick={handleAddCondition}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Condition
              </Button>
            </div>
          </div>
          
          <DialogFooter className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClearFilter}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All
              </Button>
              
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsSaveDialogOpen(true)}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Filter
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsFilterModalOpen(false)}
              >
                Cancel
              </Button>
              
              <Button
                type="button"
                onClick={handleApplyFilter}
              >
                Apply Filter
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <SaveFilterDialog 
        open={isSaveDialogOpen} 
        onOpenChange={setIsSaveDialogOpen}
        boardId={boardId}
        filter={localFilter}
      />
    </>
  );
}