import { query } from '../db/client.js';
import { socketService } from './socketService.js';
import { generateId } from '../utils/id.js';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message?: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: Date;
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

export interface CreateNotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  message?: string;
  data?: Record<string, any>;
  relatedUserId?: string;
  workspaceId?: string;
  boardId?: string;
  itemId?: string;
}

class NotificationService {
  /**
   * Create a new notification
   */
  async createNotification(data: CreateNotificationData): Promise<Notification> {
    try {
      const notificationId = generateId();

      // Insert notification into database
      const result = await query(
        `INSERT INTO notifications (id, "recipientId", type, title, message, data, "isRead", "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          notificationId,
          data.userId,
          data.type,
          data.title,
          data.message || null,
          JSON.stringify(data.data || {}),
          false,
          new Date()
        ]
      );

      const notification = result.rows[0];

      // Send real-time notification via WebSocket
      await this.sendRealTimeNotification(notification);

      // Check if user wants email notifications
      const shouldSendEmail = await this.shouldSendEmailNotification(data.userId, data.type);
      if (shouldSendEmail) {
        // TODO: Implement email notification sending
        console.log(`📧 Email notification queued for user ${data.userId}: ${data.title}`);
      }

      console.log(`🔔 Notification created for user ${data.userId}: ${data.title}`);
      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw new Error('Failed to create notification');
    }
  }

  /**
   * Create multiple notifications (bulk)
   */
  async createBulkNotifications(notifications: CreateNotificationData[]): Promise<Notification[]> {
    try {
      const createdNotifications: Notification[] = [];

      for (const notificationData of notifications) {
        const notification = await this.createNotification(notificationData);
        createdNotifications.push(notification);
      }

      return createdNotifications;
    } catch (error) {
      console.error('Error creating bulk notifications:', error);
      throw new Error('Failed to create bulk notifications');
    }
  }

  /**
   * Get notifications for a user
   */
  async getUserNotifications(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      unreadOnly?: boolean;
      type?: NotificationType;
    } = {}
  ): Promise<{ notifications: Notification[]; total: number; unreadCount: number }> {
    try {
      const { limit = 50, offset = 0, unreadOnly = false, type } = options;

      let whereClause = '"recipientId" = $1';
      const params: any[] = [userId];
      let paramIndex = 2;

      if (unreadOnly) {
        whereClause += ` AND "isRead" = false`;
      }

      if (type) {
        whereClause += ` AND type = $${paramIndex}`;
        params.push(type);
        paramIndex++;
      }

      // Get notifications
      const notificationsResult = await query(
        `SELECT * FROM notifications 
         WHERE ${whereClause}
         ORDER BY "createdAt" DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, limit, offset]
      );

      // Get total count
      const totalResult = await query(
        `SELECT COUNT(*) as count FROM notifications WHERE ${whereClause}`,
        params
      );

      // Get unread count
      const unreadResult = await query(
        `SELECT COUNT(*) as count FROM notifications WHERE "recipientId" = $1 AND "isRead" = false`,
        [userId]
      );

      return {
        notifications: notificationsResult.rows,
        total: parseInt(totalResult.rows[0].count),
        unreadCount: parseInt(unreadResult.rows[0].count)
      };
    } catch (error) {
      console.error('Error getting user notifications:', error);
      throw new Error('Failed to get notifications');
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    try {
      await query(
        `UPDATE notifications SET "isRead" = true, "updatedAt" = $1 
         WHERE id = $2 AND "recipientId" = $3`,
        [new Date(), notificationId, userId]
      );

      console.log(`📖 Notification ${notificationId} marked as read by user ${userId}`);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw new Error('Failed to mark notification as read');
    }
  }

  /**
   * Mark multiple notifications as read
   */
  async markMultipleAsRead(notificationIds: string[], userId: string): Promise<void> {
    try {
      if (notificationIds.length === 0) return;

      const placeholders = notificationIds.map((_, index) => `$${index + 3}`).join(',');

      await query(
        `UPDATE notifications SET "isRead" = true, "updatedAt" = $1 
         WHERE "recipientId" = $2 AND id IN (${placeholders})`,
        [new Date(), userId, ...notificationIds]
      );

      console.log(`📖 ${notificationIds.length} notifications marked as read by user ${userId}`);
    } catch (error) {
      console.error('Error marking multiple notifications as read:', error);
      throw new Error('Failed to mark notifications as read');
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<void> {
    try {
      await query(
        `UPDATE notifications SET "isRead" = true, "updatedAt" = $1 
         WHERE "recipientId" = $2 AND "isRead" = false`,
        [new Date(), userId]
      );

      console.log(`📖 All notifications marked as read for user ${userId}`);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw new Error('Failed to mark all notifications as read');
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    try {
      await query(
        `DELETE FROM notifications WHERE id = $1 AND "recipientId" = $2`,
        [notificationId, userId]
      );

      console.log(`🗑️ Notification ${notificationId} deleted by user ${userId}`);
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw new Error('Failed to delete notification');
    }
  }

  /**
   * Delete old notifications (cleanup)
   */
  async deleteOldNotifications(daysOld: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await query(
        `DELETE FROM notifications WHERE "createdAt" < $1`,
        [cutoffDate]
      );

      const deletedCount = result.rowCount || 0;
      console.log(`🧹 Deleted ${deletedCount} old notifications (older than ${daysOld} days)`);

      return deletedCount;
    } catch (error) {
      console.error('Error deleting old notifications:', error);
      throw new Error('Failed to delete old notifications');
    }
  }

  /**
   * Get notification preferences for a user
   */
  async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      const result = await query(
        `SELECT * FROM notification_preferences WHERE "userId" = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        // Return default preferences
        return {
          userId,
          emailNotifications: true,
          pushNotifications: true,
          mentionNotifications: true,
          assignmentNotifications: true,
          commentNotifications: true,
          dueDateReminders: true,
          workspaceInvitations: true,
        };
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error getting user preferences:', error);
      throw new Error('Failed to get notification preferences');
    }
  }

  /**
   * Update notification preferences for a user
   */
  async updateUserPreferences(userId: string, preferences: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    try {
      // Check if preferences exist
      const existingResult = await query(
        `SELECT * FROM notification_preferences WHERE "userId" = $1`,
        [userId]
      );

      if (existingResult.rows.length === 0) {
        // Insert new preferences
        const result = await query(
          `INSERT INTO notification_preferences 
           ("userId", "emailNotifications", "pushNotifications", "mentionNotifications", 
            "assignmentNotifications", "commentNotifications", "dueDateReminders", "workspaceInvitations")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING *`,
          [
            userId,
            preferences.emailNotifications ?? true,
            preferences.pushNotifications ?? true,
            preferences.mentionNotifications ?? true,
            preferences.assignmentNotifications ?? true,
            preferences.commentNotifications ?? true,
            preferences.dueDateReminders ?? true,
            preferences.workspaceInvitations ?? true,
          ]
        );
        return result.rows[0];
      } else {
        // Update existing preferences
        const updates: string[] = [];
        const params: any[] = [new Date()]; // First param is updatedAt
        let paramIndex = 1;

        Object.entries(preferences).forEach(([key, value]) => {
          if (key !== 'userId' && value !== undefined) {
            updates.push(`"${key}" = $${paramIndex + 1}`);
            params.push(value);
            paramIndex++;
          }
        });

        if (updates.length === 0) {
          return existingResult.rows[0];
        }

        params.push(userId); // Last param is userId

        const result = await query(
          `UPDATE notification_preferences 
           SET ${updates.join(', ')}, "updatedAt" = $1
           WHERE "userId" = $${paramIndex + 1}
           RETURNING *`,
          params
        );

        return result.rows[0];
      }
    } catch (error) {
      console.error('Error updating user preferences:', error);
      throw new Error('Failed to update notification preferences');
    }
  }

  /**
   * Send real-time notification via WebSocket
   */
  private async sendRealTimeNotification(notification: Notification): Promise<void> {
    try {
      socketService.sendToUser(notification.userId, 'notification', {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        read: notification.read,
        createdAt: notification.createdAt,
      });
    } catch (error) {
      console.error('Error sending real-time notification:', error);
      // Don't throw error - notification was still created in database
    }
  }

  /**
   * Check if user should receive email notification
   */
  private async shouldSendEmailNotification(userId: string, type: NotificationType): Promise<boolean> {
    try {
      const preferences = await this.getUserPreferences(userId);

      if (!preferences.emailNotifications) {
        return false;
      }

      // Check specific notification type preferences
      switch (type) {
        case 'mention':
          return preferences.mentionNotifications;
        case 'assignment':
          return preferences.assignmentNotifications;
        case 'comment':
          return preferences.commentNotifications;
        case 'due_date_reminder':
          return preferences.dueDateReminders;
        case 'workspace_invitation':
          return preferences.workspaceInvitations;
        default:
          return true;
      }
    } catch (error) {
      console.error('Error checking email notification preference:', error);
      return false;
    }
  }

  /**
   * Create mention notification
   */
  async createMentionNotification(data: {
    mentionedUserId: string;
    mentioningUserId: string;
    mentioningUserName: string;
    itemId: string;
    itemName: string;
    boardId: string;
    workspaceId: string;
    commentId?: string;
  }): Promise<Notification> {
    return this.createNotification({
      userId: data.mentionedUserId,
      type: 'mention',
      title: `${data.mentioningUserName} mentioned you`,
      message: `You were mentioned in "${data.itemName}"`,
      data: {
        mentioningUserId: data.mentioningUserId,
        mentioningUserName: data.mentioningUserName,
        itemId: data.itemId,
        itemName: data.itemName,
        boardId: data.boardId,
        workspaceId: data.workspaceId,
        commentId: data.commentId,
      },
    });
  }

  /**
   * Create assignment notification
   */
  async createAssignmentNotification(data: {
    assignedUserId: string;
    assigningUserId: string;
    assigningUserName: string;
    itemId: string;
    itemName: string;
    boardId: string;
    workspaceId: string;
  }): Promise<Notification> {
    return this.createNotification({
      userId: data.assignedUserId,
      type: 'assignment',
      title: `You were assigned to "${data.itemName}"`,
      message: `${data.assigningUserName} assigned you to this item`,
      data: {
        assigningUserId: data.assigningUserId,
        assigningUserName: data.assigningUserName,
        itemId: data.itemId,
        itemName: data.itemName,
        boardId: data.boardId,
        workspaceId: data.workspaceId,
      },
    });
  }

  /**
   * Create comment notification
   */
  async createCommentNotification(data: {
    userId: string;
    commenterUserId: string;
    commenterUserName: string;
    itemId: string;
    itemName: string;
    boardId: string;
    workspaceId: string;
    commentId: string;
    commentPreview: string;
  }): Promise<Notification> {
    return this.createNotification({
      userId: data.userId,
      type: 'comment',
      title: `New comment on "${data.itemName}"`,
      message: `${data.commenterUserName}: ${data.commentPreview}`,
      data: {
        commenterUserId: data.commenterUserId,
        commenterUserName: data.commenterUserName,
        itemId: data.itemId,
        itemName: data.itemName,
        boardId: data.boardId,
        workspaceId: data.workspaceId,
        commentId: data.commentId,
      },
    });
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default notificationService;