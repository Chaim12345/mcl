import { AuthenticatedSocket } from './socketService.js';
import { notificationService } from './notificationService.js';

export class NotificationEventHandler {
  /**
   * Handle marking notification as read
   */
  static async handleMarkAsRead(socket: AuthenticatedSocket, data: {
    notificationId: string;
  }): Promise<void> {
    try {
      await notificationService.markAsRead(data.notificationId, socket.userId);
      
      // Confirm to client
      socket.emit('notification-marked-read', {
        notificationId: data.notificationId,
        success: true,
      });
    } catch (error) {
      console.error('Error handling mark notification as read:', error);
      socket.emit('error', { 
        type: 'NOTIFICATION_MARK_READ_ERROR',
        message: 'Failed to mark notification as read' 
      });
    }
  }

  /**
   * Handle marking multiple notifications as read
   */
  static async handleMarkMultipleAsRead(socket: AuthenticatedSocket, data: {
    notificationIds: string[];
  }): Promise<void> {
    try {
      await notificationService.markMultipleAsRead(data.notificationIds, socket.userId);
      
      // Confirm to client
      socket.emit('notifications-marked-read', {
        notificationIds: data.notificationIds,
        success: true,
      });
    } catch (error) {
      console.error('Error handling mark multiple notifications as read:', error);
      socket.emit('error', { 
        type: 'NOTIFICATIONS_MARK_READ_ERROR',
        message: 'Failed to mark notifications as read' 
      });
    }
  }

  /**
   * Handle marking all notifications as read
   */
  static async handleMarkAllAsRead(socket: AuthenticatedSocket): Promise<void> {
    try {
      await notificationService.markAllAsRead(socket.userId);
      
      // Confirm to client
      socket.emit('all-notifications-marked-read', {
        success: true,
      });
    } catch (error) {
      console.error('Error handling mark all notifications as read:', error);
      socket.emit('error', { 
        type: 'ALL_NOTIFICATIONS_MARK_READ_ERROR',
        message: 'Failed to mark all notifications as read' 
      });
    }
  }

  /**
   * Handle deleting notification
   */
  static async handleDeleteNotification(socket: AuthenticatedSocket, data: {
    notificationId: string;
  }): Promise<void> {
    try {
      await notificationService.deleteNotification(data.notificationId, socket.userId);
      
      // Confirm to client
      socket.emit('notification-deleted', {
        notificationId: data.notificationId,
        success: true,
      });
    } catch (error) {
      console.error('Error handling delete notification:', error);
      socket.emit('error', { 
        type: 'NOTIFICATION_DELETE_ERROR',
        message: 'Failed to delete notification' 
      });
    }
  }

  /**
   * Handle updating notification preferences
   */
  static async handleUpdatePreferences(socket: AuthenticatedSocket, data: {
    preferences: {
      emailNotifications?: boolean;
      pushNotifications?: boolean;
      mentionNotifications?: boolean;
      assignmentNotifications?: boolean;
      commentNotifications?: boolean;
      dueDateReminders?: boolean;
      workspaceInvitations?: boolean;
    };
  }): Promise<void> {
    try {
      const updatedPreferences = await notificationService.updateUserPreferences(
        socket.userId, 
        data.preferences
      );
      
      // Confirm to client
      socket.emit('notification-preferences-updated', {
        preferences: updatedPreferences,
        success: true,
      });
    } catch (error) {
      console.error('Error handling update notification preferences:', error);
      socket.emit('error', { 
        type: 'NOTIFICATION_PREFERENCES_UPDATE_ERROR',
        message: 'Failed to update notification preferences' 
      });
    }
  }
}