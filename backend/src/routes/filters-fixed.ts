import { Router, Request, Response } from 'express';
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

const router = Router();

// Extend Request type to include user
interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: string;
    };
}

// Apply filter to board items
router.post('/apply', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { boardId } = req.query;
        const { filter, sorts } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

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
        // Log error for debugging
        if (error instanceof Error) {
            // Handle known error types
        }
        res.status(500).json({ error: 'Failed to apply filter' });
    }
});

// Apply simple filter criteria
router.post('/simple', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { boardId } = req.query;
        const { columnId, status, priority, dueDateFrom, dueDateTo, searchTerm, sorts } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        // Create a simple filter from the criteria
        const filterOptions: {
            columnId?: string;
            status?: Status;
            priority?: Priority;
            dueDateFrom?: Date;
            dueDateTo?: Date;
            searchTerm?: string;
        } = {};

        if (columnId) filterOptions.columnId = columnId;
        if (status) filterOptions.status = status as Status;
        if (priority) filterOptions.priority = priority as Priority;
        if (dueDateFrom) filterOptions.dueDateFrom = new Date(dueDateFrom);
        if (dueDateTo) filterOptions.dueDateTo = new Date(dueDateTo);
        if (searchTerm) filterOptions.searchTerm = searchTerm;

        const filter = createSimpleFilter(filterOptions);

        if (!boardId || typeof boardId !== 'string') {
            res.status(400).json({ error: 'Board ID is required' });
            return;
        }

        const items = await filterBoardItems(boardId, filter, userId, sorts);
        res.json(items);
    } catch (error) {
        // Log error for debugging
        if (error instanceof Error) {
            // Handle known error types
        }
        res.status(500).json({ error: 'Failed to apply filter' });
    }
});

// Get saved filters for a board
router.get('/saved', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { boardId } = req.query;
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        if (!boardId || typeof boardId !== 'string') {
            res.status(400).json({ error: 'Board ID is required' });
            return;
        }

        const filters = await getSavedFilters(boardId, userId);
        res.json(filters);
    } catch (error) {
        // Log error for debugging
        if (error instanceof Error) {
            // Handle known error types
        }
        res.status(500).json({ error: 'Failed to get saved filters' });
    }
});

// Save a filter
router.post('/save', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { name, filter, isDefault } = req.body;
        const { boardId } = req.query;
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

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
        // Log error in production environment
        res.status(500).json({ error: 'Failed to save filter' });
    }
});

// Delete a saved filter
router.delete('/:filterId', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { filterId } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

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
        // Log error in production environment
        res.status(500).json({ error: 'Failed to delete filter' });
    }
});

// Get saved views for a board
router.get('/views', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { boardId } = req.query;
        const { includeShared, includeDefault } = req.query;
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

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
        // Log error in production environment
        res.status(500).json({ error: 'Failed to get saved views' });
    }
});

// Get default view for a board
router.get('/views/default', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { boardId } = req.query;
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

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
        // Log error in production environment
        res.status(500).json({ error: 'Failed to get default view' });
    }
});

// Save a view
router.post('/views/save', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { name, viewData, isDefault } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

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
            boardId: req.query.boardId as string,
            createdBy: userId,
            isDefault: isDefault === true,
            ...viewData
        }, userId);

        res.json(savedView);
    } catch (error) {
        // Log error in production environment
        res.status(500).json({ error: 'Failed to save view' });
    }
});

// Delete a saved view
router.delete('/views/:viewId', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { viewId } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

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
        // Log error in production environment
        res.status(500).json({ error: 'Failed to delete view' });
    }
});

// Share a view
router.post('/views/:viewId/share', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { viewId } = req.params;
        const { isShared } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

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
        // Log error in production environment
        res.status(500).json({ error: 'Failed to share view' });
    }
});

// Set default view
router.post('/views/:viewId/default', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { viewId } = req.params;
        const { boardId } = req.query;
        const userId = req.user?.id;
        const options = {};

        if (!userId) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

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
        // Log error in production environment
        res.status(500).json({ error: 'Failed to set default view' });
    }
});

// Copy a view
router.post('/views/:viewId/copy', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { viewId } = req.params;
        const { name } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

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
        // Log error in production environment
        res.status(500).json({ error: 'Failed to copy view' });
    }
});

// Set view permission for a user
router.post('/views/:viewId/permissions', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { viewId } = req.params;
        const { targetUserId, permissionLevel } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

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
        // Log error in production environment
        res.status(500).json({ error: 'Failed to set view permission' });
    }
});

// Get view permissions
router.get('/views/:viewId/permissions', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { viewId } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        if (!viewId) {
            res.status(400).json({ error: 'View ID is required' });
            return;
        }

        const permissions = await getViewPermissions(viewId, userId);
        res.json(permissions);
    } catch (error) {
        // Log error in production environment
        res.status(500).json({ error: 'Failed to get view permissions' });
    }
});

// Apply sorting
router.post('/sort', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { boardId } = req.query;
        const { sorts } = req.body;
        const userId = req.user?.id;
        const options = {};

        if (!userId) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

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
        // Log error in production environment
        res.status(500).json({ error: 'Failed to apply sorting' });
    }
});

// Search board items
router.get('/search', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { boardId, q, saveHistory } = req.query;
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

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
        // Log error in production environment
        res.status(500).json({ error: 'Failed to search board items' });
    }
});

// Get search history
router.get('/search/history', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { limit, offset, boardId } = req.query;
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        const options = {
            limit: limit ? parseInt(limit as string, 10) : undefined,
            offset: offset ? parseInt(offset as string, 10) : undefined,
            boardId: boardId ? boardId as string : null
        } as SearchHistoryOptions;

        const history = await getSearchHistory(userId, options);
        res.json(history);
    } catch (error) {
        // Log error in production environment
        res.status(500).json({ error: 'Failed to get search history' });
    }
});

// Get search suggestions
router.get('/search/suggestions', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { q, limit, boardId, includeGenerated } = req.query;
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        const options = {
            limit: limit ? parseInt(limit as string, 10) : undefined,
            boardId: boardId ? boardId as string : null,
            includeGenerated: includeGenerated === 'true'
        } as SearchSuggestionsOptions;

        const suggestions = await getSearchSuggestions(userId, q as string, options);
        res.json(suggestions);
    } catch (error) {
        // Log error in production environment
        res.status(500).json({ error: 'Failed to get search suggestions' });
    }
});

// Refresh search index
router.post('/search/refresh-index', async (_req: Request, res: Response) => {
    try {
        await refreshSearchIndex();
        res.json({ success: true });
    } catch (error) {
        // Log error in production environment
        res.status(500).json({ error: 'Failed to refresh search index' });
    }
});

// Get trending search terms
router.get('/search/trending', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { limit, boardId } = req.query;
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        const trending = await getTrendingSearchTerms(
            userId,
            {
                limit: limit ? parseInt(limit as string, 10) : undefined,
                boardId: boardId ? boardId as string : null
            }
        );

        res.json(trending);
    } catch (error) {
        // Log error in production environment
        res.status(500).json({ error: 'Failed to get trending search terms' });
    }
});

// Get related search terms
router.get('/search/related', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { q, limit } = req.query;
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        if (!q) {
            res.status(400).json({ error: 'Search query is required' });
            return;
        }

        const related = await getRelatedSearchTerms(
            userId,
            q as string,
            {
                limit: limit ? parseInt(limit as string, 10) : undefined
            }
        );

        res.json(related);
    } catch (error) {
        // Log error in production environment
        res.status(500).json({ error: 'Failed to get related search terms' });
    }
});

// Get view templates
router.get('/templates', async (req: Request, res: Response) => {
    try {
        const { category, limit } = req.query;

        const options = {
            category: category as string,
            limit: limit ? parseInt(limit as string, 10) : undefined
        };

        const templates = await getViewTemplates(options);
        res.json(templates);
    } catch (error) {
        // Log error in production environment
        res.status(500).json({ error: 'Failed to get view templates' });
    }
});

// Create view template
router.post('/templates', async (req: Request, res: Response) => {
    try {
        const { name, description, viewData, category, isPublic } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

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
        
        res.status(500).json({ error: 'Failed to create view template' });
    }
});

// Delete view template
router.delete('/templates/:templateId', async (req: Request, res: Response) => {
    try {
        const { templateId } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

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

        res.status(500).json({ error: 'Failed to delete view template' });
    }
});

// Create view from template
router.post('/templates/:templateId/apply', async (req: Request, res: Response) => {
    try {
        const { templateId } = req.params;
        const { boardId, name } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

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

        res.status(500).json({ error: 'Failed to create view from template' });
    }
});

export default router;