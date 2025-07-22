import { useEffect, useState } from 'react';
import { socketService } from '@/services/socket-service';
import { useToast } from '@/hooks/use-toast';

interface UseRealTimeSyncOptions {
  boardId?: string;
  workspaceId?: string;
  onItemUpdate?: (data: any) => void;
  onItemMove?: (data: any) => void;
  onCommentAdded?: (data: any) => void;
  onActivityLogged?: (data: any) => void;
  onUserJoined?: (data: any) => void;
  onUserLeft?: (data: any) => void;
  onUserTyping?: (data: any) => void;
  onUserCursor?: (data: any) => void;
  onConnectionChange?: (status: 'connected' | 'disconnected' | 'reconnecting' | 'failed') => void;
}

export function useRealTimeSync({
  boardId,
  workspaceId,
  onItemUpdate,
  onItemMove,
  onCommentAdded,
  onActivityLogged,
  onUserJoined,
  onUserLeft,
  onUserTyping,
  onUserCursor,
  onConnectionChange,
}: UseRealTimeSyncOptions = {}) {
  const [isConnected, setIsConnected] = useState(socketService.isConnected());
  const { toast } = useToast();
  
  useEffect(() => {
    // Initialize socket if not already connected
    if (!socketService.isConnected()) {
      socketService.initialize();
    }
    
    const unsubscribers: Array<() => void> = [];
    
    // Join rooms if needed
    if (workspaceId) {
      socketService.joinWorkspace(workspaceId);
    }
    
    if (boardId) {
      socketService.joinBoard(boardId);
    }
    
    // Listen for connection status changes
    unsubscribers.push(
      socketService.on('connection-status', (data: { 
        status: 'connected' | 'disconnected' | 'reconnecting' | 'failed';
      }) => {
        setIsConnected(data.status === 'connected');
        
        if (onConnectionChange) {
          onConnectionChange(data.status);
        }
        
        // Show toast for disconnection and reconnection
        if (data.status === 'disconnected') {
          toast({
            title: 'Disconnected',
            description: 'You are currently offline. Changes will be saved when you reconnect.',
            variant: 'destructive',
          });
        } else if (data.status === 'connected') {
          toast({
            title: 'Connected',
            description: 'You are back online. All changes have been synchronized.',
            variant: 'default',
          });
        }
      })
    );
    
    // Set up event listeners based on provided callbacks
    if (onItemUpdate) {
      unsubscribers.push(socketService.on('board-updated', onItemUpdate));
    }
    
    if (onItemMove) {
      unsubscribers.push(socketService.on('item-moved', onItemMove));
    }
    
    if (onCommentAdded) {
      unsubscribers.push(socketService.on('comment-added', onCommentAdded));
    }
    
    if (onActivityLogged) {
      unsubscribers.push(socketService.on('activity-logged', onActivityLogged));
    }
    
    if (onUserJoined) {
      unsubscribers.push(socketService.on('user-joined-board', onUserJoined));
    }
    
    if (onUserLeft) {
      unsubscribers.push(socketService.on('user-left-board', onUserLeft));
    }
    
    if (onUserTyping) {
      unsubscribers.push(socketService.on('user-typing', onUserTyping));
    }
    
    if (onUserCursor) {
      unsubscribers.push(socketService.on('user-cursor', onUserCursor));
    }
    
    // Cleanup function
    return () => {
      // Leave rooms if needed
      if (workspaceId) {
        socketService.leaveWorkspace(workspaceId);
      }
      
      if (boardId) {
        socketService.leaveBoard(boardId);
      }
      
      // Unsubscribe from all events
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [
    boardId, 
    workspaceId, 
    onItemUpdate, 
    onItemMove, 
    onCommentAdded, 
    onActivityLogged,
    onUserJoined,
    onUserLeft,
    onUserTyping,
    onUserCursor,
    onConnectionChange,
    toast
  ]);
  
  return {
    isConnected,
    sendBoardUpdate: socketService.sendBoardUpdate.bind(socketService),
    sendItemMove: socketService.sendItemMove.bind(socketService),
    sendTypingIndicator: socketService.sendTypingIndicator.bind(socketService),
    sendCursorPosition: socketService.sendCursorPosition.bind(socketService),
    sendUserStatus: socketService.sendUserStatus.bind(socketService),
    sendCommentAdded: socketService.sendCommentAdded.bind(socketService),
    sendActivityLogged: socketService.sendActivityLogged.bind(socketService),
    startTyping: socketService.startTyping.bind(socketService),
    stopTyping: socketService.stopTyping.bind(socketService),
  };
}