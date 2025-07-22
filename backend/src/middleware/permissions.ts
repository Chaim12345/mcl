import { Request, Response, NextFunction } from 'express';
import { Role } from '../models/types.js';
import { isWorkspaceMember } from '../services/workspaceService.js';

// Extend Request interface to include user role
declare global {
  namespace Express {
    interface Request {
      userRole?: Role;
      workspaceId?: string;
    }
  }
}

export interface PermissionConfig {
  resource: string;
  action: string;
  roles: Role[];
  requireOwnership?: boolean;
}

// Permission definitions for different resources and actions
export const PERMISSIONS: Record<string, PermissionConfig[]> = {
  workspace: [
    {
      resource: 'workspace',
      action: 'read',
      roles: [Role.OWNER, Role.ADMIN, Role.MEMBER, Role.GUEST]
    },
    {
      resource: 'workspace',
      action: 'update',
      roles: [Role.OWNER, Role.ADMIN]
    },
    {
      resource: 'workspace',
      action: 'delete',
      roles: [Role.OWNER]
    },
    {
      resource: 'workspace',
      action: 'manage_members',
      roles: [Role.OWNER, Role.ADMIN]
    }
  ],
  board: [
    {
      resource: 'board',
      action: 'read',
      roles: [Role.OWNER, Role.ADMIN, Role.MEMBER, Role.GUEST]
    },
    {
      resource: 'board',
      action: 'create',
      roles: [Role.OWNER, Role.ADMIN, Role.MEMBER]
    },
    {
      resource: 'board',
      action: 'update',
      roles: [Role.OWNER, Role.ADMIN, Role.MEMBER]
    },
    {
      resource: 'board',
      action: 'delete',
      roles: [Role.OWNER, Role.ADMIN]
    }
  ],
  boardItem: [
    {
      resource: 'boardItem',
      action: 'read',
      roles: [Role.OWNER, Role.ADMIN, Role.MEMBER, Role.GUEST]
    },
    {
      resource: 'boardItem',
      action: 'create',
      roles: [Role.OWNER, Role.ADMIN, Role.MEMBER]
    },
    {
      resource: 'boardItem',
      action: 'update',
      roles: [Role.OWNER, Role.ADMIN, Role.MEMBER]
    },
    {
      resource: 'boardItem',
      action: 'delete',
      roles: [Role.OWNER, Role.ADMIN, Role.MEMBER]
    }
  ],
  comment: [
    {
      resource: 'comment',
      action: 'read',
      roles: [Role.OWNER, Role.ADMIN, Role.MEMBER, Role.GUEST]
    },
    {
      resource: 'comment',
      action: 'create',
      roles: [Role.OWNER, Role.ADMIN, Role.MEMBER]
    },
    {
      resource: 'comment',
      action: 'update',
      roles: [Role.OWNER, Role.ADMIN, Role.MEMBER],
      requireOwnership: true
    },
    {
      resource: 'comment',
      action: 'delete',
      roles: [Role.OWNER, Role.ADMIN, Role.MEMBER],
      requireOwnership: true
    }
  ]
};

/**
 * Middleware to check if user is a member of the workspace
 */
export async function requireWorkspaceMembership(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const workspaceId = req.params.workspaceId || req.params.id;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!workspaceId) {
      res.status(400).json({ error: 'Workspace ID is required' });
      return;
    }

    const membershipResult = await isWorkspaceMember(workspaceId, userId);
    
    if (!membershipResult.isMember) {
      res.status(403).json({ error: 'Access denied: Not a workspace member' });
      return;
    }

    req.userRole = membershipResult.role as Role;
    req.workspaceId = workspaceId;
    next();
  } catch (error) {
    console.error('Error checking workspace membership:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Create permission middleware for specific resource and action
 */
export function requirePermission(resource: string, action: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRole = req.userRole;
    
    if (!userRole) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const permission = PERMISSIONS[resource]?.find(p => p.action === action);
    
    if (!permission) {
      res.status(500).json({ error: 'Permission configuration not found' });
      return;
    }

    if (!permission.roles.includes(userRole)) {
      res.status(403).json({ 
        error: `Access denied: ${action} permission required for ${resource}` 
      });
      return;
    }

    next();
  };
}

/**
 * Check if user has specific role
 */
export function requireRole(roles: Role | Role[]) {
  const requiredRoles = Array.isArray(roles) ? roles : [roles];
  
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRole = req.userRole;
    
    if (!userRole) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!requiredRoles.includes(userRole)) {
      res.status(403).json({ 
        error: `Access denied: One of these roles required: ${requiredRoles.join(', ')}` 
      });
      return;
    }

    next();
  };
}

/**
 * Check if user is workspace owner
 */
export function requireOwner(req: Request, res: Response, next: NextFunction) {
  return requireRole(Role.OWNER)(req, res, next);
}

/**
 * Check if user is workspace admin or owner
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  return requireRole([Role.OWNER, Role.ADMIN])(req, res, next);
}

/**
 * Check if user can perform action on resource they own
 */
export function requireOwnership(checkOwnership: (req: Request) => Promise<boolean>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userRole = req.userRole;
      
      // Owners and admins can access any resource
      if (userRole === Role.OWNER || userRole === Role.ADMIN) {
        return next();
      }

      // For other roles, check ownership
      const isOwner = await checkOwnership(req);
      
      if (!isOwner) {
        return res.status(403).json({ 
          error: 'Access denied: You can only modify resources you own' 
        });
      }

      next();
    } catch (error) {
      console.error('Error checking ownership:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/**
 * Utility function to check if user has permission for resource and action
 */
export function hasPermission(userRole: Role, resource: string, action: string): boolean {
  const permission = PERMISSIONS[resource]?.find(p => p.action === action);
  return permission ? permission.roles.includes(userRole) : false;
}

/**
 * Utility function to get user's effective permissions for a resource
 */
export function getUserPermissions(userRole: Role, resource: string): string[] {
  const resourcePermissions = PERMISSIONS[resource] || [];
  return resourcePermissions
    .filter(p => p.roles.includes(userRole))
    .map(p => p.action);
}

/**
 * Middleware to add user permissions to response
 */
export function addPermissionsToResponse(resource: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.userRole;
    
    if (userRole) {
      const permissions = getUserPermissions(userRole, resource);
      res.locals.userPermissions = permissions;
    }
    
    next();
  };
}