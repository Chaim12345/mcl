import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { Role } from '../models/types.js';

// Extend Express Request type to include userRole
declare global {
  namespace Express {
    interface Request {
      userRole?: Role;
    }
  }
}
import {
  createWorkspace,
  getWorkspaceById,
  getWorkspacesForUser,
  updateWorkspace,
  deleteWorkspace,
  addWorkspaceMember,
  removeWorkspaceMember,
  updateWorkspaceMemberRole,
  isWorkspaceMember,
  getWorkspaceMembers
} from '../services/workspaceService.js';

const router = Router();

// Validation functions
function validateWorkspaceId(workspaceId: string | undefined): string {
  if (!workspaceId || workspaceId.trim().length === 0) {
    throw new Error('Workspace ID is required');
  }
  return workspaceId.trim();
}

function validateWorkspaceData(data: any): { name?: string; description?: string; logo?: string } {
  const result: { name?: string; description?: string; logo?: string } = {};
  
  if (data.name !== undefined) {
    if (typeof data.name !== 'string' || data.name.trim().length === 0) {
      throw new Error('Workspace name is required');
    }
    if (data.name.trim().length > 255) {
      throw new Error('Workspace name must be less than 255 characters');
    }
    result.name = data.name.trim();
  }
  
  if (data.description !== undefined) {
    if (typeof data.description === 'string' && data.description.trim().length > 1000) {
      throw new Error('Description must be less than 1000 characters');
    }
    result.description = data.description ? data.description.trim() : undefined;
  }
  
  if (data.logo !== undefined) {
    if (typeof data.logo === 'string' && data.logo.trim().length > 255) {
      throw new Error('Logo URL must be less than 255 characters');
    }
    result.logo = data.logo ? data.logo.trim() : undefined;
  }
  
  return result;
}

function validateMemberData(data: any): { userId: string; role?: Role } {
  if (!data.userId || typeof data.userId !== 'string' || data.userId.trim().length === 0) {
    throw new Error('User ID is required');
  }
  
  const result: { userId: string; role?: Role } = {
    userId: data.userId.trim()
  };
  
  if (data.role !== undefined) {
    if (!Object.values(Role).includes(data.role)) {
      throw new Error('Invalid role');
    }
    result.role = data.role as Role;
  }
  
  return result;
}

// Middleware to check workspace membership and permissions
async function checkWorkspaceMembership(req: Request, res: Response, next: Function): Promise<void> {
  try {
    const workspaceId = req.params.id;
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
    next();
  } catch (error) {
    console.error('Error checking workspace membership:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function checkWorkspaceAdminPermission(req: Request, res: Response, next: Function): Promise<void> {
  const userRole = req.userRole;
  
  if (userRole !== Role.OWNER && userRole !== Role.ADMIN) {
    res.status(403).json({ error: 'Access denied: Admin permissions required' });
    return;
  }
  
  next();
}

async function checkWorkspaceOwnerPermission(req: Request, res: Response, next: Function): Promise<void> {
  const userRole = req.userRole;
  
  if (userRole !== Role.OWNER) {
    res.status(403).json({ error: 'Access denied: Owner permissions required' });
    return;
  }
  
  next();
}

// GET /api/workspaces - Get all workspaces for the authenticated user
router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const workspaces = await getWorkspacesForUser(userId);
    res.json({ workspaces });
  } catch (error) {
    console.error('Error fetching workspaces:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/workspaces - Create a new workspace
router.post('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Validate workspace data
    const validatedData = validateWorkspaceData(req.body);
    
    if (!validatedData.name) {
      res.status(400).json({ error: 'Workspace name is required' });
      return;
    }
    
    const workspaceData: any = {
      name: validatedData.name,
      ownerId: userId
    };
    
    if (validatedData.description !== undefined) {
      workspaceData.description = validatedData.description;
    }
    
    if (validatedData.logo !== undefined) {
      workspaceData.logo = validatedData.logo;
    }
    
    const workspace = await createWorkspace(workspaceData);

    res.status(201).json({ workspace });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
      return;
    }
    console.error('Error creating workspace:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/workspaces/:id - Get a specific workspace
router.get('/:id', authenticateToken, checkWorkspaceMembership, async (req: Request, res: Response): Promise<void> => {
  try {
    const workspaceId = validateWorkspaceId(req.params.id);
    const workspace = await getWorkspaceById(workspaceId);

    if (!workspace) {
      res.status(404).json({ error: 'Workspace not found' });
      return;
    }

    res.json({ workspace });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
      return;
    }
    console.error('Error fetching workspace:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/workspaces/:id - Update a workspace
router.put('/:id', authenticateToken, checkWorkspaceMembership, checkWorkspaceAdminPermission, async (req: Request, res: Response): Promise<void> => {
  try {
    const workspaceId = validateWorkspaceId(req.params.id);
    const validatedData = validateWorkspaceData(req.body);

    const updateData: any = {};
    
    if (validatedData.name !== undefined) {
      updateData.name = validatedData.name;
    }
    
    if (validatedData.description !== undefined) {
      updateData.description = validatedData.description;
    }
    
    if (validatedData.logo !== undefined) {
      updateData.logo = validatedData.logo;
    }
    
    const workspace = await updateWorkspace(workspaceId, updateData);

    if (!workspace) {
      res.status(404).json({ error: 'Workspace not found' });
      return;
    }

    res.json({ workspace });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
      return;
    }
    console.error('Error updating workspace:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/workspaces/:id - Delete a workspace
router.delete('/:id', authenticateToken, checkWorkspaceMembership, checkWorkspaceOwnerPermission, async (req: Request, res: Response): Promise<void> => {
  try {
    const workspaceId = validateWorkspaceId(req.params.id);
    const deleted = await deleteWorkspace(workspaceId);

    if (!deleted) {
      res.status(404).json({ error: 'Workspace not found' });
      return;
    }

    res.json({ message: 'Workspace deleted successfully' });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
      return;
    }
    console.error('Error deleting workspace:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/workspaces/:id/members - Get workspace members
router.get('/:id/members', authenticateToken, checkWorkspaceMembership, async (req: Request, res: Response): Promise<void> => {
  try {
    const workspaceId = validateWorkspaceId(req.params.id);
    const members = await getWorkspaceMembers(workspaceId);

    res.json({ members });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
      return;
    }
    console.error('Error fetching workspace members:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/workspaces/:id/members - Add a member to workspace
router.post('/:id/members', authenticateToken, checkWorkspaceMembership, checkWorkspaceAdminPermission, async (req: Request, res: Response): Promise<void> => {
  try {
    const workspaceId = validateWorkspaceId(req.params.id);
    const validatedData = validateMemberData(req.body);

    const added = await addWorkspaceMember(workspaceId, validatedData.userId, validatedData.role || Role.MEMBER);

    if (!added) {
      res.status(409).json({ error: 'User is already a member of this workspace' });
      return;
    }

    res.status(201).json({ message: 'Member added successfully' });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
      return;
    }
    console.error('Error adding workspace member:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/workspaces/:id/members/:userId - Remove a member from workspace
router.delete('/:id/members/:userId', authenticateToken, checkWorkspaceMembership, checkWorkspaceAdminPermission, async (req: Request, res: Response): Promise<void> => {
  try {
    const workspaceId = validateWorkspaceId(req.params.id);
    const userId = req.params.userId;

    if (!userId || userId.trim().length === 0) {
      res.status(400).json({ error: 'User ID is required' });
      return;
    }

    const removed = await removeWorkspaceMember(workspaceId, userId);

    if (!removed) {
      res.status(404).json({ error: 'Member not found in workspace' });
      return;
    }

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
      return;
    }
    console.error('Error removing workspace member:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/workspaces/:id/members/:userId/role - Update member role
router.put('/:id/members/:userId/role', authenticateToken, checkWorkspaceMembership, checkWorkspaceAdminPermission, async (req: Request, res: Response): Promise<void> => {
  try {
    const workspaceId = validateWorkspaceId(req.params.id);
    const userId = req.params.userId;
    const { role } = req.body;

    if (!userId || userId.trim().length === 0) {
      res.status(400).json({ error: 'User ID is required' });
      return;
    }

    if (!role || !Object.values(Role).includes(role)) {
      res.status(400).json({ error: 'Invalid role' });
      return;
    }

    const updated = await updateWorkspaceMemberRole(workspaceId, userId, role as Role);

    if (!updated) {
      res.status(404).json({ error: 'Member not found in workspace' });
      return;
    }

    res.json({ message: 'Member role updated successfully' });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
      return;
    }
    console.error('Error updating member role:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;