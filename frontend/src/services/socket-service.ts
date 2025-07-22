import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/auth-store';
import { Comment, Activity } from '@/types';

export interface SocketUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
}

export interface UserPresence {
  userId: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  lastActivity: string;
  cursorPosition?: { x: number; y: number };
}

export interface TypingIndicator {
  user: SocketUser;
  boardId: string;
  itemId?: string;
  isTyping: boolean;
  timestamp: string;
}

export interface CursorPosition {
  user: SocketUser;
  boardId: string;
  x: number;
  y: number;
  itemId?: string;
  timestamp: string;
}

export interface BoardUpdate {
  boardId: string;
  type: 'item_created' | 'item_updated' | 'item_deleted' | 'item_moved';
  itemId?: string;
  changes?: any;
  position?: { from: number; to: number };
  user: SocketUser;
  timestamp: string;
}

export interface ItemMoveData {
  boardId: string;
  itemId: string;
  fromPosition: number;
  toPosition: number;
  fromColumn?: string;
  toColumn?: string;
  user: SocketUser;
  timestamp: string;
}

export interface CommentEvent {
  boardId: string;
  itemId: string;
  comment: Comment;
  user: SocketUser;
  timestamp: string;
}

export interface ActivityEvent {
  boardId: string;
  itemId: string;
  activity: Activity;
  user: SocketUser;
  timestamp: string;
}

class SocketService {
  private socket: Socket | null = null;
  private currentBoardId: string | null = null;
  private currentWorkspaceId: string | null = null;
  private typingTimeouts: Record<string, NodeJS.Timeout> = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;
  private listeners: Record<string, Function[]> = {};

  /**
   * Initialize socket connection
   */
  initialize(): void {
    if (this.socket) return;

    const token = useAuthStore.getState().token;
    if (!token) return;

    const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    
    this.socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
    });

    this.setupEventListeners();
  }

  /**
   * Set up socket event listeners
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Socket connected');
      this.reconnectAttempts = 0;
      
      // Rejoin rooms if needed
      if (this.currentWorkspaceId) {
        this.joinWorkspace(this.currentWorkspaceId);
      }
      
      if (this.currentBoardId) {
        this.joinBoard(this.currentBoardId);
      }
      
      this.emit('connection-status', { status: 'connected' });
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
      this.emit('connection-status', { status: 'disconnected' });
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
        this.emit('connection-status', { status: 'failed' });
      } else {
        this.emit('connection-status', { status: 'reconnecting', attempt: this.reconnectAttempts });
      }
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
      this.emit('socket-error', error);
    });

    // Board events
    this.socket.on('board-joined', (data) => {
      this.emit('board-joined', data);
    });

    this.socket.on('board-users', (data) => {
      this.emit('board-users', data);
    });

    this.socket.on('user-joined-board', (data) => {
      this.emit('user-joined-board', data);
    });

    this.socket.on('user-left-board', (data) => {
      this.emit('user-left-board', data);
    });

    this.socket.on('board-updated', (data: BoardUpdate) => {
      this.emit('board-updated', data);
    });

    this.socket.on('item-moved', (data: ItemMoveData) => {
      this.emit('item-moved', data);
    });

    // Presence events
    this.socket.on('user-typing', (data: TypingIndicator) => {
      this.emit('user-typing', data);
    });

    this.socket.on('user-cursor', (data: CursorPosition) => {
      this.emit('user-cursor', data);
    });

    this.socket.on('user-status-changed', (data) => {
      this.emit('user-status-changed', data);
    });

    // Comment events
    this.socket.on('comment-added', (data: CommentEvent) => {
      this.emit('comment-added', data);
    });

    // Activity events
    this.socket.on('activity-logged', (data: ActivityEvent) => {
      this.emit('activity-logged', data);
    });
  }

  /**
   * Join a workspace room
   */
  joinWorkspace(workspaceId: string): void {
    if (!this.socket || !this.socket.connected) {
      this.initialize();
    }
    
    if (this.socket) {
      this.socket.emit('join-workspace', workspaceId);
      this.currentWorkspaceId = workspaceId;
    }
  }

  /**
   * Leave a workspace room
   */
  leaveWorkspace(workspaceId: string): void {
    if (this.socket) {
      this.socket.emit('leave-workspace', workspaceId);
      if (this.currentWorkspaceId === workspaceId) {
        this.currentWorkspaceId = null;
      }
    }
  }

  /**
   * Join a board room
   */
  joinBoard(boardId: string): void {
    if (!this.socket || !this.socket.connected) {
      this.initialize();
    }
    
    if (this.socket) {
      this.socket.emit('join-board', boardId);
      this.currentBoardId = boardId;
    }
  }

  /**
   * Leave a board room
   */
  leaveBoard(boardId: string): void {
    if (this.socket) {
      this.socket.emit('leave-board', boardId);
      if (this.currentBoardId === boardId) {
        this.currentBoardId = null;
      }
    }
  }

  /**
   * Send board update
   */
  sendBoardUpdate(data: {
    boardId: string;
    type: 'item_created' | 'item_updated' | 'item_deleted' | 'item_moved';
    itemId?: string;
    changes?: any;
    position?: { from: number; to: number };
  }): void {
    if (this.socket) {
      this.socket.emit('board-update', data);
    }
  }

  /**
   * Send item move update
   */
  sendItemMove(data: {
    boardId: string;
    itemId: string;
    fromPosition: number;
    toPosition: number;
    fromColumn?: string;
    toColumn?: string;
  }): void {
    if (this.socket) {
      this.socket.emit('item-move', data);
    }
  }

  /**
   * Send typing indicator
   */
  sendTypingIndicator(data: {
    boardId: string;
    itemId?: string;
    isTyping: boolean;
  }): void {
    if (this.socket) {
      this.socket.emit('typing', data);
    }
  }

  /**
   * Send cursor position
   */
  sendCursorPosition(data: {
    boardId: string;
    x: number;
    y: number;
    itemId?: string;
  }): void {
    if (this.socket) {
      this.socket.emit('cursor-position', data);
    }
  }

  /**
   * Send user status
   */
  sendUserStatus(data: {
    boardId: string;
    status: 'online' | 'away' | 'busy';
  }): void {
    if (this.socket) {
      this.socket.emit('user-status', data);
    }
  }

  /**
   * Send comment added event
   */
  sendCommentAdded(data: {
    boardId: string;
    itemId: string;
    commentId: string;
    comment: Comment;
  }): void {
    if (this.socket) {
      this.socket.emit('comment-added', data);
    }
  }

  /**
   * Send activity logged event
   */
  sendActivityLogged(data: {
    boardId: string;
    itemId: string;
    activityId: string;
    activity: Activity;
  }): void {
    if (this.socket) {
      this.socket.emit('activity-logged', data);
    }
  }

  /**
   * Start typing indicator with auto-cancel
   */
  startTyping(boardId: string, itemId?: string): void {
    const key = `${boardId}:${itemId || 'board'}`;
    
    // Clear existing timeout
    if (this.typingTimeouts[key]) {
      clearTimeout(this.typingTimeouts[key]);
    }
    
    // Send typing indicator
    this.sendTypingIndicator({
      boardId,
      itemId,
      isTyping: true,
    });
    
    // Auto-cancel after 3 seconds
    this.typingTimeouts[key] = setTimeout(() => {
      this.sendTypingIndicator({
        boardId,
        itemId,
        isTyping: false,
      });
      delete this.typingTimeouts[key];
    }, 3000);
  }

  /**
   * Stop typing indicator
   */
  stopTyping(boardId: string, itemId?: string): void {
    const key = `${boardId}:${itemId || 'board'}`;
    
    // Clear existing timeout
    if (this.typingTimeouts[key]) {
      clearTimeout(this.typingTimeouts[key]);
      delete this.typingTimeouts[key];
    }
    
    // Send typing indicator
    this.sendTypingIndicator({
      boardId,
      itemId,
      isTyping: false,
    });
  }

  /**
   * Disconnect socket
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.currentBoardId = null;
      this.currentWorkspaceId = null;
      this.listeners = {};
      
      // Clear all typing timeouts
      Object.keys(this.typingTimeouts).forEach(key => {
        clearTimeout(this.typingTimeouts[key]);
      });
      this.typingTimeouts = {};
    }
  }

  /**
   * Add event listener
   */
  on(event: string, callback: Function): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    
    this.listeners[event].push(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    };
  }

  /**
   * Emit event to listeners
   */
  private emit(event: string, data: any): void {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in socket event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Check if socket is connected
   */
  isConnected(): boolean {
    return !!this.socket && this.socket.connected;
  }
}

// Export singleton instance
export const socketService = new SocketService();
export default socketService;