import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
  createBoard, 
  getBoardById, 
  getBoardsForWorkspace,
  updateBoard, 
  deleteBoard
} from '../boardService.js';
import { createWorkspace } from '../workspaceService.js';
import { userService } from '../userService.js';
import { setupDatabase, cleanupTestData } from '../../db/setup.js';

describe('Board Service', () => {
  let testUserId: string;
  let testWorkspaceId: string;
  let otherUserId: string;
  let otherWorkspaceId: string;

  beforeEach(async () => {
    // Set up database schema
    await setupDatabase();
    
    // Clean up any existing test data
    await cleanupTestData();
    
    // Create test users
    const testUser = await userService.createUser({
      email: 'test@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User'
    });
    testUserId = testUser.id;

    const otherUser = await userService.createUser({
      email: 'other@example.com',
      password: 'password123',
      firstName: 'Other',
      lastName: 'User'
    });
    otherUserId = otherUser.id;

    // Create test workspaces
    const testWorkspace = await createWorkspace({
      name: 'Test Workspace',
      description: 'A test workspace',
      ownerId: testUserId
    });
    testWorkspaceId = testWorkspace.id;

    const otherWorkspace = await createWorkspace({
      name: 'Other Workspace',
      description: 'Another workspace',
      ownerId: otherUserId
    });
    otherWorkspaceId = otherWorkspace.id;
  });

  afterEach(async () => {
    // Clean up test data
    await cleanupTestData();
  });

  describe('createBoard', () => {
    it('should create a board with default columns', async () => {
      const boardData = {
        name: 'Test Board',
        description: 'A test board',
        icon: '📋',
        workspaceId: testWorkspaceId
      };

      const board = await createBoard(boardData, testUserId);

      expect(board).toBeDefined();
      expect(board.name).toBe('Test Board');
      expect(board.description).toBe('A test board');
      expect(board.icon).toBe('📋');
      expect(board.workspaceId).toBe(testWorkspaceId);
      expect(board.columns).toHaveLength(4);
      expect(board.items).toHaveLength(0);

      // Check default columns
      const columnNames = board.columns.map(c => c.name);
      expect(columnNames).toEqual(['To Do', 'In Progress', 'Review', 'Done']);
      
      // Check column order
      board.columns.forEach((column, index) => {
        expect(column.order).toBe(index);
      });
    });

    it('should create a board with minimal data', async () => {
      const boardData = {
        name: 'Minimal Board',
        workspaceId: testWorkspaceId
      };

      const board = await createBoard(boardData, testUserId);

      expect(board).toBeDefined();
      expect(board.name).toBe('Minimal Board');
      expect(board.description).toBeNull();
      expect(board.icon).toBeNull();
      expect(board.columns).toHaveLength(4);
    });

    it('should throw error when user does not have workspace access', async () => {
      const boardData = {
        name: 'Unauthorized Board',
        workspaceId: otherWorkspaceId
      };

      await expect(createBoard(boardData, testUserId))
        .rejects.toThrow('User does not have access to this workspace');
    });

    it('should throw error for non-existent workspace', async () => {
      const boardData = {
        name: 'Invalid Board',
        workspaceId: 'non-existent-id'
      };

      await expect(createBoard(boardData, testUserId))
        .rejects.toThrow('User does not have access to this workspace');
    });
  });

  describe('getBoardById', () => {
    let testBoardId: string;

    beforeEach(async () => {
      const board = await createBoard({
        name: 'Test Board',
        description: 'A test board',
        workspaceId: testWorkspaceId
      }, testUserId);
      testBoardId = board.id;
    });

    it('should retrieve a board with columns and items', async () => {
      const board = await getBoardById(testBoardId, testUserId);

      expect(board).toBeDefined();
      expect(board!.name).toBe('Test Board');
      expect(board!.description).toBe('A test board');
      expect(board!.columns).toHaveLength(4);
      expect(board!.items).toHaveLength(0);
    });

    it('should return null for non-existent board', async () => {
      const board = await getBoardById('non-existent-id', testUserId);
      expect(board).toBeNull();
    });

    it('should throw error when user does not have workspace access', async () => {
      await expect(getBoardById(testBoardId, otherUserId))
        .rejects.toThrow('User does not have access to this workspace');
    });
  });

  describe('getBoardsForWorkspace', () => {
    beforeEach(async () => {
      // Create multiple boards
      await createBoard({
        name: 'Board 1',
        description: 'First board',
        workspaceId: testWorkspaceId
      }, testUserId);

      await createBoard({
        name: 'Board 2',
        description: 'Second board',
        workspaceId: testWorkspaceId
      }, testUserId);
    });

    it('should retrieve all boards for a workspace', async () => {
      const boards = await getBoardsForWorkspace(testWorkspaceId, testUserId);

      expect(boards).toHaveLength(2);
      expect(boards[0].name).toBe('Board 2'); // Most recent first
      expect(boards[1].name).toBe('Board 1');
      
      // Each board should have default columns
      boards.forEach(board => {
        expect(board.columns).toHaveLength(4);
      });
    });

    it('should return empty array for workspace with no boards', async () => {
      const boards = await getBoardsForWorkspace(otherWorkspaceId, otherUserId);
      expect(boards).toHaveLength(0);
    });

    it('should throw error when user does not have workspace access', async () => {
      await expect(getBoardsForWorkspace(testWorkspaceId, otherUserId))
        .rejects.toThrow('User does not have access to this workspace');
    });
  });

  describe('updateBoard', () => {
    let testBoardId: string;

    beforeEach(async () => {
      const board = await createBoard({
        name: 'Test Board',
        description: 'A test board',
        icon: '📋',
        workspaceId: testWorkspaceId
      }, testUserId);
      testBoardId = board.id;
    });

    it('should update board name', async () => {
      const updateData = {
        name: 'Updated Board Name'
      };

      const updatedBoard = await updateBoard(testBoardId, updateData, testUserId);

      expect(updatedBoard).toBeDefined();
      expect(updatedBoard!.name).toBe('Updated Board Name');
      expect(updatedBoard!.description).toBe('A test board'); // Unchanged
      expect(updatedBoard!.icon).toBe('📋'); // Unchanged
    });

    it('should update board description', async () => {
      const updateData = {
        description: 'Updated description'
      };

      const updatedBoard = await updateBoard(testBoardId, updateData, testUserId);

      expect(updatedBoard).toBeDefined();
      expect(updatedBoard!.description).toBe('Updated description');
      expect(updatedBoard!.name).toBe('Test Board'); // Unchanged
    });

    it('should update board icon', async () => {
      const updateData = {
        icon: '🚀'
      };

      const updatedBoard = await updateBoard(testBoardId, updateData, testUserId);

      expect(updatedBoard).toBeDefined();
      expect(updatedBoard!.icon).toBe('🚀');
    });

    it('should update multiple fields', async () => {
      const updateData = {
        name: 'New Name',
        description: 'New description',
        icon: '⭐'
      };

      const updatedBoard = await updateBoard(testBoardId, updateData, testUserId);

      expect(updatedBoard).toBeDefined();
      expect(updatedBoard!.name).toBe('New Name');
      expect(updatedBoard!.description).toBe('New description');
      expect(updatedBoard!.icon).toBe('⭐');
    });

    it('should handle empty update data', async () => {
      const updateData = {};

      const updatedBoard = await updateBoard(testBoardId, updateData, testUserId);

      expect(updatedBoard).toBeDefined();
      expect(updatedBoard!.name).toBe('Test Board'); // Unchanged
    });

    it('should return null for non-existent board', async () => {
      const updateData = {
        name: 'Updated Name'
      };

      const result = await updateBoard('non-existent-id', updateData, testUserId);
      expect(result).toBeNull();
    });

    it('should throw error when user does not have workspace access', async () => {
      const updateData: UpdateBoardData = {
        name: 'Updated Name'
      };

      await expect(updateBoard(testBoardId, updateData, otherUserId))
        .rejects.toThrow('User does not have access to this workspace');
    });
  });

  describe('deleteBoard', () => {
    let testBoardId: string;

    beforeEach(async () => {
      const board = await createBoard({
        name: 'Test Board',
        workspaceId: testWorkspaceId
      }, testUserId);
      testBoardId = board.id;
    });

    it('should delete a board', async () => {
      const result = await deleteBoard(testBoardId, testUserId);
      expect(result).toBe(true);

      // Verify board is deleted
      const board = await getBoardById(testBoardId, testUserId);
      expect(board).toBeNull();
    });

    it('should return false for non-existent board', async () => {
      const result = await deleteBoard('non-existent-id', testUserId);
      expect(result).toBe(false);
    });

    it('should throw error when user does not have workspace access', async () => {
      await expect(deleteBoard(testBoardId, otherUserId))
        .rejects.toThrow('User does not have access to this workspace');
    });
  });
});