import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as itemService from '../itemService.js';
import { Priority, Status, Role } from '../../models/types.js';
import { query, transaction } from '../../db/client.js';
import { generateId } from '../../utils/id.js';
import * as workspaceService from '../workspaceService.js';

// Mock dependencies
vi.mock('../../db/client.js');
vi.mock('../../utils/id.js');
vi.mock('../workspaceService.js');

const mockQuery = vi.mocked(query);
const mockTransaction = vi.mocked(transaction);
const mockGenerateId = vi.mocked(generateId);
const mockIsWorkspaceMember = vi.mocked(workspaceService.isWorkspaceMember);

describe('ItemService', () => {
  const mockUserId = 'user-123';
  const mockBoardId = 'board-123';
  const mockWorkspaceId = 'workspace-123';
  const mockColumnId = 'column-123';
  const mockItemId = 'item-123';

  // Helper function to create proper QueryResult objects
  const createQueryResult = (rows: any[], rowCount?: number) => ({
    rows,
    command: 'SELECT' as const,
    rowCount: rowCount ?? rows.length,
    oid: 0,
    fields: []
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateId.mockReturnValue('generated-id');
    mockIsWorkspaceMember.mockResolvedValue({ isMember: true, role: Role.MEMBER });
    
    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes('SELECT workspace_id FROM boards')) {
        return Promise.resolve(createQueryResult([{ workspace_id: mockWorkspaceId }]));
      }
      if (sql.includes('SELECT board_id FROM board_columns')) {
        return Promise.resolve(createQueryResult([{ board_id: mockBoardId }]));
      }
      return Promise.resolve(createQueryResult([]));
    });
  });

  describe('validateItemData', () => {
    it('should validate valid item data', () => {
      const validData: itemService.CreateItemData = {
        title: 'Valid Title',
        description: 'Valid description',
        columnId: mockColumnId,
        priority: Priority.MEDIUM,
        status: Status.TODO
      };

      const result = itemService.validateItemData(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for invalid data', () => {
      const invalidData: itemService.CreateItemData = {
        title: '',
        columnId: mockColumnId,
        priority: 'INVALID' as Priority,
        order: -1
      };

      const result = itemService.validateItemData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('getItemById', () => {
    it('should return null if item not found', async () => {
      mockQuery.mockResolvedValueOnce(createQueryResult([]));

      const result = await itemService.getItemById(mockItemId, mockUserId);

      expect(result).toBeNull();
    });

    it('should return item if found', async () => {
      const mockItem = {
        id: mockItemId,
        title: 'Test Item',
        description: 'Test Description',
        order: 0,
        board_id: mockBoardId,
        column_id: mockColumnId,
        due_date: null,
        priority: Priority.MEDIUM,
        status: Status.TODO,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockQuery.mockResolvedValueOnce(createQueryResult([mockItem]));

      const result = await itemService.getItemById(mockItemId, mockUserId);

      expect(result?.title).toBe('Test Item');
      expect(result?.fieldValues).toEqual({});
    });
  });

  describe('searchItems', () => {
    it('should search items by title and description', async () => {
      const searchTerm = 'test';
      const mockItems = [{
        id: 'item-1',
        title: 'Test Item 1',
        description: 'Description 1',
        order: 0,
        board_id: mockBoardId,
        column_id: mockColumnId,
        due_date: null,
        priority: Priority.MEDIUM,
        status: Status.TODO,
        created_at: new Date(),
        updated_at: new Date()
      }];

      mockQuery
        .mockResolvedValueOnce(createQueryResult([{ workspace_id: mockWorkspaceId }]))
        .mockResolvedValueOnce(createQueryResult(mockItems));

      const result = await itemService.searchItems(mockBoardId, searchTerm, mockUserId);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Test Item 1');
    });
  });

  describe('access control', () => {
    it('should throw error if user lacks board access', async () => {
      mockIsWorkspaceMember.mockResolvedValue({ isMember: false, role: undefined });

      await expect(
        itemService.getItemById(mockItemId, mockUserId)
      ).rejects.toThrow('User does not have access to this board');
    });
  });
});