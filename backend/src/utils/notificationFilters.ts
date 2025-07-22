import { Notification, NotificationType } from '../services/notificationService.js';

/**
 * Filter notifications by type
 */
export function filterNotificationsByType(
  notifications: Notification[], 
  types: NotificationType[]
): Notification[] {
  if (!types || types.length === 0) {
    return notifications;
  }
  return notifications.filter(notification => types.includes(notification.type));
}

/**
 * Filter notifications by read status
 */
export function filterNotificationsByReadStatus(
  notifications: Notification[], 
  readStatus: boolean | null = null
): Notification[] {
  if (readStatus === null) {
    return notifications;
  }
  return notifications.filter(notification => notification.read === readStatus);
}

/**
 * Filter notifications by date range
 */
export function filterNotificationsByDateRange(
  notifications: Notification[],
  startDate?: Date,
  endDate?: Date
): Notification[] {
  return notifications.filter(notification => {
    const createdAt = new Date(notification.createdAt);
    
    if (startDate && createdAt < startDate) {
      return false;
    }
    
    if (endDate && createdAt > endDate) {
      return false;
    }
    
    return true;
  });
}

/**
 * Group notifications by date
 */
export function groupNotificationsByDate(notifications: Notification[]): Record<string, Notification[]> {
  const groups: Record<string, Notification[]> = {};
  
  notifications.forEach(notification => {
    const date = new Date(notification.createdAt);
    const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
    
    if (dateKey) {
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(notification);
    }
  });
  
  return groups;
}

/**
 * Group notifications by type
 */
export function groupNotificationsByType(notifications: Notification[]): Record<NotificationType, Notification[]> {
  const groups: Partial<Record<NotificationType, Notification[]>> = {};
  
  notifications.forEach(notification => {
    if (!groups[notification.type]) {
      groups[notification.type] = [];
    }
    
    groups[notification.type]!.push(notification);
  });
  
  return groups as Record<NotificationType, Notification[]>;
}

/**
 * Sort notifications by date
 */
export function sortNotificationsByDate(
  notifications: Notification[], 
  order: 'asc' | 'desc' = 'desc'
): Notification[] {
  return [...notifications].sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    
    return order === 'desc' ? dateB - dateA : dateA - dateB;
  });
}