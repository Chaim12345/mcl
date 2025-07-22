import { api } from './api-client';
import { Board, BoardColumn, BoardItem, ItemFieldValue, Comment, PaginatedActivities } from '@/types';

export const boardService = {
  getBoards: (workspaceId: string) => 
    api.get<Board[]>(`/workspaces/${workspaceId}/boards`),
    
  getBoard: (boardId: string) => 
    api.get<Board>(`/boards/${boardId}`),
    
  createBoard: (workspaceId: string, data: { 
    name: string; 
    description?: string;
    color: string;
  }) => 
    api.post<Board>(`/workspaces/${workspaceId}/boards`, data),
    
  updateBoard: (boardId: string, data: { 
    name?: string; 
    description?: string;
    color?: string;
  }) => 
    api.put<Board>(`/boards/${boardId}`, data),
    
  deleteBoard: (boardId: string) => 
    api.delete<{ success: boolean }>(`/boards/${boardId}`),
    
  // Board favorites
  getFavorites: async () => {
    try {
      const result = await api.get<Board[]>('/boards/favorites');
      return result || [];
    } catch (error) {
      console.error('Failed to fetch favorite boards:', error);
      return [];
    }
  },
    
  addFavorite: (boardId: string) => 
    api.post<{ success: boolean }>(`/boards/${boardId}/favorite`),
    
  removeFavorite: (boardId: string) => 
    api.delete<{ success: boolean }>(`/boards/${boardId}/favorite`),
    
  // Recent boards
  getRecentBoards: () => 
    api.get<Board[]>('/boards/recent'),
    
  // Board columns
  getBoardColumns: (boardId: string) => 
    api.get<BoardColumn[]>(`/boards/${boardId}/columns`),
    
  createBoardColumn: (boardId: string, data: {
    name: string;
    type: string;
    settings?: Record<string, any>;
  }) => 
    api.post<BoardColumn>(`/boards/${boardId}/columns`, data),
    
  updateBoardColumn: (columnId: string, data: {
    name?: string;
    settings?: Record<string, any>;
  }) => 
    api.put<BoardColumn>(`/columns/${columnId}`, data),
    
  deleteBoardColumn: (columnId: string) => 
    api.delete<{ success: boolean }>(`/columns/${columnId}`),
    
  reorderBoardColumns: (boardId: string, columnIds: string[]) => 
    api.put<{ success: boolean }>(`/boards/${boardId}/columns/reorder`, { columnIds }),
    
  // Board items
  getBoardItems: (boardId: string) => 
    api.get<BoardItem[]>(`/boards/${boardId}/items`),
    
  getBoardItem: (itemId: string) => 
    api.get<BoardItem>(`/items/${itemId}`),
    
  createBoardItem: (boardId: string, data: {
    name: string;
    fieldValues?: Record<string, any>[];
  }) => 
    api.post<BoardItem>(`/boards/${boardId}/items`, data),
    
  updateBoardItem: (itemId: string, data: {
    name?: string;
    position?: number;
  }) => 
    api.put<BoardItem>(`/items/${itemId}`, data),
    
  deleteBoardItem: (itemId: string) => 
    api.delete<{ success: boolean }>(`/items/${itemId}`),
    
  reorderBoardItems: (boardId: string, itemIds: string[]) => 
    api.put<{ success: boolean }>(`/boards/${boardId}/items/reorder`, { itemIds }),
    
  // Item field values
  getItemFieldValues: (itemId: string) => 
    api.get<ItemFieldValue[]>(`/items/${itemId}/fields`),
    
  updateItemField: (itemId: string, columnId: string, value: any) => 
    api.put<ItemFieldValue>(`/items/${itemId}/fields/${columnId}`, { value }),
    
  // Comments
  getItemComments: (itemId: string) => 
    api.get<Comment[]>(`/comments/item/${itemId}`),
    
  createComment: (data: { content: string; itemId: string; parentId?: string; mentions?: string[] }) => 
    api.post<Comment>('/comments', data),
    
  updateComment: (commentId: string, data: { content: string; mentions?: string[] }) => 
    api.put<Comment>(`/comments/${commentId}`, data),
    
  deleteComment: (commentId: string) => 
    api.delete<void>(`/comments/${commentId}`),
    
  // Activities
  getItemActivities: (itemId: string, params?: {
    page?: number;
    limit?: number;
    sortBy?: 'createdAt';
    sortOrder?: 'asc' | 'desc';
  }) => 
    api.get<PaginatedActivities>(`/activities/item/${itemId}`, { params }),
    
  exportActivities: (params?: {
    itemId?: string;
    userId?: string;
    entityType?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
  }) => 
    api.get<Blob>('/activities/export', { 
      params,
      responseType: 'blob',
    }),
};