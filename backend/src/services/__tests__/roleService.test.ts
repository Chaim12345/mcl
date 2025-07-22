import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { query } from '../../db/client.js';
import { Role } from '../../models/types.js';
import {
  assignRole,
  removeRole,
  getRoleLevel,
  canAssignRole,
  getAssignableRoles,
  validateRoleAssignment,
  transferOwnership,
  getRoleHistory
} from '../roleService.js';
import { createWorkspace, addWorkspaceMember } from '../workspaceService.js';

describe('RoleService', () => {
  let testUserId: string;
  let testUserId2: string;
  let testUserId3: string;
  let testWorkspaceId: string;

  beforeEach(async () => {
    // Clean up any existing test data
    await query('DELETE FROM activity_logs WHERE 1=1');
    await query('DELETE FROM workspace_members WHERE 1=1');
    await query('DELETE FROM workspaces WHERE 1=1');
    await query('DELETE FROM users WHERE email LIKE \'%test%\'');

    // Create test users
    const user1Result = await query(
      `INSERT INTO users (id, email, password, "firstName", "lastName", "createdAt", "updatedAt")
       VALUES (gen_random_uuid()::text, 'test1@example.com', 'hashedpassword', 'John', 'Doe', NOW(), NOW())
       RETURNING id`
    );
    testUserId = user1Result.rows[0].id;

    const user2Result = await query(
      `INSERT INTO users (id, email, password, "firstName", "lastName", "createdAt", "updatedAt")
       VALUES (gen_random_uuid()::text, 'test2@example.com', 'hashedpassword', 'Jane', 'Smith', NOW(), NOW())
       RETURNING id`
    );
    testUserId2 = user2Result.rows[0].id;

    const user3Result = await query(
      `INSERT INTO users (id, email, password, "firstName", "lastName", "createdAt", "updatedAt")
       VALUES (gen_random_uuid()::text, 'test3@example.com', 'hashedpassword', 'Bob', 'Johnson', NOW(), NOW())
       RETURNING id`
    );
    testUserId3 = user3Result.rows[0].id;

    // Create test workspace
    const workspace = await createWorkspace({
      name: 'Test Workspace',
      ownerId: testUserId
    });
    testWorkspaceId = workspace.id;

    // Add additional members
    await addWorkspaceMember(testWorkspaceId, testUserId2, Role.MEMBER);
    await addWorkspaceMember(testWorkspaceId, testUserId3, Role.GUEST);
  });

  afterEach(async () => {
    // Clean up test data
    await query('DELETE FROM activity_logs WHERE 1=1');
    await query('DELETE FROM workspace_members WHERE 1=1');
    await query('DELETE FROM workspaces WHERE 1=1');
    await query('DELETE FROM users WHERE email LIKE \'%test%\'');
  });

  describe('getRoleLevel', () => {
    it('should return correct role levels', () => {
      expect(getRoleLevel(Role.GUEST)).toBe(1);
      expect(getRoleLevel(Role.MEMBER)).toBe(2);
      expect(getRoleLevel(Role.ADMIN)).toBe(3);
      expect(getRoleLevel(Role.OWNER)).toBe(4);
    });
  });

  describe('canAssignRole', () => {
    it('should allow higher roles to assign lower roles', () => {
      expect(canAssignRole(Role.OWNER, Role.ADMIN)).toBe(true);
      expect(canAssignRole(Role.OWNER, Role.MEMBER)).toBe(true);
      expect(canAssignRole(Role.ADMIN, Role.MEMBER)).toBe(true);
      expect(canAssignRole(Role.ADMIN, Role.GUEST)).toBe(true);
    });

    it('should not allow lower roles to assign higher roles', () => {
      expect(canAssignRole(Role.MEMBER, Role.ADMIN)).toBe(false);
      expect(canAssignRole(Role.GUEST, Role.MEMBER)).toBe(false);
      expect(canAssignRole(Role.ADMIN, Role.OWNER)).toBe(false);
    });

    it('should not allow same level role assignment', () => {
      expect(canAssignRole(Role.ADMIN, Role.ADMIN)).toBe(false);
      expect(canAssignRole(Role.MEMBER, Role.MEMBER)).toBe(false);
    });
  });

  describe('getAssignableRoles', () => {
    it('should return correct assignable roles for owner', () => {
      const roles = getAssignableRoles(Role.OWNER);
      expect(roles).toContain(Role.ADMIN);
      expect(roles).toContain(Role.MEMBER);
      expect(roles).toContain(Role.GUEST);
      expect(roles).not.toContain(Role.OWNER);
    });

    it('should return correct assignable roles for admin', () => {
      const roles = getAssignableRoles(Role.ADMIN);
      expect(roles).toContain(Role.MEMBER);
      expect(roles).toContain(Role.GUEST);
      expect(roles).not.toContain(Role.ADMIN);
      expect(roles).not.toContain(Role.OWNER);
    });

    it('should return correct assignable roles for member', () => {
      const roles = getAssignableRoles(Role.MEMBER);
      expect(roles).toContain(Role.GUEST);
      expect(roles).not.toContain(Role.MEMBER);
      expect(roles).not.toContain(Role.ADMIN);
      expect(roles).not.toContain(Role.OWNER);
    });

    it('should return empty array for guest', () => {
      const roles = getAssignableRoles(Role.GUEST);
      expect(roles).toEqual([]);
    });
  });

  describe('validateRoleAssignment', () => {
    it('should validate successful role assignment', async () => {
      const result = await validateRoleAssignment(
        testWorkspaceId,
        testUserId, // Owner
        testUserId2, // Member
        Role.ADMIN
      );

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject assignment by non-member', async () => {
      // Create another user not in workspace
      const userResult = await query(
        `INSERT INTO users (id, email, password, "firstName", "lastName", "createdAt", "updatedAt")
         VALUES (gen_random_uuid()::text, 'outsider@example.com', 'hashedpassword', 'Outsider', 'User', NOW(), NOW())
         RETURNING id`
      );
      const outsiderId = userResult.rows[0].id;

      const result = await validateRoleAssignment(
        testWorkspaceId,
        outsiderId,
        testUserId2,
        Role.ADMIN
      );

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Assigner is not a member of this workspace');
    });

    it('should reject assignment to non-member', async () => {
      const userResult = await query(
        `INSERT INTO users (id, email, password, "firstName", "lastName", "createdAt", "updatedAt")
         VALUES (gen_random_uuid()::text, 'outsider@example.com', 'hashedpassword', 'Outsider', 'User', NOW(), NOW())
         RETURNING id`
      );
      const outsiderId = userResult.rows[0].id;

      const result = await validateRoleAssignment(
        testWorkspaceId,
        testUserId, // Owner
        outsiderId, // Not a member
        Role.ADMIN
      );

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Target user is not a member of this workspace');
    });

    it('should reject insufficient permissions', async () => {
      const result = await validateRoleAssignment(
        testWorkspaceId,
        testUserId2, // Member
        testUserId3, // Guest
        Role.ADMIN // Member cannot assign admin
      );

      expect(result.valid).toBe(false);
      expect(result.error).toBe('MEMBER cannot assign ADMIN role');
    });

    it('should reject owner self-demotion', async () => {
      const result = await validateRoleAssignment(
        testWorkspaceId,
        testUserId, // Owner
        testUserId, // Same user
        Role.ADMIN // Demotion
      );

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Owners cannot demote themselves. Transfer ownership first.');
    });
  });

  describe('assignRole', () => {
    it('should successfully assign role', async () => {
      const result = await assignRole(
        testWorkspaceId,
        testUserId2,
        Role.ADMIN,
        testUserId,
        'Promotion for good work'
      );

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();

      // Verify role was changed
      const memberResult = await query(
        'SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
        [testWorkspaceId, testUserId2]
      );
      expect(memberResult.rows[0].role).toBe(Role.ADMIN);
    });

    it('should fail for non-member', async () => {
      const userResult = await query(
        `INSERT INTO users (id, email, password, "firstName", "lastName", "createdAt", "updatedAt")
         VALUES (gen_random_uuid()::text, 'outsider@example.com', 'hashedpassword', 'Outsider', 'User', NOW(), NOW())
         RETURNING id`
      );
      const outsiderId = userResult.rows[0].id;

      const result = await assignRole(
        testWorkspaceId,
        outsiderId,
        Role.MEMBER,
        testUserId
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('User is not a member of this workspace');
    });
  });

  describe('removeRole', () => {
    it('should successfully remove user from workspace', async () => {
      const result = await removeRole(
        testWorkspaceId,
        testUserId3,
        testUserId,
        'No longer needed'
      );

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();

      // Verify user was removed
      const memberResult = await query(
        'SELECT * FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
        [testWorkspaceId, testUserId3]
      );
      expect(memberResult.rows).toHaveLength(0);
    });

    it('should fail for non-member', async () => {
      const userResult = await query(
        `INSERT INTO users (id, email, password, "firstName", "lastName", "createdAt", "updatedAt")
         VALUES (gen_random_uuid()::text, 'outsider@example.com', 'hashedpassword', 'Outsider', 'User', NOW(), NOW())
         RETURNING id`
      );
      const outsiderId = userResult.rows[0].id;

      const result = await removeRole(
        testWorkspaceId,
        outsiderId,
        testUserId
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('User is not a member of this workspace');
    });
  });

  describe('transferOwnership', () => {
    it('should successfully transfer ownership', async () => {
      const result = await transferOwnership(
        testWorkspaceId,
        testUserId,
        testUserId2,
        'Stepping down'
      );

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();

      // Verify ownership transfer
      const workspaceResult = await query(
        'SELECT owner_id FROM workspaces WHERE id = $1',
        [testWorkspaceId]
      );
      expect(workspaceResult.rows[0].owner_id).toBe(testUserId2);

      // Verify role changes
      const oldOwnerResult = await query(
        'SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
        [testWorkspaceId, testUserId]
      );
      expect(oldOwnerResult.rows[0].role).toBe(Role.ADMIN);

      const newOwnerResult = await query(
        'SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
        [testWorkspaceId, testUserId2]
      );
      expect(newOwnerResult.rows[0].role).toBe(Role.OWNER);
    });

    it('should fail when current user is not owner', async () => {
      const result = await transferOwnership(
        testWorkspaceId,
        testUserId2, // Not owner
        testUserId3,
        'Invalid transfer'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Current user is not the workspace owner');
    });

    it('should fail when new owner is not a member', async () => {
      const userResult = await query(
        `INSERT INTO users (id, email, password, "firstName", "lastName", "createdAt", "updatedAt")
         VALUES (gen_random_uuid()::text, 'outsider@example.com', 'hashedpassword', 'Outsider', 'User', NOW(), NOW())
         RETURNING id`
      );
      const outsiderId = userResult.rows[0].id;

      const result = await transferOwnership(
        testWorkspaceId,
        testUserId,
        outsiderId,
        'Invalid transfer'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('New owner must be a workspace member');
    });
  });

  describe('getRoleHistory', () => {
    it('should return role change history', async () => {
      // Make some role changes
      await assignRole(testWorkspaceId, testUserId2, Role.ADMIN, testUserId, 'Promotion');
      await assignRole(testWorkspaceId, testUserId3, Role.MEMBER, testUserId, 'Upgrade');

      const history = await getRoleHistory(testWorkspaceId);

      expect(history).toHaveLength(2);
      expect(history[0].action).toBe('role_changed');
      expect(history[0].metadata.targetUserId).toBe(testUserId3);
      expect(history[0].metadata.newRole).toBe(Role.MEMBER);
      expect(history[0].changedBy.email).toBe('test1@example.com');
    });

    it('should return empty array for workspace with no history', async () => {
      // Create new workspace with no role changes
      const newWorkspace = await createWorkspace({
        name: 'New Workspace',
        ownerId: testUserId
      });

      const history = await getRoleHistory(newWorkspace.id);
      expect(history).toHaveLength(0);
    });
  });
});