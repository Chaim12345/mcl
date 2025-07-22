import React from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { 
  AtSign, 
  MessageSquare, 
  UserCheck, 
  Clock, 
  Edit, 
  Share2, 
  Users, 
  AlertCircle,
  MoreVertical,
  Check,
  Trash2
} from 'lucide-react';
import { Notification, NotificationType } from '@/services/notification-service';
import { useNotificationStore } from '@/stores/notification-store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface NotificationItemProps {
  notification: Notification;
}

export function NotificationItem({ notification }: NotificationItemProps) {
  const navigate = useNavigate();
  const { markAsRead, deleteNotification } = useNotificationStore();
  
  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'mention':
        return <AtSign className="h-4 w-4 text-blue-500" />;
      case 'comment':
        return <MessageSquare className="h-4 w-4 text-green-500" />;
      case 'assignment':
        return <UserCheck className="h-4 w-4 text-purple-500" />;
      case 'due_date_reminder':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'item_updated':
        return <Edit className="h-4 w-4 text-orange-500" />;
      case 'board_shared':
        return <Share2 className="h-4 w-4 text-indigo-500" />;
      case 'workspace_invitation':
        return <Users className="h-4 w-4 text-pink-500" />;
      case 'system':
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };
  
  const handleClick = () => {
    if (!notification.read) {
      markAsRead([notification.id]);
    }
    
    // Navigate based on notification type and data
    if (notification.data) {
      if (notification.type === 'mention' || notification.type === 'comment' || notification.type === 'assignment' || notification.type === 'item_updated') {
        const { boardId, itemId } = notification.data;
        if (boardId && itemId) {
          navigate(`/boards/${boardId}?itemId=${itemId}`);
          return;
        }
      }
      
      if (notification.type === 'board_shared' && notification.data.boardId) {
        navigate(`/boards/${notification.data.boardId}`);
        return;
      }
      
      if (notification.type === 'workspace_invitation' && notification.data.workspaceId) {
        navigate(`/workspaces/${notification.data.workspaceId}`);
        return;
      }
    }
  };
  
  const handleMarkAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!notification.read) {
      markAsRead([notification.id]);
    }
  };
  
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteNotification(notification.id);
  };
  
  return (
    <div 
      className={cn(
        "flex items-start gap-3 p-3 hover:bg-accent rounded-md cursor-pointer transition-colors",
        !notification.read && "bg-accent/50"
      )}
      onClick={handleClick}
    >
      <div className="mt-0.5">
        {getIcon(notification.type)}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h4 className={cn(
            "text-sm font-medium",
            !notification.read && "font-semibold"
          )}>
            {notification.title}
          </h4>
          <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
          </span>
        </div>
        
        {notification.message && (
          <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
            {notification.message}
          </p>
        )}
      </div>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {!notification.read && (
            <DropdownMenuItem onClick={handleMarkAsRead}>
              <Check className="mr-2 h-4 w-4" />
              <span>Mark as read</span>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}