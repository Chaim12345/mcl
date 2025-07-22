import { jest } from '@jest/globals';
import { 
  saveView,
  getSavedViews,
  getDefaultView,
  deleteView,
  shareView,
  setDefaultView,
  setViewPermission,
  getViewPermissions,
  copyView,
  createViewTemplate,
  getViewTemplates,
  createViewFromTemplate,
  deleteViewTemplate,
  applySorting,
  validateView,
  ViewPermissionLevel
} from '../viewService.js';
import { query, transaction } from '../../db/client.js';
import { validateBoardAccess } from '../boardService.js';
import { LogicalOperator, FilterOperator } from '../filterService.js';
import { Status } from '../../models/types.js';
import { generateId } from '../../utils/id.js';

// Mock dependencies
jest.mock('../../db/client.js');
jest.mock('../boardService.js');
jest.mock('../../utils/id.js');

const mockQuery = query as jest.MockedFunction<typeof query>;
const mockTransaction = transaction as jest.MockedFunction<typeof transaction>;
const mockValidateBoardAccess = validateBoardAccess as jest.MockedFunction<typeof validateBoardAccess>;
const mockGenerateId = generateId as jest.MockedFunction<typeof generateId>;

describe('viewService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGenerateId.mockReturnValue('generated-id');
    mockTransaction.mockImplementation(async (callback) => {
      return callback(mockQuery);
    });
  });

  describe('saveView', () => {
    it('should save a new view with enhanced properties', async () => {
      // Mock data
      const boardId = 'board-123';
      const userId = 'user-123';
      const viewDef = {
        name: 'My View',
        boardId,
        filter: {
          operator: LogicalOperator.AND,
          conditions: [
            {
              field: 'status',
              operator: FilterOperator.EQUALS,
              value: Status.IN_PROGRESS
            }
          ]
        },
        sorts: [
          { field: 'priority', direction: 'DESC' as const }
        ],
        isDefault: true,
        columnsConfig: {
          visibleColumns: ['col1', 'col2'],
          columnWidths: { col1: 100, col2: 200 },
          columnOrder: ['col1', 'col2']
        },
        layoutConfig: {
          type: 'table',
          rowHeight: 'medium'
        },
        icon: 'filter',
        color: '#ff0000',
        createdBy: userId
      };

      // Mock query responses
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'view-123',
          name: 'My View',
          board_id: boardId,
          filter_json: JSON.stringify(viewDef.filter),
          sort_json: JSON.stringify(viewDef.sorts),
          columns_config: JSON.stringify(viewDef.columnsConfig),
          layout_config: JSON.stringify(viewDef.layoutConfig),
          team_access: null,
          is_default: true,
          is_shared: false,
          is_global: false,
          is_template: false,
          icon: 'filter',
          color: '#ff0000',
          created_by: userId,
          created_at: new Date(),
          updated_at: new Date()
        }],
        rowCount: 1
      });

      // Call the function
      const result = await saveView(viewDef, userId);

      // Assertions
      expect(mockValidateBoardAccess).toHaveBeenCalledWith(boardId, userId);
      expect(mockQuery).toHaveBeenCalledTimes(2); // One for unset default, one for insert
      expect(result.id).toBe('view-123');
      expect(result.name).toBe('My View');
      expect(result.isDefault).toBe(true);
      expect(result.filter).toEqual(viewDef.filter);
      expect(result.sorts).toEqual(viewDef.sorts);
      expect(result.columnsConfig).toEqual(viewDef.columnsConfig);
      expect(result.layoutConfig).toEqual(viewDef.layoutConfig);
      expect(result.icon).toBe('filter');
      expect(result.color).toBe('#ff0000');
    });
  });

  describe('getSavedViews', () => {
    it('should get all saved views for a board with options', async () => {
      // Mock data
      const boardId = 'board-123';
      const userId = 'user-123';
      const options = {
        includeShared: true,
        includeGlobal: true,
        includeTemplates: false
      };

      // Mock query response
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'view-1',
            name: 'My View 1',
            board_id: boardId,
            filter_json: JSON.stringify({
              operator: LogicalOperator.AND,
              conditions: []
            }),
            sort_json: null,
            columns_config: null,
            layout_config: null,
            team_access: null,
            is_default: true,
            is_shared: false,
            is_global: false,
            is_template: false,
            icon: null,
            color: null,
            created_by: userId,
            created_at: new Date(),
            updated_at: new Date(),
            permission_level: 'manage'
          },
          {
            id: 'view-2',
            name: 'Shared View',
            board_id: boardId,
            filter_json: null,
            sort_json: JSON.stringify([
              { field: 'priority', direction: 'DESC' }
            ]),
            columns_config: null,
            layout_config: null,
            team_access: null,
            is_default: false,
            is_shared: true,
            is_global: false,
            is_template: false,
            icon: null,
            color: null,
            created_by: 'other-user',
            created_at: new Date(),
            updated_at: new Date(),
            permission_level: 'view'
          }
        ],
        rowCount: 2
      });

      // Call the function
      const result = await getSavedViews(boardId, userId, options);

      // Assertions
      expect(mockValidateBoardAccess).toHaveBeenCalledWith(boardId, userId);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE board_id = $1 AND (created_by = $2 OR is_shared = TRUE OR is_global = TRUE) AND (is_template = FALSE OR is_template IS NULL)'),
        [boardId, userId]
      );
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('view-1');
      expect(result[0].isDefault).toBe(true);
      expect(result[1].id).toBe('view-2');
      expect(result[1].isShared).toBe(true);
    });
  });

  describe('getDefaultView', () => {
    it('should get the default view using board_default_views', async () => {
      // Mock data
      const boardId = 'board-123';
      const userId = 'user-123';
      const options = { useGlobal: true };

      // Mock query responses - first for personal default, then global default
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'view-1',
            name: 'Default View',
            board_id: boardId,
            filter_json: JSON.stringify({
              operator: LogicalOperator.AND,
              conditions: []
            }),
            sort_json: null,
            columns_config: null,
            layout_config: null,
            team_access: null,
            is_default: true,
            is_shared: false,
            is_global: false,
            is_template: false,
            icon: null,
            color: null,
            created_by: userId,
            created_at: new Date(),
            updated_at: new Date()
          }
        ],
        rowCount: 1
      });

      // Call the function
      const result = await getDefaultView(boardId, userId, options);

      // Assertions
      expect(mockValidateBoardAccess).toHaveBeenCalledWith(boardId, userId);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('JOIN board_default_views d ON v.id = d.view_id'),
        [boardId, userId]
      );
      expect(result).not.toBeNull();
      expect(result?.id).toBe('view-1');
      expect(result?.name).toBe('Default View');
      expect(result?.isDefault).toBe(true);
    });

    it('should try global default if no personal default exists', async () => {
      // Mock data
      const boardId = 'board-123';
      const userId = 'user-123';

      // Mock query responses - empty for personal default, then global default
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      });
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'view-2',
            name: 'Global Default',
            board_id: boardId,
            filter_json: null,
            sort_json: null,
            columns_config: null,
            layout_config: null,
            team_access: null,
            is_default: true,
            is_shared: false,
            is_global: true,
            is_template: false,
            icon: null,
            color: null,
            created_by: 'admin',
            created_at: new Date(),
            updated_at: new Date()
          }
        ],
        rowCount: 1
      });

      // Call the function
      const result = await getDefaultView(boardId, userId);

      // Assertions
      expect(mockValidateBoardAccess).toHaveBeenCalledWith(boardId, userId);
      expect(mockQuery).toHaveBeenCalledTimes(2);
      expect(result).not.toBeNull();
      expect(result?.id).toBe('view-2');
      expect(result?.name).toBe('Global Default');
      expect(result?.isGlobal).toBe(true);
    });

    it('should fall back to any default view if no specific default exists', async () => {
      // Mock data
      const boardId = 'board-123';
      const userId = 'user-123';

      // Mock query responses - empty for personal and global defaults
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      });
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      });
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'view-3',
            name: 'Any Default',
            board_id: boardId,
            filter_json: null,
            sort_json: null,
            columns_config: null,
            layout_config: null,
            team_access: null,
            is_default: true,
            is_shared: false,
            is_global: false,
            is_template: false,
            icon: null,
            color: null,
            created_by: 'someone',
            created_at: new Date(),
            updated_at: new Date()
          }
        ],
        rowCount: 1
      });

      // Call the function
      const result = await getDefaultView(boardId, userId);

      // Assertions
      expect(mockValidateBoardAccess).toHaveBeenCalledWith(boardId, userId);
      expect(mockQuery).toHaveBeenCalledTimes(3);
      expect(result).not.toBeNull();
      expect(result?.id).toBe('view-3');
      expect(result?.name).toBe('Any Default');
    });
  });

  describe('deleteView', () => {
    it('should delete a view and related records', async () => {
      // Mock data
      const viewId = 'view-123';
      const userId = 'user-123';

      // Mock query responses
      mockQuery.mockResolvedValueOnce({
        rows: [{ 
          board_id: 'board-123', 
          created_by: userId,
          permission_level: 'manage'
        }],
        rowCount: 1
      });

      // Call the function
      const result = await deleteView(viewId, userId);

      // Assertions
      expect(mockValidateBoardAccess).toHaveBeenCalledWith('board-123', userId);
      expect(mockQuery).toHaveBeenCalledTimes(4); // Check view, delete default refs, delete permissions, delete view
      expect(result).toBe(true);
    });

    it('should throw error if user does not have permission', async () => {
      // Mock data
      const viewId = 'view-123';
      const userId = 'user-123';

      // Mock query responses
      mockQuery.mockResolvedValueOnce({
        rows: [{ 
          board_id: 'board-123', 
          created_by: 'other-user',
          permission_level: 'view'
        }],
        rowCount: 1
      });

      // Call the function and expect error
      await expect(deleteView(viewId, userId)).rejects.toThrow('You do not have permission to delete this view');
      expect(mockValidateBoardAccess).toHaveBeenCalledWith('board-123', userId);
    });
  });

  describe('setDefaultView', () => {
    it('should set a view as the default for a board', async () => {
      // Mock data
      const viewId = 'view-123';
      const boardId = 'board-123';
      const userId = 'user-123';
      const options = { isGlobal: true };

      // Mock query responses
      mockQuery.mockResolvedValueOnce({
        rows: [{ board_id: boardId }],
        rowCount: 1
      });

      // Call the function
      const result = await setDefaultView(viewId, boardId, userId, options);

      // Assertions
      expect(mockValidateBoardAccess).toHaveBeenCalledWith(boardId, userId);
      expect(mockQuery).toHaveBeenCalledTimes(3); // Check view, update view, update default view
      expect(result).toBe(true);
    });

    it('should return false if view does not belong to board', async () => {
      // Mock data
      const viewId = 'view-123';
      const boardId = 'board-123';
      const userId = 'user-123';

      // Mock query responses
      mockQuery.mockResolvedValueOnce({
        rows: [{ board_id: 'different-board' }],
        rowCount: 1
      });

      // Call the function
      const result = await setDefaultView(viewId, boardId, userId);

      // Assertions
      expect(mockValidateBoardAccess).toHaveBeenCalledWith(boardId, userId);
      expect(result).toBe(false);
    });
  });

  describe('setViewPermission', () => {
    it('should set permission for a user on a view', async () => {
      // Mock data
      const viewId = 'view-123';
      const targetUserId = 'target-user';
      const userId = 'user-123';
      const permissionLevel = ViewPermissionLevel.EDIT;

      // Mock query responses
      mockQuery.mockResolvedValueOnce({
        rows: [{ board_id: 'board-123', created_by: userId }],
        rowCount: 1
      });
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'permission-1' }],
        rowCount: 1
      });

      // Call the function
      const result = await setViewPermission(viewId, targetUserId, permissionLevel, userId);

      // Assertions
      expect(mockValidateBoardAccess).toHaveBeenCalledWith('board-123', userId);
      expect(mockQuery).toHaveBeenCalledTimes(2);
      expect(mockQuery).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('INSERT INTO view_permissions'),
        expect.arrayContaining([
          'generated-id', viewId, targetUserId, permissionLevel, expect.any(Date), expect.any(Date)
        ])
      );
      expect(result).toBe(true);
    });

    it('should throw error if user is not the creator', async () => {
      // Mock data
      const viewId = 'view-123';
      const targetUserId = 'target-user';
      const userId = 'user-123';
      const permissionLevel = ViewPermissionLevel.EDIT;

      // Mock query responses
      mockQuery.mockResolvedValueOnce({
        rows: [{ board_id: 'board-123', created_by: 'other-user' }],
        rowCount: 1
      });

      // Call the function and expect error
      await expect(setViewPermission(viewId, targetUserId, permissionLevel, userId))
        .rejects.toThrow('Only the view creator can set permissions');
      expect(mockValidateBoardAccess).toHaveBeenCalledWith('board-123', userId);
    });
  });

  describe('copyView', () => {
    it('should copy a view', async () => {
      // Mock data
      const sourceViewId = 'view-123';
      const newName = 'Copy of My View';
      const userId = 'user-123';

      // Mock query responses
      mockQuery.mockResolvedValueOnce({
        rows: [{ board_id: 'board-123' }],
        rowCount: 1
      });
      mockQuery.mockResolvedValueOnce({
        rows: [{ new_view_id: 'view-copy-123' }],
        rowCount: 1
      });
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'view-copy-123',
          name: newName,
          board_id: 'board-123',
          filter_json: null,
          sort_json: null,
          columns_config: null,
          layout_config: null,
          team_access: null,
          is_default: false,
          is_shared: false,
          is_global: false,
          is_template: false,
          icon: null,
          color: null,
          created_by: userId,
          created_at: new Date(),
          updated_at: new Date()
        }],
        rowCount: 1
      });

      // Call the function
      const result = await copyView(sourceViewId, newName, userId);

      // Assertions
      expect(mockValidateBoardAccess).toHaveBeenCalledWith('board-123', userId);
      expect(mockQuery).toHaveBeenCalledTimes(3);
      expect(result).not.toBeNull();
      expect(result?.id).toBe('view-copy-123');
      expect(result?.name).toBe(newName);
      expect(result?.createdBy).toBe(userId);
    });
  });

  describe('applySorting', () => {
    it('should apply multi-column sorting to a query', async () => {
      // Mock data
      const boardId = 'board-123';
      const userId = 'user-123';
      const sorts = [
        { field: 'priority', direction: 'DESC' as const },
        { field: 'dueDate', direction: 'ASC' as const }
      ];
      const options = { limit: 50, offset: 10 };

      // Mock query response
      mockQuery.mockResolvedValueOnce({
        rows: [
          { id: 'item-1', title: 'High Priority Item', priority: 'HIGH' },
          { id: 'item-2', title: 'Medium Priority Item', priority: 'MEDIUM' }
        ],
        rowCount: 2
      });

      // Call the function
      const result = await applySorting(boardId, sorts, userId, options);

      // Assertions
      expect(mockValidateBoardAccess).toHaveBeenCalledWith(boardId, userId);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY i.priority DESC, i.due_date ASC'),
        [boardId, 50, 10]
      );
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('item-1');
      expect(result[1].id).toBe('item-2');
    });

    it('should use default sorting when no sorts provided', async () => {
      // Mock data
      const boardId = 'board-123';
      const userId = 'user-123';
      const sorts: any[] = [];

      // Mock query response
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      });

      // Call the function
      await applySorting(boardId, sorts, userId);

      // Assertions
      expect(mockValidateBoardAccess).toHaveBeenCalledWith(boardId, userId);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY i.column_id ASC, i."order" ASC'),
        [boardId, 100, 0]
      );
    });
  });

  describe('validateView', () => {
    it('should validate a correct view definition', () => {
      // Mock data
      const view = {
        name: 'Valid View',
        boardId: 'board-123',
        layoutConfig: {
          type: 'table',
          rowHeight: 'medium'
        },
        columnsConfig: {
          visibleColumns: ['col1', 'col2'],
          columnOrder: ['col1', 'col2']
        },
        createdBy: 'user-123'
      };

      // Call the function
      const result = validateView(view);

      // Assertions
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid view definitions', () => {
      // Mock data
      const view = {
        name: '',
        boardId: '',
        layoutConfig: {
          type: 'invalid',
          rowHeight: 'invalid'
        },
        columnsConfig: {
          visibleColumns: 'not-an-array' as any,
          columnOrder: 'not-an-array' as any
        },
        createdBy: 'user-123'
      };

      // Call the function
      const result = validateView(view);

      // Assertions
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors).toContain('View name is required');
      expect(result.errors).toContain('Board ID is required');
      expect(result.errors).toContain('Invalid layout type. Must be one of: table, kanban, calendar, gantt, list');
      expect(result.errors).toContain('Invalid row height. Must be one of: small, medium, large');
      expect(result.errors).toContain('Visible columns must be an array');
      expect(result.errors).toContain('Column order must be an array');
    });
  });
});