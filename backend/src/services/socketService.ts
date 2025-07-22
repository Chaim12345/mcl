import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { verifyToken } from '../utils/jwt.js';
import { query } from '../db/client.js';
import { User } from '../models/types.js';
import { NotificationEventHandler } from './notificationEventHandlers.js';
import { BoardEventHandler } from './boardEventHandlers.js';

export interface AuthenticatedSocket extends Socket {
  user: User;
  userId: string;
}

export interface SocketUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
}

export interface RoomData {
  type: 'workspace' | 'board';
  id: string;
  users: Set<string>;
}

class SocketService {
  private io: SocketIOServer | null = null;
  private connectedUsers = new Map<string, SocketUser>();
  private userSockets = new Map<string, Set<string>>(); // userId -> Set of socketIds
  private rooms = new Map<string, RoomData>();

  /**
   * Initialize Socket.io server
   */
  initialize(server: HTTPServer): SocketIOServer {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        // Verify JWT token
        const decoded = verifyToken(token);
        
        // Get user from database
        const result = await query(
          'SELECT id, email, "firstName", "lastName", avatar, "isActive" FROM users WHERE id = $1',
          [decoded.userId]
        );

        if (result.rows.length === 0) {
          return next(new Error('User not found'));
        }

        const user = result.rows[0];
        
        if (!user.isActive) {
          return next(new Error('User account is inactive'));
        }

        // Attach user to socket
        (socket as any).user = user;
        (socket as any).userId = user.id;
        
        next();
      } catch (error) {
        console.error('Socket authentication error:', error);
        next(new Error('Authentication failed'));
      }
    });

    // Connection handling
    this.io.on('connection', (socket) => {
      this.handleConnection(socket as AuthenticatedSocket);
    });

    console.log('🔌 Socket.io server initialized');
    return this.io;
  }

  /**
   * Handle new socket connection
   */
  private handleConnection(socket: AuthenticatedSocket): void {
    const user = socket.user;
    const userId = user.id;
    
    console.log(`👤 User ${user.email} connected (${socket.id})`);

    // Track connected user
    this.connectedUsers.set(socket.id, {
      id: user.id,
      email: user.email,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      ...(user.avatar && { avatar: user.avatar }),
    });

    // Track user sockets
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(socket.id);

    // Import event handlers dynamically to avoid circular imports
    this.setupEventHandlers(socket);

    // Handle disconnection
    socket.on('disconnect', () => {
      this.handleDisconnection(socket);
    });
  }

  /**
   * Setup event handlers for socket
   */
  private setupEventHandlers(socket: AuthenticatedSocket): void {
    // Workspace events
    socket.on('join-workspace', async (workspaceId: string) => {
      await this.handleJoinWorkspace(socket, workspaceId);
    });

    socket.on('leave-workspace', (workspaceId: string) => {
      this.handleLeaveWorkspace(socket, workspaceId);
    });

    // Board events
    socket.on('join-board', async (boardId: string) => {
      await this.handleJoinBoard(socket, boardId);
    });

    socket.on('leave-board', (boardId: string) => {
      this.handleLeaveBoard(socket, boardId);
    });

    // Board updates
    socket.on('board-update', async (data: any) => {
      await BoardEventHandler.handleBoardUpdate(socket, data);
    });

    socket.on('item-move', async (data: any) => {
      await BoardEventHandler.handleItemMove(socket, data);
    });

    // Presence events
    socket.on('typing', async (data: any) => {
      await BoardEventHandler.handleTyping(socket, data);
    });

    socket.on('user-status', (data: any) => {
      BoardEventHandler.handleUserStatus(socket, data);
    });

    socket.on('cursor-position', async (data: any) => {
      await BoardEventHandler.handleCursorPosition(socket, data);
    });

    // Comment events
    socket.on('comment-added', async (data: any) => {
      await BoardEventHandler.handleCommentAdded(socket, data);
    });

    // Activity events
    socket.on('activity-logged', async (data: any) => {
      await BoardEventHandler.handleActivityLogged(socket, data);
    });

    // Notification events
    socket.on('mark-notification-read', async (data: any) => {
      await NotificationEventHandler.handleMarkAsRead(socket, data);
    });

    socket.on('mark-notifications-read', async (data: any) => {
      await NotificationEventHandler.handleMarkMultipleAsRead(socket, data);
    });

    socket.on('mark-all-notifications-read', async () => {
      await NotificationEventHandler.handleMarkAllAsRead(socket);
    });

    socket.on('delete-notification', async (data: any) => {
      await NotificationEventHandler.handleDeleteNotification(socket, data);
    });

    socket.on('update-notification-preferences', async (data: any) => {
      await NotificationEventHandler.handleUpdatePreferences(socket, data);
    });
  }

  /**
   * Handle joining workspace room
   */
  private async handleJoinWorkspace(socket: AuthenticatedSocket, workspaceId: string): Promise<void> {
    try {
      // Check if user has access to workspace
      const hasAccess = await this.checkWorkspaceAccess(socket.userId, workspaceId);
      if (!hasAccess) {
        socket.emit('error', { 
          type: 'WORKSPACE_ACCESS_DENIED',
          message: 'Access denied to workspace' 
        });
        return;
      }

      const roomName = `workspace:${workspaceId}`;
      await socket.join(roomName);

      // Track room membership
      if (!this.rooms.has(roomName)) {
        this.rooms.set(roomName, {
          type: 'workspace',
          id: workspaceId,
          users: new Set(),
        });
      }
      this.rooms.get(roomName)!.users.add(socket.userId);

      // Get user role
      const roleResult = await query(
        'SELECT role FROM workspace_members WHERE "userId" = $1 AND "workspaceId" = $2',
        [socket.userId, workspaceId]
      );
      const role = roleResult.rows.length > 0 ? roleResult.rows[0].role : 'member';

      // Notify others in the workspace
      socket.to(roomName).emit('user-joined-workspace', {
        user: this.connectedUsers.get(socket.id),
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

      // Send current room users to the joining user
      const roomUsers = Array.from(this.rooms.get(roomName)!.users)
        .map(userId => Array.from(this.userSockets.get(userId) || []))
        .flat()
        .map(socketId => this.connectedUsers.get(socketId))
        .filter(Boolean);

      socket.emit('workspace-users', { workspaceId, users: roomUsers });
      
      console.log(`👤 User ${socket.user.email} joined workspace ${workspaceId}`);
    } catch (error) {
      console.error('Error joining workspace:', error);
      socket.emit('error', { 
        type: 'WORKSPACE_JOIN_ERROR',
        message: 'Failed to join workspace' 
      });
    }
  }

  /**
   * Handle leaving workspace room
   */
  private handleLeaveWorkspace(socket: AuthenticatedSocket, workspaceId: string): void {
    const roomName = `workspace:${workspaceId}`;
    socket.leave(roomName);

    // Update room tracking
    const room = this.rooms.get(roomName);
    if (room) {
      room.users.delete(socket.userId);
      if (room.users.size === 0) {
        this.rooms.delete(roomName);
      }
    }

    // Notify others
    socket.to(roomName).emit('user-left-workspace', {
      user: this.connectedUsers.get(socket.id),
      workspaceId,
    });

    console.log(`👤 User ${socket.user.email} left workspace ${workspaceId}`);
  }

  /**
   * Handle joining board room
   */
  private async handleJoinBoard(socket: AuthenticatedSocket, boardId: string): Promise<void> {
    await BoardEventHandler.handleJoinBoard(socket, boardId);
    
    // Track room membership for our internal tracking
    const roomName = `board:${boardId}`;
    if (!this.rooms.has(roomName)) {
      this.rooms.set(roomName, {
        type: 'board',
        id: boardId,
        users: new Set(),
      });
    }
    this.rooms.get(roomName)!.users.add(socket.userId);
  }

  /**
   * Handle leaving board room
   */
  private handleLeaveBoard(socket: AuthenticatedSocket, boardId: string): void {
    BoardEventHandler.handleLeaveBoard(socket, boardId);
    
    // Update room tracking for our internal tracking
    const roomName = `board:${boardId}`;
    const room = this.rooms.get(roomName);
    if (room) {
      room.users.delete(socket.userId);
      if (room.users.size === 0) {
        this.rooms.delete(roomName);
      }
    }
  }

  /**
   * Handle user activity (typing, viewing, etc.)
   */
  private handleUserActivity(socket: AuthenticatedSocket, data: { type: 'typing' | 'viewing'; boardId?: string; itemId?: string }): void {
    const user = this.connectedUsers.get(socket.id);
    if (!user) return;

    if (data.boardId) {
      const roomName = `board:${data.boardId}`;
      socket.to(roomName).emit('user-activity', {
        user,
        ...data,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Handle socket disconnection
   */
  private handleDisconnection(socket: AuthenticatedSocket): void {
    const user = this.connectedUsers.get(socket.id);
    if (!user) return;

    console.log(`👤 User ${user.email} disconnected (${socket.id})`);

    // Remove from tracking
    this.connectedUsers.delete(socket.id);
    
    const userSocketSet = this.userSockets.get(socket.userId);
    if (userSocketSet) {
      userSocketSet.delete(socket.id);
      if (userSocketSet.size === 0) {
        this.userSockets.delete(socket.userId);
      }
    }

    // Remove from all rooms and notify
    for (const [roomName, room] of this.rooms.entries()) {
      if (room.users.has(socket.userId)) {
        // Check if user has other active sockets
        const hasOtherSockets = this.userSockets.has(socket.userId) && this.userSockets.get(socket.userId)!.size > 0;
        
        if (!hasOtherSockets) {
          room.users.delete(socket.userId);
          
          // Notify room about user leaving
          if (room.type === 'workspace') {
            socket.to(roomName).emit('user-left-workspace', { user, workspaceId: room.id });
          } else if (room.type === 'board') {
            socket.to(roomName).emit('user-left-board', { user, boardId: room.id });
          }
        }

        // Clean up empty rooms
        if (room.users.size === 0) {
          this.rooms.delete(roomName);
        }
      }
    }
  }

  /**
   * Check if user has access to workspace
   */
  private async checkWorkspaceAccess(userId: string, workspaceId: string): Promise<boolean> {
    try {
      const result = await query(
        'SELECT 1 FROM workspace_members WHERE "userId" = $1 AND "workspaceId" = $2',
        [userId, workspaceId]
      );
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error checking workspace access:', error);
      return false;
    }
  }

  /**
   * Check if user has access to board
   */
  private async checkBoardAccess(userId: string, boardId: string): Promise<boolean> {
    try {
      const result = await query(
        `SELECT 1 FROM boards b 
         JOIN workspace_members wm ON b."workspaceId" = wm."workspaceId" 
         WHERE b.id = $1 AND wm."userId" = $2`,
        [boardId, userId]
      );
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error checking board access:', error);
      return false;
    }
  }

  /**
   * Broadcast to workspace room
   */
  broadcastToWorkspace(workspaceId: string, event: string, data: any): void {
    if (!this.io) return;
    this.io.to(`workspace:${workspaceId}`).emit(event, data);
  }

  /**
   * Broadcast to board room
   */
  broadcastToBoard(boardId: string, event: string, data: any): void {
    if (!this.io) return;
    this.io.to(`board:${boardId}`).emit(event, data);
  }

  /**
   * Send to specific user (all their sockets)
   */
  sendToUser(userId: string, event: string, data: any): void {
    if (!this.io) return;
    
    const userSocketIds = this.userSockets.get(userId);
    if (userSocketIds) {
      for (const socketId of userSocketIds) {
        this.io.to(socketId).emit(event, data);
      }
    }
  }

  /**
   * Get connected users in a room
   */
  getRoomUsers(roomName: string): SocketUser[] {
    const room = this.rooms.get(roomName);
    if (!room) return [];

    return Array.from(room.users)
      .map(userId => Array.from(this.userSockets.get(userId) || []))
      .flat()
      .map(socketId => this.connectedUsers.get(socketId))
      .filter(Boolean) as SocketUser[];
  }

  // These methods have been moved to BoardEventHandler class

  /**
   * Get Socket.io instance
   */
  getIO(): SocketIOServer | null {
    return this.io;
  }
}

// Export singleton instance
export const socketService = new SocketService();
export default socketService;