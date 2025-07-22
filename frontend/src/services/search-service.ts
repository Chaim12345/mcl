import apiClient from './api-client';
import { BoardItem } from '@/types';

export interface SearchResult {
  items: BoardItem[];
  highlights?: Record<string, string[]>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface SearchOptions {
  limit?: number;
  offset?: number;
  saveHistory?: boolean;
  includeFieldValues?: boolean;
  searchInColumns?: string[];
  minRelevance?: number;
  highlightResults?: boolean;
  sortBy?: 'relevance' | 'created' | 'updated';
  sortDirection?: 'asc' | 'desc';
}

/**
 * Search board items
 */
export const searchBoardItems = async (
  boardId: string,
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult> => {
  const params = new URLSearchParams({
    q: query,
    ...(options.limit !== undefined && { limit: options.limit.toString() }),
    ...(options.offset !== undefined && { offset: options.offset.toString() }),
    ...(options.saveHistory !== undefined && { saveHistory: options.saveHistory.toString() }),
    ...(options.includeFieldValues !== undefined && { includeFieldValues: options.includeFieldValues.toString() }),
    ...(options.searchInColumns && { searchInColumns: options.searchInColumns.join(',') }),
    ...(options.minRelevance !== undefined && { minRelevance: options.minRelevance.toString() }),
    ...(options.highlightResults !== undefined && { highlightResults: options.highlightResults.toString() }),
    ...(options.sortBy && { sortBy: options.sortBy }),
    ...(options.sortDirection && { sortDirection: options.sortDirection }),
  });
  
  const response = await apiClient.get(`/boards/${boardId}/search?${params.toString()}`);
  return response.data;
};

/**
 * Get search history
 */
export const getSearchHistory = async (
  limit?: number,
  boardId?: string
): Promise<{ query: string; count: number; lastSearched: string }[]> => {
  const params = new URLSearchParams({
    ...(limit !== undefined && { limit: limit.toString() }),
    ...(boardId && { boardId }),
  });
  
  const response = await apiClient.get(`/search/history?${params.toString()}`);
  return response.data;
};

/**
 * Clear search history
 */
export const clearSearchHistory = async (): Promise<void> => {
  await apiClient.delete('/search/history');
};

/**
 * Get search suggestions
 */
export const getSearchSuggestions = async (
  query: string,
  options: {
    boardId?: string;
    limit?: number;
    includeGenerated?: boolean;
  } = {}
): Promise<string[]> => {
  const params = new URLSearchParams({
    q: query,
    ...(options.boardId && { boardId: options.boardId }),
    ...(options.limit !== undefined && { limit: options.limit.toString() }),
    ...(options.includeGenerated !== undefined && { includeGenerated: options.includeGenerated.toString() }),
  });
  
  const response = await apiClient.get(`/search/suggestions?${params.toString()}`);
  return response.data;
};

/**
 * Get trending search terms
 */
export const getTrendingSearchTerms = async (
  limit?: number,
  boardId?: string
): Promise<{ query: string; count: number }[]> => {
  const params = new URLSearchParams({
    ...(limit !== undefined && { limit: limit.toString() }),
    ...(boardId && { boardId }),
  });
  
  const response = await apiClient.get(`/search/trending?${params.toString()}`);
  return response.data;
};

/**
 * Get related search terms
 */
export const getRelatedSearchTerms = async (
  query: string,
  limit?: number
): Promise<string[]> => {
  const params = new URLSearchParams({
    q: query,
    ...(limit !== undefined && { limit: limit.toString() }),
  });
  
  const response = await apiClient.get(`/search/related?${params.toString()}`);
  return response.data;
};