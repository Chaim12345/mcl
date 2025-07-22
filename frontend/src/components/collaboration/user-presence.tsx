import { useEffect } from 'react';
import { useSocket } from '@/hooks/use-socket';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatDistanceToNow } from 'date-fns';

interface UserPresenceProps {
  boardId: string;
}

export function UserPresence({ boardId }: UserPresenceProps) {
  const { boardUsers, joinBoard, leaveBoard } = useSocket();
  
  // Join board room on mount
  useEffect(() => {
    joinBoard(boardId);
    
    return () => {
      leaveBoard(boardId);
    };
  }, [boardId, joinBoard, leaveBoard]);
  
  // Get online users
  const onlineUsers = Object.values(boardUsers).filter(user => user.status === 'online');
  const awayUsers = Object.values(boardUsers).filter(user => user.status === 'away' || user.status === 'busy');
  
  if (Object.keys(boardUsers).length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-1">
      <TooltipProvider>
        <div className="flex -space-x-2">
          {onlineUsers.slice(0, 3).map((user) => (
            <Tooltip key={user.userId}>
              <TooltipTrigger asChild>
                <Avatar className="h-6 w-6 border-2 border-background">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {user.userId.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>
                <p>{user.userId}</p>
                <p className="text-xs text-muted-foreground">
                  Active {formatDistanceToNow(new Date(user.lastActivity), { addSuffix: true })}
                </p>
              </TooltipContent>
            </Tooltip>
          ))}
          
          {onlineUsers.length > 3 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Avatar className="h-6 w-6 border-2 border-background">
                  <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                    +{onlineUsers.length - 3}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>
                <p>{onlineUsers.length - 3} more online users</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </TooltipProvider>
      
      {onlineUsers.length > 0 && (
        <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 text-xs">
          {onlineUsers.length} online
        </Badge>
      )}
      
      {awayUsers.length > 0 && (
        <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300 text-xs">
          {awayUsers.length} away
        </Badge>
      )}
    </div>
  );
}