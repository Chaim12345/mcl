import { describe, it, expect } from 'vitest';
import { 
  filterNotificationsByType,
  filterNotificationsByReadStatus,
  filterNotificationsByDateRange,
  groupNotificationsByDate,
  groupNotificationsByType,
  sortNotificationsByDate
} from '../notificationFilters.js';
import { Notification } from '../../services/notificationService.js';

describe('Notification Filters', () => {
  const mockNotifications: Notification[] = [
    {
      id: 'notif-1',
      userId: 'user-1',
      type: 'mention',
      title: 'Mention 1',
      message: 'You were mentioned',
      read: false,
      createdAt: new Date('2023-01-01T10:00:00Z'),
    },
    {
      id: 'notif-2',
      userId: 'user-1',
      type: 'comment',
      title: 'Comment 1',
      message: 'New comment',
      read: true,
      createdAt: new Date('2023-01-02T10:00:00Z'),
    },
    {
      id: 'notif-3',
      userId: 'user-1',
      type: 'mention',
      title: 'Mention 2',
      message: 'You were mentioned again',
      read: false,
      createdAt: new Date('2023-01-03T10:00:00Z'),
    },
    {
      id: 'notif-4',
      userId: 'user-1',
      type: 'assignment',
      title: 'Assignment 1',
      message: 'You were assigned',
      read: true,
      createdAt: new Date('2023-01-04T10:00:00Z'),
    },
  ];

  describe('filterNotificationsByType', () => {
    it('should filter notifications by type', () => {
      const result = filterNotificationsByType(mockNotifications, ['mention']);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('notif-1');
      expect(result[1].id).toBe('notif-3');
    });

    it('should return all notifications if no types provided', () => {
      const result = filterNotificationsByType(mockNotifications, []);
      expect(result).toHaveLength(4);
    });

    it('should handle multiple types', () => {
      const result = filterNotificationsByType(mockNotifications, ['mention', 'assignment']);
      expect(result).toHaveLength(3);
      expect(result.map(n => n.id)).toContain('notif-1');
      expect(result.map(n => n.id)).toContain('notif-3');
      expect(result.map(n => n.id)).toContain('notif-4');
    });
  });

  describe('filterNotificationsByReadStatus', () => {
    it('should filter notifications by read status (unread)', () => {
      const result = filterNotificationsByReadStatus(mockNotifications, false);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('notif-1');
      expect(result[1].id).toBe('notif-3');
    });

    it('should filter notifications by read status (read)', () => {
      const result = filterNotificationsByReadStatus(mockNotifications, true);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('notif-2');
      expect(result[1].id).toBe('notif-4');
    });

    it('should return all notifications if read status is null', () => {
      const result = filterNotificationsByReadStatus(mockNotifications, null);
      expect(result).toHaveLength(4);
    });
  });

  describe('filterNotificationsByDateRange', () => {
    it('should filter notifications by date range', () => {
      const startDate = new Date('2023-01-02T00:00:00Z');
      const endDate = new Date('2023-01-03T23:59:59Z');
      
      const result = filterNotificationsByDateRange(mockNotifications, startDate, endDate);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('notif-2');
      expect(result[1].id).toBe('notif-3');
    });

    it('should filter notifications with only start date', () => {
      const startDate = new Date('2023-01-03T00:00:00Z');
      
      const result = filterNotificationsByDateRange(mockNotifications, startDate);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('notif-3');
      expect(result[1].id).toBe('notif-4');
    });

    it('should filter notifications with only end date', () => {
      const endDate = new Date('2023-01-02T23:59:59Z');
      
      const result = filterNotificationsByDateRange(mockNotifications, undefined, endDate);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('notif-1');
      expect(result[1].id).toBe('notif-2');
    });

    it('should return all notifications if no date range provided', () => {
      const result = filterNotificationsByDateRange(mockNotifications);
      expect(result).toHaveLength(4);
    });
  });

  describe('groupNotificationsByDate', () => {
    it('should group notifications by date', () => {
      const result = groupNotificationsByDate(mockNotifications);
      
      expect(Object.keys(result)).toHaveLength(4);
      expect(result['2023-01-01']).toHaveLength(1);
      expect(result['2023-01-02']).toHaveLength(1);
      expect(result['2023-01-03']).toHaveLength(1);
      expect(result['2023-01-04']).toHaveLength(1);
      
      expect(result['2023-01-01'][0].id).toBe('notif-1');
      expect(result['2023-01-02'][0].id).toBe('notif-2');
      expect(result['2023-01-03'][0].id).toBe('notif-3');
      expect(result['2023-01-04'][0].id).toBe('notif-4');
    });
  });

  describe('groupNotificationsByType', () => {
    it('should group notifications by type', () => {
      const result = groupNotificationsByType(mockNotifications);
      
      expect(Object.keys(result)).toHaveLength(3);
      expect(result.mention).toHaveLength(2);
      expect(result.comment).toHaveLength(1);
      expect(result.assignment).toHaveLength(1);
      
      expect(result.mention[0].id).toBe('notif-1');
      expect(result.mention[1].id).toBe('notif-3');
      expect(result.comment[0].id).toBe('notif-2');
      expect(result.assignment[0].id).toBe('notif-4');
    });
  });

  describe('sortNotificationsByDate', () => {
    it('should sort notifications by date descending (default)', () => {
      const result = sortNotificationsByDate(mockNotifications);
      
      expect(result).toHaveLength(4);
      expect(result[0].id).toBe('notif-4');
      expect(result[1].id).toBe('notif-3');
      expect(result[2].id).toBe('notif-2');
      expect(result[3].id).toBe('notif-1');
    });

    it('should sort notifications by date ascending', () => {
      const result = sortNotificationsByDate(mockNotifications, 'asc');
      
      expect(result).toHaveLength(4);
      expect(result[0].id).toBe('notif-1');
      expect(result[1].id).toBe('notif-2');
      expect(result[2].id).toBe('notif-3');
      expect(result[3].id).toBe('notif-4');
    });

    it('should not modify the original array', () => {
      const original = [...mockNotifications];
      sortNotificationsByDate(mockNotifications);
      
      expect(mockNotifications).toEqual(original);
    });
  });
});