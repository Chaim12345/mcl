import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  createBoard,
  getBoardById,
  getBoardsForWorkspace,
  updateBoard,
  deleteBoard,
  createColumn,
  updateColumn,
  deleteColumn,
  reorderColumns,
  getColumnsForBoard,
  validateColumnData,
  CreateBoardData,
  UpdateBoardData,
  CreateColumnData,
  UpdateColumnData
} from '../services/boardService.js';
import {
  createItem,
  getItemById,
  getItemsForBoard,
  updateItem,
  deleteItem,
  reorderItems,
  moveItemToColumn,
  bulkUpdateItems,
  searchItems,
  filterItems,
  validateItemData,
  CreateItemData,
  UpdateItemData
} from '../services/itemService.js';

const router = Router();

// Helper function to validate authenticated user
function validateUser(req: Request, res: Response): req is Request & { user: { id: string } } {
  if (!req.user) {
    res.status(401).json({ error: 'User not authenticated' });
    return false;
  }
  return true;
}

// ===== BOARD ROUTES =====

/**
 * GET /api/workspaces/:workspaceId/boards
 * Get all boards for a workspace
 */
router.get('/workspaces/:workspaceId/boards', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { workspaceId } = req.params;
    
    if (!validateUser(req, res)) return;
    if (!workspaceId) {
      res.status(400).json({ error: 'Workspace ID is required' });
      return;
    }
    
    const userId = req.user.id;
    const boards = await getBoardsForWorkspace(workspaceId, userId);
    res.json(boards);
  } catch (error) {
    console.error('Error fetching boards:', error);
    if (error instanceof Error) {
      if (error.message.includes('access')) {
        res.status(403).json({ error: error.message });
        return;
      }
    }
    res.status(500).json({ error: 'Failed to fetch boards' });
  }
});

/**
 * POST /api/workspaces/:workspaceId/boards
 * Create a new board in a workspace
 */
router.post('/workspaces/:workspaceId/boards', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { workspaceId } = req.params;
    
    if (!validateUser(req, res)) return;
    
    const userId = req.user.id;
    const boardData: CreateBoardData = {
      ...req.body,
      workspaceId
    };

    // Validate required fields
    if (!boardData.name || boardData.name.trim().length === 0) {
      res.status(400).json({ error: 'Board name is required' });
      return;
    }

    if (boardData.name.length > 255) {
      res.status(400).json({ error: 'Board name must be less than 255 characters' });
      return;
    }

    const board = await createBoard(boardData, userId);
    res.status(201).json(board);
  } catch (error) {
    console.error('Error creating board:', error);
    if (error instanceof Error) {
      if (error.message.includes('access')) {
        res.status(403).json({ error: error.message });
        return;
      }
    }
    res.status(500).json({ error: 'Failed to create board' });
  }
});

/**
 * GET /api/boards/:id
 * Get a specific board with full data (columns and items)
 */
router.get('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    if (!req.user) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    
    if (!id) {
      res.status(400).json({ error: 'Board ID is required' });
      return;
    }
    
    const userId = req.user.id;
    const board = await getBoardById(id, userId);
    if (!board) {
      res.status(404).json({ error: 'Board not found' });
      return;
    }

    res.json(board);
  } catch (error) {
    console.error('Error fetching board:', error);
    if (error instanceof Error) {
      if (error.message.includes('access')) {
        res.status(403).json({ error: error.message });
        return;
      }
    }
    res.status(500).json({ error: 'Failed to fetch board' });
  }
});

/**
 * PUT /api/boards/:id
 * Update board information
 */
router.put('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    if (!validateUser(req, res)) return;
    if (!id) {
      res.status(400).json({ error: 'Board ID is required' });
      return;
    }
    
    const userId = req.user.id;
    const updateData: UpdateBoardData = req.body;

    // Validate update data
    if (updateData.name !== undefined) {
      if (typeof updateData.name !== 'string' || updateData.name.trim().length === 0) {
        res.status(400).json({ error: 'Board name must be a non-empty string' });
        return;
      }
      if (updateData.name.length > 255) {
        res.status(400).json({ error: 'Board name must be less than 255 characters' });
        return;
      }
    }

    const board = await updateBoard(id, updateData, userId);
    if (!board) {
      res.status(404).json({ error: 'Board not found' });
      return;
    }

    res.json(board);
  } catch (error) {
    console.error('Error updating board:', error);
    if (error instanceof Error) {
      if (error.message.includes('access')) {
        res.status(403).json({ error: error.message });
        return;
      }
    }
    res.status(500).json({ error: 'Failed to update board' });
  }
});

/**
 * DELETE /api/boards/:id
 * Delete a board and all related data
 */
router.delete('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    if (!validateUser(req, res)) return;
    if (!id) {
      res.status(400).json({ error: 'Board ID is required' });
      return;
    }
    
    const userId = req.user.id;

    const deleted = await deleteBoard(id, userId);
    if (!deleted) {
      res.status(404).json({ error: 'Board not found' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting board:', error);
    if (error instanceof Error) {
      if (error.message.includes('access')) {
        res.status(403).json({ error: error.message });
        return;
      }
    }
    res.status(500).json({ error: 'Failed to delete board' });
  }
});

// ===== COLUMN ROUTES =====

/**
 * GET /api/boards/:boardId/columns
 * Get all columns for a board
 */
router.get('/:boardId/columns', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { boardId } = req.params;
    
    if (!validateUser(req, res)) return;
    if (!boardId) {
      res.status(400).json({ error: 'Board ID is required' });
      return;
    }
    
    const userId = req.user.id;

    const columns = await getColumnsForBoard(boardId, userId);
    res.json(columns);
  } catch (error) {
    console.error('Error fetching columns:', error);
    if (error instanceof Error) {
      if (error.message.includes('access') || error.message.includes('not found')) {
        res.status(403).json({ error: error.message });
        return;
      }
    }
    res.status(500).json({ error: 'Failed to fetch columns' });
  }
});

/**
 * POST /api/boards/:boardId/columns
 * Create a new column for a board
 */
router.post('/:boardId/columns', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { boardId } = req.params;
    
    if (!validateUser(req, res)) return;
    if (!boardId) {
      res.status(400).json({ error: 'Board ID is required' });
      return;
    }
    
    const userId = req.user.id;
    const columnData: CreateColumnData = req.body;

    // Validate column data
    const validation = validateColumnData(columnData);
    if (!validation.isValid) {
      res.status(400).json({ error: validation.errors.join(', ') });
      return;
    }

    const column = await createColumn(boardId, columnData, userId);
    res.status(201).json(column);
  } catch (error) {
    console.error('Error creating column:', error);
    if (error instanceof Error) {
      if (error.message.includes('access') || error.message.includes('not found')) {
        res.status(403).json({ error: error.message });
        return;
      }
    }
    res.status(500).json({ error: 'Failed to create column' });
  }
});

/**
 * PUT /api/columns/:columnId
 * Update a column
 */
router.put('/columns/:columnId', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { columnId } = req.params;
    
    if (!validateUser(req, res)) return;
    if (!columnId) {
      res.status(400).json({ error: 'Column ID is required' });
      return;
    }
    
    const userId = req.user.id;
    const updateData: UpdateColumnData = req.body;

    // Validate column data
    const validation = validateColumnData(updateData);
    if (!validation.isValid) {
      res.status(400).json({ error: validation.errors.join(', ') });
      return;
    }

    const column = await updateColumn(columnId, updateData, userId);
    if (!column) {
      res.status(404).json({ error: 'Column not found' });
      return;
    }

    res.json(column);
  } catch (error) {
    console.error('Error updating column:', error);
    if (error instanceof Error) {
      if (error.message.includes('access') || error.message.includes('not found')) {
        res.status(403).json({ error: error.message });
        return;
      }
    }
    res.status(500).json({ error: 'Failed to update column' });
  }
});

/**
 * DELETE /api/columns/:columnId
 * Delete a column
 */
router.delete('/columns/:columnId', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { columnId } = req.params;
    
    if (!validateUser(req, res)) return;
    if (!columnId) {
      res.status(400).json({ error: 'Column ID is required' });
      return;
    }
    
    const userId = req.user.id;

    const deleted = await deleteColumn(columnId, userId);
    if (!deleted) {
      res.status(404).json({ error: 'Column not found' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting column:', error);
    if (error instanceof Error) {
      if (error.message.includes('access') || error.message.includes('not found')) {
        res.status(403).json({ error: error.message });
        return;
      }
    }
    res.status(500).json({ error: 'Failed to delete column' });
  }
});

/**
 * PUT /api/boards/:boardId/columns/reorder
 * Reorder columns in a board
 */
router.put('/:boardId/columns/reorder', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { boardId } = req.params;
    
    if (!validateUser(req, res)) return;
    if (!boardId) {
      res.status(400).json({ error: 'Board ID is required' });
      return;
    }
    
    const userId = req.user.id;
    const { columnOrders }: { columnOrders: { columnId: string; order: number }[] } = req.body;

    if (!Array.isArray(columnOrders)) {
      res.status(400).json({ error: 'columnOrders must be an array' });
      return;
    }

    const success = await reorderColumns(boardId, columnOrders, userId);
    if (!success) {
      res.status(400).json({ error: 'Failed to reorder columns' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error reordering columns:', error);
    if (error instanceof Error) {
      if (error.message.includes('access') || error.message.includes('not found')) {
        res.status(403).json({ error: error.message });
        return;
      }
    }
    res.status(500).json({ error: 'Failed to reorder columns' });
  }
});

// ===== ITEM ROUTES =====

/**
 * GET /api/boards/:boardId/items
 * Get all items for a board
 */
router.get('/:boardId/items', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { boardId } = req.params;
    
    if (!validateUser(req, res)) return;
    
    const userId = req.user.id;
    const { search, columnId, status, priority } = req.query;

    let items;

    if (search && boardId) {
      // Search items
      items = await searchItems(boardId, search as string, userId);
    } else if (columnId || status || priority) {
      // Filter items
      const filters: any = {};
      if (columnId) filters.columnId = columnId as string;
      if (status) filters.status = status as string;
      if (priority) filters.priority = priority as string;
      
      if (boardId) {
        items = await filterItems(boardId, filters, userId);
      }
    } else if (boardId) {
      // Get all items
      items = await getItemsForBoard(boardId, userId);
    }

    res.json(items);
  } catch (error) {
    console.error('Error fetching items:', error);
    if (error instanceof Error) {
      if (error.message.includes('access') || error.message.includes('not found')) {
        res.status(403).json({ error: error.message });
        return;
      }
    }
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

/**
 * POST /api/boards/:boardId/items
 * Create a new item in a board
 */
router.post('/:boardId/items', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { boardId } = req.params;
    
    if (!validateUser(req, res)) return;
    
    const userId = req.user.id;
    const itemData: CreateItemData = req.body;

    // Validate item data
    const validation = validateItemData(itemData);
    if (!validation.isValid) {
      res.status(400).json({ error: validation.errors.join(', ') });
      return;
    }

    // Ensure columnId is provided
    if (!itemData.columnId) {
      res.status(400).json({ error: 'columnId is required' });
      return;
    }

    if (!boardId) {
      res.status(400).json({ error: 'Board ID is required' });
      return;
    }

    const item = await createItem(boardId, itemData, userId);
    res.status(201).json(item);
  } catch (error) {
    console.error('Error creating item:', error);
    if (error instanceof Error) {
      if (error.message.includes('access') || error.message.includes('not found')) {
        res.status(403).json({ error: error.message });
        return;
      }
    }
    res.status(500).json({ error: 'Failed to create item' });
  }
});

/**
 * GET /api/items/:itemId
 * Get a specific item
 */
router.get('/items/:itemId', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { itemId } = req.params;
    
    if (!validateUser(req, res)) return;
    
    const userId = req.user.id;

    if (!itemId) {
      res.status(400).json({ error: 'Item ID is required' });
      return;
    }

    const item = await getItemById(itemId, userId);
    if (!item) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }

    res.json(item);
  } catch (error) {
    console.error('Error fetching item:', error);
    if (error instanceof Error) {
      if (error.message.includes('access')) {
        res.status(403).json({ error: error.message });
        return;
      }
    }
    res.status(500).json({ error: 'Failed to fetch item' });
  }
});

/**
 * PUT /api/items/:itemId
 * Update an item
 */
router.put('/items/:itemId', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { itemId } = req.params;
    
    if (!validateUser(req, res)) return;
    
    const userId = req.user.id;
    const updateData: UpdateItemData = req.body;

    // Validate item data
    const validation = validateItemData(updateData);
    if (!validation.isValid) {
      res.status(400).json({ error: validation.errors.join(', ') });
      return;
    }

    if (!itemId) {
      res.status(400).json({ error: 'Item ID is required' });
      return;
    }

    const item = await updateItem(itemId, updateData, userId);
    if (!item) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }

    res.json(item);
  } catch (error) {
    console.error('Error updating item:', error);
    if (error instanceof Error) {
      if (error.message.includes('access') || error.message.includes('not found')) {
        res.status(403).json({ error: error.message });
        return;
      }
    }
    res.status(500).json({ error: 'Failed to update item' });
  }
});

/**
 * DELETE /api/items/:itemId
 * Delete an item
 */
router.delete('/items/:itemId', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { itemId } = req.params;
    
    if (!validateUser(req, res)) return;
    
    const userId = req.user.id;

    if (!itemId) {
      res.status(400).json({ error: 'Item ID is required' });
      return;
    }

    const deleted = await deleteItem(itemId, userId);
    if (!deleted) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting item:', error);
    if (error instanceof Error) {
      if (error.message.includes('access')) {
        res.status(403).json({ error: error.message });
        return;
      }
    }
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

/**
 * PUT /api/boards/:boardId/items/reorder
 * Reorder items within a board (supports drag and drop)
 */
router.put('/:boardId/items/reorder', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { boardId } = req.params;
    
    if (!validateUser(req, res)) return;
    
    const userId = req.user.id;
    const { itemOrders }: { itemOrders: { itemId: string; columnId: string; order: number }[] } = req.body;

    if (!Array.isArray(itemOrders)) {
      res.status(400).json({ error: 'itemOrders must be an array' });
      return;
    }

    if (!boardId) {
      res.status(400).json({ error: 'Board ID is required' });
      return;
    }

    const success = await reorderItems(boardId, itemOrders, userId);
    if (!success) {
      res.status(400).json({ error: 'Failed to reorder items' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error reordering items:', error);
    if (error instanceof Error) {
      if (error.message.includes('access') || error.message.includes('not found')) {
        res.status(403).json({ error: error.message });
        return;
      }
    }
    res.status(500).json({ error: 'Failed to reorder items' });
  }
});

/**
 * PUT /api/items/:itemId/move
 * Move an item to a different column
 */
router.put('/items/:itemId/move', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { itemId } = req.params;
    
    if (!validateUser(req, res)) return;
    
    const userId = req.user.id;
    const { targetColumnId, targetOrder } = req.body;

    if (!targetColumnId) {
      res.status(400).json({ error: 'targetColumnId is required' });
      return;
    }

    if (!itemId) {
      res.status(400).json({ error: 'Item ID is required' });
      return;
    }

    const item = await moveItemToColumn(itemId, targetColumnId, targetOrder, userId);
    if (!item) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }

    res.json(item);
  } catch (error) {
    console.error('Error moving item:', error);
    if (error instanceof Error) {
      if (error.message.includes('access') || error.message.includes('not found')) {
        res.status(403).json({ error: error.message });
        return;
      }
    }
    res.status(500).json({ error: 'Failed to move item' });
  }
});

/**
 * PUT /api/boards/:boardId/items/bulk
 * Bulk update multiple items
 */
router.put('/:boardId/items/bulk', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { boardId } = req.params;
    
    if (!validateUser(req, res)) return;
    
    const userId = req.user.id;
    const { updates }: { updates: { itemId: string; data: UpdateItemData }[] } = req.body;

    if (!Array.isArray(updates)) {
      res.status(400).json({ error: 'updates must be an array' });
      return;
    }

    // Validate each update
    for (const update of updates) {
      const validation = validateItemData(update.data);
      if (!validation.isValid) {
        res.status(400).json({ 
          error: `Invalid data for item ${update.itemId}: ${validation.errors.join(', ')}` 
        });
        return;
      }
    }

    if (!boardId) {
      res.status(400).json({ error: 'Board ID is required' });
      return;
    }

    const items = await bulkUpdateItems(boardId, updates, userId);
    res.json(items);
  } catch (error) {
    
    if (error instanceof Error) {
      if (error.message.includes('access') || error.message.includes('not found')) {
        res.status(403).json({ error: error.message });
        return;
      }
    }
    res.status(500).json({ error: 'Failed to bulk update items' });
  }
});

export default router;