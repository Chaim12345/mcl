import React, { useEffect } from 'react';
import { useNotificationStore } from '@/stores/notification-store';
import { NotificationItem } from './notification-item';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { NotificationType } from '@/services/notification-service';

interface NotificationListProps {
  maxHeight?: string;
  type?: NotificationType;
  unreadOnly?: boolean;
}

export function NotificationList({ 
  maxHeight = '400px',
  type,
  unreadOnly = false
}: NotificationListProps) {
  const { 
    notifications, 
    isLoading, 
    hasMore, 
    fetchNotifications,
    markAllAsRead
  } = useNotificationStore();
  
  useEffect(() => {
    fetchNotifications({ reset: true, unreadOnly, type });
  }, [fetchNotifications, unreadOnly, type]);
  
  const handleLoadMore = () => {
    fetchNotifications({ unreadOnly, type });
  };
  
  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };
  
  const filteredNotifications = notifications.filter(notification => {
    if (type && notification.type !== type) return false;
    if (unreadOnly && notification.read) return false;
    return true;
  });
  
  return (
    <div className="flex flex-col">
      {filteredNotifications.length > 0 && !unreadOnly && (
        <div className="px-3 py-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs w-full"
            onClick={handleMarkAllAsRead}
          >
            Mark all as read
          </Button>
        </div>
      )}
      
      <ScrollArea className={`max-h-[${maxHeight}]`}>
        <div className="flex flex-col">
          {filteredNotifications.length === 0 && !isLoading ? (
            <div className="flex items-center justify-center p-6 text-center">
              <p className="text-sm text-muted-foreground">
                {unreadOnly 
                  ? "No unread notifications" 
                  : type 
                    ? `No ${type} notifications` 
                    : "No notifications"}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <NotificationItem 
                key={notification.id} 
                notification={notification} 
              />
            ))
          )}
          
          {hasMore && (
            <div className="p-3 flex justify-center">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLoadMore}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Load more'
                )}
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}