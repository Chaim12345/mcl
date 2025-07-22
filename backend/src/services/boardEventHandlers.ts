import { AuthenticatedSocket } from './socketService.js';
import { checkBoardPermission } from '../middleware/socketAuth.js';
import { createActivity, ACTIVITY_ACTIONS } from './activityService.js';
import prisma from '../db/prisma.js';

export interface BoardUpdate {
  boardId: string;
  type: 'item_created' | 'item_updated' | 'item_deleted' | 'item_moved';
  itemId?: string;
  changes?: any;
  position?: { from: number; to: number };
  user: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  timestamp: string;
}

export interface ItemMoveData {
  boardId: string;
  itemId: string;
  fromPosition: number;
  toPosition: number;
  fromColumn?: string;
  toColumn?: string;
}

export interface UserPresence {
  userId: string;
  boardId: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  lastActivity: Date;
  cursorPosition?: { x: number; y: number };
}

/**
 * Handle board-related socket events
 */
export class BoardEventHandler {
  private static presenceMap = new Map<string, Map<string, UserPresence>>();
  
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

      // Update presence tracking
      this.updateUserPresence(boardId, socket.userId, {
        userId: socket.userId,
        boardId,
        status: 'online',
        lastActivity: new Date()
      });

      // Get current board users
      const boardUsers = this.getBoardUsers(boardId);

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

      // Send current board users to the joining user
      socket.emit('board-users', { 
        boardId, 
        users: boardUsers 
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

    // Update presence tracking
    this.removeUserPresence(boardId, socket.userId);

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
      
      // Update user's last activity
      this.updateUserActivity(data.boardId, socket.userId);
      
      // Create activity log
      if (data.itemId) {
        let activityAction;
        let metadata = {};
        
        switch (data.type) {
          case 'item_created':
            activityAction = ACTIVITY_ACTIONS.ITEM_CREATED;
            break;
          case 'item_updated':
            activityAction = ACTIVITY_ACTIONS.ITEM_UPDATED;
            metadata = { changes: data.changes };
            break;
          case 'item_deleted':
            activityAction = ACTIVITY_ACTIONS.ITEM_DELETED;
            break;
          case 'item_moved':
            activityAction = ACTIVITY_ACTIONS.ITEM_MOVED;
            metadata = { position: data.position };
            break;
        }
        
        await createActivity({
          action: activityAction,
          entityId: data.itemId,
          entityType: 'item',
          itemId: data.itemId,
          userId: socket.userId,
          metadata
        });
      }
      
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
  static async handleItemMove(socket: AuthenticatedSocket, data: ItemMoveData): Promise<void> {
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
      
      // Update user's last activity
      this.updateUserActivity(data.boardId, socket.userId);
      
      // Create activity log
      await createActivity({
        action: ACTIVITY_ACTIONS.ITEM_MOVED,
        entityId: data.itemId,
        entityType: 'item',
        itemId: data.itemId,
        userId: socket.userId,
        metadata: {
          fromPosition: data.fromPosition,
          toPosition: data.toPosition,
          fromColumn: data.fromColumn,
          toColumn: data.toColumn
        }
      });
      
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

  /**
   * Handle comment added event
   */
  static async handleCommentAdded(socket: AuthenticatedSocket, data: {
    boardId: string;
    itemId: string;
    commentId: string;
    comment: any;
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
      
      // Update user's last activity
      this.updateUserActivity(data.boardId, socket.userId);
      
      // Create activity log
      await createActivity({
        action: ACTIVITY_ACTIONS.COMMENT_CREATED,
        entityId: data.commentId,
        entityType: 'comment',
        itemId: data.itemId,
        userId: socket.userId
      });
      
      // Broadcast comment to all users in board except sender
      socket.to(roomName).emit('comment-added', {
        boardId: data.boardId,
        itemId: data.itemId,
        comment: data.comment,
        user: {
          id: socket.user.id,
          firstName: socket.user.firstName,
          lastName: socket.user.lastName,
          avatar: socket.user.avatar,
        },
        timestamp: new Date().toISOString(),
      });

      console.log(`💬 Comment added to item ${data.itemId} in board ${data.boardId} by ${socket.user.email}`);
    } catch (error) {
      console.error('Error handling comment added:', error);
      socket.emit('error', { 
        type: 'COMMENT_ADD_ERROR',
        message: 'Failed to broadcast comment' 
      });
    }
  }

  /**
   * Handle activity logged event
   */
  static async handleActivityLogged(socket: AuthenticatedSocket, data: {
    boardId: string;
    itemId: string;
    activityId: string;
    activity: any;
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
      
      // Broadcast activity to all users in board except sender
      socket.to(roomName).emit('activity-logged', {
        boardId: data.boardId,
        itemId: data.itemId,
        activity: data.activity,
        user: {
          id: socket.user.id,
          firstName: socket.user.firstName,
          lastName: socket.user.lastName,
          avatar: socket.user.avatar,
        },
        timestamp: new Date().toISOString(),
      });

      console.log(`📝 Activity logged for item ${data.itemId} in board ${data.boardId}`);
    } catch (error) {
      console.error('Error handling activity logged:', error);
      socket.emit('error', { 
        type: 'ACTIVITY_LOG_ERROR',
        message: 'Failed to broadcast activity' 
      });
    }
  }

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
      if (!hasAccess) return;

      const roomName = `board:${data.boardId}`;
      
      // Update user's last activity
      this.updateUserActivity(data.boardId, socket.userId);
      
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
      if (!hasAccess) return;

      const roomName = `board:${data.boardId}`;
      
      // Update user's presence with cursor position
      this.updateUserPresence(data.boardId, socket.userId, {
        userId: socket.userId,
        boardId: data.boardId,
        status: 'online',
        lastActivity: new Date(),
        cursorPosition: { x: data.x, y: data.y }
      });
      
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

  /**
   * Handle user status changes
   */
  static handleUserStatus(socket: AuthenticatedSocket, data: {
    boardId: string;
    status: 'online' | 'away' | 'busy';
  }): void {
    try {
      const roomName = `board:${data.boardId}`;
      
      // Update user's presence with new status
      this.updateUserPresence(data.boardId, socket.userId, {
        userId: socket.userId,
        boardId: data.boardId,
        status: data.status,
        lastActivity: new Date()
      });
      
      // Broadcast status to others in board
      socket.to(roomName).emit('user-status-changed', {
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
    } catch (error) {
      console.error('Error handling user status:', error);
    }
  }

  /**
   * Update user presence in a board
   */
  private static updateUserPresence(boardId: string, userId: string, data: UserPresence): void {
    if (!this.presenceMap.has(boardId)) {
      this.presenceMap.set(boardId, new Map());
    }
    
    const boardUsers = this.presenceMap.get(boardId)!;
    
    // Merge with existing data if present
    const existingData = boardUsers.get(userId);
    if (existingData) {
      boardUsers.set(userId, { ...existingData, ...data });
    } else {
      boardUsers.set(userId, data);
    }
  }

  /**
   * Remove user presence from a board
   */
  private static removeUserPresence(boardId: string, userId: string): void {
    const boardUsers = this.presenceMap.get(boardId);
    if (boardUsers) {
      boardUsers.delete(userId);
      
      // Clean up empty maps
      if (boardUsers.size === 0) {
        this.presenceMap.delete(boardId);
      }
    }
  }

  /**
   * Update user's last activity timestamp
   */
  private static updateUserActivity(boardId: string, userId: string): void {
    const boardUsers = this.presenceMap.get(boardId);
    if (boardUsers) {
      const userData = boardUsers.get(userId);
      if (userData) {
        userData.lastActivity = new Date();
        boardUsers.set(userId, userData);
      }
    }
  }

  /**
   * Get all users in a board
   */
  private static getBoardUsers(boardId: string): any[] {
    const boardUsers = this.presenceMap.get(boardId);
    if (!boardUsers) return [];
    
    return Array.from(boardUsers.values()).map(presence => ({
      userId: presence.userId,
      status: presence.status,
      lastActivity: presence.lastActivity,
      cursorPosition: presence.cursorPosition
    }));
  }

  /**
   * Clean up inactive users (called periodically)
   */
  static cleanupInactiveUsers(): void {
    const inactivityThreshold = 5 * 60 * 1000; // 5 minutes
    const now = new Date();
    
    for (const [boardId, boardUsers] of this.presenceMap.entries()) {
      for (const [userId, userData] of boardUsers.entries()) {
        const timeSinceActivity = now.getTime() - userData.lastActivity.getTime();
        
        if (timeSinceActivity > inactivityThreshold) {
          // Mark user as away after inactivity
          if (userData.status === 'online') {
            userData.status = 'away';
            boardUsers.set(userId, userData);
            
            // Broadcast status change
            const roomName = `board:${boardId}`;
            const io = global.io; // Assuming io is stored globally
            if (io) {
              io.to(roomName).emit('user-status-changed', {
                userId,
                status: 'away',
                boardId,
                timestamp: now.toISOString(),
              });
            }
          }
        }
      }
    }
  }
}