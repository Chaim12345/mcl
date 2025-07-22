import { query, transaction } from '../db/client.js';
import { Role } from '../models/types.js';
import { generateId } from '../utils/id.js';

export interface CreateWorkspaceData {
  name: string;
  description?: string;
  logo?: string;
  ownerId: string;
}

export interface UpdateWorkspaceData {
  name?: string;
  description?: string;
  logo?: string;
}

export interface WorkspaceWithMembers {
  id: string;
  name: string;
  description: string | null;
  logo: string | null;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  members: Array<{
    id: string;
    userId: string;
    role: Role;
    joinedAt: Date;
    user: {
      id: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
      avatar: string | null;
    };
  }>;
}

/**
 * Create a new workspace with the owner as the first member
 */
export async function createWorkspace(data: CreateWorkspaceData): Promise<WorkspaceWithMembers> {
  return transaction(async (client) => {
    const workspaceId = generateId();
    const memberId = generateId();
    const now = new Date();

    // Create the workspace
    await client.query(
      `INSERT INTO workspaces (id, name, description, logo, "ownerId", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [workspaceId, data.name, data.description || null, data.logo || null, data.ownerId, now, now]
    );

    // Add the owner as a workspace member with OWNER role
    await client.query(
      `INSERT INTO workspace_members (id, "workspaceId", "userId", role, "joinedAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [memberId, workspaceId, data.ownerId, Role.OWNER, now, now]
    );

    // Get the complete workspace with members using the transaction client
    const result = await client.query(
      `SELECT 
        w.id, w.name, w.description, w.logo, w."ownerId", w."createdAt", w."updatedAt",
        wm.id as member_id, wm."userId", wm.role, wm."joinedAt",
        u.email, u."firstName", u."lastName", u.avatar
       FROM workspaces w
       LEFT JOIN workspace_members wm ON w.id = wm."workspaceId"
       LEFT JOIN users u ON wm."userId" = u.id
       WHERE w.id = $1
       ORDER BY wm."joinedAt" ASC`,
      [workspaceId]
    );

    if (result.rows.length === 0) {
      throw new Error('Failed to create workspace');
    }

    const firstRow = result.rows[0];
    const workspace: WorkspaceWithMembers = {
      id: firstRow.id,
      name: firstRow.name,
      description: firstRow.description,
      logo: firstRow.logo,
      ownerId: firstRow.ownerId,
      createdAt: firstRow.createdAt,
      updatedAt: firstRow.updatedAt,
      members: []
    };

    // Build members array from joined results
    for (const row of result.rows) {
      if (row.member_id) {
        workspace.members.push({
          id: row.member_id,
          userId: row.userId,
          role: row.role as Role,
          joinedAt: row.joinedAt,
          user: {
            id: row.userId,
            email: row.email,
            firstName: row.firstName,
            lastName: row.lastName,
            avatar: row.avatar
          }
        });
      }
    }

    return workspace;
  });
}

/**
 * Get workspace by ID with members
 */
export async function getWorkspaceById(workspaceId: string): Promise<WorkspaceWithMembers | null> {
  const result = await query(
    `SELECT 
      w.id, w.name, w.description, w.logo, w."ownerId", w."createdAt", w."updatedAt",
      wm.id as member_id, wm."userId", wm.role, wm."joinedAt",
      u.email, u."firstName", u."lastName", u.avatar
     FROM workspaces w
     LEFT JOIN workspace_members wm ON w.id = wm."workspaceId"
     LEFT JOIN users u ON wm."userId" = u.id
     WHERE w.id = $1
     ORDER BY wm."joinedAt" ASC`,
    [workspaceId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const firstRow = result.rows[0];
  const workspace: WorkspaceWithMembers = {
    id: firstRow.id,
    name: firstRow.name,
    description: firstRow.description,
    logo: firstRow.logo,
    ownerId: firstRow.ownerId,
    createdAt: firstRow.createdAt,
    updatedAt: firstRow.updatedAt,
    members: []
  };

  // Build members array from joined results
  for (const row of result.rows) {
    if (row.member_id) {
      workspace.members.push({
        id: row.member_id,
        userId: row.userId,
        role: row.role as Role,
        joinedAt: row.joinedAt,
        user: {
          id: row.userId,
          email: row.email,
          firstName: row.firstName,
          lastName: row.lastName,
          avatar: row.avatar
        }
      });
    }
  }

  return workspace;
}

/**
 * Get all workspaces for a user (where they are a member)
 */
export async function getWorkspacesForUser(userId: string): Promise<WorkspaceWithMembers[]> {
  const result = await query(
    `SELECT 
      w.id, w.name, w.description, w.logo, w."ownerId", w."createdAt", w."updatedAt",
      wm.id as member_id, wm."userId", wm.role, wm."joinedAt",
      u.email, u."firstName", u."lastName", u.avatar
     FROM workspaces w
     INNER JOIN workspace_members wm ON w.id = wm."workspaceId"
     LEFT JOIN workspace_members all_members ON w.id = all_members."workspaceId"
     LEFT JOIN users u ON all_members."userId" = u.id
     WHERE wm."userId" = $1
     ORDER BY w."createdAt" DESC, all_members."joinedAt" ASC`,
    [userId]
  );

  // Group results by workspace
  const workspaceMap = new Map<string, WorkspaceWithMembers>();

  for (const row of result.rows) {
    if (!workspaceMap.has(row.id)) {
      workspaceMap.set(row.id, {
        id: row.id,
        name: row.name,
        description: row.description,
        logo: row.logo,
        ownerId: row.ownerId,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        members: []
      });
    }

    const workspace = workspaceMap.get(row.id)!;

    // Add member if not already added
    if (row.member_id && !workspace.members.find(m => m.id === row.member_id)) {
      workspace.members.push({
        id: row.member_id,
        userId: row.userId,
        role: row.role as Role,
        joinedAt: row.joinedAt,
        user: {
          id: row.userId,
          email: row.email,
          firstName: row.firstName,
          lastName: row.lastName,
          avatar: row.avatar
        }
      });
    }
  }

  return Array.from(workspaceMap.values());
}

/**
 * Update workspace information
 */
export async function updateWorkspace(
  workspaceId: string,
  data: UpdateWorkspaceData
): Promise<WorkspaceWithMembers | null> {
  const updates: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (data.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(data.name);
  }

  if (data.description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    values.push(data.description);
  }

  if (data.logo !== undefined) {
    updates.push(`logo = $${paramIndex++}`);
    values.push(data.logo);
  }

  if (updates.length === 0) {
    return getWorkspaceById(workspaceId);
  }

  updates.push(`"updatedAt" = $${paramIndex++}`);
  values.push(new Date());
  values.push(workspaceId);

  await query(
    `UPDATE workspaces SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
    values
  );

  return getWorkspaceById(workspaceId);
}

/**
 * Delete a workspace and all related data
 */
export async function deleteWorkspace(workspaceId: string): Promise<boolean> {
  const result = await query(
    'DELETE FROM workspaces WHERE id = $1',
    [workspaceId]
  );

  return (result.rowCount ?? 0) > 0;
}

/**
 * Add a member to a workspace
 */
export async function addWorkspaceMember(
  workspaceId: string,
  userId: string,
  role: Role = Role.MEMBER
): Promise<boolean> {
  try {
    const memberId = generateId();
    const now = new Date();

    await query(
      `INSERT INTO workspace_members (id, "workspaceId", "userId", role, "joinedAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [memberId, workspaceId, userId, role, now, now]
    );

    return true;
  } catch (error: unknown) {
    // Handle unique constraint violation (user already a member)
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      return false;
    }
    throw error;
  }
}

/**
 * Remove a member from a workspace
 */
export async function removeWorkspaceMember(
  workspaceId: string,
  userId: string
): Promise<boolean> {
  const result = await query(
    'DELETE FROM workspace_members WHERE "workspaceId" = $1 AND "userId" = $2',
    [workspaceId, userId]
  );

  return (result.rowCount ?? 0) > 0;
}

/**
 * Update a member's role in a workspace
 */
export async function updateWorkspaceMemberRole(
  workspaceId: string,
  userId: string,
  role: Role
): Promise<boolean> {
  const result = await query(
    `UPDATE workspace_members 
     SET role = $1, "updatedAt" = $2
     WHERE "workspaceId" = $3 AND "userId" = $4`,
    [role, new Date(), workspaceId, userId]
  );

  return (result.rowCount ?? 0) > 0;
}

/**
 * Check if a user is a member of a workspace
 */
export async function isWorkspaceMember(
  workspaceId: string,
  userId: string
): Promise<{ isMember: boolean; role?: Role }> {
  const result = await query(
    'SELECT role FROM workspace_members WHERE "workspaceId" = $1 AND "userId" = $2',
    [workspaceId, userId]
  );

  if (result.rows.length === 0) {
    return { isMember: false };
  }

  return {
    isMember: true,
    role: result.rows[0].role as Role
  };
}

/**
 * Get workspace members
 */
export async function getWorkspaceMembers(workspaceId: string) {
  const result = await query(
    `SELECT 
      wm.id, wm."userId", wm.role, wm."joinedAt",
      u.email, u."firstName", u."lastName", u.avatar
     FROM workspace_members wm
     JOIN users u ON wm."userId" = u.id
     WHERE wm."workspaceId" = $1
     ORDER BY wm."joinedAt" ASC`,
    [workspaceId]
  );

  return result.rows.map(row => ({
    id: row.id,
    userId: row.userId,
    role: row.role as Role,
    joinedAt: row.joinedAt,
    user: {
      id: row.userId,
      email: row.email,
      firstName: row.firstName,
      lastName: row.lastName,
      avatar: row.avatar
    }
  }));
}