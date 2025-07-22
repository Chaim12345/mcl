import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { notificationService } from '../services/notificationService.js';
import { validateRequest, notificationSchemas } from '../utils/validation.js';

const router = Router();

/**
 * GET /api/notifications
 * Get notifications for the authenticated user
 */
router.get('/', authenticateToken, validateRequest(notificationSchemas.getNotifications, 'query'), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { limit, offset, unreadOnly, type } = req.query as any;

    const result = await notificationService.getUserNotifications(userId, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      unreadOnly: unreadOnly === 'true',
      type,
    });

    res.json({
      success: true,
      data: {
        notifications: result.notifications,
        pagination: {
          total: result.total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: result.total > parseInt(offset) + parseInt(limit),
        },
        unreadCount: result.unreadCount,
      },
    });
  } catch (error) {
    console.error('Error getting notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get notifications',
      code: 'NOTIFICATIONS_GET_ERROR',
    });
  }
});

/**
 * GET /api/notifications/unread-count
 * Get unread notification count for the authenticated user
 */
router.get('/unread-count', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const result = await notificationService.getUserNotifications(userId, {
      limit: 1,
      offset: 0,
    });

    res.json({
      success: true,
      data: {
        unreadCount: result.unreadCount,
      },
    });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get unread count',
      code: 'UNREAD_COUNT_ERROR',
    });
  }
});

/**
 * PUT /api/notifications/mark-read
 * Mark notifications as read
 */
router.put('/mark-read', authenticateToken, validateRequest(notificationSchemas.markAsRead), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { notificationIds } = req.body;

    await notificationService.markMultipleAsRead(notificationIds, userId);

    res.json({
      success: true,
      message: 'Notifications marked as read',
    });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark notifications as read',
      code: 'MARK_READ_ERROR',
    });
  }
});

/**
 * PUT /api/notifications/mark-all-read
 * Mark all notifications as read for the authenticated user
 */
router.put('/mark-all-read', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    await notificationService.markAllAsRead(userId);

    res.json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark all notifications as read',
      code: 'MARK_ALL_READ_ERROR',
    });
  }
});

/**
 * DELETE /api/notifications/:id
 * Delete a specific notification
 */
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ error: 'Notification ID is required' });
      return;
    }

    await notificationService.deleteNotification(id, userId);

    res.json({
      success: true,
      message: 'Notification deleted',
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete notification',
      code: 'DELETE_NOTIFICATION_ERROR',
    });
  }
});

/**
 * GET /api/notifications/preferences
 * Get notification preferences for the authenticated user
 */
router.get('/preferences', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const preferences = await notificationService.getUserPreferences(userId);

    res.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    console.error('Error getting notification preferences:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get notification preferences',
      code: 'PREFERENCES_GET_ERROR',
    });
  }
});

/**
 * PUT /api/notifications/preferences
 * Update notification preferences for the authenticated user
 */
router.put('/preferences', authenticateToken, validateRequest(notificationSchemas.updatePreferences), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const preferences = req.body;

    const updatedPreferences = await notificationService.updateUserPreferences(userId, preferences);

    res.json({
      success: true,
      data: updatedPreferences,
      message: 'Notification preferences updated',
    });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update notification preferences',
      code: 'PREFERENCES_UPDATE_ERROR',
    });
  }
});

export default router;