import express, { Request, Response } from 'express';
import {
  saveFilter,
  deleteFilter,
  getSavedFilters,
  createSimpleFilter,
  filterBoardItems,
  validateFilter
} from '../services/filterService.js';
import {
  saveView,
  getSavedViews,
  getDefaultView,
  deleteView,
  shareView
} from '../services/viewService.js';
import {
  validateView,
  setDefaultView,
  copyView,
  ViewPermissionLevel,
  setViewPermission,
  getViewPermissions,
  applySorting,
  SearchOptions,
  SearchHistoryOptions,
  SearchSuggestionsOptions,
  refreshSearchIndex,
  getTrendingSearchTerms,
  getRelatedSearchTerms,
  getViewTemplates,
  createViewTemplate,
  deleteViewTemplate,
  createViewFromTemplate
} from './filters-stubs.js';
import { searchBoardItems, getSearchHistory, getSearchSuggestions } from '../services/searchService.js';
import { Status, Priority } from '../models/types.js';

const router = express.Router();

// Apply filter to board items
router.post('/apply', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { boardId } = req.query;
    const { filter, sorts } = req.body;
    const userId = req.user.id;

    const validation = validateFilter(filter);
    if (!validation.isValid) {
      res.status(400).json({ error: validation.errors.join(', ') });
      return;
    }
    
    if (!boardId || typeof boardId !== 'string') {
      res.status(400).json({ error: 'Board ID is required' });
      return;
    }
    
    const items = await filterBoardItems(boardId, filter, userId, sorts);
    res.json(items);
  } catch (error) {
    console.error('Error applying filter:', error);
    res.status(500).json({ error: 'Failed to apply filter' });
  }
});

// Apply simple filter criteria
router.post('/simple', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { boardId } = req.query;
    const { columnId, status, priority, dueDateFrom, dueDateTo, searchTerm, sorts } = req.body;
    const userId = req.user.id;

    // Create a simple filter from the criteria with proper optional handling
    const filterCriteria: {
      columnId?: string;
      status?: Status;
      priority?: Priority;
      dueDateFrom?: Date;
      dueDateTo?: Date;
      searchTerm?: string;
    } = {};

    if (columnId !== undefined) filterCriteria.columnId = columnId;
    if (status !== undefined) filterCriteria.status = status as Status;
    if (priority !== undefined) filterCriteria.priority = priority as Priority;
    if (dueDateFrom !== undefined) filterCriteria.dueDateFrom = new Date(dueDateFrom);
    if (dueDateTo !== undefined) filterCriteria.dueDateTo = new Date(dueDateTo);
    if (searchTerm !== undefined) filterCriteria.searchTerm = searchTerm;

    const filter = createSimpleFilter(filterCriteria);
    
    if (!boardId || typeof boardId !== 'string') {
      res.status(400).json({ error: 'Board ID is required' });
      return;
    }
    
    const items = await filterBoardItems(boardId, filter, userId, sorts);
    res.json(items);
  } catch (error) {
    console.error('Error applying simple filter:', error);
    res.status(500).json({ error: 'Failed to apply filter' });
  }
});

// Get saved filters for a board
router.get('/saved', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { boardId } = req.query;
    const userId = req.user.id;

    if (!boardId || typeof boardId !== 'string') {
      res.status(400).json({ error: 'Board ID is required' });
      return;
    }

    const filters = await getSavedFilters(boardId, userId);
    res.json(filters);
  } catch (error) {
    console.error('Error getting saved filters:', error);
    res.status(500).json({ error: 'Failed to get saved filters' });
  }
});

// Save a filter
router.post('/save', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { name, filter, isDefault } = req.body;
    const { boardId } = req.query;
    const userId = req.user.id;

    if (!name) {
      res.status(400).json({ error: 'Filter name is required' });
      return;
    }

    if (!boardId || typeof boardId !== 'string') {
      res.status(400).json({ error: 'Board ID is required' });
      return;
    }

    const savedFilter = await saveFilter({
      name,
      filter,
      boardId,
      createdBy: userId,
      isDefault: isDefault === true
    }, userId);

    res.json(savedFilter);
  } catch (error) {
    console.error('Error saving filter:', error);
    res.status(500).json({ error: 'Failed to save filter' });
  }
});

// Delete a saved filter
router.delete('/:filterId', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { filterId } = req.params;
    const userId = req.user.id;

    if (!filterId) {
      res.status(400).json({ error: 'Filter ID is required' });
      return;
    }

    const deleted = await deleteFilter(filterId, userId);
    if (!deleted) {
      res.status(404).json({ error: 'Filter not found' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting filter:', error);
    res.status(500).json({ error: 'Failed to delete filter' });
  }
});

// Get saved views for a board
router.get('/views', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { boardId } = req.query;
    const { includeShared, includeDefault } = req.query;
    const userId = req.user.id;

    if (!boardId || typeof boardId !== 'string') {
      res.status(400).json({ error: 'Board ID is required' });
      return;
    }

    const options = {
      includeShared: includeShared === 'true',
      includeDefault: includeDefault === 'true'
    };

    const views = await getSavedViews(boardId, userId, options);
    res.json(views);
  } catch (error) {
    console.error('Error getting saved views:', error);
    res.status(500).json({ error: 'Failed to get saved views' });
  }
});

// Get default view for a board
router.get('/views/default', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { boardId } = req.query;
    const userId = req.user.id;

    if (!boardId || typeof boardId !== 'string') {
      res.status(400).json({ error: 'Board ID is required' });
      return;
    }

    const options = {};
    const view = await getDefaultView(boardId, userId, options);
    
    if (!view) {
      res.status(404).json({ error: 'No default view found' });
      return;
    }

    res.json(view);
  } catch (error) {
    console.error('Error getting default view:', error);
    res.status(500).json({ error: 'Failed to get default view' });
  }
});

// Save a view
router.post('/views/save', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { name, viewData, isDefault } = req.body;
    const userId = req.user.id;

    if (!name) {
      res.status(400).json({ error: 'View name is required' });
      return;
    }

    const validation = validateView(viewData);
    if (!validation.isValid) {
      res.status(400).json({ error: validation.errors.join(', ') });
      return;
    }

    const savedView = await saveView({
      name,
      ...viewData,
      createdBy: userId,
      isDefault: isDefault === true
    }, userId);

    res.json(savedView);
  } catch (error) {
    console.error('Error saving view:', error);
    res.status(500).json({ error: 'Failed to save view' });
  }
});

// Delete a saved view
router.delete('/views/:viewId', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { viewId } = req.params;
    const userId = req.user.id;

    if (!viewId) {
      res.status(400).json({ error: 'View ID is required' });
      return;
    }

    const deleted = await deleteView(viewId, userId);
    if (!deleted) {
      res.status(404).json({ error: 'View not found' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting view:', error);
    res.status(500).json({ error: 'Failed to delete view' });
  }
});

// Share a view
router.post('/views/:viewId/share', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { viewId } = req.params;
    const { isShared } = req.body;
    const userId = req.user.id;

    if (!viewId) {
      res.status(400).json({ error: 'View ID is required' });
      return;
    }

    const view = await shareView(viewId, isShared, userId);
    if (!view) {
      res.status(404).json({ error: 'View not found' });
      return;
    }

    res.json(view);
  } catch (error) {
    console.error('Error sharing view:', error);
    res.status(500).json({ error: 'Failed to share view' });
  }
});

// Set default view
router.post('/views/:viewId/default', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { viewId } = req.params;
    const { boardId } = req.query;
    const userId = req.user.id;
    const options = {};

    if (!viewId) {
      res.status(400).json({ error: 'View ID is required' });
      return;
    }

    if (!boardId || typeof boardId !== 'string') {
      res.status(400).json({ error: 'Board ID is required' });
      return;
    }

    const success = await setDefaultView(viewId, boardId, userId, options);
    if (!success) {
      res.status(404).json({ error: 'View not found' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error setting default view:', error);
    res.status(500).json({ error: 'Failed to set default view' });
  }
});

// Copy a view
router.post('/views/:viewId/copy', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { viewId } = req.params;
    const { name } = req.body;
    const userId = req.user.id;

    if (!viewId) {
      res.status(400).json({ error: 'View ID is required' });
      return;
    }

    if (!name) {
      res.status(400).json({ error: 'New view name is required' });
      return;
    }

    const view = await copyView(viewId, name, userId);
    if (!view) {
      res.status(404).json({ error: 'View not found' });
      return;
    }

    res.json(view);
  } catch (error) {
    console.error('Error copying view:', error);
    res.status(500).json({ error: 'Failed to copy view' });
  }
});

// Set view permission for a user
router.post('/views/:viewId/permissions', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { viewId } = req.params;
    const { targetUserId, permissionLevel } = req.body;
    const userId = req.user.id;

    if (!viewId) {
      res.status(400).json({ error: 'View ID is required' });
      return;
    }

    if (!targetUserId) {
      res.status(400).json({ error: 'Target user ID is required' });
      return;
    }

    if (!permissionLevel || !Object.values(ViewPermissionLevel).includes(permissionLevel as ViewPermissionLevel)) {
      res.status(400).json({ error: `Permission level must be one of: ${Object.values(ViewPermissionLevel).join(', ')}` });
      return;
    }

    const success = await setViewPermission(viewId, targetUserId, permissionLevel as ViewPermissionLevel, userId);
    if (!success) {
      res.status(404).json({ error: 'View not found or permission denied' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error setting view permission:', error);
    res.status(500).json({ error: 'Failed to set view permission' });
  }
});

// Get view permissions
router.get('/views/:viewId/permissions', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { viewId } = req.params;
    const userId = req.user.id;

    if (!viewId) {
      res.status(400).json({ error: 'View ID is required' });
      return;
    }

    const permissions = await getViewPermissions(viewId, userId);
    res.json(permissions);
  } catch (error) {
    console.error('Error getting view permissions:', error);
    res.status(500).json({ error: 'Failed to get view permissions' });
  }
});

// Apply sorting
router.post('/sort', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { boardId } = req.query;
    const { sorts } = req.body;
    const userId = req.user.id;
    const options = {};

    if (!boardId || typeof boardId !== 'string') {
      res.status(400).json({ error: 'Board ID is required' });
      return;
    }

    if (!sorts || !Array.isArray(sorts) || sorts.length === 0) {
      res.status(400).json({ error: 'Sort criteria are required' });
      return;
    }

    const items = await applySorting(boardId, sorts, userId, options);
    res.json(items);
  } catch (error) {
    console.error('Error applying sorting:', error);
    res.status(500).json({ error: 'Failed to apply sorting' });
  }
});

// Search board items
router.get('/search', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { boardId, q, saveHistory } = req.query;
    const userId = req.user.id;

    if (!q) {
      res.status(400).json({ error: 'Search query is required' });
      return;
    }

    if (!boardId || typeof boardId !== 'string') {
      res.status(400).json({ error: 'Board ID is required' });
      return;
    }

    const options: SearchOptions = {
      includeContent: true,
      saveHistory: saveHistory === 'true',
    };

    const results = await searchBoardItems(boardId, q as string, userId, options);
    res.json(results);
  } catch (error) {
    console.error('Error searching board items:', error);
    res.status(500).json({ error: 'Failed to search board items' });
  }
});

// Get search history
router.get('/search/history', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { limit, offset, boardId } = req.query;
    const userId = req.user.id;

    const options: SearchHistoryOptions = {};
    
    if (limit && typeof limit === 'string') {
      const parsedLimit = parseInt(limit, 10);
      if (!isNaN(parsedLimit)) {
        options.limit = parsedLimit;
      }
    }
    
    if (offset && typeof offset === 'string') {
      const parsedOffset = parseInt(offset, 10);
      if (!isNaN(parsedOffset)) {
        options.offset = parsedOffset;
      }
    }
    
    if (boardId && typeof boardId === 'string') {
      options.boardId = boardId;
    } else {
      options.boardId = null;
    }

    const history = await getSearchHistory(userId, options);
    res.json(history);
  } catch (error) {
    console.error('Error getting search history:', error);
    res.status(500).json({ error: 'Failed to get search history' });
  }
});

// Get search suggestions
router.get('/search/suggestions', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { q, limit, boardId, includeGenerated } = req.query;
    const userId = req.user.id;

    const options: SearchSuggestionsOptions = {
      includeGenerated: includeGenerated === 'true'
    };
    
    if (limit && typeof limit === 'string') {
      const parsedLimit = parseInt(limit, 10);
      if (!isNaN(parsedLimit)) {
        options.limit = parsedLimit;
      }
    }
    
    if (boardId && typeof boardId === 'string') {
      options.boardId = boardId;
    } else {
      options.boardId = null;
    }

    const suggestions = await getSearchSuggestions(userId, q as string, options);
    res.json(suggestions);
  } catch (error) {
    console.error('Error getting search suggestions:', error);
    res.status(500).json({ error: 'Failed to get search suggestions' });
  }
});

// Refresh search index
router.post('/search/refresh-index', async (req: Request, res: Response) => {
  try {
    await refreshSearchIndex();
    res.json({ success: true });
  } catch (error) {
    console.error('Error refreshing search index:', error);
    res.status(500).json({ error: 'Failed to refresh search index' });
  }
});

// Get trending search terms
router.get('/search/trending', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { limit, boardId } = req.query;
    const userId = req.user.id;

    const options: any = {};
    
    if (limit && typeof limit === 'string') {
      const parsedLimit = parseInt(limit, 10);
      if (!isNaN(parsedLimit)) {
        options.limit = parsedLimit;
      }
    }
    
    if (boardId && typeof boardId === 'string') {
      options.boardId = boardId;
    } else {
      options.boardId = null;
    }

    const trending = await getTrendingSearchTerms(userId, options);
    res.json(trending);
  } catch (error) {
    console.error('Error getting trending search terms:', error);
    res.status(500).json({ error: 'Failed to get trending search terms' });
  }
});

// Get related search terms
router.get('/search/related', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { q, limit } = req.query;
    const userId = req.user.id;

    if (!q) {
      res.status(400).json({ error: 'Search query is required' });
      return;
    }

    const options: any = {};
    
    if (limit && typeof limit === 'string') {
      const parsedLimit = parseInt(limit, 10);
      if (!isNaN(parsedLimit)) {
        options.limit = parsedLimit;
      }
    }

    const related = await getRelatedSearchTerms(userId, q as string, options);
    res.json(related);
  } catch (error) {
    console.error('Error getting related search terms:', error);
    res.status(500).json({ error: 'Failed to get related search terms' });
  }
});

// Get view templates
router.get('/templates', async (req: Request, res: Response) => {
  try {
    const { category, limit } = req.query;

    const options: any = {};
    
    if (category && typeof category === 'string') {
      options.category = category;
    }
    
    if (limit && typeof limit === 'string') {
      const parsedLimit = parseInt(limit, 10);
      if (!isNaN(parsedLimit)) {
        options.limit = parsedLimit;
      }
    }

    const templates = await getViewTemplates(options);
    res.json(templates);
  } catch (error) {
    console.error('Error getting view templates:', error);
    res.status(500).json({ error: 'Failed to get view templates' });
  }
});

// Create view template
router.post('/templates', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { name, description, viewData, category, isPublic } = req.body;
    const userId = req.user.id;

    if (!name) {
      res.status(400).json({ error: 'Template name is required' });
      return;
    }

    const template = await createViewTemplate({
      name,
      description,
      viewData,
      category,
      isPublic: isPublic === true,
      createdBy: userId
    });

    res.status(201).json(template);
  } catch (error) {
    console.error('Error creating view template:', error);
    res.status(500).json({ error: 'Failed to create view template' });
  }
});

// Delete view template
router.delete('/templates/:templateId', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { templateId } = req.params;
    const userId = req.user.id;

    if (!templateId) {
      res.status(400).json({ error: 'Template ID is required' });
      return;
    }

    const deleted = await deleteViewTemplate(templateId, userId);
    if (!deleted) {
      res.status(404).json({ error: 'Template not found or permission denied' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting view template:', error);
    res.status(500).json({ error: 'Failed to delete view template' });
  }
});

// Create view from template
router.post('/templates/:templateId/apply', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { templateId } = req.params;
    const { boardId, name } = req.body;
    const userId = req.user.id;

    if (!templateId) {
      res.status(400).json({ error: 'Template ID is required' });
      return;
    }

    if (!boardId) {
      res.status(400).json({ error: 'Board ID is required' });
      return;
    }

    if (!name) {
      res.status(400).json({ error: 'View name is required' });
      return;
    }

    const view = await createViewFromTemplate(templateId, boardId as string, name, userId);
    if (!view) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }

    res.status(201).json(view);
  } catch (error) {
    console.error('Error creating view from template:', error);
    res.status(500).json({ error: 'Failed to create view from template' });
  }
});

export default router;