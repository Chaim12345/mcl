import { Socket } from 'socket.io';
import { verifyToken } from '../utils/jwt.js';
import { query } from '../db/client.js';
import { User } from '../models/types.js';

export interface AuthenticatedSocket extends Socket {
  user: User;
  userId: string;
}

/**
 * Socket.io authentication middleware
 */
export const socketAuthMiddleware = async (socket: Socket, next: (err?: Error) => void) => {
  try {
    const token = socket.handshake.auth.token || 
                  socket.handshake.headers.authorization?.replace('Bearer ', '');
    
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
    (socket as AuthenticatedSocket).user = user;
    (socket as AuthenticatedSocket).userId = user.id;
    
    next();
  } catch (error) {
    console.error('Socket authentication error:', error);
    next(new Error('Authentication failed'));
  }
};

/**
 * Check if user has access to workspace
 */
export const checkWorkspacePermission = async (userId: string, workspaceId: string): Promise<boolean> => {
  try {
    const result = await query(
      'SELECT role FROM workspace_members WHERE "userId" = $1 AND "workspaceId" = $2',
      [userId, workspaceId]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error checking workspace permission:', error);
    return false;
  }
};

/**
 * Check if user has access to board
 */
export const checkBoardPermission = async (userId: string, boardId: string): Promise<boolean> => {
  try {
    const result = await query(
      `SELECT 1 FROM boards b 
       JOIN workspace_members wm ON b."workspaceId" = wm."workspaceId" 
       WHERE b.id = $1 AND wm."userId" = $2`,
      [boardId, userId]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error checking board permission:', error);
    return false;
  }
};

/**
 * Check if user has admin role in workspace
 */
export const checkWorkspaceAdminPermission = async (userId: string, workspaceId: string): Promise<boolean> => {
  try {
    const result = await query(
      'SELECT 1 FROM workspace_members WHERE "userId" = $1 AND "workspaceId" = $2 AND role = $3',
      [userId, workspaceId, 'admin']
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error checking workspace admin permission:', error);
    return false;
  }
};

/**
 * Get user's role in workspace
 */
export const getUserWorkspaceRole = async (userId: string, workspaceId: string): Promise<string | null> => {
  try {
    const result = await query(
      'SELECT role FROM workspace_members WHERE "userId" = $1 AND "workspaceId" = $2',
      [userId, workspaceId]
    );
    return result.rows.length > 0 ? result.rows[0].role : null;
  } catch (error) {
    console.error('Error getting user workspace role:', error);
    return null;
  }
};