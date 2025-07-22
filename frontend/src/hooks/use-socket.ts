import { useEffect, useState, useCallback } from 'react';
import { socketService, SocketUser, UserPresence, TypingIndicator, CursorPosition, BoardUpdate, ItemMoveData, CommentEvent, ActivityEvent } from '@/services/socket-service';
import { useAuth } from '@/hooks/use-auth';

export interface ConnectionStatus {
  status: 'connected' | 'disconnected' | 'reconnecting' | 'failed';
  attempt?: number;
}

export function useSocket() {
  const { isAuthenticated } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({ 
    status: socketService.isConnected() ? 'connected' : 'disconnected' 
  });
  const [boardUsers, setBoardUsers] = useState<Record<string, UserPresence>>({});
  const [typingUsers, setTypingUsers] = useState<Record<string, TypingIndicator>>({});
  const [cursorPositions, setCursorPositions] = useState<Record<string, CursorPosition>>({});

  // Initialize socket when authenticated
  useEffect(() => {
    if (isAuthenticated && !socketService.isConnected()) {
      socketService.initialize();
    }
    
    return () => {
      // Don't disconnect on unmount, as we want to keep the socket alive
      // for the entire session
    };
  }, [isAuthenticated]);

  // Set up event listeners
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const unsubscribeConnectionStatus = socketService.on('connection-status', (status: ConnectionStatus) => {
      setConnectionStatus(status);
    });
    
    const unsubscribeBoardUsers = socketService.on('board-users', (data: { boardId: string, users: UserPresence[] }) => {
      const usersMap: Record<string, UserPresence> = {};
      data.users.forEach(user => {
        usersMap[user.userId] = user;
      });
      setBoardUsers(usersMap);
    });
    
    const unsubscribeUserJoined = socketService.on('user-joined-board', (data: { user: SocketUser, boardId: string }) => {
      setBoardUsers(prev => ({
        ...prev,
        [data.user.id]: {
          userId: data.user.id,
          status: 'online',
          lastActivity: new Date().toISOString(),
        }
      }));
    });
    
    const unsubscribeUserLeft = socketService.on('user-left-board', (data: { user: SocketUser, boardId: string }) => {
      setBoardUsers(prev => {
        const newUsers = { ...prev };
        delete newUsers[data.user.id];
        return newUsers;
      });
    });
    
    const unsubscribeUserTyping = socketService.on('user-typing', (data: TypingIndicator) => {
      if (data.isTyping) {
        setTypingUsers(prev => ({
          ...prev,
          [data.user.id]: data
        }));
      } else {
        setTypingUsers(prev => {
          const newTyping = { ...prev };
          delete newTyping[data.user.id];
          return newTyping;
        });
      }
    });
    
    const unsubscribeUserCursor = socketService.on('user-cursor', (data: CursorPosition) => {
      setCursorPositions(prev => ({
        ...prev,
        [data.user.id]: data
      }));
    });
    
    const unsubscribeUserStatus = socketService.on('user-status-changed', (data: { user: SocketUser, status: 'online' | 'away' | 'busy', boardId: string }) => {
      setBoardUsers(prev => ({
        ...prev,
        [data.user.id]: {
          ...prev[data.user.id],
          userId: data.user.id,
          status: data.status,
          lastActivity: new Date().toISOString(),
        }
      }));
    });
    
    return () => {
      unsubscribeConnectionStatus();
      unsubscribeBoardUsers();
      unsubscribeUserJoined();
      unsubscribeUserLeft();
      unsubscribeUserTyping();
      unsubscribeUserCursor();
      unsubscribeUserStatus();
    };
  }, [isAuthenticated]);

  // Join workspace
  const joinWorkspace = useCallback((workspaceId: string) => {
    socketService.joinWorkspace(workspaceId);
  }, []);

  // Leave workspace
  const leaveWorkspace = useCallback((workspaceId: string) => {
    socketService.leaveWorkspace(workspaceId);
  }, []);

  // Join board
  const joinBoard = useCallback((boardId: string) => {
    socketService.joinBoard(boardId);
    
    // Reset board-specific state
    setBoardUsers({});
    setTypingUsers({});
    setCursorPositions({});
  }, []);

  // Leave board
  const leaveBoard = useCallback((boardId: string) => {
    socketService.leaveBoard(boardId);
    
    // Reset board-specific state
    setBoardUsers({});
    setTypingUsers({});
    setCursorPositions({});
  }, []);

  // Send typing indicator
  const sendTypingIndicator = useCallback((boardId: string, itemId?: string, isTyping: boolean = true) => {
    if (isTyping) {
      socketService.startTyping(boardId, itemId);
    } else {
      socketService.stopTyping(boardId, itemId);
    }
  }, []);

  // Send cursor position
  const sendCursorPosition = useCallback((boardId: string, x: number, y: number, itemId?: string) => {
    socketService.sendCursorPosition({ boardId, x, y, itemId });
  }, []);

  // Send user status
  const sendUserStatus = useCallback((boardId: string, status: 'online' | 'away' | 'busy') => {
    socketService.sendUserStatus({ boardId, status });
  }, []);

  // Subscribe to board updates
  const onBoardUpdate = useCallback((callback: (data: BoardUpdate) => void) => {
    return socketService.on('board-updated', callback);
  }, []);

  // Subscribe to item move events
  const onItemMove = useCallback((callback: (data: ItemMoveData) => void) => {
    return socketService.on('item-moved', callback);
  }, []);

  // Subscribe to comment events
  const onCommentAdded = useCallback((callback: (data: CommentEvent) => void) => {
    return socketService.on('comment-added', callback);
  }, []);

  // Subscribe to activity events
  const onActivityLogged = useCallback((callback: (data: ActivityEvent) => void) => {
    return socketService.on('activity-logged', callback);
  }, []);

  // Send comment added event
  const sendCommentAdded = useCallback((data: {
    boardId: string;
    itemId: string;
    commentId: string;
    comment: any;
  }) => {
    socketService.sendCommentAdded(data);
  }, []);

  // Send activity logged event
  const sendActivityLogged = useCallback((data: {
    boardId: string;
    itemId: string;
    activityId: string;
    activity: any;
  }) => {
    socketService.sendActivityLogged(data);
  }, []);

  return {
    connectionStatus,
    boardUsers,
    typingUsers,
    cursorPositions,
    joinWorkspace,
    leaveWorkspace,
    joinBoard,
    leaveBoard,
    sendTypingIndicator,
    sendCursorPosition,
    sendUserStatus,
    onBoardUpdate,
    onItemMove,
    onCommentAdded,
    onActivityLogged,
    sendCommentAdded,
    sendActivityLogged,
  };
}