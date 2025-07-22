import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { authenticateToken, optionalAuth, requireRole } from '../auth.js';
import * as jwtUtils from '../../utils/jwt.js';
import * as dbClient from '../../db/client.js';

// Mock the dependencies
vi.mock('../../utils/jwt.js');
vi.mock('../../db/client.js');

const mockJwtUtils = vi.mocked(jwtUtils);
const mockDbClient = vi.mocked(dbClient);

describe('Authentication Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      headers: {},
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  describe('authenticateToken', () => {
    it('should return 401 if no token is provided', async () => {
      mockJwtUtils.extractTokenFromHeader.mockReturnValue(null);

      await authenticateToken(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Access token required',
        code: 'TOKEN_MISSING'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 if token is expired', async () => {
      const mockToken = 'expired-token';
      mockJwtUtils.extractTokenFromHeader.mockReturnValue(mockToken);
      mockJwtUtils.isTokenExpired.mockReturnValue(true);

      await authenticateToken(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 if user is not found', async () => {
      const mockToken = 'valid-token';
      const mockDecoded = { userId: 'user-123', email: 'test@example.com' };
      
      mockJwtUtils.extractTokenFromHeader.mockReturnValue(mockToken);
      mockJwtUtils.isTokenExpired.mockReturnValue(false);
      mockJwtUtils.verifyToken.mockReturnValue(mockDecoded);
      mockDbClient.query.mockResolvedValue({ rows: [] } as any);

      await authenticateToken(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 if user is inactive', async () => {
      const mockToken = 'valid-token';
      const mockDecoded = { userId: 'user-123', email: 'test@example.com' };
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        avatar: null,
        isActive: false
      };
      
      mockJwtUtils.extractTokenFromHeader.mockReturnValue(mockToken);
      mockJwtUtils.isTokenExpired.mockReturnValue(false);
      mockJwtUtils.verifyToken.mockReturnValue(mockDecoded);
      mockDbClient.query.mockResolvedValue({ rows: [mockUser] } as any);

      await authenticateToken(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'User account is inactive',
        code: 'USER_INACTIVE'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should authenticate successfully with valid token and active user', async () => {
      const mockToken = 'valid-token';
      const mockDecoded = { userId: 'user-123', email: 'test@example.com' };
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        avatar: null,
        isActive: true
      };
      
      mockJwtUtils.extractTokenFromHeader.mockReturnValue(mockToken);
      mockJwtUtils.isTokenExpired.mockReturnValue(false);
      mockJwtUtils.verifyToken.mockReturnValue(mockDecoded);
      mockDbClient.query.mockResolvedValue({ rows: [mockUser] } as any);

      await authenticateToken(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toEqual(mockUser);
      expect(mockReq.token).toBe(mockToken);
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should handle invalid token error', async () => {
      const mockToken = 'invalid-token';
      
      mockJwtUtils.extractTokenFromHeader.mockReturnValue(mockToken);
      mockJwtUtils.isTokenExpired.mockReturnValue(false);
      mockJwtUtils.verifyToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await authenticateToken(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid token',
        code: 'TOKEN_INVALID'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('optionalAuth', () => {
    it('should continue without user if no token is provided', async () => {
      mockJwtUtils.extractTokenFromHeader.mockReturnValue(null);

      await optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toBeUndefined();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should continue without user if token is invalid', async () => {
      const mockToken = 'invalid-token';
      
      mockJwtUtils.extractTokenFromHeader.mockReturnValue(mockToken);
      mockJwtUtils.verifyToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toBeUndefined();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should set user if valid token is provided', async () => {
      const mockToken = 'valid-token';
      const mockDecoded = { userId: 'user-123', email: 'test@example.com' };
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        avatar: null,
        isActive: true
      };
      
      mockJwtUtils.extractTokenFromHeader.mockReturnValue(mockToken);
      mockJwtUtils.verifyToken.mockReturnValue(mockDecoded);
      mockDbClient.query.mockResolvedValue({ rows: [mockUser] } as any);

      await optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toEqual(mockUser);
      expect(mockReq.token).toBe(mockToken);
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    it('should return 401 if user is not authenticated', async () => {
      const middleware = requireRole(['ADMIN']);

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 if user has no workspace access', async () => {
      mockReq.user = { id: 'user-123' } as any;
      mockReq.params = { workspaceId: 'workspace-123' };
      mockDbClient.query.mockResolvedValue({ rows: [] } as any);

      const middleware = requireRole(['ADMIN']);

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'You do not have access to this workspace',
        code: 'WORKSPACE_ACCESS_DENIED'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 if user role is insufficient', async () => {
      mockReq.user = { id: 'user-123' } as any;
      mockReq.params = { workspaceId: 'workspace-123' };
      mockDbClient.query.mockResolvedValue({ rows: [{ role: 'MEMBER' }] } as any);

      const middleware = requireRole(['ADMIN', 'OWNER']);

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow access if user has required role', async () => {
      mockReq.user = { id: 'user-123' } as any;
      mockReq.params = { workspaceId: 'workspace-123' };
      mockDbClient.query.mockResolvedValue({ rows: [{ role: 'ADMIN' }] } as any);

      const middleware = requireRole(['ADMIN', 'OWNER']);

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });
});