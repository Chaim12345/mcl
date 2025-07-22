import apiClient from './api-client';
import { FilterGroup, FilterDefinition, SortDefinition, FilterOperator, LogicalOperator } from '@/types/filter';
import { BoardItem } from '@/types';

/**
 * Apply complex filter to board items
 */
export const applyFilter = async (
  boardId: string,
  filter: FilterGroup,
  sorts?: SortDefinition[]
): Promise<BoardItem[]> => {
  const response = await apiClient.post(`/boards/${boardId}/filter`, { filter, sorts });
  return response.data;
};

/**
 * Apply simple filter to board items
 */
export const applySimpleFilter = async (
  boardId: string,
  criteria: {
    columnId?: string;
    status?: string;
    priority?: string;
    dueDateFrom?: Date;
    dueDateTo?: Date;
    searchTerm?: string;
  },
  sorts?: SortDefinition[]
): Promise<BoardItem[]> => {
  const response = await apiClient.post(`/boards/${boardId}/simple-filter`, { ...criteria, sorts });
  return response.data;
};

/**
 * Get saved filters for a board
 */
export const getSavedFilters = async (boardId: string): Promise<FilterDefinition[]> => {
  const response = await apiClient.get(`/boards/${boardId}/saved-filters`);
  return response.data;
};

/**
 * Save a filter
 */
export const saveFilter = async (
  boardId: string,
  filter: Omit<FilterDefinition, 'boardId' | 'createdBy' | 'createdAt' | 'updatedAt'>
): Promise<FilterDefinition> => {
  const response = await apiClient.post(`/boards/${boardId}/saved-filters`, filter);
  return response.data;
};

/**
 * Delete a saved filter
 */
export const deleteFilter = async (filterId: string): Promise<void> => {
  await apiClient.delete(`/saved-filters/${filterId}`);
};

/**
 * Get default filter presets
 */
export const getFilterPresets = (): { id: string; name: string; filter: FilterGroup; icon: string }[] => {
  return [
    {
      id: 'assigned-to-me',
      name: 'Assigned to me',
      icon: 'user',
      filter: {
        operator: LogicalOperator.AND,
        conditions: [
          {
            field: 'assignee',
            operator: FilterOperator.EQUALS,
            value: 'current_user'
          }
        ]
      }
    },
    {
      id: 'due-today',
      name: 'Due today',
      icon: 'calendar',
      filter: {
        operator: LogicalOperator.AND,
        conditions: [
          {
            field: 'dueDate',
            operator: FilterOperator.EQUALS,
            value: new Date().toISOString().split('T')[0]
          }
        ]
      }
    },
    {
      id: 'overdue',
      name: 'Overdue',
      icon: 'alert-circle',
      filter: {
        operator: LogicalOperator.AND,
        conditions: [
          {
            field: 'dueDate',
            operator: FilterOperator.LESS_THAN,
            value: new Date().toISOString().split('T')[0]
          },
          {
            field: 'status',
            operator: FilterOperator.NOT_EQUALS,
            value: 'Done'
          }
        ]
      }
    },
    {
      id: 'high-priority',
      name: 'High priority',
      icon: 'alert-triangle',
      filter: {
        operator: LogicalOperator.AND,
        conditions: [
          {
            field: 'priority',
            operator: FilterOperator.EQUALS,
            value: 'High'
          }
        ]
      }
    }
  ];
};