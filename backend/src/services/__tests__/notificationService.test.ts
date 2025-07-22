import { describe, it, expect, beforeEach, vi } from 'vitest';
import { notificationService, CreateNotificationData } from '../notificationService.js';
import { query } from '../../db/client.js';
import { socketService } from '../socketService.js';

// Mock dependencies
vi.mock('../../db/client.js', () => ({
  query: vi.fn(),
}));

vi.mock('../socketService.js', () => ({
  socketService: {
    sendToUser: vi.fn(),
  },
}));

vi.mock('../../utils/id.js', () => ({
  generateId: vi.fn(() => 'test-id-123'),
}));

describe('NotificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createNotification', () => {
    it('should create a notification and send it via WebSocket', async () => {
      const mockNotification = {
        id: 'test-id-123',
        userId: 'user-123',
        type: 'mention',
        title: 'Test notification',
        message: 'Test message',
        data: '{}',
        read: false,
        createdAt: new Date(),
      };

      // Mock database insert
      (query as any).mockResolvedValueOnce({
        rows: [mockNotification],
      });

      // Mock preferences check
      (query as any).mockResolvedValueOnce({
        rows: [{
          userId: 'user-123',
          emailNotifications: true,
          mentionNotifications: true,
        }],
      });

      const notificationData: CreateNotificationData = {
        userId: 'user-123',
        type: 'mention',
        title: 'Test notification',
        message: 'Test message',
      };

      const result = await notificationService.createNotification(notificationData);

      expect(result).toEqual(mockNotification);
      expect(socketService.sendToUser).toHaveBeenCalledWith('user-123', 'notification', {
        id: 'test-id-123',
        type: 'mention',
        title: 'Test notification',
        message: 'Test message',
        data: '{}',
        read: false,
        createdAt: mockNotification.createdAt,
      });
    });

    it('should handle bulk notification creation', async () => {
      const mockNotifications = [
        {
          id: 'test-id-1',
          userId: 'user-1',
          type: 'mention',
          title: 'Test 1',
          message: 'Message 1',
          data: '{}',
          read: false,
          createdAt: new Date(),
        },
        {
          id: 'test-id-2',
          userId: 'user-2',
          type: 'comment',
          title: 'Test 2',
          message: 'Message 2',
          data: '{}',
          read: false,
          createdAt: new Date(),
        },
      ];

      // Mock database inserts
      (query as any)
        .mockResolvedValueOnce({ rows: [mockNotifications[0]] })
        .mockResolvedValueOnce({ rows: [{ emailNotifications: true, mentionNotifications: true }] })
        .mockResolvedValueOnce({ rows: [mockNotifications[1]] })
        .mockResolvedValueOnce({ rows: [{ emailNotifications: true, commentNotifications: true }] });

      const notificationsData: CreateNotificationData[] = [
        {
          userId: 'user-1',
          type: 'mention',
          title: 'Test 1',
          message: 'Message 1',
        },
        {
          userId: 'user-2',
          type: 'comment',
          title: 'Test 2',
          message: 'Message 2',
        },
      ];

      const result = await notificationService.createBulkNotifications(notificationsData);

      expect(result).toHaveLength(2);
      expect(socketService.sendToUser).toHaveBeenCalledTimes(2);
    });
  });

  describe('getUserNotifications', () => {
    it('should get user notifications with pagination', async () => {
      const mockNotifications = [
        {
          id: 'notif-1',
          userId: 'user-123',
          type: 'mention',
          title: 'Test 1',
          message: 'Message 1',
          data: '{}',
          read: false,
          createdAt: new Date(),
        },
      ];

      // Mock notifications query
      (query as any).mockResolvedValueOnce({
        rows: mockNotifications,
      });

      // Mock total count query
      (query as any).mockResolvedValueOnce({
        rows: [{ count: '10' }],
      });

      // Mock unread count query
      (query as any).mockResolvedValueOnce({
        rows: [{ count: '5' }],
      });

      const result = await notificationService.getUserNotifications('user-123', {
        limit: 10,
        offset: 0,
      });

      expect(result.notifications).toEqual(mockNotifications);
      expect(result.total).toBe(10);
      expect(result.unreadCount).toBe(5);
      expect(query).toHaveBeenCalledTimes(3);
    });

    it('should filter notifications by type and read status', async () => {
      // Mock notifications query
      (query as any).mockResolvedValueOnce({
        rows: [],
      });

      // Mock total count query
      (query as any).mockResolvedValueOnce({
        rows: [{ count: '0' }],
      });

      // Mock unread count query
      (query as any).mockResolvedValueOnce({
        rows: [{ count: '0' }],
      });

      await notificationService.getUserNotifications('user-123', {
        limit: 10,
        offset: 0,
        unreadOnly: true,
        type: 'mention',
      });

      // Check that the query was called with the right parameters
      expect(query).toHaveBeenCalledTimes(3);
      expect((query as any).mock.calls[0][0]).toContain('WHERE "userId" = $1 AND read = false AND type =');
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read', async () => {
      (query as any).mockResolvedValueOnce({
        rowCount: 1,
      });

      await notificationService.markAsRead('notif-1', 'user-123');

      expect(query).toHaveBeenCalledTimes(1);
      expect((query as any).mock.calls[0][0]).toContain('UPDATE notifications SET read = true');
      expect((query as any).mock.calls[0][1][1]).toBe('notif-1');
      expect((query as any).mock.calls[0][1][2]).toBe('user-123');
    });
  });

  describe('markMultipleAsRead', () => {
    it('should mark multiple notifications as read', async () => {
      (query as any).mockResolvedValueOnce({
        rowCount: 2,
      });

      await notificationService.markMultipleAsRead(['notif-1', 'notif-2'], 'user-123');

      expect(query).toHaveBeenCalledTimes(1);
      expect((query as any).mock.calls[0][0]).toContain('UPDATE notifications SET read = true');
      expect((query as any).mock.calls[0][1]).toContain('notif-1');
      expect((query as any).mock.calls[0][1]).toContain('notif-2');
    });

    it('should do nothing if notification ids array is empty', async () => {
      await notificationService.markMultipleAsRead([], 'user-123');

      expect(query).not.toHaveBeenCalled();
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read for a user', async () => {
      (query as any).mockResolvedValueOnce({
        rowCount: 5,
      });

      await notificationService.markAllAsRead('user-123');

      expect(query).toHaveBeenCalledTimes(1);
      expect((query as any).mock.calls[0][0]).toContain('UPDATE notifications SET read = true');
      expect((query as any).mock.calls[0][1][1]).toBe('user-123');
    });
  });

  describe('deleteNotification', () => {
    it('should delete a notification', async () => {
      (query as any).mockResolvedValueOnce({
        rowCount: 1,
      });

      await notificationService.deleteNotification('notif-1', 'user-123');

      expect(query).toHaveBeenCalledTimes(1);
      expect((query as any).mock.calls[0][0]).toContain('DELETE FROM notifications');
      expect((query as any).mock.calls[0][1][0]).toBe('notif-1');
      expect((query as any).mock.calls[0][1][1]).toBe('user-123');
    });
  });

  describe('deleteOldNotifications', () => {
    it('should delete notifications older than specified days', async () => {
      (query as any).mockResolvedValueOnce({
        rowCount: 10,
      });

      const result = await notificationService.deleteOldNotifications(30);

      expect(result).toBe(10);
      expect(query).toHaveBeenCalledTimes(1);
      expect((query as any).mock.calls[0][0]).toContain('DELETE FROM notifications WHERE "createdAt" <');
    });
  });

  describe('getUserPreferences', () => {
    it('should get user notification preferences', async () => {
      const mockPreferences = {
        userId: 'user-123',
        emailNotifications: true,
        pushNotifications: true,
        mentionNotifications: true,
        assignmentNotifications: true,
        commentNotifications: true,
        dueDateReminders: true,
        workspaceInvitations: true,
      };

      (query as any).mockResolvedValueOnce({
        rows: [mockPreferences],
      });

      const result = await notificationService.getUserPreferences('user-123');

      expect(result).toEqual(mockPreferences);
      expect(query).toHaveBeenCalledTimes(1);
    });

    it('should return default preferences if none exist', async () => {
      (query as any).mockResolvedValueOnce({
        rows: [],
      });

      const result = await notificationService.getUserPreferences('user-123');

      expect(result).toEqual({
        userId: 'user-123',
        emailNotifications: true,
        pushNotifications: true,
        mentionNotifications: true,
        assignmentNotifications: true,
        commentNotifications: true,
        dueDateReminders: true,
        workspaceInvitations: true,
      });
    });
  });

  describe('updateUserPreferences', () => {
    it('should insert new preferences if none exist', async () => {
      const mockPreferences = {
        userId: 'user-123',
        emailNotifications: false,
        pushNotifications: true,
      };

      // Check if preferences exist
      (query as any).mockResolvedValueOnce({
        rows: [],
      });

      // Insert new preferences
      (query as any).mockResolvedValueOnce({
        rows: [mockPreferences],
      });

      const result = await notificationService.updateUserPreferences('user-123', {
        emailNotifications: false,
        pushNotifications: true,
      });

      expect(result).toEqual(mockPreferences);
      expect(query).toHaveBeenCalledTimes(2);
      expect((query as any).mock.calls[1][0]).toContain('INSERT INTO notification_preferences');
    });

    it('should update existing preferences', async () => {
      const existingPreferences = {
        userId: 'user-123',
        emailNotifications: true,
        pushNotifications: true,
        mentionNotifications: true,
      };

      const updatedPreferences = {
        ...existingPreferences,
        emailNotifications: false,
      };

      // Check if preferences exist
      (query as any).mockResolvedValueOnce({
        rows: [existingPreferences],
      });

      // Update preferences
      (query as any).mockResolvedValueOnce({
        rows: [updatedPreferences],
      });

      const result = await notificationService.updateUserPreferences('user-123', {
        emailNotifications: false,
      });

      expect(result).toEqual(updatedPreferences);
      expect(query).toHaveBeenCalledTimes(2);
      expect((query as any).mock.calls[1][0]).toContain('UPDATE notification_preferences');
    });

    it('should return existing preferences if no updates provided', async () => {
      const existingPreferences = {
        userId: 'user-123',
        emailNotifications: true,
        pushNotifications: true,
      };

      // Check if preferences exist
      (query as any).mockResolvedValueOnce({
        rows: [existingPreferences],
      });

      const result = await notificationService.updateUserPreferences('user-123', {});

      expect(result).toEqual(existingPreferences);
      expect(query).toHaveBeenCalledTimes(1);
    });
  });

  describe('notification type helpers', () => {
    it('should create mention notification', async () => {
      const mockNotification = {
        id: 'test-id-123',
        userId: 'user-123',
        type: 'mention',
        title: 'John Doe mentioned you',
        message: 'You were mentioned in "Test Item"',
        data: JSON.stringify({
          mentioningUserId: 'user-456',
          mentioningUserName: 'John Doe',
          itemId: 'item-123',
          itemName: 'Test Item',
          boardId: 'board-123',
          workspaceId: 'workspace-123',
          commentId: 'comment-123',
        }),
        read: false,
        createdAt: new Date(),
      };

      // Mock createNotification
      vi.spyOn(notificationService, 'createNotification').mockResolvedValueOnce(mockNotification);

      const result = await notificationService.createMentionNotification({
        mentionedUserId: 'user-123',
        mentioningUserId: 'user-456',
        mentioningUserName: 'John Doe',
        itemId: 'item-123',
        itemName: 'Test Item',
        boardId: 'board-123',
        workspaceId: 'workspace-123',
        commentId: 'comment-123',
      });

      expect(result).toEqual(mockNotification);
      expect(notificationService.createNotification).toHaveBeenCalledWith({
        userId: 'user-123',
        type: 'mention',
        title: 'John Doe mentioned you',
        message: 'You were mentioned in "Test Item"',
        data: {
          mentioningUserId: 'user-456',
          mentioningUserName: 'John Doe',
          itemId: 'item-123',
          itemName: 'Test Item',
          boardId: 'board-123',
          workspaceId: 'workspace-123',
          commentId: 'comment-123',
        },
      });
    });

    it('should create assignment notification', async () => {
      const mockNotification = {
        id: 'test-id-123',
        userId: 'user-123',
        type: 'assignment',
        title: 'You were assigned to "Test Item"',
        message: 'John Doe assigned you to this item',
        data: JSON.stringify({
          assigningUserId: 'user-456',
          assigningUserName: 'John Doe',
          itemId: 'item-123',
          itemName: 'Test Item',
          boardId: 'board-123',
          workspaceId: 'workspace-123',
        }),
        read: false,
        createdAt: new Date(),
      };

      // Mock createNotification
      vi.spyOn(notificationService, 'createNotification').mockResolvedValueOnce(mockNotification);

      const result = await notificationService.createAssignmentNotification({
        assignedUserId: 'user-123',
        assigningUserId: 'user-456',
        assigningUserName: 'John Doe',
        itemId: 'item-123',
        itemName: 'Test Item',
        boardId: 'board-123',
        workspaceId: 'workspace-123',
      });

      expect(result).toEqual(mockNotification);
      expect(notificationService.createNotification).toHaveBeenCalledWith({
        userId: 'user-123',
        type: 'assignment',
        title: 'You were assigned to "Test Item"',
        message: 'John Doe assigned you to this item',
        data: {
          assigningUserId: 'user-456',
          assigningUserName: 'John Doe',
          itemId: 'item-123',
          itemName: 'Test Item',
          boardId: 'board-123',
          workspaceId: 'workspace-123',
        },
      });
    });

    it('should create comment notification', async () => {
      const mockNotification = {
        id: 'test-id-123',
        userId: 'user-123',
        type: 'comment',
        title: 'New comment on "Test Item"',
        message: 'John Doe: This is a comment',
        data: JSON.stringify({
          commenterUserId: 'user-456',
          commenterUserName: 'John Doe',
          itemId: 'item-123',
          itemName: 'Test Item',
          boardId: 'board-123',
          workspaceId: 'workspace-123',
          commentId: 'comment-123',
        }),
        read: false,
        createdAt: new Date(),
      };

      // Mock createNotification
      vi.spyOn(notificationService, 'createNotification').mockResolvedValueOnce(mockNotification);

      const result = await notificationService.createCommentNotification({
        userId: 'user-123',
        commenterUserId: 'user-456',
        commenterUserName: 'John Doe',
        itemId: 'item-123',
        itemName: 'Test Item',
        boardId: 'board-123',
        workspaceId: 'workspace-123',
        commentId: 'comment-123',
        commentPreview: 'This is a comment',
      });

      expect(result).toEqual(mockNotification);
      expect(notificationService.createNotification).toHaveBeenCalledWith({
        userId: 'user-123',
        type: 'comment',
        title: 'New comment on "Test Item"',
        message: 'John Doe: This is a comment',
        data: {
          commenterUserId: 'user-456',
          commenterUserName: 'John Doe',
          itemId: 'item-123',
          itemName: 'Test Item',
          boardId: 'board-123',
          workspaceId: 'workspace-123',
          commentId: 'comment-123',
        },
      });
    });
  });
});