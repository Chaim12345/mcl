import { create } from 'zustand';
import { FilterGroup, FilterOperator, LogicalOperator, FilterCondition, FilterDefinition } from '@/types/filter';

interface FilterState {
  activeFilter: FilterGroup | null;
  savedFilters: FilterDefinition[];
  isFilterModalOpen: boolean;
  
  // Actions
  setActiveFilter: (filter: FilterGroup | null) => void;
  addFilterCondition: (condition: FilterCondition) => void;
  removeFilterCondition: (index: number) => void;
  updateFilterCondition: (index: number, condition: FilterCondition) => void;
  clearFilters: () => void;
  setSavedFilters: (filters: FilterDefinition[]) => void;
  addSavedFilter: (filter: FilterDefinition) => void;
  removeSavedFilter: (filterId: string) => void;
  setIsFilterModalOpen: (isOpen: boolean) => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  activeFilter: null,
  savedFilters: [],
  isFilterModalOpen: false,
  
  setActiveFilter: (filter) => set({ activeFilter: filter }),
  
  addFilterCondition: (condition) => set((state) => {
    const currentFilter = state.activeFilter || {
      operator: LogicalOperator.AND,
      conditions: []
    };
    
    return {
      activeFilter: {
        ...currentFilter,
        conditions: [...currentFilter.conditions, condition]
      }
    };
  }),
  
  removeFilterCondition: (index) => set((state) => {
    if (!state.activeFilter) return { activeFilter: null };
    
    const newConditions = [...state.activeFilter.conditions];
    newConditions.splice(index, 1);
    
    // If no conditions left, clear the filter
    if (newConditions.length === 0) {
      return { activeFilter: null };
    }
    
    return {
      activeFilter: {
        ...state.activeFilter,
        conditions: newConditions
      }
    };
  }),
  
  updateFilterCondition: (index, condition) => set((state) => {
    if (!state.activeFilter) return { activeFilter: null };
    
    const newConditions = [...state.activeFilter.conditions];
    newConditions[index] = condition;
    
    return {
      activeFilter: {
        ...state.activeFilter,
        conditions: newConditions
      }
    };
  }),
  
  clearFilters: () => set({ activeFilter: null }),
  
  setSavedFilters: (filters) => set({ savedFilters: filters }),
  
  addSavedFilter: (filter) => set((state) => ({
    savedFilters: [...state.savedFilters, filter]
  })),
  
  removeSavedFilter: (filterId) => set((state) => ({
    savedFilters: state.savedFilters.filter(f => f.id !== filterId)
  })),
  
  setIsFilterModalOpen: (isOpen) => set({ isFilterModalOpen: isOpen }),
}));