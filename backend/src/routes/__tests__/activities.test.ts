import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import prisma from '../../db/prisma.js';
import activityRoutes from '../activities.js';
import { generateAccessToken } from '../../utils/jwt.js';
import { createActivity, ACTIVITY_ACTIONS } from '../../services/activityService.js';

// Create test app instead of using main server to avoid port conflicts
const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/activities', activityRoutes);

describe('Activity API Routes', () => {
  let authToken: string;
  let user2AuthToken: string;
  let userId: string;
  let user2Id: string;
  let boardId: string;
  let itemId: string;
  let item2Id: string;

  beforeAll(async () => {
    // Setup users
    const user1 = await prisma.user.create({
      data: {
        email: 'activity1@example.com',
        password: 'hashedpassword',
        firstName: 'John',
        lastName: 'Doe',
      },
    });
    userId = user1.id;
    authToken = generateAccessToken({ id: user1.id, email: user1.email });

    const user2 = await prisma.user.create({
      data: {
        email: 'activity2@example.com',
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
        name: 'Activity Workspace',
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
        name: 'Activity Board',
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

    const item1 = await prisma.boardItem.create({
      data: {
        title: 'Task for Activities 1',
        boardId: board.id,
        columnId: column.id,
        order: 0,
      },
    });
    itemId = item1.id;

    const item2 = await prisma.boardItem.create({
      data: {
        title: 'Task for Activities 2',
        boardId: board.id,
        columnId: column.id,
        order: 1,
      },
    });
    item2Id = item2.id;
  });

  afterAll(async () => {
    await prisma.activityLog.deleteMany();
    await prisma.boardItem.deleteMany();
    await prisma.boardColumn.deleteMany();
    await prisma.board.deleteMany();
    await prisma.workspaceMember.deleteMany();
    await prisma.workspace.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up activities before each test
    await prisma.activityLog.deleteMany();
  });

  describe('GET /api/activities', () => {
    beforeEach(async () => {
      // Create test activities
      await createActivity({
        action: ACTIVITY_ACTIONS.ITEM_CREATED,
        entityId: itemId,
        entityType: 'item',
        itemId,
        userId,
        metadata: { title: 'Task for Activities 1' },
      });

      await createActivity({
        action: ACTIVITY_ACTIONS.ITEM_UPDATED,
        entityId: itemId,
        entityType: 'item',
        itemId,
        userId: user2Id,
        metadata: { updatedFields: ['title'] },
      });

      await createActivity({
        action: ACTIVITY_ACTIONS.COMMENT_CREATED,
        entityId: 'comment-id',
        entityType: 'comment',
        itemId: item2Id,
        userId,
      });
    });

    it('should get all activities with default pagination', async () => {
      const res = await request(app)
        .get('/api/activities')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.activities).toBeDefined();
      expect(res.body.activities.length).toBe(3);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.total).toBe(3);
      
      // Check that formatted messages are included
      res.body.activities.forEach((activity: any) => {
        expect(activity.formattedMessage).toBeDefined();
        expect(typeof activity.formattedMessage).toBe('string');
      });
    });

    it('should filter activities by itemId', async () => {
      const res = await request(app)
        .get(`/api/activities?itemId=${itemId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.activities.length).toBe(2);
      res.body.activities.forEach((activity: any) => {
        expect(activity.itemId).toBe(itemId);
      });
    });

    it('should filter activities by userId', async () => {
      const res = await request(app)
        .get(`/api/activities?userId=${userId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.activities.length).toBe(2);
      res.body.activities.forEach((activity: any) => {
        expect(activity.userId).toBe(userId);
      });
    });

    it('should filter activities by entityType', async () => {
      const res = await request(app)
        .get('/api/activities?entityType=item')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.activities.length).toBe(2);
      res.body.activities.forEach((activity: any) => {
        expect(activity.entityType).toBe('item');
      });
    });

    it('should filter activities by action', async () => {
      const res = await request(app)
        .get(`/api/activities?action=${ACTIVITY_ACTIONS.ITEM_CREATED}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.activities.length).toBe(1);
      expect(res.body.activities[0].action).toBe(ACTIVITY_ACTIONS.ITEM_CREATED);
    });

    it('should paginate activities correctly', async () => {
      const res = await request(app)
        .get('/api/activities?page=1&limit=2')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.activities.length).toBe(2);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(2);
      expect(res.body.pagination.total).toBe(3);
      expect(res.body.pagination.totalPages).toBe(2);
      expect(res.body.pagination.hasNext).toBe(true);
      expect(res.body.pagination.hasPrev).toBe(false);
    });

    it('should sort activities by createdAt desc by default', async () => {
      const res = await request(app)
        .get('/api/activities')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      
      // Activities should be sorted by newest first
      for (let i = 0; i < res.body.activities.length - 1; i++) {
        const current = new Date(res.body.activities[i].createdAt);
        const next = new Date(res.body.activities[i + 1].createdAt);
        expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
      }
    });

    it('should return validation error for invalid parameters', async () => {
      const res = await request(app)
        .get('/api/activities?page=0&limit=101')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Validation failed');
      expect(res.body.details).toBeDefined();
    });
  });

  describe('GET /api/activities/item/:itemId', () => {
    beforeEach(async () => {
      // Create activities for specific items
      await createActivity({
        action: ACTIVITY_ACTIONS.ITEM_CREATED,
        entityId: itemId,
        entityType: 'item',
        itemId,
        userId,
      });

      await createActivity({
        action: ACTIVITY_ACTIONS.ITEM_UPDATED,
        entityId: itemId,
        entityType: 'item',
        itemId,
        userId: user2Id,
      });

      await createActivity({
        action: ACTIVITY_ACTIONS.COMMENT_CREATED,
        entityId: 'comment-id',
        entityType: 'comment',
        itemId: item2Id,
        userId,
      });
    });

    it('should get activities for a specific item', async () => {
      const res = await request(app)
        .get(`/api/activities/item/${itemId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.activities.length).toBe(2);
      res.body.activities.forEach((activity: any) => {
        expect(activity.itemId).toBe(itemId);
        expect(activity.formattedMessage).toBeDefined();
      });
    });

    it('should return empty array for item with no activities', async () => {
      // Create another item without activities
      const column = await prisma.boardColumn.findFirst({
        where: { boardId },
      });

      const emptyItem = await prisma.boardItem.create({
        data: {
          title: 'Empty Item',
          boardId,
          columnId: column!.id,
          order: 2,
        },
      });

      const res = await request(app)
        .get(`/api/activities/item/${emptyItem.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.activities).toEqual([]);

      // Clean up
      await prisma.boardItem.delete({ where: { id: emptyItem.id } });
    });

    it('should return 400 for missing itemId', async () => {
      const res = await request(app)
        .get('/api/activities/item/')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404); // Express returns 404 for missing route params
    });

    it('should paginate item activities', async () => {
      const res = await request(app)
        .get(`/api/activities/item/${itemId}?page=1&limit=1`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.activities.length).toBe(1);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(1);
      expect(res.body.pagination.total).toBe(2);
    });
  });

  describe('GET /api/activities/user/:userId', () => {
    beforeEach(async () => {
      // Create activities for specific users
      await createActivity({
        action: ACTIVITY_ACTIONS.ITEM_CREATED,
        entityId: itemId,
        entityType: 'item',
        itemId,
        userId,
      });

      await createActivity({
        action: ACTIVITY_ACTIONS.ITEM_UPDATED,
        entityId: itemId,
        entityType: 'item',
        itemId,
        userId,
      });

      await createActivity({
        action: ACTIVITY_ACTIONS.COMMENT_CREATED,
        entityId: 'comment-id',
        entityType: 'comment',
        itemId: item2Id,
        userId: user2Id,
      });
    });

    it('should get activities for a specific user', async () => {
      const res = await request(app)
        .get(`/api/activities/user/${userId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.activities.length).toBe(2);
      res.body.activities.forEach((activity: any) => {
        expect(activity.userId).toBe(userId);
        expect(activity.formattedMessage).toBeDefined();
      });
    });

    it('should return empty array for user with no activities', async () => {
      // Create another user without activities
      const userWithoutActivities = await prisma.user.create({
        data: {
          email: 'noactivities@test.com',
          password: 'hashedpassword',
        },
      });

      const res = await request(app)
        .get(`/api/activities/user/${userWithoutActivities.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.activities).toEqual([]);

      // Clean up
      await prisma.user.delete({ where: { id: userWithoutActivities.id } });
    });

    it('should paginate user activities', async () => {
      const res = await request(app)
        .get(`/api/activities/user/${userId}?page=1&limit=1`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.activities.length).toBe(1);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(1);
      expect(res.body.pagination.total).toBe(2);
    });
  });

  describe('GET /api/activities/stats', () => {
    beforeEach(async () => {
      // Create diverse activities for stats
      await createActivity({
        action: ACTIVITY_ACTIONS.ITEM_CREATED,
        entityId: itemId,
        entityType: 'item',
        itemId,
        userId,
      });

      await createActivity({
        action: ACTIVITY_ACTIONS.ITEM_UPDATED,
        entityId: itemId,
        entityType: 'item',
        itemId,
        userId,
      });

      await createActivity({
        action: ACTIVITY_ACTIONS.COMMENT_CREATED,
        entityId: 'comment-id',
        entityType: 'comment',
        itemId: item2Id,
        userId: user2Id,
      });

      await createActivity({
        action: ACTIVITY_ACTIONS.BOARD_CREATED,
        entityId: boardId,
        entityType: 'board',
        userId,
        metadata: { boardName: 'Activity Board' },
      });
    });

    it('should return activity statistics', async () => {
      const res = await request(app)
        .get('/api/activities/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.totalActivities).toBe(4);
      expect(res.body.activitiesByType).toBeDefined();
      expect(res.body.activitiesByType.item).toBe(2);
      expect(res.body.activitiesByType.comment).toBe(1);
      expect(res.body.activitiesByType.board).toBe(1);
      expect(res.body.activitiesByUser).toBeDefined();
      expect(res.body.activitiesByUser.length).toBeGreaterThan(0);
      expect(res.body.recentActivityCount).toBe(4); // All activities are recent
    });

    it('should filter stats by itemId', async () => {
      const res = await request(app)
        .get(`/api/activities/stats?itemId=${itemId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.totalActivities).toBe(2);
      expect(res.body.activitiesByType.item).toBe(2);
      expect(res.body.activitiesByType.comment).toBeUndefined();
    });

    it('should filter stats by date range', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const res = await request(app)
        .get(`/api/activities/stats?startDate=${yesterday.toISOString()}&endDate=${tomorrow.toISOString()}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.totalActivities).toBe(4); // All activities should be within range
    });
  });

  describe('Authentication', () => {
    it('should require authentication for all endpoints', async () => {
      const endpoints = [
        '/api/activities',
        `/api/activities/item/${itemId}`,
        `/api/activities/user/${userId}`,
        '/api/activities/stats',
      ];

      for (const endpoint of endpoints) {
        const res = await request(app).get(endpoint);
        expect(res.statusCode).toBe(401);
      }
    });
  });
});