import apiClient from './api-client';
import { ViewDefinition, FilterGroup, SortDefinition } from '@/types/filter';

/**
 * Get saved views for a board
 */
export const getSavedViews = async (
  boardId: string,
  options: {
    includeShared?: boolean;
    includeGlobal?: boolean;
    includeTemplates?: boolean;
  } = {}
): Promise<ViewDefinition[]> => {
  const params = new URLSearchParams({
    ...(options.includeShared !== undefined && { includeShared: options.includeShared.toString() }),
    ...(options.includeGlobal !== undefined && { includeGlobal: options.includeGlobal.toString() }),
    ...(options.includeTemplates !== undefined && { includeTemplates: options.includeTemplates.toString() }),
  });
  
  const response = await apiClient.get(`/boards/${boardId}/views?${params.toString()}`);
  return response.data;
};

/**
 * Get default view for a board
 */
export const getDefaultView = async (
  boardId: string,
  options: {
    useGlobal?: boolean;
  } = {}
): Promise<ViewDefinition | null> => {
  const params = new URLSearchParams({
    ...(options.useGlobal !== undefined && { useGlobal: options.useGlobal.toString() }),
  });
  
  try {
    const response = await apiClient.get(`/boards/${boardId}/default-view?${params.toString()}`);
    return response.data;
  } catch (error) {
    // Return null if no default view is found
    return null;
  }
};

/**
 * Save a view
 */
export const saveView = async (
  boardId: string,
  view: {
    name: string;
    filter?: FilterGroup;
    sorts?: SortDefinition[];
    isDefault?: boolean;
    isShared?: boolean;
  }
): Promise<ViewDefinition> => {
  const response = await apiClient.post(`/boards/${boardId}/views`, view);
  return response.data;
};

/**
 * Delete a view
 */
export const deleteView = async (viewId: string): Promise<void> => {
  await apiClient.delete(`/views/${viewId}`);
};

/**
 * Share or unshare a view
 */
export const shareView = async (
  viewId: string,
  isShared: boolean
): Promise<ViewDefinition> => {
  const response = await apiClient.put(`/views/${viewId}/share`, { isShared });
  return response.data;
};

/**
 * Set a view as the default for a board
 */
export const setDefaultView = async (
  viewId: string,
  boardId: string,
  options: {
    isGlobal?: boolean;
  } = {}
): Promise<boolean> => {
  const response = await apiClient.put(`/boards/${boardId}/default-view/${viewId}`, options);
  return response.data.success;
};

/**
 * Copy a view
 */
export const copyView = async (
  viewId: string,
  name: string
): Promise<ViewDefinition> => {
  const response = await apiClient.post(`/views/${viewId}/copy`, { name });
  return response.data;
};

/**
 * Get view templates
 */
export const getViewTemplates = async (
  options: {
    category?: string;
    createdBy?: string;
  } = {}
): Promise<ViewDefinition[]> => {
  const params = new URLSearchParams({
    ...(options.category && { category: options.category }),
    ...(options.createdBy && { createdBy: options.createdBy }),
  });
  
  const response = await apiClient.get(`/view-templates?${params.toString()}`);
  return response.data;
};

/**
 * Create a view from a template
 */
export const createViewFromTemplate = async (
  templateId: string,
  boardId: string,
  name: string
): Promise<ViewDefinition> => {
  const response = await apiClient.post(`/boards/${boardId}/views/from-template/${templateId}`, { name });
  return response.data;
};