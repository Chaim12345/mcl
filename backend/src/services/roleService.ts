import { query } from '../db/client.js';
import { Role } from '../models/types.js';
import { isWorkspaceMember } from './workspaceService.js';

export interface RoleAssignment {
  userId: string;
  workspaceId: string;
  role: Role;
  assignedBy: string;
  assignedAt: Date;
}

export interface RoleChangeLog {
  id: string;
  userId: string;
  workspaceId: string;
  oldRole: Role | null;
  newRole: Role;
  changedBy: string;
  changedAt: Date;
  reason?: string;
}

/**
 * Assign a role to a user in a workspace
 */
export async function assignRole(
  workspaceId: string,
  userId: string,
  role: Role,
  assignedBy: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if the user is already a member
    const membershipResult = await isWorkspaceMember(workspaceId, userId);
    
    if (!membershipResult.isMember) {
      return { success: false, error: 'User is not a member of this workspace' };
    }

    const oldRole = membershipResult.role;

    // Update the user's role
    const result = await query(
      `UPDATE workspace_members 
       SET role = $1, updated_at = $2 
       WHERE workspace_id = $3 AND user_id = $4`,
      [role, new Date(), workspaceId, userId]
    );

    if ((result.rowCount ?? 0) === 0) {
      return { success: false, error: 'Failed to update user role' };
    }

    // Log the role change
    await logRoleChange(workspaceId, userId, oldRole, role, assignedBy, reason);

    return { success: true };
  } catch (error) {
    console.error('Error assigning role:', error);
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Remove a user's role (remove from workspace)
 */
export async function removeRole(
  workspaceId: string,
  userId: string,
  removedBy: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get current role before removal
    const membershipResult = await isWorkspaceMember(workspaceId, userId);
    
    if (!membershipResult.isMember) {
      return { success: false, error: 'User is not a member of this workspace' };
    }

    const oldRole = membershipResult.role;

    if (!oldRole) {
      return { success: false, error: 'Unable to determine user role' };
    }

    // Remove the user from workspace
    const result = await query(
      'DELETE FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
      [workspaceId, userId]
    );

    if ((result.rowCount ?? 0) === 0) {
      return { success: false, error: 'Failed to remove user from workspace' };
    }

    // Log the role removal
    await logRoleRemoval(workspaceId, userId, oldRole, removedBy, reason);

    return { success: true };
  } catch (error) {
    console.error('Error removing role:', error);
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Get role hierarchy level (higher number = more permissions)
 */
export function getRoleLevel(role: Role): number {
  switch (role) {
    case Role.GUEST:
      return 1;
    case Role.MEMBER:
      return 2;
    case Role.ADMIN:
      return 3;
    case Role.OWNER:
      return 4;
    default:
      return 0;
  }
}

/**
 * Check if one role can assign another role
 */
export function canAssignRole(assignerRole: Role, targetRole: Role): boolean {
  const assignerLevel = getRoleLevel(assignerRole);
  const targetLevel = getRoleLevel(targetRole);
  
  // Can only assign roles at or below your level
  // Owners can assign any role, admins can assign member/guest
  return assignerLevel > targetLevel;
}

/**
 * Get all valid roles that a user can assign
 */
export function getAssignableRoles(userRole: Role): Role[] {
  const userLevel = getRoleLevel(userRole);
  const allRoles = [Role.GUEST, Role.MEMBER, Role.ADMIN, Role.OWNER];
  
  return allRoles.filter(role => getRoleLevel(role) < userLevel);
}

/**
 * Validate role assignment permissions
 */
export async function validateRoleAssignment(
  workspaceId: string,
  assignerId: string,
  targetUserId: string,
  newRole: Role
): Promise<{ valid: boolean; error?: string }> {
  try {
    // Check if assigner is a member and get their role
    const assignerMembership = await isWorkspaceMember(workspaceId, assignerId);
    
    if (!assignerMembership.isMember) {
      return { valid: false, error: 'Assigner is not a member of this workspace' };
    }

    const assignerRole = assignerMembership.role!;

    // Check if assigner can assign this role
    if (!canAssignRole(assignerRole, newRole)) {
      return { 
        valid: false, 
        error: `${assignerRole} cannot assign ${newRole} role` 
      };
    }

    // Check if target user is a member
    const targetMembership = await isWorkspaceMember(workspaceId, targetUserId);
    
    if (!targetMembership.isMember) {
      return { valid: false, error: 'Target user is not a member of this workspace' };
    }

    // Prevent self-demotion for owners (must transfer ownership first)
    if (assignerId === targetUserId && assignerRole === Role.OWNER && newRole !== Role.OWNER) {
      return { 
        valid: false, 
        error: 'Owners cannot demote themselves. Transfer ownership first.' 
      };
    }

    return { valid: true };
  } catch (error) {
    console.error('Error validating role assignment:', error);
    return { valid: false, error: 'Internal server error' };
  }
}

/**
 * Transfer workspace ownership
 */
export async function transferOwnership(
  workspaceId: string,
  currentOwnerId: string,
  newOwnerId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate current owner
    const currentOwnerMembership = await isWorkspaceMember(workspaceId, currentOwnerId);
    
    if (!currentOwnerMembership.isMember || currentOwnerMembership.role !== Role.OWNER) {
      return { success: false, error: 'Current user is not the workspace owner' };
    }

    // Validate new owner is a member
    const newOwnerMembership = await isWorkspaceMember(workspaceId, newOwnerId);
    
    if (!newOwnerMembership.isMember) {
      return { success: false, error: 'New owner must be a workspace member' };
    }

    // Update both roles in a transaction-like manner
    await query('BEGIN');
    
    try {
      // Demote current owner to admin
      await query(
        `UPDATE workspace_members 
         SET role = $1, updated_at = $2 
         WHERE workspace_id = $3 AND user_id = $4`,
        [Role.ADMIN, new Date(), workspaceId, currentOwnerId]
      );

      // Promote new owner
      await query(
        `UPDATE workspace_members 
         SET role = $1, updated_at = $2 
         WHERE workspace_id = $3 AND user_id = $4`,
        [Role.OWNER, new Date(), workspaceId, newOwnerId]
      );

      // Update workspace owner_id
      await query(
        'UPDATE workspaces SET owner_id = $1, updated_at = $2 WHERE id = $3',
        [newOwnerId, new Date(), workspaceId]
      );

      await query('COMMIT');

      // Log the ownership transfer
      await logOwnershipTransfer(workspaceId, currentOwnerId, newOwnerId, reason);

      return { success: true };
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error transferring ownership:', error);
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Log role changes for audit purposes
 */
async function logRoleChange(
  workspaceId: string,
  userId: string,
  oldRole: Role | undefined,
  newRole: Role,
  changedBy: string,
  reason?: string
): Promise<void> {
  try {
    await query(
      `INSERT INTO activity_logs (id, action, entity_id, entity_type, user_id, metadata, created_at)
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, NOW())`,
      [
        'role_changed',
        workspaceId,
        'workspace',
        changedBy,
        JSON.stringify({
          targetUserId: userId,
          oldRole: oldRole || null,
          newRole,
          reason
        })
      ]
    );
  } catch (error) {
    console.error('Error logging role change:', error);
  }
}

/**
 * Log role removal for audit purposes
 */
async function logRoleRemoval(
  workspaceId: string,
  userId: string,
  oldRole: Role,
  removedBy: string,
  reason?: string
): Promise<void> {
  try {
    await query(
      `INSERT INTO activity_logs (id, action, entity_id, entity_type, user_id, metadata, created_at)
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, NOW())`,
      [
        'member_removed',
        workspaceId,
        'workspace',
        removedBy,
        JSON.stringify({
          removedUserId: userId,
          oldRole,
          reason
        })
      ]
    );
  } catch (error) {
    console.error('Error logging role removal:', error);
  }
}

/**
 * Log ownership transfer for audit purposes
 */
async function logOwnershipTransfer(
  workspaceId: string,
  oldOwnerId: string,
  newOwnerId: string,
  reason?: string
): Promise<void> {
  try {
    await query(
      `INSERT INTO activity_logs (id, action, entity_id, entity_type, user_id, metadata, created_at)
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, NOW())`,
      [
        'ownership_transferred',
        workspaceId,
        'workspace',
        oldOwnerId,
        JSON.stringify({
          oldOwnerId,
          newOwnerId,
          reason
        })
      ]
    );
  } catch (error) {
    console.error('Error logging ownership transfer:', error);
  }
}

/**
 * Get role change history for a workspace
 */
export async function getRoleHistory(workspaceId: string): Promise<any[]> {
  try {
    const result = await query(
      `SELECT 
        al.id, al.action, al.created_at, al.metadata,
        u.email as changed_by_email, u."firstName", u."lastName"
       FROM activity_logs al
       JOIN users u ON al.user_id = u.id
       WHERE al.entity_id = $1 
         AND al.entity_type = 'workspace'
         AND al.action IN ('role_changed', 'member_removed', 'ownership_transferred')
       ORDER BY al.created_at DESC`,
      [workspaceId]
    );

    return result.rows.map(row => ({
      id: row.id,
      action: row.action,
      createdAt: row.created_at,
      metadata: row.metadata,
      changedBy: {
        email: row.changed_by_email,
        firstName: row.firstName,
        lastName: row.lastName
      }
    }));
  } catch (error) {
    console.error('Error getting role history:', error);
    return [];
  }
}