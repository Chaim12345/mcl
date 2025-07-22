import React, { useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
import { NotificationList } from './notification-list';
import { NotificationPreferences } from './notification-preferences';
import { useNotificationStore } from '@/stores/notification-store';
import { initializeNotificationListeners } from '@/stores/notification-store';
import { Badge } from '@/components/ui/badge';

export function NotificationCenter() {
  const { unreadCount, fetchUnreadCount } = useNotificationStore();
  
  // Initialize socket listeners and fetch unread count on mount
  useEffect(() => {
    const cleanup = initializeNotificationListeners();
    fetchUnreadCount();
    
    // Refresh unread count every minute
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 60000);
    
    return () => {
      cleanup();
      clearInterval(interval);
    };
  }, [fetchUnreadCount]);
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px]"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[380px]">
        <Tabs defaultValue="all">
          <div className="flex items-center justify-between px-4 py-2 border-b">
            <h3 className="font-semibold">Notifications</h3>
            <TabsList className="grid grid-cols-3 h-8">
              <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
              <TabsTrigger value="unread" className="text-xs">
                Unread
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {unreadCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="settings" className="text-xs">Settings</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="all" className="focus-visible:outline-none">
            <NotificationList maxHeight="400px" />
          </TabsContent>
          
          <TabsContent value="unread" className="focus-visible:outline-none">
            <NotificationList maxHeight="400px" unreadOnly={true} />
          </TabsContent>
          
          <TabsContent value="settings" className="focus-visible:outline-none">
            <NotificationPreferences />
          </TabsContent>
        </Tabs>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}