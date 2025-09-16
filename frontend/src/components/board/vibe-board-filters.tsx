import React, { useState } from 'react';
import moment from 'moment';
import { VibeModal, VibeButton, VibeSelect, VibeTextField, VibeBox, VibeFlex, VibeCheckbox } from '@/components/vibe';

// Temporary Badge component replacement
const VibeBadge = ({ text, color, type, ...props }: any) => (
  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
    color === 'positive' ? 'bg-green-100 text-green-800' : 
    color === 'warning' ? 'bg-yellow-100 text-yellow-800' : 
    color === 'negative' ? 'bg-red-100 text-red-800' :
    'bg-gray-100 text-gray-800'
  }`} {...props}>
    {text}
  </span>
);
import { Text, Heading, DatePicker } from '@vibe/core';
import { 
  Filter, 
  X, 
  Calendar, 
  User, 
  Flag, 
  Tag,
  RotateCcw
} from 'lucide-react';

export interface BoardFilter {
  status?: string[];
  priority?: string[];
  assignee?: string[];
  tags?: string[];
  dueDate?: {
    from?: string;
    to?: string;
  };
  progress?: {
    min?: number;
    max?: number;
  };
  budget?: {
    min?: number;
    max?: number;
  };
}

export interface VibeBoardFiltersProps {
  // State
  isOpen: boolean;
  onClose: () => void;
  
  // Current filters
  filters: BoardFilter;
  onFiltersChange: (filters: BoardFilter) => void;
  
  // Filter options
  statusOptions?: Array<{ value: string; label: string; color?: string }>;
  priorityOptions?: Array<{ value: string; label: string; color?: string }>;
  assigneeOptions?: Array<{ value: string; label: string; avatar?: string }>;
  tagOptions?: string[];
  
  // Quick filters
  showQuickFilters?: boolean;
  quickFilters?: Array<{
    id: string;
    label: string;
    filters: BoardFilter;
  }>;
  
  // Board context
  boardId?: string;
  workspaceId?: string;
}

export function VibeBoardFilters({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  statusOptions = [
    { value: 'To Do', label: 'To Do', color: 'primary' },
    { value: 'In Progress', label: 'In Progress', color: 'warning' },
    { value: 'Completed', label: 'Completed', color: 'positive' },
    { value: 'Blocked', label: 'Blocked', color: 'negative' }
  ],
  priorityOptions = [
    { value: 'Low', label: 'Low', color: 'dark' },
    { value: 'Medium', label: 'Medium', color: 'primary' },
    { value: 'High', label: 'High', color: 'warning' },
    { value: 'Critical', label: 'Critical', color: 'negative' }
  ],
  assigneeOptions = [],
  tagOptions = [],
  showQuickFilters = true,
  quickFilters = [
    {
      id: 'my-items',
      label: 'My Items',
      filters: { assignee: ['current-user'] }
    },
    {
      id: 'high-priority',
      label: 'High Priority',
      filters: { priority: ['High', 'Critical'] }
    },
    {
      id: 'overdue',
      label: 'Overdue',
      filters: { dueDate: { to: new Date().toISOString() } }
    },
    {
      id: 'in-progress',
      label: 'In Progress',
      filters: { status: ['In Progress'] }
    }
  ],
  boardId,
  workspaceId
}: VibeBoardFiltersProps) {
  const [localFilters, setLocalFilters] = useState<BoardFilter>(filters);

  const handleFilterChange = (key: keyof BoardFilter, value: any) => {
    setLocalFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleMultiSelectChange = (key: keyof BoardFilter, value: string, checked: boolean) => {
    setLocalFilters(prev => {
      const currentValues = (prev[key] as string[]) || [];
      if (checked) {
        return {
          ...prev,
          [key]: [...currentValues, value]
        };
      } else {
        return {
          ...prev,
          [key]: currentValues.filter(v => v !== value)
        };
      }
    });
  };

  const handleApplyFilters = () => {
    onFiltersChange(localFilters);
    onClose();
  };

  const handleClearFilters = () => {
    const emptyFilters: BoardFilter = {};
    setLocalFilters(emptyFilters);
    onFiltersChange(emptyFilters);
  };

  const handleQuickFilter = (quickFilter: typeof quickFilters[0]) => {
    setLocalFilters(quickFilter.filters);
    onFiltersChange(quickFilter.filters);
    onClose();
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (localFilters.status?.length) count++;
    if (localFilters.priority?.length) count++;
    if (localFilters.assignee?.length) count++;
    if (localFilters.tags?.length) count++;
    if (localFilters.dueDate?.from || localFilters.dueDate?.to) count++;
    if (localFilters.progress?.min !== undefined || localFilters.progress?.max !== undefined) count++;
    if (localFilters.budget?.min !== undefined || localFilters.budget?.max !== undefined) count++;
    return count;
  };

  return (
    <VibeModal
      open={isOpen}
      onClose={onClose}
      title="Filter Items"
      size="large"
    >
      <div className="space-y-6">
        {/* Quick Filters */}
        {showQuickFilters && quickFilters.length > 0 && (
          <VibeBox>
            <div className="space-y-3">
              <Text type="text2" weight="medium">Quick Filters</Text>
              <VibeFlex gap="small" className="flex-wrap">
                {quickFilters.map((quickFilter) => (
                  <VibeButton
                    key={quickFilter.id}
                    kind="secondary"
                    size="small"
                    onClick={() => handleQuickFilter(quickFilter)}
                  >
                    {quickFilter.label}
                  </VibeButton>
                ))}
              </VibeFlex>
            </div>
          </VibeBox>
        )}

        {/* Status Filter */}
        <VibeBox>
          <div className="space-y-3">
            <VibeFlex align="center" gap="small">
              <Flag className="h-4 w-4 text-gray-500" />
              <Text type="text2" weight="medium">Status</Text>
            </VibeFlex>
            
            <div className="grid grid-cols-2 gap-2">
              {statusOptions.map((option) => (
                <VibeCheckbox
                  key={option.value}
                  checked={localFilters.status?.includes(option.value) || false}
                  onChange={(event) => handleMultiSelectChange('status', option.value, event.target.checked)}
                  label={
                    <VibeFlex align="center" gap="small">
                      <VibeBadge 
                        type="indicator" 
                        color={option.color as any || 'primary'} 
                        text={option.label} 
                      />
                    </VibeFlex>
                  }
                />
              ))}
            </div>
          </div>
        </VibeBox>

        {/* Priority Filter */}
        <VibeBox>
          <div className="space-y-3">
            <VibeFlex align="center" gap="small">
              <Flag className="h-4 w-4 text-gray-500" />
              <Text type="text2" weight="medium">Priority</Text>
            </VibeFlex>
            
            <div className="grid grid-cols-2 gap-2">
              {priorityOptions.map((option) => (
                <VibeCheckbox
                  key={option.value}
                  checked={localFilters.priority?.includes(option.value) || false}
                  onChange={(event) => handleMultiSelectChange('priority', option.value, event.target.checked)}
                  label={
                    <VibeFlex align="center" gap="small">
                      <VibeBadge 
                        type="indicator" 
                        color={option.color as any || 'primary'} 
                        text={option.label} 
                      />
                    </VibeFlex>
                  }
                />
              ))}
            </div>
          </div>
        </VibeBox>

        {/* Assignee Filter */}
        {assigneeOptions.length > 0 && (
          <VibeBox>
            <div className="space-y-3">
              <VibeFlex align="center" gap="small">
                <User className="h-4 w-4 text-gray-500" />
                <Text type="text2" weight="medium">Assignee</Text>
              </VibeFlex>
              
              <div className="space-y-2">
                <VibeCheckbox
                  checked={localFilters.assignee?.includes('unassigned') || false}
                  onChange={(event) => handleMultiSelectChange('assignee', 'unassigned', event.target.checked)}
                  label="Unassigned"
                />
                {assigneeOptions.map((option) => (
                  <VibeCheckbox
                    key={option.value}
                    checked={localFilters.assignee?.includes(option.value) || false}
                    onChange={(event) => handleMultiSelectChange('assignee', option.value, event.target.checked)}
                    label={
                      <VibeFlex align="center" gap="small">
                        <Text type="text2">{option.label}</Text>
                      </VibeFlex>
                    }
                  />
                ))}
              </div>
            </div>
          </VibeBox>
        )}

        {/* Tags Filter */}
        {tagOptions.length > 0 && (
          <VibeBox>
            <div className="space-y-3">
              <VibeFlex align="center" gap="small">
                <Tag className="h-4 w-4 text-gray-500" />
                <Text type="text2" weight="medium">Tags</Text>
              </VibeFlex>
              
              <div className="grid grid-cols-2 gap-2">
                {tagOptions.map((tag) => (
                  <VibeCheckbox
                    key={tag}
                    checked={localFilters.tags?.includes(tag) || false}
                    onChange={(event) => handleMultiSelectChange('tags', tag, event.target.checked)}
                    label={
                      <VibeBadge 
                        type="indicator" 
                        color="dark" 
                        text={tag} 
                      />
                    }
                  />
                ))}
              </div>
            </div>
          </VibeBox>
        )}

        {/* Due Date Filter */}
        <VibeBox>
          <div className="space-y-3">
            <VibeFlex align="center" gap="small">
              <Calendar className="h-4 w-4 text-gray-500" />
              <Text type="text2" weight="medium">Due Date</Text>
            </VibeFlex>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Text type="text2" color="secondary" className="mb-2">From</Text>
                <DatePicker
                  date={localFilters.dueDate?.from ? moment(localFilters.dueDate.from) : undefined}
                  onPickDate={(date: any) => handleFilterChange('dueDate', {
                    ...localFilters.dueDate,
                    from: date?.toISOString()
                  })}
                  className="w-full"
                />
              </div>
              <div>
                <Text type="text2" color="secondary" className="mb-2">To</Text>
                <DatePicker
                  date={localFilters.dueDate?.to ? moment(localFilters.dueDate.to) : undefined}
                  onPickDate={(date: any) => handleFilterChange('dueDate', {
                    ...localFilters.dueDate,
                    to: date?.toISOString()
                  })}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </VibeBox>

        {/* Progress Filter */}
        <VibeBox>
          <div className="space-y-3">
            <Text type="text2" weight="medium">Progress (%)</Text>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Text type="text2" color="secondary" className="mb-2">Min</Text>
                <VibeTextField
                  type="number"
                  value={localFilters.progress?.min?.toString() || ''}
                  onChange={(value: string) => handleFilterChange('progress', {
                    ...localFilters.progress,
                    min: value ? parseInt(value) : undefined
                  })}
                  placeholder="0"
                  min="0"
                  max="100"
                />
              </div>
              <div>
                <Text type="text2" color="secondary" className="mb-2">Max</Text>
                <VibeTextField
                  type="number"
                  value={localFilters.progress?.max?.toString() || ''}
                  onChange={(value: string) => handleFilterChange('progress', {
                    ...localFilters.progress,
                    max: value ? parseInt(value) : undefined
                  })}
                  placeholder="100"
                  min="0"
                  max="100"
                />
              </div>
            </div>
          </div>
        </VibeBox>

        {/* Budget Filter */}
        <VibeBox>
          <div className="space-y-3">
            <Text type="text2" weight="medium">Budget ($)</Text>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Text type="text2" color="secondary" className="mb-2">Min</Text>
                <VibeTextField
                  type="number"
                  value={localFilters.budget?.min?.toString() || ''}
                  onChange={(value: string) => handleFilterChange('budget', {
                    ...localFilters.budget,
                    min: value ? parseFloat(value) : undefined
                  })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Text type="text2" color="secondary" className="mb-2">Max</Text>
                <VibeTextField
                  type="number"
                  value={localFilters.budget?.max?.toString() || ''}
                  onChange={(value: string) => handleFilterChange('budget', {
                    ...localFilters.budget,
                    max: value ? parseFloat(value) : undefined
                  })}
                  placeholder="10000.00"
                />
              </div>
            </div>
          </div>
        </VibeBox>

        {/* Actions */}
        <VibeFlex align="center" justify="space-between" className="pt-4 border-t">
          <div>
            <VibeButton
              kind="tertiary"
              onClick={handleClearFilters}
              disabled={getActiveFilterCount() === 0}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Clear All ({getActiveFilterCount()})
            </VibeButton>
          </div>

          <VibeFlex gap="medium">
            <VibeButton
              kind="tertiary"
              onClick={onClose}
            >
              Cancel
            </VibeButton>
            <VibeButton
              kind="primary"
              onClick={handleApplyFilters}
            >
              Apply Filters
              {getActiveFilterCount() > 0 && (
                <VibeBadge 
                  type="counter" 
                  color="primary" 
                  text={getActiveFilterCount().toString()}
                  className="ml-2"
                />
              )}
            </VibeButton>
          </VibeFlex>
        </VibeFlex>
      </div>
    </VibeModal>
  );
}