import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import prisma from '../../db/prisma.js';
import {
  createActivity,
  getActivities,
  getItemActivities,
  getUserActivities,
  formatActivityMessage,
  getActivityCategory,
  getActivityStats,
  cleanupOldActivities,
  ACTIVITY_ACTIONS,
  ACTIVITY_CATEGORIES,
} from '../activityService.js';

describe('ActivityService', () => {
  let testUser1: any;
  let testUser2: any;
  let testWorkspace: any;
  let testBoard: any;
  let testColumn: any;
  let testItem1: any;
  let testItem2: any;

  beforeAll(async () => {
    // Create test users
    testUser1 = await prisma.user.create({
      data: {
        email: 'activity1@test.com',
        password: 'hashedpassword',
        firstName: 'Alice',
        lastName: 'Johnson',
      },
    });

    testUser2 = await prisma.user.create({
      data: {
        email: 'activity2@test.com',
        password: 'hashedpassword',
        firstName: 'Bob',
        lastName: 'Smith',
      },
    });

    // Create test workspace and board structure
    testWorkspace = await prisma.workspace.create({
      data: {
        name: 'Activity Test Workspace',
        ownerId: testUser1.id,
      },
    });

    testBoard = await prisma.board.create({
      data: {
        name: 'Activity Test Board',
        workspaceId: testWorkspace.id,
      },
    });

    testColumn = await prisma.boardColumn.create({
      data: {
        name: 'Test Column',
        boardId: testBoard.id,
        order: 0,
      },
    });

    testItem1 = await prisma.boardItem.create({
      data: {
        title: 'Test Item 1',
        boardId: testBoard.id,
        columnId: testColumn.id,
        order: 0,
      },
    });

    testItem2 = await prisma.boardItem.create({
      data: {
        title: 'Test Item 2',
        boardId: testBoard.id,
        columnId: testColumn.id,
        order: 1,
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.activityLog.deleteMany();
    await prisma.boardItem.deleteMany();
    await prisma.boardColumn.deleteMany();
    await prisma.board.deleteMany();
    await prisma.workspace.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up activities before each test
    await prisma.activityLog.deleteMany();
  });

  describe('createActivity', () => {
    it('should create a basic activity log entry', async () => {
      const activityData = {
        action: ACTIVITY_ACTIONS.ITEM_CREATED,
        entityId: testItem1.id,
        entityType: 'item',
        itemId: testItem1.id,
        userId: testUser1.id,
        metadata: { title: 'Test Item 1' },
      };

      const activity = await createActivity(activityData);

      expect(activity).toBeDefined();
      expect(activity.action).toBe(ACTIVITY_ACTIONS.ITEM_CREATED);
      expect(activity.entityId).toBe(testItem1.id);
      expect(activity.entityType).toBe('item');
      expect(activity.itemId).toBe(testItem1.id);
      expect(activity.userId).toBe(testUser1.id);
      expect(activity.metadata).toEqual({ title: 'Test Item 1' });
      expect(activity.user).toBeDefined();
      expect(activity.user.firstName).toBe('Alice');
      expect(activity.item).toBeDefined();
      expect(activity.item!.title).toBe('Test Item 1');
    });

    it('should create activity without itemId', async () => {
      const activityData = {
        action: ACTIVITY_ACTIONS.BOARD_CREATED,
        entityId: testBoard.id,
        entityType: 'board',
        userId: testUser1.id,
        metadata: { boardName: 'Activity Test Board' },
      };

      const activity = await createActivity(activityData);

      expect(activity.itemId).toBeNull();
      expect(activity.action).toBe(ACTIVITY_ACTIONS.BOARD_CREATED);
      expect(activity.entityType).toBe('board');
    });
  });

  describe('getActivities', () => {
    beforeEach(async () => {
      // Create test activities
      await createActivity({
        action: ACTIVITY_ACTIONS.ITEM_CREATED,
        entityId: testItem1.id,
        entityType: 'item',
        itemId: testItem1.id,
        userId: testUser1.id,
      });

      await createActivity({
        action: ACTIVITY_ACTIONS.ITEM_UPDATED,
        entityId: testItem1.id,
        entityType: 'item',
        itemId: testItem1.id,
        userId: testUser2.id,
      });

      await createActivity({
        action: ACTIVITY_ACTIONS.COMMENT_CREATED,
        entityId: 'comment-id',
        entityType: 'comment',
        itemId: testItem2.id,
        userId: testUser1.id,
      });
    });

    it('should get all activities with default pagination', async () => {
      const result = await getActivities();

      expect(result.activities.length).toBe(3);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
      expect(result.pagination.total).toBe(3);
      expect(result.pagination.totalPages).toBe(1);
      expect(result.pagination.hasNext).toBe(false);
      expect(result.pagination.hasPrev).toBe(false);
    });

    it('should filter activities by itemId', async () => {
      const result = await getActivities({ itemId: testItem1.id });

      expect(result.activities.length).toBe(2);
      result.activities.forEach(activity => {
        expect(activity.itemId).toBe(testItem1.id);
      });
    });

    it('should filter activities by userId', async () => {
      const result = await getActivities({ userId: testUser1.id });

      expect(result.activities.length).toBe(2);
      result.activities.forEach(activity => {
        expect(activity.userId).toBe(testUser1.id);
      });
    });

    it('should filter activities by entityType', async () => {
      const result = await getActivities({ entityType: 'item' });

      expect(result.activities.length).toBe(2);
      result.activities.forEach(activity => {
        expect(activity.entityType).toBe('item');
      });
    });

    it('should filter activities by action', async () => {
      const result = await getActivities({ action: ACTIVITY_ACTIONS.ITEM_CREATED });

      expect(result.activities.length).toBe(1);
      expect(result.activities[0].action).toBe(ACTIVITY_ACTIONS.ITEM_CREATED);
    });

    it('should paginate activities correctly', async () => {
      const result = await getActivities({}, { page: 1, limit: 2 });

      expect(result.activities.length).toBe(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(2);
      expect(result.pagination.total).toBe(3);
      expect(result.pagination.totalPages).toBe(2);
      expect(result.pagination.hasNext).toBe(true);
      expect(result.pagination.hasPrev).toBe(false);
    });

    it('should sort activities by createdAt desc by default', async () => {
      const result = await getActivities();

      // Activities should be sorted by newest first
      for (let i = 0; i < result.activities.length - 1; i++) {
        const current = new Date(result.activities[i].createdAt);
        const next = new Date(result.activities[i + 1].createdAt);
        expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
      }
    });
  });

  describe('getItemActivities', () => {
    it('should get activities for a specific item', async () => {
      await createActivity({
        action: ACTIVITY_ACTIONS.ITEM_CREATED,
        entityId: testItem1.id,
        entityType: 'item',
        itemId: testItem1.id,
        userId: testUser1.id,
      });

      const result = await getItemActivities(testItem1.id);

      expect(result.activities.length).toBe(1);
      expect(result.activities[0].itemId).toBe(testItem1.id);
    });
  });

  describe('getUserActivities', () => {
    it('should get activities for a specific user', async () => {
      await createActivity({
        action: ACTIVITY_ACTIONS.ITEM_CREATED,
        entityId: testItem1.id,
        entityType: 'item',
        itemId: testItem1.id,
        userId: testUser1.id,
      });

      const result = await getUserActivities(testUser1.id);

      expect(result.activities.length).toBe(1);
      expect(result.activities[0].userId).toBe(testUser1.id);
    });
  });

  describe('formatActivityMessage', () => {
    it('should format item created message', async () => {
      const activity = await createActivity({
        action: ACTIVITY_ACTIONS.ITEM_CREATED,
        entityId: testItem1.id,
        entityType: 'item',
        itemId: testItem1.id,
        userId: testUser1.id,
      });

      const message = formatActivityMessage(activity);
      expect(message).toBe('Alice Johnson created item "Test Item 1"');
    });

    it('should format item moved message', async () => {
      const activity = await createActivity({
        action: ACTIVITY_ACTIONS.ITEM_MOVED,
        entityId: testItem1.id,
        entityType: 'item',
        itemId: testItem1.id,
        userId: testUser1.id,
        metadata: {
          fromColumn: 'To Do',
          toColumn: 'In Progress',
        },
      });

      const message = formatActivityMessage(activity);
      expect(message).toBe('Alice Johnson moved "Test Item 1" from To Do to In Progress');
    });

    it('should format comment created message', async () => {
      const activity = await createActivity({
        action: ACTIVITY_ACTIONS.COMMENT_CREATED,
        entityId: 'comment-id',
        entityType: 'comment',
        itemId: testItem1.id,
        userId: testUser2.id,
      });

      const message = formatActivityMessage(activity);
      expect(message).toBe('Bob Smith added a comment to "Test Item 1"');
    });

    it('should use email when name is not available', async () => {
      // Create user without first/last name
      const userWithoutName = await prisma.user.create({
        data: {
          email: 'noname@test.com',
          password: 'hashedpassword',
        },
      });

      const activity = await createActivity({
        action: ACTIVITY_ACTIONS.ITEM_CREATED,
        entityId: testItem1.id,
        entityType: 'item',
        itemId: testItem1.id,
        userId: userWithoutName.id,
      });

      const message = formatActivityMessage(activity);
      expect(message).toBe('noname@test.com created item "Test Item 1"');

      // Clean up
      await prisma.user.delete({ where: { id: userWithoutName.id } });
    });
  });

  describe('getActivityCategory', () => {
    it('should categorize item actions', () => {
      expect(getActivityCategory(ACTIVITY_ACTIONS.ITEM_CREATED)).toBe(ACTIVITY_CATEGORIES.ITEM);
      expect(getActivityCategory(ACTIVITY_ACTIONS.ITEM_UPDATED)).toBe(ACTIVITY_CATEGORIES.ITEM);
      expect(getActivityCategory(ACTIVITY_ACTIONS.ITEM_DELETED)).toBe(ACTIVITY_CATEGORIES.ITEM);
    });

    it('should categorize comment actions', () => {
      expect(getActivityCategory(ACTIVITY_ACTIONS.COMMENT_CREATED)).toBe(ACTIVITY_CATEGORIES.COMMENT);
      expect(getActivityCategory(ACTIVITY_ACTIONS.COMMENT_UPDATED)).toBe(ACTIVITY_CATEGORIES.COMMENT);
    });

    it('should categorize board actions', () => {
      expect(getActivityCategory(ACTIVITY_ACTIONS.BOARD_CREATED)).toBe(ACTIVITY_CATEGORIES.BOARD);
      expect(getActivityCategory(ACTIVITY_ACTIONS.COLUMN_CREATED)).toBe(ACTIVITY_CATEGORIES.BOARD);
    });

    it('should categorize workspace actions', () => {
      expect(getActivityCategory(ACTIVITY_ACTIONS.WORKSPACE_CREATED)).toBe(ACTIVITY_CATEGORIES.WORKSPACE);
    });

    it('should return other for unknown actions', () => {
      expect(getActivityCategory('unknown_action')).toBe('other');
    });
  });

  describe('getActivityStats', () => {
    beforeEach(async () => {
      // Create diverse activities for stats
      await createActivity({
        action: ACTIVITY_ACTIONS.ITEM_CREATED,
        entityId: testItem1.id,
        entityType: 'item',
        itemId: testItem1.id,
        userId: testUser1.id,
      });

      await createActivity({
        action: ACTIVITY_ACTIONS.ITEM_UPDATED,
        entityId: testItem1.id,
        entityType: 'item',
        itemId: testItem1.id,
        userId: testUser1.id,
      });

      await createActivity({
        action: ACTIVITY_ACTIONS.COMMENT_CREATED,
        entityId: 'comment-id',
        entityType: 'comment',
        itemId: testItem2.id,
        userId: testUser2.id,
      });
    });

    it('should return activity statistics', async () => {
      const stats = await getActivityStats();

      expect(stats.totalActivities).toBe(3);
      expect(stats.activitiesByType).toHaveProperty('item', 2);
      expect(stats.activitiesByType).toHaveProperty('comment', 1);
      expect(stats.activitiesByUser.length).toBe(2);
      expect(stats.recentActivityCount).toBe(3); // All activities are recent
    });

    it('should filter stats by itemId', async () => {
      const stats = await getActivityStats({ itemId: testItem1.id });

      expect(stats.totalActivities).toBe(2);
      expect(stats.activitiesByType).toHaveProperty('item', 2);
      expect(stats.activitiesByType).not.toHaveProperty('comment');
    });
  });

  describe('cleanupOldActivities', () => {
    it('should delete old activities', async () => {
      // Create an activity
      await createActivity({
        action: ACTIVITY_ACTIONS.ITEM_CREATED,
        entityId: testItem1.id,
        entityType: 'item',
        itemId: testItem1.id,
        userId: testUser1.id,
      });

      // Manually update the created date to be old
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 100); // 100 days ago

      await prisma.activityLog.updateMany({
        data: { createdAt: oldDate },
      });

      const deletedCount = await cleanupOldActivities(90);

      expect(deletedCount).toBe(1);

      // Verify activity was deleted
      const remainingActivities = await prisma.activityLog.findMany();
      expect(remainingActivities.length).toBe(0);
    });

    it('should not delete recent activities', async () => {
      await createActivity({
        action: ACTIVITY_ACTIONS.ITEM_CREATED,
        entityId: testItem1.id,
        entityType: 'item',
        itemId: testItem1.id,
        userId: testUser1.id,
      });

      const deletedCount = await cleanupOldActivities(90);

      expect(deletedCount).toBe(0);

      // Verify activity still exists
      const remainingActivities = await prisma.activityLog.findMany();
      expect(remainingActivities.length).toBe(1);
    });
  });
});