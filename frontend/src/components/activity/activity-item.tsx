import { Activity } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import {
  MessageSquare,
  FileText,
  Clipboard,
  Users,
  User,
  Calendar,
  Tag,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Edit,
  Trash,
  Plus,
  ArrowRight,
  Move,
  Star,
} from 'lucide-react';

interface ActivityItemProps {
  activity: Activity;
}

export function ActivityItem({ activity }: ActivityItemProps) {
  // Format the activity date
  const formattedDate = formatDistanceToNow(new Date(activity.createdAt), { 
    addSuffix: true 
  });
  
  // Get icon based on activity type
  const getActivityIcon = () => {
    const action = activity.action;
    
    if (action.startsWith('comment_')) {
      return <MessageSquare className="h-4 w-4" />;
    }
    
    if (action.startsWith('item_')) {
      if (action === 'item_created') return <Plus className="h-4 w-4" />;
      if (action === 'item_updated') return <Edit className="h-4 w-4" />;
      if (action === 'item_deleted') return <Trash className="h-4 w-4" />;
      if (action === 'item_moved') return <Move className="h-4 w-4" />;
      if (action === 'item_status_changed') return <ArrowRight className="h-4 w-4" />;
      if (action === 'item_assigned') return <User className="h-4 w-4" />;
      if (action === 'item_due_date_set' || action === 'item_due_date_removed') {
        return <Calendar className="h-4 w-4" />;
      }
      return <FileText className="h-4 w-4" />;
    }
    
    if (action.startsWith('board_')) {
      return <Clipboard className="h-4 w-4" />;
    }
    
    if (action.startsWith('workspace_')) {
      return <Users className="h-4 w-4" />;
    }
    
    return <Clock className="h-4 w-4" />;
  };
  
  // Get color based on activity type
  const getActivityColor = () => {
    const action = activity.action;
    
    if (action.startsWith('comment_')) {
      return 'text-blue-500 bg-blue-100 dark:bg-blue-900 dark:text-blue-300';
    }
    
    if (action.startsWith('item_')) {
      if (action === 'item_created') return 'text-green-500 bg-green-100 dark:bg-green-900 dark:text-green-300';
      if (action === 'item_deleted') return 'text-red-500 bg-red-100 dark:bg-red-900 dark:text-red-300';
      if (action === 'item_status_changed') return 'text-purple-500 bg-purple-100 dark:bg-purple-900 dark:text-purple-300';
      return 'text-orange-500 bg-orange-100 dark:bg-orange-900 dark:text-orange-300';
    }
    
    if (action.startsWith('board_')) {
      return 'text-indigo-500 bg-indigo-100 dark:bg-indigo-900 dark:text-indigo-300';
    }
    
    if (action.startsWith('workspace_')) {
      return 'text-pink-500 bg-pink-100 dark:bg-pink-900 dark:text-pink-300';
    }
    
    return 'text-gray-500 bg-gray-100 dark:bg-gray-800 dark:text-gray-300';
  };

  return (
    <div className="flex gap-3 group">
      <div className="relative">
        <Avatar className="h-8 w-8">
          <AvatarImage src={activity.user.avatar || undefined} />
          <AvatarFallback>
            {activity.user.firstName?.[0]}{activity.user.lastName?.[0]}
          </AvatarFallback>
        </Avatar>
        <div className={`absolute -bottom-1 -right-1 rounded-full p-1 ${getActivityColor()}`}>
          {getActivityIcon()}
        </div>
      </div>
      
      <div className="flex-1">
        <div className="text-sm">
          {activity.formattedMessage}
        </div>
        
        <div className="text-xs text-muted-foreground mt-1">
          {formattedDate}
        </div>
      </div>
    </div>
  );
}