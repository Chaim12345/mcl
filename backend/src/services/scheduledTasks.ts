import { notificationService } from './notificationService.js';
import { BoardEventHandler } from './boardEventHandlers.js';

/**
 * Schedule regular cleanup of old notifications
 * @param days Number of days to keep notifications (default: 30)
 * @param intervalHours How often to run the cleanup (default: 24 hours)
 */
export function scheduleNotificationCleanup(days: number = 30, intervalHours: number = 24): void {
  // Initial cleanup after 1 minute
  setTimeout(async () => {
    try {
      const deletedCount = await notificationService.deleteOldNotifications(days);
      console.log(`🧹 Scheduled cleanup: Deleted ${deletedCount} old notifications (older than ${days} days)`);
    } catch (error) {
      console.error('Error in scheduled notification cleanup:', error);
    }
  }, 60 * 1000);

  // Regular cleanup
  setInterval(async () => {
    try {
      const deletedCount = await notificationService.deleteOldNotifications(days);
      console.log(`🧹 Scheduled cleanup: Deleted ${deletedCount} old notifications (older than ${days} days)`);
    } catch (error) {
      console.error('Error in scheduled notification cleanup:', error);
    }
  }, intervalHours * 60 * 60 * 1000);
}

/**
 * Schedule regular cleanup of inactive users in boards
 * @param intervalMinutes How often to run the cleanup (default: 1 minute)
 */
export function scheduleUserPresenceCleanup(intervalMinutes: number = 1): void {
  // Regular cleanup
  setInterval(() => {
    try {
      BoardEventHandler.cleanupInactiveUsers();
    } catch (error) {
      console.error('Error in scheduled user presence cleanup:', error);
    }
  }, intervalMinutes * 60 * 1000);
}

/**
 * Initialize all scheduled tasks
 */
export function initializeScheduledTasks(): void {
  scheduleNotificationCleanup();
  scheduleUserPresenceCleanup();
  console.log('📅 Scheduled tasks initialized');
}