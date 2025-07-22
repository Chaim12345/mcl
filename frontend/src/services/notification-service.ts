import { ApiResponse } from '@/types';
import apiClient from './api-client';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message?: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: string;
}

export type NotificationType =
  | 'mention'
  | 'assignment'
  | 'comment'
  | 'item_updated'
  | 'board_shared'
  | 'workspace_invitation'
  | 'due_date_reminder'
  | 'system';

export interface NotificationPreferences {
  userId: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  mentionNotifications: boolean;
  assignmentNotifications: boolean;
  commentNotifications: boolean;
  dueDateReminders: boolean;
  workspaceInvitations: boolean;
}

export interface NotificationsResponse {
  notifications: Notification[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  unreadCount: number;
}

class NotificationService {
  /**
   * Get notifications for the current user
   */
  async getNotifications(options: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
    type?: NotificationType;
  } = {}): Promise<NotificationsResponse> {
    const { limit = 20, offset = 0, unreadOnly = false, type } = options;
    
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
      unreadOnly: unreadOnly.toString(),
    });
    
    if (type) {
      params.append('type', type);
    }
    
    const response = await apiClient.get<ApiResponse<NotificationsResponse>>(
      `/notifications?${params.toString()}`
    );
    
    return response.data.data;
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<number> {
    const response = await apiClient.get<ApiResponse<{ unreadCount: number }>>(
      '/notifications/unread-count'
    );
    
    return response.data.data.unreadCount;
  }

  /**
   * Mark notifications as read
   */
  async markAsRead(notificationIds: string[]): Promise<void> {
    await apiClient.put('/notifications/mark-read', {
      notificationIds,
    });
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<void> {
    await apiClient.put('/notifications/mark-all-read');
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    await apiClient.delete(`/notifications/${notificationId}`);
  }

  /**
   * Get notification preferences
   */
  async getPreferences(): Promise<NotificationPreferences> {
    const response = await apiClient.get<ApiResponse<NotificationPreferences>>(
      '/notifications/preferences'
    );
    
    return response.data.data;
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(preferences: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    const response = await apiClient.put<ApiResponse<NotificationPreferences>>(
      '/notifications/preferences',
      preferences
    );
    
    return response.data.data;
  }
}

export const notificationService = new NotificationService();
export default notificationService;