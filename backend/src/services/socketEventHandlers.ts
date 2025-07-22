import { AuthenticatedSocket } from './socketService.js';
import { 
  checkWorkspacePermission, 
  checkBoardPermission,
  getUserWorkspaceRole 
} from '../middleware/socketAuth.js';

export interface UserPresence {
  userId: string;
  socketId: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  lastActivity: Date;
  currentBoard?: string;
  status: 'online' | 'away' | 'busy';
}

export interface TypingIndicator {
  userId: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  boardId: string;
  itemId?: string;
  isTyping: boolean;
  timestamp: Date;
}

export interface BoardActivity {
  type: 'item_created' | 'item_updated' | 'item_deleted' | 'item_moved' | 'comment_added';
  boardId: string;
  itemId?: string;
  userId: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  data: any;
  timestamp: Date;
}

/**
 * Handle workspace-related socket events
 */
export class WorkspaceEventHandler {
  /**
   * Handle user joining workspace
   */
  static async handleJoinWorkspace(socket: AuthenticatedSocket, workspaceId: string): Promise<void> {
    try {
      // Check permissions
      const hasAccess = await checkWorkspacePermission(socket.userId, workspaceId);
      if (!hasAccess) {
        socket.emit('error', { 
          type: 'WORKSPACE_ACCESS_DENIED',
          message: 'You do not have access to this workspace' 
        });
        return;
      }

      const roomName = `workspace:${workspaceId}`;
      await socket.join(roomName);

      // Get user role
      const role = await getUserWorkspaceRole(socket.userId, workspaceId);

      // Notify others in workspace
      socket.to(roomName).emit('user-joined-workspace', {
        user: {
          id: socket.user.id,
          email: socket.user.email,
          firstName: socket.user.firstName,
          lastName: socket.user.lastName,
          avatar: socket.user.avatar,
        },
        workspaceId,
        role,
        timestamp: new Date().toISOString(),
      });

      // Confirm join to user
      socket.emit('workspace-joined', {
        workspaceId,
        role,
        timestamp: new Date().toISOString(),
      });

      console.log(`👤 User ${socket.user.email} joined workspace ${workspaceId} with role ${role}`);
    } catch (error) {
      console.error('Error handling workspace join:', error);
      socket.emit('error', { 
        type: 'WORKSPACE_JOIN_ERROR',
        message: 'Failed to join workspace' 
      });
    }
  }

  /**
   * Handle user leaving workspace
   */
  static handleLeaveWorkspace(socket: AuthenticatedSocket, workspaceId: string): void {
    const roomName = `workspace:${workspaceId}`;
    socket.leave(roomName);

    // Notify others
    socket.to(roomName).emit('user-left-workspace', {
      user: {
        id: socket.user.id,
        email: socket.user.email,
        firstName: socket.user.firstName,
        lastName: socket.user.lastName,
        avatar: socket.user.avatar,
      },
      workspaceId,
      timestamp: new Date().toISOString(),
    });

    console.log(`👤 User ${socket.user.email} left workspace ${workspaceId}`);
  }
}

/**
 * Handle board-related socket events
 */
export class BoardEventHandler {
  /**
   * Handle user joining board
   */
  static async handleJoinBoard(socket: AuthenticatedSocket, boardId: string): Promise<void> {
    try {
      // Check permissions
      const hasAccess = await checkBoardPermission(socket.userId, boardId);
      if (!hasAccess) {
        socket.emit('error', { 
          type: 'BOARD_ACCESS_DENIED',
          message: 'You do not have access to this board' 
        });
        return;
      }

      const roomName = `board:${boardId}`;
      await socket.join(roomName);

      // Notify others in board
      socket.to(roomName).emit('user-joined-board', {
        user: {
          id: socket.user.id,
          email: socket.user.email,
          firstName: socket.user.firstName,
          lastName: socket.user.lastName,
          avatar: socket.user.avatar,
        },
        boardId,
        timestamp: new Date().toISOString(),
      });

      // Confirm join to user
      socket.emit('board-joined', {
        boardId,
        timestamp: new Date().toISOString(),
      });

      console.log(`👤 User ${socket.user.email} joined board ${boardId}`);
    } catch (error) {
      console.error('Error handling board join:', error);
      socket.emit('error', { 
        type: 'BOARD_JOIN_ERROR',
        message: 'Failed to join board' 
      });
    }
  }

  /**
   * Handle user leaving board
   */
  static handleLeaveBoard(socket: AuthenticatedSocket, boardId: string): void {
    const roomName = `board:${boardId}`;
    socket.leave(roomName);

    // Notify others
    socket.to(roomName).emit('user-left-board', {
      user: {
        id: socket.user.id,
        email: socket.user.email,
        firstName: socket.user.firstName,
        lastName: socket.user.lastName,
        avatar: socket.user.avatar,
      },
      boardId,
      timestamp: new Date().toISOString(),
    });

    console.log(`👤 User ${socket.user.email} left board ${boardId}`);
  }

  /**
   * Handle real-time board updates
   */
  static async handleBoardUpdate(socket: AuthenticatedSocket, data: {
    boardId: string;
    type: 'item_created' | 'item_updated' | 'item_deleted' | 'item_moved';
    itemId?: string;
    changes?: any;
    position?: { from: number; to: number };
  }): Promise<void> {
    try {
      // Check permissions
      const hasAccess = await checkBoardPermission(socket.userId, data.boardId);
      if (!hasAccess) {
        socket.emit('error', { 
          type: 'BOARD_ACCESS_DENIED',
          message: 'You do not have access to this board' 
        });
        return;
      }

      const roomName = `board:${data.boardId}`;
      
      // Broadcast update to all users in board except sender
      socket.to(roomName).emit('board-updated', {
        ...data,
        user: {
          id: socket.user.id,
          firstName: socket.user.firstName,
          lastName: socket.user.lastName,
          avatar: socket.user.avatar,
        },
        timestamp: new Date().toISOString(),
      });

      console.log(`📋 Board ${data.boardId} updated by ${socket.user.email}: ${data.type}`);
    } catch (error) {
      console.error('Error handling board update:', error);
      socket.emit('error', { 
        type: 'BOARD_UPDATE_ERROR',
        message: 'Failed to broadcast board update' 
      });
    }
  }

  /**
   * Handle drag and drop updates
   */
  static async handleItemMove(socket: AuthenticatedSocket, data: {
    boardId: string;
    itemId: string;
    fromPosition: number;
    toPosition: number;
    fromColumn?: string;
    toColumn?: string;
  }): Promise<void> {
    try {
      // Check permissions
      const hasAccess = await checkBoardPermission(socket.userId, data.boardId);
      if (!hasAccess) {
        socket.emit('error', { 
          type: 'BOARD_ACCESS_DENIED',
          message: 'You do not have access to this board' 
        });
        return;
      }

      const roomName = `board:${data.boardId}`;
      
      // Broadcast move to all users in board except sender
      socket.to(roomName).emit('item-moved', {
        ...data,
        user: {
          id: socket.user.id,
          firstName: socket.user.firstName,
          lastName: socket.user.lastName,
          avatar: socket.user.avatar,
        },
        timestamp: new Date().toISOString(),
      });

      console.log(`🔄 Item ${data.itemId} moved in board ${data.boardId} by ${socket.user.email}`);
    } catch (error) {
      console.error('Error handling item move:', error);
      socket.emit('error', { 
        type: 'ITEM_MOVE_ERROR',
        message: 'Failed to broadcast item move' 
      });
    }
  }
}

/**
 * Handle user presence and activity
 */
export class PresenceEventHandler {
  /**
   * Handle typing indicators
   */
  static async handleTyping(socket: AuthenticatedSocket, data: {
    boardId: string;
    itemId?: string;
    isTyping: boolean;
  }): Promise<void> {
    try {
      // Check permissions
      const hasAccess = await checkBoardPermission(socket.userId, data.boardId);
      if (!hasAccess) {
        return;
      }

      const roomName = `board:${data.boardId}`;
      
      // Broadcast typing indicator to others in board
      socket.to(roomName).emit('user-typing', {
        user: {
          id: socket.user.id,
          firstName: socket.user.firstName,
          lastName: socket.user.lastName,
          avatar: socket.user.avatar,
        },
        boardId: data.boardId,
        itemId: data.itemId,
        isTyping: data.isTyping,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error handling typing indicator:', error);
    }
  }

  /**
   * Handle user activity status
   */
  static handleActivityStatus(socket: AuthenticatedSocket, data: {
    status: 'online' | 'away' | 'busy';
    boardId?: string;
  }): void {
    // Broadcast status to relevant rooms
    if (data.boardId) {
      socket.to(`board:${data.boardId}`).emit('user-status-changed', {
        user: {
          id: socket.user.id,
          firstName: socket.user.firstName,
          lastName: socket.user.lastName,
          avatar: socket.user.avatar,
        },
        status: data.status,
        boardId: data.boardId,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Handle cursor position updates
   */
  static async handleCursorPosition(socket: AuthenticatedSocket, data: {
    boardId: string;
    x: number;
    y: number;
    itemId?: string;
  }): Promise<void> {
    try {
      // Check permissions
      const hasAccess = await checkBoardPermission(socket.userId, data.boardId);
      if (!hasAccess) {
        return;
      }

      const roomName = `board:${data.boardId}`;
      
      // Broadcast cursor position to others in board
      socket.to(roomName).emit('user-cursor', {
        user: {
          id: socket.user.id,
          firstName: socket.user.firstName,
          lastName: socket.user.lastName,
          avatar: socket.user.avatar,
        },
        ...data,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error handling cursor position:', error);
    }
  }
}