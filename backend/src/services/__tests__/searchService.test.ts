import { jest } from '@jest/globals';
import { 
  searchBoardItems,
  getSearchHistory,
  getSearchSuggestions,
  clearSearchHistory,
  refreshSearchIndex,
  getTrendingSearchTerms,
  getRelatedSearchTerms,
  SearchOptions
} from '../searchService.js';
import { query, transaction } from '../../db/client.js';
import { validateBoardAccess } from '../boardService.js';
import { generateId } from '../../utils/id.js';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { beforeEach } from 'vitest';
import { describe } from 'vitest';

// Mock dependencies
jest.mock('../../db/client.js');
jest.mock('../boardService.js');
jest.mock('../../utils/id.js');

const mockQuery = query as jest.MockedFunction<typeof query>;
const mockTransaction = transaction as jest.MockedFunction<typeof transaction>;
const mockValidateBoardAccess = validateBoardAccess as jest.MockedFunction<typeof validateBoardAccess>;
const mockGenerateId = generateId as jest.MockedFunction<typeof generateId>;

describe('searchService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGenerateId.mockReturnValue('generated-id');
  });

  describe('searchBoardItems', () => {
    it('should search items in a board using materialized view when available', async () => {
      // Mock data
      const boardId = 'board-123';
      const userId = 'user-123';
      const searchTerm = 'test';
      const options: SearchOptions = {
        limit: 10,
        offset: 0,
        highlightResults: true
      };

      // Mock materialized view check
      mockQuery.mockResolvedValueOnce({
        rows: [{ 1: 1 }],
        rowCount: 1
      });

      // Mock search query response
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'item-1',
            title: 'Test Item',
            description: 'Test description',
            board_id: boardId,
            column_id: 'column-1',
            created_at: new Date(),
            updated_at: new Date(),
            relevance: 0.8,
            matched_field: 'title',
            highlight: '<mark>Test</mark> Item - <mark>Test</mark> description'
          }
        ],
        rowCount: 1
      });

      // Call the function
      const result = await searchBoardItems(boardId, searchTerm, userId, options);

      // Assertions
      expect(mockValidateBoardAccess).toHaveBeenCalledWith(boardId, userId);
      expect(mockQuery).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('SELECT 1 FROM pg_matviews'),
        []
      );
      expect(mockQuery).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('FROM search_items_mv'),
        expect.arrayContaining([boardId, 'test:*', 10, 0.01, 0])
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('item-1');
      expect(result[0].title).toBe('Test Item');
      expect(result[0].relevance).toBe(0.8);
      expect(result[0].matchedField).toBe('title');
      expect(result[0].highlight).toBe('<mark>Test</mark> Item - <mark>Test</mark> description');
    });

    it('should fall back to direct search when materialized view is not available', async () => {
      // Mock data
      const boardId = 'board-123';
      const userId = 'user-123';
      const searchTerm = 'test';

      // Mock materialized view check (not available)
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      });

      // Mock search query response
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'item-1',
            title: 'Test Item',
            description: 'Test description',
            board_id: boardId,
            column_id: 'column-1',
            created_at: new Date(),
            updated_at: new Date(),
            relevance: 0.8,
            matched_field: 'title'
          }
        ],
        rowCount: 1
      });

      // Call the function
      const result = await searchBoardItems(boardId, searchTerm, userId);

      // Assertions
      expect(mockValidateBoardAccess).toHaveBeenCalledWith(boardId, userId);
      expect(mockQuery).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('SELECT 1 FROM pg_matviews'),
        []
      );
      expect(mockQuery).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('FROM board_items'),
        expect.arrayContaining([boardId, 'test:*', 100, 0.01, 0])
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('item-1');
    });

    it('should save search history when requested', async () => {
      // Mock data
      const boardId = 'board-123';
      const userId = 'user-123';
      const searchTerm = 'test';

      // Mock materialized view check
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      });

      // Mock search query response
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'item-1',
            title: 'Test Item',
            description: 'Test description',
            board_id: boardId,
            column_id: 'column-1',
            created_at: new Date(),
            updated_at: new Date(),
            relevance: 0.8,
            matched_field: 'title'
          }
        ],
        rowCount: 1
      });

      // Mock save history query
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 1
      });

      // Call the function
      await searchBoardItems(boardId, searchTerm, userId, { saveHistory: true });

      // Assertions
      expect(mockQuery).toHaveBeenCalledTimes(3);
      expect(mockQuery).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('INSERT INTO search_history'),
        expect.arrayContaining(['generated-id', userId, searchTerm, boardId, 1, expect.any(Date)])
      );
    });

    it('should apply sorting options correctly', async () => {
      // Mock data
      const boardId = 'board-123';
      const userId = 'user-123';
      const searchTerm = 'test';
      const options: SearchOptions = {
        sortBy: 'created',
        sortDirection: 'asc'
      };

      // Mock materialized view check
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      });

      // Mock search query response
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      });

      // Call the function
      await searchBoardItems(boardId, searchTerm, userId, options);

      // Assertions
      expect(mockQuery).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('ORDER BY i.created_at ASC'),
        expect.anything()
      );
    });
  });

  describe('getSearchHistory', () => {
    it('should get search history for a user with options', async () => {
      // Mock data
      const userId = 'user-123';
      const options = {
        limit: 5,
        boardId: 'board-123',
        offset: 10
      };

      // Mock query response
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'search-1',
            user_id: userId,
            search_term: 'test',
            board_id: 'board-123',
            result_count: 5,
            created_at: new Date()
          }
        ],
        rowCount: 1
      });

      // Call the function
      const result = await getSearchHistory(userId, options);

      // Assertions
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = $1 AND board_id = $2'),
        expect.arrayContaining([userId, 'board-123', 5, 10])
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('search-1');
      expect(result[0].searchTerm).toBe('test');
    });

    it('should get search history without boardId filter', async () => {
      // Mock data
      const userId = 'user-123';

      // Mock query response
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'search-1',
            user_id: userId,
            search_term: 'test',
            board_id: 'board-123',
            result_count: 5,
            created_at: new Date()
          },
          {
            id: 'search-2',
            user_id: userId,
            search_term: 'another',
            board_id: 'board-456',
            result_count: 3,
            created_at: new Date()
          }
        ],
        rowCount: 2
      });

      // Call the function
      const result = await getSearchHistory(userId);

      // Assertions
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = $1'),
        expect.arrayContaining([userId, 10, 0])
      );
      expect(result).toHaveLength(2);
    });
  });

  describe('getSearchSuggestions', () => {
    it('should get search suggestions from user history', async () => {
      // Mock data
      const userId = 'user-123';
      const prefix = 'te';
      const options = {
        boardId: 'board-123',
        limit: 5
      };

      // Mock query responses for user history
      mockQuery.mockResolvedValueOnce({
        rows: [
          { 
            search_term: 'test',
            last_used: new Date(),
            frequency: '3'
          },
          { 
            search_term: 'testing',
            last_used: new Date(),
            frequency: '1'
          }
        ],
        rowCount: 2
      });

      // Mock query responses for popular suggestions (not needed in this case)
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      });

      // Call the function
      const result = await getSearchSuggestions(userId, prefix, options);

      // Assertions
      expect(mockQuery).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('FROM search_history'),
        expect.arrayContaining([userId, 'board-123', prefix + '%', 5])
      );
      expect(result).toHaveLength(2);
      expect(result[0].term).toBe('test');
      expect(result[0].source).toBe('history');
      expect(result[1].term).toBe('testing');
    });

    it('should supplement with popular searches when user history is insufficient', async () => {
      // Mock data
      const userId = 'user-123';
      const prefix = 'te';

      // Mock query responses for user history (only one result)
      mockQuery.mockResolvedValueOnce({
        rows: [
          { 
            search_term: 'test',
            last_used: new Date(),
            frequency: '2'
          }
        ],
        rowCount: 1
      });

      // Mock query responses for popular suggestions
      mockQuery.mockResolvedValueOnce({
        rows: [
          { 
            term: 'team',
            frequency: 10,
            last_used: new Date()
          },
          { 
            term: 'template',
            frequency: 5,
            last_used: new Date()
          }
        ],
        rowCount: 2
      });

      // Call the function
      const result = await getSearchSuggestions(userId, prefix);

      // Assertions
      expect(mockQuery).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(3);
      expect(result[0].term).toBe('test');
      expect(result[0].source).toBe('history');
      expect(result[1].term).toBe('team');
      expect(result[1].source).toBe('popular');
      expect(result[2].term).toBe('template');
      expect(result[2].source).toBe('popular');
    });

    it('should include generated suggestions when requested', async () => {
      // Mock data
      const userId = 'user-123';
      const prefix = 'test';
      const options = {
        includeGenerated: true,
        limit: 5
      };

      // Mock query responses for user history (no results)
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      });

      // Mock query responses for popular suggestions (no results)
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      });

      // Mock query responses for generated suggestions
      mockQuery.mockResolvedValueOnce({
        rows: [
          { keyword: 'testing', weight: 0.8 },
          { keyword: 'tests', weight: 0.5 }
        ],
        rowCount: 2
      });

      // Call the function
      const result = await getSearchSuggestions(userId, prefix, options);

      // Assertions
      expect(mockQuery).toHaveBeenCalledTimes(3);
      expect(result).toHaveLength(2);
      expect(result[0].term).toBe('testing');
      expect(result[0].source).toBe('generated');
      expect(result[1].term).toBe('tests');
      expect(result[1].source).toBe('generated');
    });
  });

  describe('clearSearchHistory', () => {
    it('should clear search history for a user', async () => {
      // Mock data
      const userId = 'user-123';

      // Mock query response
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 5
      });

      // Call the function
      await clearSearchHistory(userId);

      // Assertions
      expect(mockQuery).toHaveBeenCalledWith(
        'DELETE FROM search_history WHERE user_id = $1',
        [userId]
      );
    });
  });

  describe('refreshSearchIndex', () => {
    it('should refresh the search index when materialized view exists', async () => {
      // Mock query response
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      });

      // Call the function
      await refreshSearchIndex();

      // Assertions
      expect(mockQuery).toHaveBeenCalledWith(
        'REFRESH MATERIALIZED VIEW CONCURRENTLY search_items_mv',
        []
      );
    });

    it('should create the materialized view if it does not exist', async () => {
      // Mock query responses
      mockQuery.mockRejectedValueOnce(new Error('Materialized view does not exist'));
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      // Call the function
      await refreshSearchIndex();

      // Assertions
      expect(mockQuery).toHaveBeenCalledTimes(4);
      expect(mockQuery).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('CREATE MATERIALIZED VIEW IF NOT EXISTS search_items_mv'),
        []
      );
    });
  });

  describe('getTrendingSearchTerms', () => {
    it('should get trending search terms', async () => {
      // Mock query response
      mockQuery.mockResolvedValueOnce({
        rows: [
          { term: 'popular', count: '10' },
          { term: 'trending', count: '8' },
          { term: 'hot', count: '5' }
        ],
        rowCount: 3
      });

      // Call the function
      const result = await getTrendingSearchTerms(3);

      // Assertions
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('GROUP BY search_term'),
        [3]
      );
      expect(result).toHaveLength(3);
      expect(result[0].term).toBe('popular');
      expect(result[0].count).toBe(10);
    });

    it('should filter by board ID when provided', async () => {
      // Mock data
      const boardId = 'board-123';

      // Mock query response
      mockQuery.mockResolvedValueOnce({
        rows: [
          { term: 'board-specific', count: '5' }
        ],
        rowCount: 1
      });

      // Call the function
      const result = await getTrendingSearchTerms(10, boardId);

      // Assertions
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE board_id = $2'),
        [10, boardId]
      );
      expect(result).toHaveLength(1);
      expect(result[0].term).toBe('board-specific');
    });
  });

  describe('getRelatedSearchTerms', () => {
    it('should get related search terms', async () => {
      // Mock data
      const searchTerm = 'project';
      
      // Mock query response
      mockQuery.mockResolvedValueOnce({
        rows: [
          { search_term: 'management', frequency: '5' },
          { search_term: 'planning', frequency: '3' }
        ],
        rowCount: 2
      });

      // Call the function
      const result = await getRelatedSearchTerms(searchTerm);

      // Assertions
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WITH user_sessions'),
        [searchTerm, 5]
      );
      expect(result).toEqual(['management', 'planning']);
    });
  });
});