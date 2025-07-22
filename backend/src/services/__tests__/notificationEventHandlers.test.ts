import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotificationEventHandler } from '../notificationEventHandlers.js';
import { notificationService } from '../notificationService.js';

// Mock dependencies
vi.mock('../notificationService.js', () => ({
  notificationService: {
    markAsRead: vi.fn(),
    markMultipleAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    deleteNotification: vi.fn(),
    updateUserPreferences: vi.fn(),
  },
}));

describe('NotificationEventHandler', () => {
  let mockSocket: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockSocket = {
      userId: 'user-123',
      emit: vi.fn(),
    };
  });

  describe('handleMarkAsRead', () => {
    it('should mark notification as read and emit success event', async () => {
      await NotificationEventHandler.handleMarkAsRead(mockSocket, {
        notificationId: 'notif-123',
      });

      expect(notificationService.markAsRead).toHaveBeenCalledWith('notif-123', 'user-123');
      expect(mockSocket.emit).toHaveBeenCalledWith('notification-marked-read', {
        notificationId: 'notif-123',
        success: true,
      });
    });

    it('should handle errors and emit error event', async () => {
      (notificationService.markAsRead as any).mockRejectedValueOnce(new Error('Test error'));

      await NotificationEventHandler.handleMarkAsRead(mockSocket, {
        notificationId: 'notif-123',
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        type: 'NOTIFICATION_MARK_READ_ERROR',
        message: 'Failed to mark notification as read',
      });
    });
  });

  describe('handleMarkMultipleAsRead', () => {
    it('should mark multiple notifications as read and emit success event', async () => {
      await NotificationEventHandler.handleMarkMultipleAsRead(mockSocket, {
        notificationIds: ['notif-1', 'notif-2'],
      });

      expect(notificationService.markMultipleAsRead).toHaveBeenCalledWith(['notif-1', 'notif-2'], 'user-123');
      expect(mockSocket.emit).toHaveBeenCalledWith('notifications-marked-read', {
        notificationIds: ['notif-1', 'notif-2'],
        success: true,
      });
    });

    it('should handle errors and emit error event', async () => {
      (notificationService.markMultipleAsRead as any).mockRejectedValueOnce(new Error('Test error'));

      await NotificationEventHandler.handleMarkMultipleAsRead(mockSocket, {
        notificationIds: ['notif-1', 'notif-2'],
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        type: 'NOTIFICATIONS_MARK_READ_ERROR',
        message: 'Failed to mark notifications as read',
      });
    });
  });

  describe('handleMarkAllAsRead', () => {
    it('should mark all notifications as read and emit success event', async () => {
      await NotificationEventHandler.handleMarkAllAsRead(mockSocket);

      expect(notificationService.markAllAsRead).toHaveBeenCalledWith('user-123');
      expect(mockSocket.emit).toHaveBeenCalledWith('all-notifications-marked-read', {
        success: true,
      });
    });

    it('should handle errors and emit error event', async () => {
      (notificationService.markAllAsRead as any).mockRejectedValueOnce(new Error('Test error'));

      await NotificationEventHandler.handleMarkAllAsRead(mockSocket);

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        type: 'ALL_NOTIFICATIONS_MARK_READ_ERROR',
        message: 'Failed to mark all notifications as read',
      });
    });
  });

  describe('handleDeleteNotification', () => {
    it('should delete notification and emit success event', async () => {
      await NotificationEventHandler.handleDeleteNotification(mockSocket, {
        notificationId: 'notif-123',
      });

      expect(notificationService.deleteNotification).toHaveBeenCalledWith('notif-123', 'user-123');
      expect(mockSocket.emit).toHaveBeenCalledWith('notification-deleted', {
        notificationId: 'notif-123',
        success: true,
      });
    });

    it('should handle errors and emit error event', async () => {
      (notificationService.deleteNotification as any).mockRejectedValueOnce(new Error('Test error'));

      await NotificationEventHandler.handleDeleteNotification(mockSocket, {
        notificationId: 'notif-123',
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        type: 'NOTIFICATION_DELETE_ERROR',
        message: 'Failed to delete notification',
      });
    });
  });

  describe('handleUpdatePreferences', () => {
    it('should update notification preferences and emit success event', async () => {
      const mockPreferences = {
        emailNotifications: false,
        pushNotifications: true,
      };

      const mockUpdatedPreferences = {
        userId: 'user-123',
        emailNotifications: false,
        pushNotifications: true,
        mentionNotifications: true,
        assignmentNotifications: true,
        commentNotifications: true,
        dueDateReminders: true,
        workspaceInvitations: true,
      };

      (notificationService.updateUserPreferences as any).mockResolvedValueOnce(mockUpdatedPreferences);

      await NotificationEventHandler.handleUpdatePreferences(mockSocket, {
        preferences: mockPreferences,
      });

      expect(notificationService.updateUserPreferences).toHaveBeenCalledWith('user-123', mockPreferences);
      expect(mockSocket.emit).toHaveBeenCalledWith('notification-preferences-updated', {
        preferences: mockUpdatedPreferences,
        success: true,
      });
    });

    it('should handle errors and emit error event', async () => {
      (notificationService.updateUserPreferences as any).mockRejectedValueOnce(new Error('Test error'));

      await NotificationEventHandler.handleUpdatePreferences(mockSocket, {
        preferences: { emailNotifications: false },
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        type: 'NOTIFICATION_PREFERENCES_UPDATE_ERROR',
        message: 'Failed to update notification preferences',
      });
    });
  });
});