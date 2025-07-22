import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { query } from '../../db/client.js';
import { Role } from '../../models/types.js';
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
} from '../workspaceService.js';

describe('WorkspaceService', () => {
  let testUserId: string;
  let testUserId2: string;
  let testWorkspaceId: string;

  beforeEach(async () => {
    // Clean up any existing test data
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
  });

  afterEach(async () => {
    // Clean up test data
    await query('DELETE FROM workspace_members WHERE 1=1');
    await query('DELETE FROM workspaces WHERE 1=1');
    await query('DELETE FROM users WHERE email LIKE \'%test%\'');
  });

  describe('createWorkspace', () => {
    it('should create a workspace with owner as first member', async () => {
      const workspaceData = {
        name: 'Test Workspace',
        description: 'A test workspace',
        ownerId: testUserId
      };

      const workspace = await createWorkspace(workspaceData);

      expect(workspace).toBeDefined();
      expect(workspace.name).toBe('Test Workspace');
      expect(workspace.description).toBe('A test workspace');
      expect(workspace.ownerId).toBe(testUserId);
      expect(workspace.members).toHaveLength(1);
      expect(workspace.members[0].role).toBe(Role.OWNER);
      expect(workspace.members[0].userId).toBe(testUserId);

      testWorkspaceId = workspace.id;
    });

    it('should create a workspace with minimal data', async () => {
      const workspaceData = {
        name: 'Minimal Workspace',
        ownerId: testUserId
      };

      const workspace = await createWorkspace(workspaceData);

      expect(workspace).toBeDefined();
      expect(workspace.name).toBe('Minimal Workspace');
      expect(workspace.description).toBeNull();
      expect(workspace.logo).toBeNull();
      expect(workspace.ownerId).toBe(testUserId);
      expect(workspace.members).toHaveLength(1);
    });
  });

  describe('getWorkspaceById', () => {
    beforeEach(async () => {
      const workspace = await createWorkspace({
        name: 'Test Workspace',
        ownerId: testUserId
      });
      testWorkspaceId = workspace.id;
    });

    it('should return workspace with members', async () => {
      const workspace = await getWorkspaceById(testWorkspaceId);

      expect(workspace).toBeDefined();
      expect(workspace!.id).toBe(testWorkspaceId);
      expect(workspace!.name).toBe('Test Workspace');
      expect(workspace!.members).toHaveLength(1);
      expect(workspace!.members[0].user.email).toBe('test1@example.com');
    });

    it('should return null for non-existent workspace', async () => {
      const workspace = await getWorkspaceById('non-existent-id');
      expect(workspace).toBeNull();
    });
  });

  describe('getWorkspacesForUser', () => {
    beforeEach(async () => {
      const workspace = await createWorkspace({
        name: 'Test Workspace',
        ownerId: testUserId
      });
      testWorkspaceId = workspace.id;
    });

    it('should return workspaces where user is a member', async () => {
      const workspaces = await getWorkspacesForUser(testUserId);

      expect(workspaces).toHaveLength(1);
      expect(workspaces[0].id).toBe(testWorkspaceId);
      expect(workspaces[0].name).toBe('Test Workspace');
      expect(workspaces[0].members).toHaveLength(1);
    });

    it('should return empty array for user with no workspaces', async () => {
      const workspaces = await getWorkspacesForUser(testUserId2);
      expect(workspaces).toHaveLength(0);
    });
  });

  describe('updateWorkspace', () => {
    beforeEach(async () => {
      const workspace = await createWorkspace({
        name: 'Test Workspace',
        ownerId: testUserId
      });
      testWorkspaceId = workspace.id;
    });

    it('should update workspace name', async () => {
      const updatedWorkspace = await updateWorkspace(testWorkspaceId, {
        name: 'Updated Workspace'
      });

      expect(updatedWorkspace).toBeDefined();
      expect(updatedWorkspace!.name).toBe('Updated Workspace');
    });

    it('should update workspace description', async () => {
      const updatedWorkspace = await updateWorkspace(testWorkspaceId, {
        description: 'Updated description'
      });

      expect(updatedWorkspace).toBeDefined();
      expect(updatedWorkspace!.description).toBe('Updated description');
    });

    it('should update multiple fields', async () => {
      const updatedWorkspace = await updateWorkspace(testWorkspaceId, {
        name: 'New Name',
        description: 'New Description',
        logo: 'new-logo.png'
      });

      expect(updatedWorkspace).toBeDefined();
      expect(updatedWorkspace!.name).toBe('New Name');
      expect(updatedWorkspace!.description).toBe('New Description');
      expect(updatedWorkspace!.logo).toBe('new-logo.png');
    });

    it('should return null for non-existent workspace', async () => {
      const updatedWorkspace = await updateWorkspace('non-existent-id', {
        name: 'New Name'
      });

      expect(updatedWorkspace).toBeNull();
    });
  });

  describe('deleteWorkspace', () => {
    beforeEach(async () => {
      const workspace = await createWorkspace({
        name: 'Test Workspace',
        ownerId: testUserId
      });
      testWorkspaceId = workspace.id;
    });

    it('should delete workspace successfully', async () => {
      const deleted = await deleteWorkspace(testWorkspaceId);
      expect(deleted).toBe(true);

      const workspace = await getWorkspaceById(testWorkspaceId);
      expect(workspace).toBeNull();
    });

    it('should return false for non-existent workspace', async () => {
      const deleted = await deleteWorkspace('non-existent-id');
      expect(deleted).toBe(false);
    });
  });

  describe('addWorkspaceMember', () => {
    beforeEach(async () => {
      const workspace = await createWorkspace({
        name: 'Test Workspace',
        ownerId: testUserId
      });
      testWorkspaceId = workspace.id;
    });

    it('should add member to workspace', async () => {
      const added = await addWorkspaceMember(testWorkspaceId, testUserId2, Role.MEMBER);
      expect(added).toBe(true);

      const workspace = await getWorkspaceById(testWorkspaceId);
      expect(workspace!.members).toHaveLength(2);
      
      const newMember = workspace!.members.find(m => m.userId === testUserId2);
      expect(newMember).toBeDefined();
      expect(newMember!.role).toBe(Role.MEMBER);
    });

    it('should not add duplicate member', async () => {
      // Add member first time
      await addWorkspaceMember(testWorkspaceId, testUserId2, Role.MEMBER);
      
      // Try to add same member again
      const added = await addWorkspaceMember(testWorkspaceId, testUserId2, Role.ADMIN);
      expect(added).toBe(false);

      const workspace = await getWorkspaceById(testWorkspaceId);
      expect(workspace!.members).toHaveLength(2);
    });
  });

  describe('removeWorkspaceMember', () => {
    beforeEach(async () => {
      const workspace = await createWorkspace({
        name: 'Test Workspace',
        ownerId: testUserId
      });
      testWorkspaceId = workspace.id;
      await addWorkspaceMember(testWorkspaceId, testUserId2, Role.MEMBER);
    });

    it('should remove member from workspace', async () => {
      const removed = await removeWorkspaceMember(testWorkspaceId, testUserId2);
      expect(removed).toBe(true);

      const workspace = await getWorkspaceById(testWorkspaceId);
      expect(workspace!.members).toHaveLength(1);
      expect(workspace!.members[0].userId).toBe(testUserId);
    });

    it('should return false for non-existent member', async () => {
      const removed = await removeWorkspaceMember(testWorkspaceId, 'non-existent-user');
      expect(removed).toBe(false);
    });
  });

  describe('updateWorkspaceMemberRole', () => {
    beforeEach(async () => {
      const workspace = await createWorkspace({
        name: 'Test Workspace',
        ownerId: testUserId
      });
      testWorkspaceId = workspace.id;
      await addWorkspaceMember(testWorkspaceId, testUserId2, Role.MEMBER);
    });

    it('should update member role', async () => {
      const updated = await updateWorkspaceMemberRole(testWorkspaceId, testUserId2, Role.ADMIN);
      expect(updated).toBe(true);

      const workspace = await getWorkspaceById(testWorkspaceId);
      const member = workspace!.members.find(m => m.userId === testUserId2);
      expect(member!.role).toBe(Role.ADMIN);
    });

    it('should return false for non-existent member', async () => {
      const updated = await updateWorkspaceMemberRole(testWorkspaceId, 'non-existent-user', Role.ADMIN);
      expect(updated).toBe(false);
    });
  });

  describe('isWorkspaceMember', () => {
    beforeEach(async () => {
      const workspace = await createWorkspace({
        name: 'Test Workspace',
        ownerId: testUserId
      });
      testWorkspaceId = workspace.id;
      await addWorkspaceMember(testWorkspaceId, testUserId2, Role.MEMBER);
    });

    it('should return true for existing member', async () => {
      const result = await isWorkspaceMember(testWorkspaceId, testUserId2);
      expect(result.isMember).toBe(true);
      expect(result.role).toBe(Role.MEMBER);
    });

    it('should return false for non-member', async () => {
      const result = await isWorkspaceMember(testWorkspaceId, 'non-existent-user');
      expect(result.isMember).toBe(false);
      expect(result.role).toBeUndefined();
    });
  });

  describe('getWorkspaceMembers', () => {
    beforeEach(async () => {
      const workspace = await createWorkspace({
        name: 'Test Workspace',
        ownerId: testUserId
      });
      testWorkspaceId = workspace.id;
      await addWorkspaceMember(testWorkspaceId, testUserId2, Role.MEMBER);
    });

    it('should return all workspace members', async () => {
      const members = await getWorkspaceMembers(testWorkspaceId);
      
      expect(members).toHaveLength(2);
      expect(members.find(m => m.userId === testUserId)?.role).toBe(Role.OWNER);
      expect(members.find(m => m.userId === testUserId2)?.role).toBe(Role.MEMBER);
    });

    it('should return empty array for workspace with no members', async () => {
      // Create workspace without members (shouldn't happen in practice)
      const workspaceResult = await query(
        `INSERT INTO workspaces (id, name, owner_id, created_at, updated_at)
         VALUES (gen_random_uuid()::text, 'Empty Workspace', $1, NOW(), NOW())
         RETURNING id`,
        [testUserId]
      );
      
      const members = await getWorkspaceMembers(workspaceResult.rows[0].id);
      expect(members).toHaveLength(0);
    });
  });
});