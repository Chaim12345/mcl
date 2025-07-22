import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { Role } from '../../models/types.js';
import {
  requirePermission,
  requireRole,
  requireOwner,
  requireAdmin,
  hasPermission,
  getUserPermissions,
  PERMISSIONS
} from '../permissions.js';

// Mock request and response objects
const mockRequest = (userRole?: Role) => ({
  userRole,
  params: {},
  user: { id: 'test-user-id' }
} as Request);

const mockResponse = () => {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.locals = {};
  return res;
};

const mockNext = vi.fn() as NextFunction;

describe('Permissions Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('requirePermission', () => {
    it('should allow access when user has required permission', () => {
      const req = mockRequest(Role.ADMIN);
      const res = mockResponse();
      const middleware = requirePermission('workspace', 'update');

      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should deny access when user lacks required permission', () => {
      const req = mockRequest(Role.GUEST);
      const res = mockResponse();
      const middleware = requirePermission('workspace', 'update');

      middleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Access denied: update permission required for workspace'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should deny access when user role is not set', () => {
      const req = mockRequest();
      const res = mockResponse();
      const middleware = requirePermission('workspace', 'read');

      middleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Authentication required'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle invalid permission configuration', () => {
      const req = mockRequest(Role.ADMIN);
      const res = mockResponse();
      const middleware = requirePermission('invalid_resource', 'invalid_action');

      middleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Permission configuration not found'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    it('should allow access for single required role', () => {
      const req = mockRequest(Role.ADMIN);
      const res = mockResponse();
      const middleware = requireRole(Role.ADMIN);

      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow access for multiple required roles', () => {
      const req = mockRequest(Role.MEMBER);
      const res = mockResponse();
      const middleware = requireRole([Role.ADMIN, Role.MEMBER]);

      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should deny access when user lacks required role', () => {
      const req = mockRequest(Role.GUEST);
      const res = mockResponse();
      const middleware = requireRole([Role.ADMIN, Role.MEMBER]);

      middleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Access denied: One of these roles required: ADMIN, MEMBER'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireOwner', () => {
    it('should allow access for owner', () => {
      const req = mockRequest(Role.OWNER);
      const res = mockResponse();

      requireOwner(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should deny access for non-owner', () => {
      const req = mockRequest(Role.ADMIN);
      const res = mockResponse();

      requireOwner(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireAdmin', () => {
    it('should allow access for admin', () => {
      const req = mockRequest(Role.ADMIN);
      const res = mockResponse();

      requireAdmin(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow access for owner', () => {
      const req = mockRequest(Role.OWNER);
      const res = mockResponse();

      requireAdmin(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should deny access for member', () => {
      const req = mockRequest(Role.MEMBER);
      const res = mockResponse();

      requireAdmin(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('hasPermission', () => {
    it('should return true when user has permission', () => {
      expect(hasPermission(Role.ADMIN, 'workspace', 'update')).toBe(true);
      expect(hasPermission(Role.OWNER, 'workspace', 'delete')).toBe(true);
      expect(hasPermission(Role.MEMBER, 'board', 'create')).toBe(true);
    });

    it('should return false when user lacks permission', () => {
      expect(hasPermission(Role.GUEST, 'workspace', 'update')).toBe(false);
      expect(hasPermission(Role.MEMBER, 'workspace', 'delete')).toBe(false);
      expect(hasPermission(Role.GUEST, 'board', 'create')).toBe(false);
    });

    it('should return false for invalid resource/action', () => {
      expect(hasPermission(Role.OWNER, 'invalid', 'action')).toBe(false);
    });
  });

  describe('getUserPermissions', () => {
    it('should return correct permissions for owner', () => {
      const permissions = getUserPermissions(Role.OWNER, 'workspace');
      expect(permissions).toContain('read');
      expect(permissions).toContain('update');
      expect(permissions).toContain('delete');
      expect(permissions).toContain('manage_members');
    });

    it('should return correct permissions for admin', () => {
      const permissions = getUserPermissions(Role.ADMIN, 'workspace');
      expect(permissions).toContain('read');
      expect(permissions).toContain('update');
      expect(permissions).toContain('manage_members');
      expect(permissions).not.toContain('delete');
    });

    it('should return correct permissions for member', () => {
      const permissions = getUserPermissions(Role.MEMBER, 'workspace');
      expect(permissions).toContain('read');
      expect(permissions).not.toContain('update');
      expect(permissions).not.toContain('delete');
      expect(permissions).not.toContain('manage_members');
    });

    it('should return correct permissions for guest', () => {
      const permissions = getUserPermissions(Role.GUEST, 'workspace');
      expect(permissions).toContain('read');
      expect(permissions).not.toContain('update');
      expect(permissions).not.toContain('delete');
      expect(permissions).not.toContain('manage_members');
    });

    it('should return empty array for invalid resource', () => {
      const permissions = getUserPermissions(Role.OWNER, 'invalid');
      expect(permissions).toEqual([]);
    });
  });

  describe('Permission Configuration', () => {
    it('should have valid workspace permissions', () => {
      const workspacePerms = PERMISSIONS.workspace;
      expect(workspacePerms).toBeDefined();
      expect(workspacePerms.length).toBeGreaterThan(0);
      
      const readPerm = workspacePerms.find(p => p.action === 'read');
      expect(readPerm?.roles).toContain(Role.GUEST);
      expect(readPerm?.roles).toContain(Role.MEMBER);
      expect(readPerm?.roles).toContain(Role.ADMIN);
      expect(readPerm?.roles).toContain(Role.OWNER);
    });

    it('should have valid board permissions', () => {
      const boardPerms = PERMISSIONS.board;
      expect(boardPerms).toBeDefined();
      expect(boardPerms.length).toBeGreaterThan(0);
      
      const createPerm = boardPerms.find(p => p.action === 'create');
      expect(createPerm?.roles).not.toContain(Role.GUEST);
      expect(createPerm?.roles).toContain(Role.MEMBER);
    });

    it('should have valid comment permissions with ownership requirements', () => {
      const commentPerms = PERMISSIONS.comment;
      expect(commentPerms).toBeDefined();
      
      const updatePerm = commentPerms.find(p => p.action === 'update');
      expect(updatePerm?.requireOwnership).toBe(true);
      
      const deletePerm = commentPerms.find(p => p.action === 'delete');
      expect(deletePerm?.requireOwnership).toBe(true);
    });
  });
});