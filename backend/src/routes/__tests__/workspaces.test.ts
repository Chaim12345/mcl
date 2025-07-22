import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { query } from '../../db/client.js';
import { Role } from '../../models/types.js';
import { generateToken } from '../../utils/jwt.js';
import workspacesRouter from '../workspaces.js';

const app = express();
app.use(express.json());
app.use('/api/workspaces', workspacesRouter);

describe('Workspaces API', () => {
  let testUserId: string;
  let testUserId2: string;
  let testWorkspaceId: string;
  let authToken: string;
  let authToken2: string;

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

    // Generate auth tokens
    authToken = generateToken({ userId: testUserId });
    authToken2 = generateToken({ userId: testUserId2 });
  });

  afterEach(async () => {
    // Clean up test data
    await query('DELETE FROM workspace_members WHERE 1=1');
    await query('DELETE FROM workspaces WHERE 1=1');
    await query('DELETE FROM users WHERE email LIKE \'%test%\'');
  });

  describe('POST /api/workspaces', () => {
    it('should create a new workspace', async () => {
      const workspaceData = {
        name: 'Test Workspace',
        description: 'A test workspace'
      };

      const response = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${authToken}`)
        .send(workspaceData)
        .expect(201);

      expect(response.body.workspace).toBeDefined();
      expect(response.body.workspace.name).toBe('Test Workspace');
      expect(response.body.workspace.description).toBe('A test workspace');
      expect(response.body.workspace.ownerId).toBe(testUserId);
      expect(response.body.workspace.members).toHaveLength(1);
      expect(response.body.workspace.members[0].role).toBe(Role.OWNER);

      testWorkspaceId = response.body.workspace.id;
    });

    it('should require authentication', async () => {
      const workspaceData = {
        name: 'Test Workspace'
      };

      await request(app)
        .post('/api/workspaces')
        .send(workspaceData)
        .expect(401);
    });

    it('should validate workspace name', async () => {
      const workspaceData = {
        name: ''
      };

      const response = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${authToken}`)
        .send(workspaceData)
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });
  });

  describe('GET /api/workspaces', () => {
    beforeEach(async () => {
      // Create a test workspace
      const response = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test Workspace' });
      
      testWorkspaceId = response.body.workspace.id;
    });

    it('should get user workspaces', async () => {
      const response = await request(app)
        .get('/api/workspaces')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.workspaces).toBeDefined();
      expect(response.body.workspaces).toHaveLength(1);
      expect(response.body.workspaces[0].name).toBe('Test Workspace');
    });

    it('should return empty array for user with no workspaces', async () => {
      const response = await request(app)
        .get('/api/workspaces')
        .set('Authorization', `Bearer ${authToken2}`)
        .expect(200);

      expect(response.body.workspaces).toHaveLength(0);
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/workspaces')
        .expect(401);
    });
  });

  describe('GET /api/workspaces/:id', () => {
    beforeEach(async () => {
      // Create a test workspace
      const response = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test Workspace' });
      
      testWorkspaceId = response.body.workspace.id;
    });

    it('should get workspace by id', async () => {
      const response = await request(app)
        .get(`/api/workspaces/${testWorkspaceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.workspace).toBeDefined();
      expect(response.body.workspace.id).toBe(testWorkspaceId);
      expect(response.body.workspace.name).toBe('Test Workspace');
    });

    it('should return 404 for non-existent workspace', async () => {
      await request(app)
        .get('/api/workspaces/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should deny access to non-members', async () => {
      await request(app)
        .get(`/api/workspaces/${testWorkspaceId}`)
        .set('Authorization', `Bearer ${authToken2}`)
        .expect(403);
    });
  });

  describe('PUT /api/workspaces/:id', () => {
    beforeEach(async () => {
      // Create a test workspace
      const response = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test Workspace' });
      
      testWorkspaceId = response.body.workspace.id;
    });

    it('should update workspace', async () => {
      const updateData = {
        name: 'Updated Workspace',
        description: 'Updated description'
      };

      const response = await request(app)
        .put(`/api/workspaces/${testWorkspaceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.workspace.name).toBe('Updated Workspace');
      expect(response.body.workspace.description).toBe('Updated description');
    });

    it('should require admin permissions', async () => {
      // Add user2 as a member (not admin)
      await query(
        `INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at, updated_at)
         VALUES (gen_random_uuid()::text, $1, $2, $3, NOW(), NOW())`,
        [testWorkspaceId, testUserId2, Role.MEMBER]
      );

      await request(app)
        .put(`/api/workspaces/${testWorkspaceId}`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ name: 'Updated Name' })
        .expect(403);
    });
  });

  describe('DELETE /api/workspaces/:id', () => {
    beforeEach(async () => {
      // Create a test workspace
      const response = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test Workspace' });
      
      testWorkspaceId = response.body.workspace.id;
    });

    it('should delete workspace', async () => {
      await request(app)
        .delete(`/api/workspaces/${testWorkspaceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify workspace is deleted
      await request(app)
        .get(`/api/workspaces/${testWorkspaceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should require owner permissions', async () => {
      // Add user2 as an admin (not owner)
      await query(
        `INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at, updated_at)
         VALUES (gen_random_uuid()::text, $1, $2, $3, NOW(), NOW())`,
        [testWorkspaceId, testUserId2, Role.ADMIN]
      );

      await request(app)
        .delete(`/api/workspaces/${testWorkspaceId}`)
        .set('Authorization', `Bearer ${authToken2}`)
        .expect(403);
    });
  });

  describe('GET /api/workspaces/:id/members', () => {
    beforeEach(async () => {
      // Create a test workspace
      const response = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test Workspace' });
      
      testWorkspaceId = response.body.workspace.id;
    });

    it('should get workspace members', async () => {
      const response = await request(app)
        .get(`/api/workspaces/${testWorkspaceId}/members`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.members).toBeDefined();
      expect(response.body.members).toHaveLength(1);
      expect(response.body.members[0].userId).toBe(testUserId);
      expect(response.body.members[0].role).toBe(Role.OWNER);
    });
  });

  describe('POST /api/workspaces/:id/members', () => {
    beforeEach(async () => {
      // Create a test workspace
      const response = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test Workspace' });
      
      testWorkspaceId = response.body.workspace.id;
    });

    it('should add member to workspace', async () => {
      const memberData = {
        userId: testUserId2,
        role: Role.MEMBER
      };

      await request(app)
        .post(`/api/workspaces/${testWorkspaceId}/members`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(memberData)
        .expect(201);

      // Verify member was added
      const response = await request(app)
        .get(`/api/workspaces/${testWorkspaceId}/members`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.members).toHaveLength(2);
    });

    it('should not add duplicate member', async () => {
      const memberData = {
        userId: testUserId2,
        role: Role.MEMBER
      };

      // Add member first time
      await request(app)
        .post(`/api/workspaces/${testWorkspaceId}/members`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(memberData)
        .expect(201);

      // Try to add same member again
      await request(app)
        .post(`/api/workspaces/${testWorkspaceId}/members`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(memberData)
        .expect(409);
    });
  });

  describe('DELETE /api/workspaces/:id/members/:userId', () => {
    beforeEach(async () => {
      // Create a test workspace
      const response = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test Workspace' });
      
      testWorkspaceId = response.body.workspace.id;

      // Add user2 as a member
      await request(app)
        .post(`/api/workspaces/${testWorkspaceId}/members`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ userId: testUserId2, role: Role.MEMBER });
    });

    it('should remove member from workspace', async () => {
      await request(app)
        .delete(`/api/workspaces/${testWorkspaceId}/members/${testUserId2}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify member was removed
      const response = await request(app)
        .get(`/api/workspaces/${testWorkspaceId}/members`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.members).toHaveLength(1);
      expect(response.body.members[0].userId).toBe(testUserId);
    });
  });

  describe('PUT /api/workspaces/:id/members/:userId/role', () => {
    beforeEach(async () => {
      // Create a test workspace
      const response = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test Workspace' });
      
      testWorkspaceId = response.body.workspace.id;

      // Add user2 as a member
      await request(app)
        .post(`/api/workspaces/${testWorkspaceId}/members`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ userId: testUserId2, role: Role.MEMBER });
    });

    it('should update member role', async () => {
      await request(app)
        .put(`/api/workspaces/${testWorkspaceId}/members/${testUserId2}/role`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ role: Role.ADMIN })
        .expect(200);

      // Verify role was updated
      const response = await request(app)
        .get(`/api/workspaces/${testWorkspaceId}/members`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const member = response.body.members.find((m: any) => m.userId === testUserId2);
      expect(member.role).toBe(Role.ADMIN);
    });
  });
});