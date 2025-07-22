import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFilterStore } from '@/stores/filter-store';
import { getSavedFilters } from '@/services/filter-service';
import { FilterGroup } from '@/types/filter';

export function useFilter(boardId: string) {
  const { activeFilter, setActiveFilter, setSavedFilters } = useFilterStore();
  const [isLoading, setIsLoading] = useState(false);
  
  // Fetch saved filters
  const { data: filters, isLoading: isLoadingFilters  } = useQuery({
    queryKey: ['saved-filters', boardId],
    queryFn: () => getSavedFilters(boardId),
    enabled: !!boardId,
  
  });

  // Update store when data changes
  useEffect(() => {
    if (filters) {
      setSavedFilters(filters);
    }
  }, [filters, setSavedFilters]);
  
  // Set loading state
  useEffect(() => {
    setIsLoading(isLoadingFilters);
  }, [isLoadingFilters]);
  
  // Apply filter
  const applyFilter = (filter: FilterGroup | null) => {
    setActiveFilter(filter);
  };
  
  // Clear filter
  const clearFilter = () => {
    setActiveFilter(null);
  };
  
  return {
    activeFilter,
    savedFilters: filters || [],
    isLoading,
    applyFilter,
    clearFilter,
  };
}