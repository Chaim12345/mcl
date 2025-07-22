import { Request, Response, NextFunction } from 'express';
import { User } from '../models/types.js';
import { 
  verifyToken, 
  extractTokenFromHeader, 
  isTokenExpired, 
  JWTPayload 
} from '../utils/jwt.js';
import { query } from '../db/client.js';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
      token?: string;
    }
  }
}

/**
 * Authentication middleware that verifies JWT tokens
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      res.status(401).json({ 
        error: 'Access token required',
        code: 'TOKEN_MISSING'
      });
      return;
    }

    // Check if token is expired
    if (isTokenExpired(token)) {
      res.status(401).json({ 
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
      return;
    }

    // Verify the token
    const decoded = verifyToken(token);
    
    // Store token in request for potential use in other middleware
    req.token = token;
    
    // Get full user details from database
    const result = await query(
      'SELECT id, email, "firstName", "lastName", avatar, "isActive" FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
      return;
    }

    const user = result.rows[0];
    
    // Check if user is active
    if (!user.isActive) {
      res.status(403).json({ 
        error: 'User account is inactive',
        code: 'USER_INACTIVE'
      });
      return;
    }

    // Add user info to request object
    req.user = user as User;

    next();
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid token') {
      res.status(401).json({ 
        error: 'Invalid token',
        code: 'TOKEN_INVALID'
      });
      return;
    }
    
    if (error instanceof Error && error.message === 'Token expired') {
      res.status(401).json({ 
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
      return;
    }

    console.error('Authentication middleware error:', error);
    res.status(500).json({ 
      error: 'Authentication failed',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * Optional authentication middleware - doesn't fail if no token provided
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      // No token provided, continue without user
      next();
      return;
    }

    // Try to verify the token
    const decoded = verifyToken(token);
    
    // Store token in request
    req.token = token;
    
    // Get user from database
    const result = await query(
      'SELECT id, email, "firstName", "lastName", avatar, "isActive" FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length > 0) {
      // Add user info to request object if token is valid
      req.user = result.rows[0] as User;
    }

    next();
  } catch (error) {
    // Token is invalid, but we continue without user
    console.warn('Optional auth failed:', error instanceof Error ? error.message : 'Unknown error');
    next();
  }
};

/**
 * Role-based authorization middleware
 */
export const requireRole = (roles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
        return;
      }

      // Get user roles from database
      const result = await query(
        'SELECT role FROM workspace_members WHERE "userId" = $1 AND "workspaceId" = $2',
        [req.user.id, req.params.workspaceId || req.body.workspaceId]
      );

      if (result.rows.length === 0) {
        res.status(403).json({
          error: 'You do not have access to this workspace',
          code: 'WORKSPACE_ACCESS_DENIED'
        });
        return;
      }

      const userRole = result.rows[0].role;
      
      if (!roles.includes(userRole)) {
        res.status(403).json({
          error: 'Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Role authorization error:', error);
      res.status(500).json({
        error: 'Authorization failed',
        code: 'AUTH_ERROR'
      });
    }
  };
};