import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { 
  Filter, 
  X, 
  ChevronDown, 
  Save, 
  Clock, 
  Star, 
  Plus,
  AlertCircle,
  Calendar,
  User,
  AlertTriangle
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useFilterStore } from '@/stores/filter-store';
import { useBoardStore } from '@/stores/board-store';
import { FilterGroup, FilterOperator, LogicalOperator } from '@/types/filter';
import { FilterModal } from './filter-modal';
import { SaveFilterDialog } from './save-filter-dialog';
import { getFilterPresets } from '@/services/filter-service';

interface FilterBarProps {
  boardId: string;
  onFilterChange?: (filter: FilterGroup | null) => void;
}

export function FilterBar({ boardId, onFilterChange }: FilterBarProps) {
  const queryClient = useQueryClient();
  const { activeFilter, savedFilters, setActiveFilter, clearFilters, setIsFilterModalOpen } = useFilterStore();
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [filterPresets] = useState(getFilterPresets());
  
  // Apply filter effect
  useEffect(() => {
    if (onFilterChange) {
      onFilterChange(activeFilter);
    }
  }, [activeFilter, onFilterChange]);
  
  const getFilterSummary = (filter: FilterGroup): string => {
    if (!filter || !filter.conditions || filter.conditions.length === 0) {
      return 'No filters';
    }
    
    const conditionCount = filter.conditions.length;
    const firstCondition = filter.conditions[0];
    
    if ('field' in firstCondition) {
      const fieldName = firstCondition.field.charAt(0).toUpperCase() + firstCondition.field.slice(1);
      const operatorText = getOperatorText(firstCondition.operator);
      const valueText = Array.isArray(firstCondition.value) 
        ? firstCondition.value.join(', ')
        : String(firstCondition.value);
      
      if (conditionCount === 1) {
        return `${fieldName} ${operatorText} ${valueText}`;
      }
      
      return `${fieldName} ${operatorText} ${valueText} + ${conditionCount - 1} more`;
    }
    
    return `${conditionCount} filter conditions`;
  };
  
  const getOperatorText = (operator: FilterOperator): string => {
    switch (operator) {
      case FilterOperator.EQUALS:
        return 'is';
      case FilterOperator.NOT_EQUALS:
        return 'is not';
      case FilterOperator.CONTAINS:
        return 'contains';
      case FilterOperator.GREATER_THAN:
        return 'is greater than';
      case FilterOperator.LESS_THAN:
        return 'is less than';
      case FilterOperator.GREATER_THAN_EQUALS:
        return 'is at least';
      case FilterOperator.LESS_THAN_EQUALS:
        return 'is at most';
      case FilterOperator.BETWEEN:
        return 'is between';
      case FilterOperator.IN:
        return 'is one of';
      default:
        return operator;
    }
  };
  
  const handleFilterPresetClick = (preset: { filter: FilterGroup }) => {
    setActiveFilter(preset.filter);
    queryClient.invalidateQueries({ queryKey: ['board-items', boardId] });
  };
  
  const handleSavedFilterClick = (filter: FilterGroup) => {
    setActiveFilter(filter);
    queryClient.invalidateQueries({ queryKey: ['board-items', boardId] });
  };
  
  const handleClearFilters = () => {
    clearFilters();
    queryClient.invalidateQueries({ queryKey: ['board-items', boardId] });
  };
  
  const getIconForPreset = (presetId: string) => {
    switch (presetId) {
      case 'assigned-to-me':
        return <User className="h-4 w-4" />;
      case 'due-today':
        return <Calendar className="h-4 w-4" />;
      case 'overdue':
        return <AlertCircle className="h-4 w-4" />;
      case 'high-priority':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Filter className="h-4 w-4" />;
    }
  };
  
  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Quick Filters</DropdownMenuLabel>
            {filterPresets.map((preset) => (
              <DropdownMenuItem key={preset.id} onClick={() => handleFilterPresetClick(preset)}>
                {preset.icon && getIconForPreset(preset.id)}
                <span className="ml-2">{preset.name}</span>
              </DropdownMenuItem>
            ))}
            
            {savedFilters.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Saved Filters</DropdownMenuLabel>
                {savedFilters.map((savedFilter) => (
                  <DropdownMenuItem 
                    key={savedFilter.id} 
                    onClick={() => handleSavedFilterClick(savedFilter.filter)}
                  >
                    <Star className="h-4 w-4 mr-2" />
                    {savedFilter.name}
                  </DropdownMenuItem>
                ))}
              </>
            )}
            
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setIsFilterModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Filter
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        {activeFilter && activeFilter.conditions.length > 0 && (
          <>
            <Badge variant="secondary" className="px-3 py-1">
              {getFilterSummary(activeFilter)}
              <button 
                className="ml-2 hover:bg-muted rounded-full"
                onClick={handleClearFilters}
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Clear filter</span>
              </button>
            </Badge>
            
            <Button 
              variant="ghost" 
              size="sm"
              className="h-8 px-2"
              onClick={() => setIsSaveDialogOpen(true)}
            >
              <Save className="h-4 w-4" />
              <span className="sr-only">Save filter</span>
            </Button>
          </>
        )}
      </div>
      
      <FilterModal boardId={boardId} />
      
      <SaveFilterDialog 
        open={isSaveDialogOpen} 
        onOpenChange={setIsSaveDialogOpen}
        boardId={boardId}
      />
    </>
  );
}