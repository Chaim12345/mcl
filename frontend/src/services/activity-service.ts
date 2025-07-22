import { api } from './api-client';
import { Activity, PaginatedActivities } from '@/types';

export const activityService = {
  // Get all activities with filtering and pagination
  getActivities: (params?: {
    page?: number;
    limit?: number;
    sortBy?: 'createdAt';
    sortOrder?: 'asc' | 'desc';
    itemId?: string;
    userId?: string;
    entityType?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
  }) => 
    api.get<PaginatedActivities>('/activities', { params }),
    
  // Get activities for a specific item
  getItemActivities: (itemId: string, params?: {
    page?: number;
    limit?: number;
    sortBy?: 'createdAt';
    sortOrder?: 'asc' | 'desc';
  }) => 
    api.get<PaginatedActivities>(`/activities/item/${itemId}`, { params }),
    
  // Get activities for a specific user
  getUserActivities: (userId: string, params?: {
    page?: number;
    limit?: number;
    sortBy?: 'createdAt';
    sortOrder?: 'asc' | 'desc';
  }) => 
    api.get<PaginatedActivities>(`/activities/user/${userId}`, { params }),
    
  // Get activity statistics
  getActivityStats: (params?: {
    itemId?: string;
    startDate?: string;
    endDate?: string;
  }) => 
    api.get<{
      totalActivities: number;
      activitiesByType: Record<string, number>;
      activitiesByUser: Array<{ userId: string; userName: string; count: number }>;
      recentActivityCount: number;
    }>('/activities/stats', { params }),
    
  // Export activities to CSV
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