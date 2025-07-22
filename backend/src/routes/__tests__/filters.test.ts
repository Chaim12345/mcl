import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { filterBoardItems, saveFilter, getSavedFilters, deleteFilter, createSimpleFilter, validateFilter } from '../../services/filterService.js';
import { saveView, getSavedViews, getDefaultView, deleteView, shareView } from '../../services/viewService.js';
import { searchBoardItems, getSearchHistory, getSearchSuggestions, clearSearchHistory } from '../../services/searchService.js';
import filterRoutes from '../filters.js';
import { Status, Priority } from '../../models/types.js';

// Mock services
jest.mock('../../services/filterService.js');
jest.mock('../../services/viewService.js');
jest.mock('../../services/searchService.js');
jest.mock('../../middleware/auth.js', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { id: 'test-user-id' };
    next();
  }
}));

const mockFilterBoardItems = filterBoardItems as jest.MockedFunction<typeof filterBoardItems>;
const mockSaveFilter = saveFilter as jest.MockedFunction<typeof saveFilter>;
const mockGetSavedFilters = getSavedFilters as jest.MockedFunction<typeof getSavedFilters>;
const mockDeleteFilter = deleteFilter as jest.MockedFunction<typeof deleteFilter>;
const mockCreateSimpleFilter = createSimpleFilter as jest.MockedFunction<typeof createSimpleFilter>;
const mockValidateFilter = validateFilter as jest.MockedFunction<typeof validateFilter>;

const mockSaveView = saveView as jest.MockedFunction<typeof saveView>;
const mockGetSavedViews = getSavedViews as jest.MockedFunction<typeof getSavedViews>;
const mockGetDefaultView = getDefaultView as jest.MockedFunction<typeof getDefaultView>;
const mockDeleteView = deleteView as jest.MockedFunction<typeof deleteView>;
const mockShareView = shareView as jest.MockedFunction<typeof shareView>;

const mockSearchBoardItems = searchBoardItems as jest.MockedFunction<typeof searchBoardItems>;
const mockGetSearchHistory = getSearchHistory as jest.MockedFunction<typeof getSearchHistory>;
const mockGetSearchSuggestions = getSearchSuggestions as jest.MockedFunction<typeof getSearchSuggestions>;
const mockClearSearchHistory = clearSearchHistory as jest.MockedFunction<typeof clearSearchHistory>;

// Setup express app for testing
const app = express();
app.use(express.json());
app.use('/', filterRoutes);

describe('Filter Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /boards/:boardId/filter', () => {
    it('should filter items using complex criteria', async () => {
      // Mock data
      const boardId = 'board-123';
      const filter = {
        operator: 'AND',
        conditions: [
          {
            field: 'status',
            operator: 'equals',
            value: Status.IN_PROGRESS
          }
        ]
      };
      const items = [
        { id: 'item-1', title: 'Test Item 1' },
        { id: 'item-2', title: 'Test Item 2' }
      ];

      // Mock service responses
      mockValidateFilter.mockReturnValue({ isValid: true, errors: [] });
      mockFilterBoardItems.mockResolvedValue(items);

      // Make request
      const response = await request(app)
        .post(`/boards/${boardId}/filter`)
        .send({ filter });

      // Assertions
      expect(response.status).toBe(200);
      expect(response.body).toEqual(items);
      expect(mockFilterBoardItems).toHaveBeenCalledWith(
        boardId,
        filter,
        undefined,
        'test-user-id'
      );
    });

    it('should return 400 for invalid filter', async () => {
      // Mock data
      const boardId = 'board-123';
      const filter = {
        operator: 'INVALID',
        conditions: []
      };

      // Mock service responses
      mockValidateFilter.mockReturnValue({ 
        isValid: false, 
        errors: ['Invalid logical operator: INVALID'] 
      });

      // Make request
      const response = await request(app)
        .post(`/boards/${boardId}/filter`)
        .send({ filter });

      // Assertions
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(mockFilterBoardItems).not.toHaveBeenCalled();
    });
  });

  describe('POST /boards/:boardId/simple-filter', () => {
    it('should filter items using simple criteria', async () => {
      // Mock data
      const boardId = 'board-123';
      const criteria = {
        status: Status.IN_PROGRESS,
        priority: Priority.HIGH
      };
      const simpleFilter = {
        operator: 'AND',
        conditions: [
          {
            field: 'status',
            operator: 'equals',
            value: Status.IN_PROGRESS
          },
          {
            field: 'priority',
            operator: 'equals',
            value: Priority.HIGH
          }
        ]
      };
      const items = [
        { id: 'item-1', title: 'Test Item 1' }
      ];

      // Mock service responses
      mockCreateSimpleFilter.mockReturnValue(simpleFilter);
      mockFilterBoardItems.mockResolvedValue(items);

      // Make request
      const response = await request(app)
        .post(`/boards/${boardId}/simple-filter`)
        .send(criteria);

      // Assertions
      expect(response.status).toBe(200);
      expect(response.body).toEqual(items);
      expect(mockCreateSimpleFilter).toHaveBeenCalledWith(expect.objectContaining({
        status: Status.IN_PROGRESS,
        priority: Priority.HIGH
      }));
      expect(mockFilterBoardItems).toHaveBeenCalledWith(
        boardId,
        simpleFilter,
        undefined,
        'test-user-id'
      );
    });
  });

  describe('GET /boards/:boardId/saved-filters', () => {
    it('should get all saved filters for a board', async () => {
      // Mock data
      const boardId = 'board-123';
      const filters = [
        { id: 'filter-1', name: 'My Filter 1' },
        { id: 'filter-2', name: 'My Filter 2' }
      ];

      // Mock service response
      mockGetSavedFilters.mockResolvedValue(filters);

      // Make request
      const response = await request(app)
        .get(`/boards/${boardId}/saved-filters`);

      // Assertions
      expect(response.status).toBe(200);
      expect(response.body).toEqual(filters);
      expect(mockGetSavedFilters).toHaveBeenCalledWith(boardId, 'test-user-id');
    });
  });

  describe('POST /boards/:boardId/saved-filters', () => {
    it('should save a filter', async () => {
      // Mock data
      const boardId = 'board-123';
      const filterData = {
        name: 'My Filter',
        filter: {
          operator: 'AND',
          conditions: []
        }
      };
      const savedFilter = {
        id: 'filter-123',
        ...filterData,
        boardId,
        createdBy: 'test-user-id',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Mock service responses
      mockValidateFilter.mockReturnValue({ isValid: true, errors: [] });
      mockSaveFilter.mockResolvedValue(savedFilter);

      // Make request
      const response = await request(app)
        .post(`/boards/${boardId}/saved-filters`)
        .send(filterData);

      // Assertions
      expect(response.status).toBe(201);
      expect(response.body).toEqual(savedFilter);
      expect(mockSaveFilter).toHaveBeenCalledWith(
        expect.objectContaining({
          ...filterData,
          boardId,
          createdBy: 'test-user-id'
        }),
        'test-user-id'
      );
    });

    it('should return 400 for invalid filter', async () => {
      // Mock data
      const boardId = 'board-123';
      const filterData = {
        name: 'My Filter',
        filter: {
          operator: 'INVALID',
          conditions: []
        }
      };

      // Mock service responses
      mockValidateFilter.mockReturnValue({ 
        isValid: false, 
        errors: ['Invalid logical operator: INVALID'] 
      });

      // Make request
      const response = await request(app)
        .post(`/boards/${boardId}/saved-filters`)
        .send(filterData);

      // Assertions
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(mockSaveFilter).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /saved-filters/:filterId', () => {
    it('should delete a saved filter', async () => {
      // Mock data
      const filterId = 'filter-123';

      // Mock service response
      mockDeleteFilter.mockResolvedValue(true);

      // Make request
      const response = await request(app)
        .delete(`/saved-filters/${filterId}`);

      // Assertions
      expect(response.status).toBe(204);
      expect(mockDeleteFilter).toHaveBeenCalledWith(filterId, 'test-user-id');
    });

    it('should return 404 if filter not found', async () => {
      // Mock data
      const filterId = 'filter-123';

      // Mock service response
      mockDeleteFilter.mockResolvedValue(false);

      // Make request
      const response = await request(app)
        .delete(`/saved-filters/${filterId}`);

      // Assertions
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  // Add more tests for view and search routes...
});