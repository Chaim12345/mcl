import React, { useState, useMemo } from 'react';
import { 
  VibeTable, 
  VibeTableContainer,
  type VibeTableColumn 
} from '@/components/vibe/vibe-table';
import { VibeButton, VibeTextField, VibeBadge, VibeAvatar, VibeFlex, VibeBox } from '@/components/vibe';
import { Text } from '@vibe/core';
import { 
  Plus, 
  Filter, 
  Search, 
  MoreHorizontal, 
  Edit, 
  Trash2,
  Calendar,
  User,
  Flag
} from 'lucide-react';

// Types for board items
export interface BoardItem {
  id: string;
  name: string;
  status: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  assignee?: {
    id: string;
    name: string;
    avatar?: string;
  };
  dueDate?: string;
  tags?: string[];
  progress?: number;
  budget?: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VibeBoardTableProps {
  // Data
  items: BoardItem[];
  columns: VibeTableColumn[];
  
  // State
  loading?: boolean;
  error?: string;
  
  // Interactions
  onItemClick?: (item: BoardItem) => void;
  onItemEdit?: (item: BoardItem) => void;
  onItemDelete?: (item: BoardItem) => void;
  onAddItem?: () => void;
  
  // Filtering and Search
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  filters?: Record<string, any>;
  onFiltersChange?: (filters: Record<string, any>) => void;
  
  // Sorting
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (columnId: string, direction: 'asc' | 'desc') => void;
  
  // Selection
  selectedItems?: string[];
  onSelectionChange?: (selectedItems: string[]) => void;
  
  // Customization
  showSearch?: boolean;
  showFilters?: boolean;
  showAddButton?: boolean;
  emptyMessage?: string;
  
  // Board specific
  boardId?: string;
  workspaceId?: string;
}

export function VibeBoardTable({
  items,
  columns,
  loading = false,
  error,
  onItemClick,
  onItemEdit,
  onItemDelete,
  onAddItem,
  searchQuery = '',
  onSearchChange,
  filters = {},
  onFiltersChange,
  sortBy,
  sortDirection = 'asc',
  onSort,
  selectedItems = [],
  onSelectionChange,
  showSearch = true,
  showFilters = true,
  showAddButton = true,
  emptyMessage = 'No items found',
  boardId,
  workspaceId
}: VibeBoardTableProps) {
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);

  // Filter and search items
  const filteredItems = useMemo(() => {
    let filtered = [...items];

    // Apply search filter
    const query = onSearchChange ? searchQuery : localSearchQuery;
    if (query.trim()) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        item.description?.toLowerCase().includes(query.toLowerCase()) ||
        item.assignee?.name.toLowerCase().includes(query.toLowerCase()) ||
        item.tags?.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
      );
    }

    // Apply other filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'all') {
        filtered = filtered.filter(item => {
          const itemValue = item[key as keyof BoardItem];
          if (Array.isArray(itemValue)) {
            return itemValue.includes(value);
          }
          return itemValue === value;
        });
      }
    });

    return filtered;
  }, [items, searchQuery, localSearchQuery, filters, onSearchChange]);

  // Enhanced columns with actions
  const enhancedColumns: VibeTableColumn[] = useMemo(() => {
    const baseColumns = columns.map(col => ({
      ...col,
      render: col.render || ((value: any, row: BoardItem) => {
        // Default renderers for common column types
        switch (col.id) {
          case 'name':
            return (
              <VibeFlex align="center" gap="small">
                <Text type="text2" weight="medium">{value}</Text>
              </VibeFlex>
            );
          
          case 'status':
            return (
              <VibeBadge 
                type="indicator" 
                color={getStatusColor(value)} 
                text={value} 
              />
            );
          
          case 'priority':
            return (
              <VibeBadge 
                type="indicator" 
                color={getPriorityColor(value)} 
                text={value} 
              />
            );
          
          case 'assignee':
            return row.assignee ? (
              <VibeFlex align="center" gap="small">
                <VibeAvatar 
                  type={row.assignee.avatar ? 'img' : 'text'}
                  src={row.assignee.avatar}
                  text={row.assignee.name.split(' ').map(n => n[0]).join('')}
                  size="small"
                />
                <Text type="text2">{row.assignee.name}</Text>
              </VibeFlex>
            ) : (
              <Text type="text2" color="secondary">Unassigned</Text>
            );
          
          case 'dueDate':
            return value ? (
              <VibeFlex align="center" gap="small">
                <Calendar className="h-4 w-4 text-gray-500" />
                <Text type="text2">{new Date(value).toLocaleDateString()}</Text>
              </VibeFlex>
            ) : (
              <Text type="text2" color="secondary">No due date</Text>
            );
          
          case 'progress':
            return value !== undefined ? (
              <VibeFlex align="center" gap="small">
                <div className="w-16 h-2 bg-gray-200 rounded-full">
                  <div 
                    className="h-2 bg-blue-500 rounded-full" 
                    style={{ width: `${value}%` }}
                  />
                </div>
                <Text type="text2" color="secondary">{value}%</Text>
              </VibeFlex>
            ) : null;
          
          case 'budget':
            return value ? (
              <Text type="text2" weight="medium">
                ${value.toLocaleString()}
              </Text>
            ) : null;
          
          case 'tags':
            return value && value.length > 0 ? (
              <VibeFlex gap="small" className="flex-wrap">
                {value.slice(0, 3).map((tag: string, index: number) => (
                  <VibeBadge 
                    key={index}
                    type="indicator" 
                    color="dark" 
                    text={tag}
                  />
                ))}
                {value.length > 3 && (
                  <Text type="text2" color="secondary">+{value.length - 3}</Text>
                )}
              </VibeFlex>
            ) : null;
          
          default:
            return <Text type="text2">{value}</Text>;
        }
      })
    }));

    // Add actions column if handlers are provided
    if (onItemEdit || onItemDelete) {
      baseColumns.push({
        id: 'actions',
        title: 'Actions',
        width: 120,
        render: (_: any, row: BoardItem) => (
          <VibeFlex align="center" gap="small">
            {onItemEdit && (
              <VibeButton 
                kind="tertiary" 
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onItemEdit(row);
                }}
                ariaLabel={`Edit ${row.name}`}
              >
                <Edit className="h-4 w-4" />
              </VibeButton>
            )}
            {onItemDelete && (
              <VibeButton 
                kind="tertiary" 
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onItemDelete(row);
                }}
                ariaLabel={`Delete ${row.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </VibeButton>
            )}
            <VibeButton 
              kind="tertiary" 
              size="small"
              ariaLabel={`More actions for ${row.name}`}
            >
              <MoreHorizontal className="h-4 w-4" />
            </VibeButton>
          </VibeFlex>
        )
      });
    }

    return baseColumns;
  }, [columns, onItemEdit, onItemDelete]);

  const handleSearchChange = (value: string) => {
    if (onSearchChange) {
      onSearchChange(value);
    } else {
      setLocalSearchQuery(value);
    }
  };

  const handleRowClick = (item: BoardItem) => {
    if (onItemClick) {
      onItemClick(item);
    }
  };

  // Helper functions for styling
  const getStatusColor = (status: string): 'primary' | 'dark' | 'negative' | 'light' | 'notification' => {
    const statusMap: Record<string, 'primary' | 'dark' | 'negative' | 'light' | 'notification'> = {
      'Completed': 'primary',
      'Done': 'primary',
      'In Progress': 'notification',
      'Active': 'notification',
      'Planning': 'light',
      'To Do': 'light',
      'Blocked': 'negative',
      'Cancelled': 'negative',
      'Draft': 'dark'
    };
    return statusMap[status] || 'primary';
  };

  const getPriorityColor = (priority: string): 'negative' | 'notification' | 'primary' | 'dark' => {
    const priorityMap: Record<string, 'negative' | 'notification' | 'primary' | 'dark'> = {
      'Critical': 'negative',
      'High': 'notification',
      'Medium': 'primary',
      'Low': 'dark'
    };
    return priorityMap[priority] || 'primary';
  };

  return (
    <div className="space-y-4">
      {/* Header with Search and Actions */}
      {(showSearch || showFilters || showAddButton) && (
        <VibeFlex align="center" justify="space-between" className="flex-wrap gap-4">
          <VibeFlex align="center" gap="medium" className="flex-1">
            {showSearch && (
              <div className="flex-1 max-w-md">
                <VibeTextField
                  placeholder="Search items..."
                  value={onSearchChange ? searchQuery : localSearchQuery}
                  onChange={handleSearchChange}
                  iconName="search"
                />
              </div>
            )}
            
            {showFilters && (
              <VibeButton kind="secondary" size="medium">
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </VibeButton>
            )}
          </VibeFlex>
          
          {showAddButton && onAddItem && (
            <VibeButton kind="primary" size="medium" onClick={onAddItem}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </VibeButton>
          )}
        </VibeFlex>
      )}

      {/* Selection Summary */}
      {selectedItems.length > 0 && (
        <VibeBox 
          backgroundColor="primaryBackgroundColor" 
          padding="medium" 
          rounded="medium"
        >
          <VibeFlex align="center" justify="space-between">
            <Text type="text2" weight="medium">
              {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected
            </Text>
            <VibeFlex gap="small">
              <VibeButton kind="secondary" size="small">
                Bulk Edit
              </VibeButton>
              <VibeButton kind="secondary" size="small">
                Delete Selected
              </VibeButton>
              <VibeButton 
                kind="tertiary" 
                size="small"
                onClick={() => onSelectionChange?.([])}
              >
                Clear Selection
              </VibeButton>
            </VibeFlex>
          </VibeFlex>
        </VibeBox>
      )}

      {/* Table */}
      <VibeTableContainer>
        <VibeTable
          columns={enhancedColumns}
          data={filteredItems}
          size="medium"
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSort={onSort}
          onRowClick={handleRowClick}
          selectedRows={selectedItems}
          onSelectionChange={onSelectionChange}
          dataState={{
            isLoading: loading,
            isError: !!error
          }}
          emptyState={
            <VibeBox padding="large" className="text-center">
              <Text type="text1" color="secondary">{emptyMessage}</Text>
              {showAddButton && onAddItem && (
                <div className="mt-4">
                  <VibeButton kind="primary" onClick={onAddItem}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Item
                  </VibeButton>
                </div>
              )}
            </VibeBox>
          }
          errorState={
            <VibeBox padding="large" className="text-center">
              <Text type="text1" color="negative">
                {error || 'Failed to load items'}
              </Text>
            </VibeBox>
          }
        />
      </VibeTableContainer>

      {/* Footer with Item Count */}
      <VibeFlex align="center" justify="space-between">
        <Text type="text2" color="secondary">
          Showing {filteredItems.length} of {items.length} items
        </Text>
        
        {filteredItems.length !== items.length && (
          <VibeButton 
            kind="tertiary" 
            size="small"
            onClick={() => {
              handleSearchChange('');
              onFiltersChange?.({});
            }}
          >
            Clear Filters
          </VibeButton>
        )}
      </VibeFlex>
    </div>
  );
}