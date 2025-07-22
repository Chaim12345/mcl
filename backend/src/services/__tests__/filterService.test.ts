import { jest } from '@jest/globals';
import { 
  filterBoardItems, 
  createSimpleFilter, 
  validateFilter,
  FilterOperator,
  LogicalOperator,
  FilterGroup,
  FilterCondition
} from '../filterService.js';
import { query } from '../../db/client.js';
import { validateBoardAccess } from '../boardService.js';
import { Priority, Status } from '../../models/types.js';

// Mock dependencies
jest.mock('../../db/client.js');
jest.mock('../boardService.js');

const mockQuery = query as jest.MockedFunction<typeof query>;
const mockValidateBoardAccess = validateBoardAccess as jest.MockedFunction<typeof validateBoardAccess>;

describe('filterService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('filterBoardItems', () => {
    it('should filter items based on simple criteria', async () => {
      // Mock data
      const boardId = 'board-123';
      const userId = 'user-123';
      const filter: FilterGroup = {
        operator: LogicalOperator.AND,
        conditions: [
          {
            field: 'status',
            operator: FilterOperator.EQUALS,
            value: Status.IN_PROGRESS
          }
        ]
      };

      // Mock query response
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'item-1',
            title: 'Test Item 1',
            description: 'Description 1',
            order: 0,
            board_id: boardId,
            column_id: 'column-1',
            due_date: new Date(),
            priority: Priority.HIGH,
            status: Status.IN_PROGRESS,
            created_at: new Date(),
            updated_at: new Date()
          }
        ],
        rowCount: 1
      });

      // Call the function
      const result = await filterBoardItems(boardId, filter, undefined, userId);

      // Assertions
      expect(mockValidateBoardAccess).toHaveBeenCalledWith(boardId, userId);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE i.board_id = $1 AND'),
        expect.arrayContaining([boardId, Status.IN_PROGRESS])
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('item-1');
      expect(result[0].status).toBe(Status.IN_PROGRESS);
    });

    it('should apply sorting when provided', async () => {
      // Mock data
      const boardId = 'board-123';
      const userId = 'user-123';
      const filter: FilterGroup = {
        operator: LogicalOperator.AND,
        conditions: []
      };
      const sorts = [
        { field: 'priority', direction: 'DESC' as const },
        { field: 'dueDate', direction: 'ASC' as const }
      ];

      // Mock query response
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      });

      // Call the function
      await filterBoardItems(boardId, filter, sorts, userId);

      // Assertions
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY i.priority DESC, i.due_date ASC'),
        expect.arrayContaining([boardId])
      );
    });
  });

  describe('createSimpleFilter', () => {
    it('should create a filter from simple criteria', () => {
      const criteria = {
        columnId: 'column-1',
        status: Status.IN_PROGRESS,
        priority: Priority.HIGH,
        dueDateFrom: new Date('2023-01-01'),
        dueDateTo: new Date('2023-12-31'),
        searchTerm: 'test'
      };

      const result = createSimpleFilter(criteria);

      expect(result.operator).toBe(LogicalOperator.AND);
      expect(result.conditions).toHaveLength(4); // 3 direct conditions + 1 search group
      
      // Check column condition
      expect(result.conditions[0]).toEqual({
        field: 'columnId',
        operator: FilterOperator.EQUALS,
        value: 'column-1'
      });
      
      // Check status condition
      expect(result.conditions[1]).toEqual({
        field: 'status',
        operator: FilterOperator.EQUALS,
        value: Status.IN_PROGRESS
      });
      
      // Check priority condition
      expect(result.conditions[2]).toEqual({
        field: 'priority',
        operator: FilterOperator.EQUALS,
        value: Priority.HIGH
      });
      
      // Check date range condition
      expect(result.conditions[3]).toEqual({
        field: 'dueDate',
        operator: FilterOperator.BETWEEN,
        value: criteria.dueDateFrom,
        valueEnd: criteria.dueDateTo
      });
      
      // Check search condition (nested OR group)
      const searchGroup = result.conditions[4] as FilterGroup;
      expect(searchGroup.operator).toBe(LogicalOperator.OR);
      expect(searchGroup.conditions).toHaveLength(2);
      expect(searchGroup.conditions[0]).toEqual({
        field: 'title',
        operator: FilterOperator.CONTAINS,
        value: 'test'
      });
    });

    it('should handle partial criteria', () => {
      const criteria = {
        status: Status.DONE
      };

      const result = createSimpleFilter(criteria);

      expect(result.conditions).toHaveLength(1);
      expect(result.conditions[0]).toEqual({
        field: 'status',
        operator: FilterOperator.EQUALS,
        value: Status.DONE
      });
    });
  });

  describe('validateFilter', () => {
    it('should validate a correct filter', () => {
      const filter: FilterGroup = {
        operator: LogicalOperator.AND,
        conditions: [
          {
            field: 'status',
            operator: FilterOperator.EQUALS,
            value: Status.IN_PROGRESS
          },
          {
            field: 'priority',
            operator: FilterOperator.IN,
            value: [Priority.HIGH, Priority.URGENT]
          }
        ]
      };

      const result = validateFilter(filter);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid filters', () => {
      const filter = {
        operator: 'INVALID_OPERATOR',
        conditions: [
          {
            field: 'status',
            operator: 'INVALID_OPERATOR',
            value: Status.IN_PROGRESS
          }
        ]
      } as unknown as FilterGroup;

      const result = validateFilter(filter);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate nested filter groups', () => {
      const filter: FilterGroup = {
        operator: LogicalOperator.AND,
        conditions: [
          {
            field: 'status',
            operator: FilterOperator.EQUALS,
            value: Status.IN_PROGRESS
          },
          {
            operator: LogicalOperator.OR,
            conditions: [
              {
                field: 'priority',
                operator: FilterOperator.EQUALS,
                value: Priority.HIGH
              },
              {
                field: 'priority',
                operator: FilterOperator.EQUALS,
                value: Priority.URGENT
              }
            ]
          }
        ]
      };

      const result = validateFilter(filter);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate BETWEEN operator requires valueEnd', () => {
      const filter: FilterGroup = {
        operator: LogicalOperator.AND,
        conditions: [
          {
            field: 'dueDate',
            operator: FilterOperator.BETWEEN,
            value: new Date()
            // Missing valueEnd
          } as FilterCondition
        ]
      };

      const result = validateFilter(filter);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('BETWEEN operator requires both value and valueEnd');
    });
  });
});