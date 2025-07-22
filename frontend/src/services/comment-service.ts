import { api } from './api-client';
import { Comment } from '@/types';

export const commentService = {
  // Get all comments for an item
  getItemComments: (itemId: string) => 
    api.get<Comment[]>(`/comments/item/${itemId}`),
    
  // Get a specific comment by ID
  getComment: (commentId: string) => 
    api.get<Comment>(`/comments/${commentId}`),
    
  // Create a new comment
  createComment: (data: {
    content: string;
    itemId: string;
    parentId?: string;
    mentions?: string[];
  }) => 
    api.post<Comment>('/comments', data),
    
  // Update an existing comment
  updateComment: (commentId: string, data: {
    content: string;
    mentions?: string[];
  }) => 
    api.put<Comment>(`/comments/${commentId}`, data),
    
  // Delete a comment
  deleteComment: (commentId: string) => 
    api.delete<void>(`/comments/${commentId}`),
};