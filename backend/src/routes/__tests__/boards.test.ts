import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import boardRoutes from '../boards.js';

// Mock the authentication middleware
vi.mock('../../middleware/auth.js', () => ({
  authenticateToken: (req: any, _res: any, next: any) => {
    req.user = { id: 'test-user-id' };
    next();
  }
}));

// Mock the board service
vi.mock('../../services/boardService.js', () => ({
  getBoardsForWorkspace: vi.fn(),
  createBoard: vi.fn(),
  getBoardById: vi.fn(),
  updateBoard: vi.fn(),
  deleteBoard: vi.fn(),
  getColumnsForBoard: vi.fn(),
  createColumn: vi.fn(),
  updateColumn: vi.fn(),
  deleteColumn: vi.fn(),
  reorderColumns: vi.fn(),
  validateColumnData: vi.fn()
}));

// Mock the item service
vi.mock('../../services/itemService.js', () => ({
  getItemsForBoard: vi.fn(),
  createItem: vi.fn(),
  getItemById: vi.fn(),
  updateItem: vi.fn(),
  deleteItem: vi.fn(),
  reorderItems: vi.fn(),
  moveItemToColumn: vi.fn(),
  bulkUpdateItems: vi.fn(),
  searchItems: vi.fn(),
  filterItems: vi.fn(),
  validateItemData: vi.fn()
}));

const app = express();
app.use(express.json());
app.use('/api/boards', boardRoutes);

describe('Board Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/boards/workspaces/:workspaceId/boards', () => {
    it('should get boards for workspace', async () => {
      const mockBoards = [
        {
          id: 'board-1',
          name: 'Test Board',
          workspaceId: 'workspace-1',
          columns: [],
          items: []
        }
      ];

      const { getBoardsForWorkspace } = require('../../services/boardService.js');
      getBoardsForWorkspace.mockResolvedValue(mockBoards);

      const response = await request(app)
        .get('/api/boards/workspaces/workspace-1/boards')
        .expect(200);

      expect(response.body).toEqual(mockBoards);
      expect(getBoardsForWorkspace).toHaveBeenCalledWith('workspace-1', 'test-user-id');
    });

    it('should handle access errors', async () => {
      const { getBoardsForWorkspace } = require('../../services/boardService.js');
      getBoardsForWorkspace.mockRejectedValue(new Error('User does not have access to this workspace'));

      const response = await request(app)
        .get('/api/boards/workspaces/workspace-1/boards')
        .expect(403);

      expect(response.body.error).toBe('User does not have access to this workspace');
    });
  });

  describe('POST /api/boards/workspaces/:workspaceId/boards', () => {
    it('should create a new board', async () => {
      const mockBoard = {
        id: 'board-1',
        name: 'New Board',
        workspaceId: 'workspace-1',
        columns: [],
        items: []
      };

      const { createBoard } = require('../../services/boardService.js');
      createBoard.mockResolvedValue(mockBoard);

      const response = await request(app)
        .post('/api/boards/workspaces/workspace-1/boards')
        .send({ name: 'New Board', description: 'Test description' })
        .expect(201);

      expect(response.body).toEqual(mockBoard);
      expect(createBoard).toHaveBeenCalledWith({
        name: 'New Board',
        description: 'Test description',
        workspaceId: 'workspace-1'
      }, 'test-user-id');
    });

    it('should validate board name', async () => {
      const response = await request(app)
        .post('/api/boards/workspaces/workspace-1/boards')
        .send({ name: '' })
        .expect(400);

      expect(response.body.error).toBe('Board name is required');
    });
  });

  describe('GET /api/boards/:id', () => {
    it('should get board by id', async () => {
      const mockBoard = {
        id: 'board-1',
        name: 'Test Board',
        workspaceId: 'workspace-1',
        columns: [],
        items: []
      };

      const { getBoardById } = require('../../services/boardService.js');
      getBoardById.mockResolvedValue(mockBoard);

      const response = await request(app)
        .get('/api/boards/board-1')
        .expect(200);

      expect(response.body).toEqual(mockBoard);
      expect(getBoardById).toHaveBeenCalledWith('board-1', 'test-user-id');
    });

    it('should return 404 for non-existent board', async () => {
      const { getBoardById } = require('../../services/boardService.js');
      getBoardById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/boards/non-existent')
        .expect(404);

      expect(response.body.error).toBe('Board not found');
    });
  });

  describe('GET /api/boards/:boardId/items', () => {
    it('should get items for board', async () => {
      const mockItems = [
        {
          id: 'item-1',
          title: 'Test Item',
          boardId: 'board-1',
          columnId: 'column-1'
        }
      ];

      const { getItemsForBoard } = require('../../services/itemService.js');
      getItemsForBoard.mockResolvedValue(mockItems);

      const response = await request(app)
        .get('/api/boards/board-1/items')
        .expect(200);

      expect(response.body).toEqual(mockItems);
      expect(getItemsForBoard).toHaveBeenCalledWith('board-1', 'test-user-id');
    });

    it('should search items when search query provided', async () => {
      const mockItems = [
        {
          id: 'item-1',
          title: 'Matching Item',
          boardId: 'board-1',
          columnId: 'column-1'
        }
      ];

      const { searchItems } = require('../../services/itemService.js');
      searchItems.mockResolvedValue(mockItems);

      const response = await request(app)
        .get('/api/boards/board-1/items?search=matching')
        .expect(200);

      expect(response.body).toEqual(mockItems);
      expect(searchItems).toHaveBeenCalledWith('board-1', 'matching', 'test-user-id');
    });
  });

  describe('POST /api/boards/:boardId/items', () => {
    it('should create a new item', async () => {
      const mockItem = {
        id: 'item-1',
        title: 'New Item',
        boardId: 'board-1',
        columnId: 'column-1'
      };

      const { createItem, validateItemData } = require('../../services/itemService.js');
      validateItemData.mockReturnValue({ isValid: true, errors: [] });
      createItem.mockResolvedValue(mockItem);

      const response = await request(app)
        .post('/api/boards/board-1/items')
        .send({ title: 'New Item', columnId: 'column-1' })
        .expect(201);

      expect(response.body).toEqual(mockItem);
      expect(createItem).toHaveBeenCalledWith('board-1', {
        title: 'New Item',
        columnId: 'column-1'
      }, 'test-user-id');
    });

    it('should validate item data', async () => {
      const { validateItemData } = require('../../services/itemService.js');
      validateItemData.mockReturnValue({ 
        isValid: false, 
        errors: ['Item title is required'] 
      });

      const response = await request(app)
        .post('/api/boards/board-1/items')
        .send({ columnId: 'column-1' })
        .expect(400);

      expect(response.body.error).toBe('Item title is required');
    });

    it('should require columnId', async () => {
      const { validateItemData } = require('../../services/itemService.js');
      validateItemData.mockReturnValue({ isValid: true, errors: [] });

      const response = await request(app)
        .post('/api/boards/board-1/items')
        .send({ title: 'New Item' })
        .expect(400);

      expect(response.body.error).toBe('columnId is required');
    });
  });
});