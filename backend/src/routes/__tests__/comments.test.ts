import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import prisma from '../../db/prisma.js';
import commentRoutes from '../comments.js';
import { generateAccessToken } from '../../utils/jwt.js';

// Create test app instead of using main server to avoid port conflicts
const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/comments', commentRoutes);

describe('Comment API Routes', () => {
  let authToken: string;
  let user2AuthToken: string;
  let userId: string;
  let user2Id: string;
  let boardId: string;
  let itemId: string;
  let commentId: string;
  let replyId: string;

  beforeAll(async () => {
    // Setup users
    const user1 = await prisma.user.create({
      data: {
        email: 'commenter1@example.com',
        password: 'hashedpassword',
        firstName: 'John',
        lastName: 'Doe',
      },
    });
    userId = user1.id;
    authToken = generateAccessToken({ id: user1.id, email: user1.email });

    const user2 = await prisma.user.create({
      data: {
        email: 'commenter2@example.com',
        password: 'hashedpassword',
        firstName: 'Jane',
        lastName: 'Smith',
      },
    });
    user2Id = user2.id;
    user2AuthToken = generateAccessToken({ id: user2.id, email: user2.email });

    // Setup workspace and board structure
    const workspace = await prisma.workspace.create({
      data: {
        name: 'Comment Workspace',
        ownerId: user1.id,
      },
    });

    await prisma.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId: user1.id,
        role: 'OWNER',
      },
    });

    const board = await prisma.board.create({
      data: {
        name: 'Comment Board',
        workspaceId: workspace.id,
      },
    });
    boardId = board.id;

    const column = await prisma.boardColumn.create({
      data: {
        name: 'Main',
        boardId: board.id,
        order: 0,
      },
    });

    const item = await prisma.boardItem.create({
      data: {
        title: 'Task for Comments',
        boardId: board.id,
        columnId: column.id,
        order: 0,
      },
    });
    itemId = item.id;
  });

  afterAll(async () => {
    await prisma.notification.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.boardItem.deleteMany();
    await prisma.boardColumn.deleteMany();
    await prisma.board.deleteMany();
    await prisma.workspaceMember.deleteMany();
    await prisma.workspace.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up comments and notifications before each test
    await prisma.notification.deleteMany();
    await prisma.comment.deleteMany();
  });

  describe('POST /api/comments', () => {
    it('should create a basic comment', async () => {
      const res = await request(app)
        .post('/api/comments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'This is a test comment',
          itemId,
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.content).toBe('This is a test comment');
      expect(res.body.itemId).toBe(itemId);
      expect(res.body.userId).toBe(userId);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.firstName).toBe('John');
      
      commentId = res.body.id;
    });

    it('should create a threaded comment (reply)', async () => {
      // First create a parent comment
      const parentRes = await request(app)
        .post('/api/comments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Parent comment',
          itemId,
        });

      const parentId = parentRes.body.id;

      // Then create a reply
      const res = await request(app)
        .post('/api/comments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Reply comment',
          itemId,
          parentId,
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('parentId', parentId);
      expect(res.body.content).toBe('Reply comment');
      
      replyId = res.body.id;
    });

    it('should create comment with mentions and notifications', async () => {
      const res = await request(app)
        .post('/api/comments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Hey @Jane, please check this task',
          itemId,
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.mentions).toContain(user2Id);

      // Check that notification was created
      const notifications = await prisma.notification.findMany({
        where: {
          recipientId: user2Id,
          type: 'MENTION',
        },
      });

      expect(notifications.length).toBe(1);
      expect(notifications[0].senderId).toBe(userId);
    });

    it('should log activity when comment is created', async () => {
      const res = await request(app)
        .post('/api/comments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'This should log an activity',
          itemId,
        });

      expect(res.statusCode).toBe(201);

      // Wait a bit for the async activity logging to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check that activity was logged
      const activities = await prisma.activityLog.findMany({
        where: {
          action: 'comment_created',
          entityId: res.body.id,
          userId,
        },
      });

      expect(activities.length).toBe(1);
      expect(activities[0].entityType).toBe('comment');
      expect(activities[0].itemId).toBe(itemId);
    });

    it('should return validation error for missing content', async () => {
      const res = await request(app)
        .post('/api/comments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          itemId,
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('should return validation error for missing itemId', async () => {
      const res = await request(app)
        .post('/api/comments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Test comment',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });
  });

  describe('GET /api/comments/item/:itemId', () => {
    it('should get all comments for an item with threading structure', async () => {
      // Create parent comment
      const parentRes = await request(app)
        .post('/api/comments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Parent comment',
          itemId,
        });

      const parentId = parentRes.body.id;

      // Create reply
      const replyRes = await request(app)
        .post('/api/comments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Reply comment',
          itemId,
          parentId,
        });

      const replyId = replyRes.body.id;

      // Get all comments
      const res = await request(app)
        .get(`/api/comments/item/${itemId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1); // One root comment

      const rootComment = res.body[0];
      expect(rootComment.id).toBe(parentId);
      expect(rootComment.replies).toBeDefined();
      expect(rootComment.replies.length).toBe(1);
      expect(rootComment.replies[0].id).toBe(replyId);
    });

    it('should return empty array for item with no comments', async () => {
      // Create another item
      const column = await prisma.boardColumn.findFirst({
        where: { boardId },
      });

      const emptyItem = await prisma.boardItem.create({
        data: {
          title: 'Empty Item',
          boardId,
          columnId: column!.id,
          order: 1,
        },
      });

      const res = await request(app)
        .get(`/api/comments/item/${emptyItem.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual([]);

      // Clean up
      await prisma.boardItem.delete({ where: { id: emptyItem.id } });
    });
  });

  describe('GET /api/comments/:id', () => {
    it('should get a specific comment by ID', async () => {
      // Create a comment first
      const createRes = await request(app)
        .post('/api/comments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Test comment for retrieval',
          itemId,
        });

      const commentId = createRes.body.id;

      // Get the comment
      const res = await request(app)
        .get(`/api/comments/${commentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.id).toBe(commentId);
      expect(res.body.content).toBe('Test comment for retrieval');
      expect(res.body.user).toBeDefined();
    });

    it('should return 404 for non-existent comment', async () => {
      const res = await request(app)
        .get('/api/comments/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('Comment not found');
    });
  });

  describe('PUT /api/comments/:id', () => {
    it('should update a comment', async () => {
      // Create a comment first
      const createRes = await request(app)
        .post('/api/comments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Original content',
          itemId,
        });

      const commentId = createRes.body.id;

      // Update the comment
      const res = await request(app)
        .put(`/api/comments/${commentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Updated content with @Jane mention',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.content).toBe('Updated content with @Jane mention');
      expect(res.body.isEdited).toBe(true);
      expect(res.body.editedAt).toBeDefined();
      expect(res.body.mentions).toContain(user2Id);
    });

    it('should log activity when comment is updated', async () => {
      // Create a comment first
      const createRes = await request(app)
        .post('/api/comments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Original content',
          itemId,
        });

      const commentId = createRes.body.id;

      // Update the comment
      const res = await request(app)
        .put(`/api/comments/${commentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Updated content',
        });

      expect(res.statusCode).toBe(200);

      // Wait a bit for the async activity logging to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check that activity was logged
      const activities = await prisma.activityLog.findMany({
        where: {
          action: 'comment_updated',
          entityId: commentId,
          userId,
        },
      });

      expect(activities.length).toBe(1);
      expect(activities[0].entityType).toBe('comment');
      expect(activities[0].itemId).toBe(itemId);
    });

    it('should return 403 when trying to update someone else\'s comment', async () => {
      // Create a comment as user1
      const createRes = await request(app)
        .post('/api/comments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'User 1 comment',
          itemId,
        });

      const commentId = createRes.body.id;

      // Try to update as user2
      const res = await request(app)
        .put(`/api/comments/${commentId}`)
        .set('Authorization', `Bearer ${user2AuthToken}`)
        .send({
          content: 'Trying to update someone else\'s comment',
        });

      expect(res.statusCode).toBe(403);
      expect(res.body.error).toContain('Permission denied');
    });

    it('should return validation error for invalid content', async () => {
      const res = await request(app)
        .put('/api/comments/some-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: '', // Empty content
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });
  });

  describe('DELETE /api/comments/:id', () => {
    it('should delete a comment', async () => {
      // Create a comment first
      const createRes = await request(app)
        .post('/api/comments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Comment to delete',
          itemId,
        });

      const commentId = createRes.body.id;

      // Delete the comment
      const res = await request(app)
        .delete(`/api/comments/${commentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(204);

      // Verify comment is deleted
      const getRes = await request(app)
        .get(`/api/comments/${commentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getRes.statusCode).toBe(404);
    });

    it('should return 403 when trying to delete someone else\'s comment', async () => {
      // Create a comment as user1
      const createRes = await request(app)
        .post('/api/comments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'User 1 comment',
          itemId,
        });

      const commentId = createRes.body.id;

      // Try to delete as user2
      const res = await request(app)
        .delete(`/api/comments/${commentId}`)
        .set('Authorization', `Bearer ${user2AuthToken}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.error).toContain('Permission denied');
    });

    it('should return 404 for non-existent comment', async () => {
      const res = await request(app)
        .delete('/api/comments/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('Comment not found');
    });
  });
});
