import { create } from 'zustand';
import { socketService } from '@/services/socket-service';
import { notificationService, Notification, NotificationType, NotificationPreferences } from '@/services/notification-service';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  offset: number;
  limit: number;
  preferences: NotificationPreferences | null;
  isPreferencesLoading: boolean;
  
  // Actions
  fetchNotifications: (options?: { reset?: boolean; unreadOnly?: boolean; type?: NotificationType }) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (notificationIds: string[]) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  fetchPreferences: () => Promise<void>;
  updatePreferences: (preferences: Partial<NotificationPreferences>) => Promise<void>;
  addNotification: (notification: Notification) => void;
  setupSocketListeners: () => () => void; // Returns cleanup function
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,
  hasMore: true,
  offset: 0,
  limit: 20,
  preferences: null,
  isPreferencesLoading: false,
  
  fetchNotifications: async (options = {}) => {
    const { reset = false, unreadOnly = false, type } = options;
    const { limit } = get();
    const offset = reset ? 0 : get().offset;
    
    try {
      set({ isLoading: true, error: null });
      
      const response = await notificationService.getNotifications({
        limit,
        offset,
        unreadOnly,
        type,
      });
      
      set((state) => ({
        notifications: reset 
          ? response.notifications 
          : [...state.notifications, ...response.notifications],
        unreadCount: response.unreadCount,
        hasMore: response.pagination.hasMore,
        offset: offset + limit,
        isLoading: false,
      }));
    } catch (error) {
      set({ 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch notifications' 
      });
    }
  },
  
  fetchUnreadCount: async () => {
    try {
      const unreadCount = await notificationService.getUnreadCount();
      set({ unreadCount });
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  },
  
  markAsRead: async (notificationIds: string[]) => {
    try {
      await notificationService.markAsRead(notificationIds);
      
      set((state) => ({
        notifications: state.notifications.map((notification) =>
          notificationIds.includes(notification.id)
            ? { ...notification, read: true }
            : notification
        ),
        unreadCount: Math.max(0, state.unreadCount - notificationIds.length),
      }));
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
    }
  },
  
  markAllAsRead: async () => {
    try {
      await notificationService.markAllAsRead();
      
      set((state) => ({
        notifications: state.notifications.map((notification) => ({
          ...notification,
          read: true,
        })),
        unreadCount: 0,
      }));
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  },
  
  deleteNotification: async (notificationId: string) => {
    try {
      await notificationService.deleteNotification(notificationId);
      
      set((state) => {
        const notification = state.notifications.find(n => n.id === notificationId);
        const unreadCount = notification && !notification.read 
          ? state.unreadCount - 1 
          : state.unreadCount;
          
        return {
          notifications: state.notifications.filter(n => n.id !== notificationId),
          unreadCount: Math.max(0, unreadCount),
        };
      });
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  },
  
  fetchPreferences: async () => {
    try {
      set({ isPreferencesLoading: true });
      const preferences = await notificationService.getPreferences();
      set({ preferences, isPreferencesLoading: false });
    } catch (error) {
      console.error('Failed to fetch notification preferences:', error);
      set({ isPreferencesLoading: false });
    }
  },
  
  updatePreferences: async (preferences: Partial<NotificationPreferences>) => {
    try {
      const updatedPreferences = await notificationService.updatePreferences(preferences);
      set({ preferences: updatedPreferences });
    } catch (error) {
      console.error('Failed to update notification preferences:', error);
    }
  },
  
  addNotification: (notification: Notification) => {
    set((state) => {
      // Check if notification already exists
      const exists = state.notifications.some(n => n.id === notification.id);
      if (exists) return state;
      
      return {
        notifications: [notification, ...state.notifications],
        unreadCount: notification.read ? state.unreadCount : state.unreadCount + 1,
      };
    });
  },
  
  setupSocketListeners: () => {
    // Initialize socket connection if not already connected
    if (!socketService.isConnected()) {
      socketService.initialize();
    }
    
    // Listen for new notifications
    const unsubscribe = socketService.on('notification', (notification: Notification) => {
      get().addNotification(notification);
    });
    
    // Return cleanup function
    return unsubscribe;
  },
}));

// Initialize socket listeners when the store is first used
let unsubscribe: (() => void) | null = null;

// Setup and cleanup socket listeners
export const initializeNotificationListeners = () => {
  if (!unsubscribe) {
    unsubscribe = useNotificationStore.getState().setupSocketListeners();
  }
  return () => {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
  };
};