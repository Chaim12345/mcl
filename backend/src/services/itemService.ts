import { query, transaction } from '../db/client.js';
import { generateId } from '../utils/id.js';
import { isWorkspaceMember } from './workspaceService.js';
import { Priority, Status } from '../models/types.js';

export interface CreateItemData {
  title: string;
  description?: string;
  columnId: string;
  dueDate?: Date;
  priority?: Priority;
  status?: Status;
  order?: number;
  fieldValues?: Record<string, any>;
}

export interface UpdateItemData {
  title?: string;
  description?: string;
  columnId?: string;
  dueDate?: Date;
  priority?: Priority;
  status?: Status;
  order?: number;
  fieldValues?: Record<string, any>;
}

export interface ItemFieldValue {
  id: string;
  itemId: string;
  columnId: string;
  value: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface ItemWithFieldValues {
  id: string;
  title: string;
  description: string | null;
  order: number;
  boardId: string;
  columnId: string;
  dueDate: Date | null;
  priority: Priority;
  status: Status;
  createdAt: Date;
  updatedAt: Date;
  fieldValues: Record<string, any>;
}

/**
 * Validate that a user has access to a board through workspace membership
 */
async function validateBoardAccess(boardId: string, userId: string): Promise<string> {
  const boardResult = await query(
    'SELECT workspace_id FROM boards WHERE id = $1',
    [boardId]
  );

  if (boardResult.rows.length === 0) {
    throw new Error('Board not found');
  }

  const workspaceId = boardResult.rows[0].workspace_id;
  const membershipInfo = await isWorkspaceMember(workspaceId, userId);
  
  if (!membershipInfo.isMember) {
    throw new Error('User does not have access to this board');
  }

  return workspaceId;
}

/**
 * Validate that a column belongs to the specified board
 */
async function validateColumnAccess(columnId: string, boardId: string): Promise<void> {
  const columnResult = await query(
    'SELECT board_id FROM board_columns WHERE id = $1',
    [columnId]
  );

  if (columnResult.rows.length === 0) {
    throw new Error('Column not found');
  }

  if (columnResult.rows[0].board_id !== boardId) {
    throw new Error('Column does not belong to the specified board');
  }
}

/**
 * Get the next order value for a new item in a column
 */
async function getNextItemOrder(columnId: string): Promise<number> {
  const result = await query(
    'SELECT MAX("order") as max_order FROM board_items WHERE column_id = $1',
    [columnId]
  );
  
  const maxOrder = result.rows[0]?.max_order;
  return maxOrder !== null ? maxOrder + 1 : 0;
}

/**
 * Create a new board item
 */
export async function createItem(
  boardId: string,
  data: CreateItemData,
  userId: string
): Promise<ItemWithFieldValues> {
  // Validate board access
  await validateBoardAccess(boardId, userId);
  
  // Validate column belongs to board
  await validateColumnAccess(data.columnId, boardId);

  const itemId = generateId();
  const now = new Date();
  const order = data.order !== undefined ? data.order : await getNextItemOrder(data.columnId);

  return transaction(async (client) => {
    // If a specific order is provided, shift existing items
    if (data.order !== undefined) {
      await client.query(
        'UPDATE board_items SET "order" = "order" + 1 WHERE column_id = $1 AND "order" >= $2',
        [data.columnId, data.order]
      );
    }

    // Create the item
    const itemResult = await client.query(
      `INSERT INTO board_items (id, title, description, "order", board_id, column_id, due_date, priority, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        itemId,
        data.title,
        data.description || null,
        order,
        boardId,
        data.columnId,
        data.dueDate || null,
        data.priority || Priority.MEDIUM,
        data.status || Status.TODO,
        now,
        now
      ]
    );

    const item = itemResult.rows[0];

    // Store field values if provided
    const fieldValues: Record<string, any> = {};
    if (data.fieldValues) {
      for (const [columnId, value] of Object.entries(data.fieldValues)) {
        // Validate that the column exists and belongs to the board
        const columnCheck = await client.query(
          'SELECT id FROM board_columns WHERE id = $1 AND board_id = $2',
          [columnId, boardId]
        );

        if (columnCheck.rows.length > 0) {
          // For now, we'll store field values in a simple way
          // In a full implementation, you'd have an item_field_values table
          fieldValues[columnId] = value;
        }
      }
    }

    return {
      id: item.id,
      title: item.title,
      description: item.description,
      order: item.order,
      boardId: item.board_id,
      columnId: item.column_id,
      dueDate: item.due_date,
      priority: item.priority,
      status: item.status,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      fieldValues
    };
  });
}

/**
 * Get item by ID with field values
 */
export async function getItemById(itemId: string, userId: string): Promise<ItemWithFieldValues | null> {
  const itemResult = await query(
    'SELECT * FROM board_items WHERE id = $1',
    [itemId]
  );

  if (itemResult.rows.length === 0) {
    return null;
  }

  const item = itemResult.rows[0];
  
  // Validate board access
  await validateBoardAccess(item.board_id, userId);

  // For now, return empty field values since we don't have the table yet
  // In a full implementation, you'd query the item_field_values table
  const fieldValues: Record<string, any> = {};

  return {
    id: item.id,
    title: item.title,
    description: item.description,
    order: item.order,
    boardId: item.board_id,
    columnId: item.column_id,
    dueDate: item.due_date,
    priority: item.priority,
    status: item.status,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    fieldValues
  };
}

/**
 * Get all items for a board with field values
 */
export async function getItemsForBoard(boardId: string, userId: string): Promise<ItemWithFieldValues[]> {
  // Validate board access
  await validateBoardAccess(boardId, userId);

  const result = await query(
    'SELECT * FROM board_items WHERE board_id = $1 ORDER BY column_id, "order" ASC',
    [boardId]
  );

  // For now, return items with empty field values
  // In a full implementation, you'd join with item_field_values table
  return result.rows.map(item => ({
    id: item.id,
    title: item.title,
    description: item.description,
    order: item.order,
    boardId: item.board_id,
    columnId: item.column_id,
    dueDate: item.due_date,
    priority: item.priority,
    status: item.status,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    fieldValues: {}
  }));
}

/**
 * Get all items for a specific column
 */
export async function getItemsForColumn(columnId: string, userId: string): Promise<ItemWithFieldValues[]> {
  // First get the column to validate board access
  const columnResult = await query(
    'SELECT board_id FROM board_columns WHERE id = $1',
    [columnId]
  );

  if (columnResult.rows.length === 0) {
    throw new Error('Column not found');
  }

  const boardId = columnResult.rows[0].board_id;
  await validateBoardAccess(boardId, userId);

  const result = await query(
    'SELECT * FROM board_items WHERE column_id = $1 ORDER BY "order" ASC',
    [columnId]
  );

  return result.rows.map(item => ({
    id: item.id,
    title: item.title,
    description: item.description,
    order: item.order,
    boardId: item.board_id,
    columnId: item.column_id,
    dueDate: item.due_date,
    priority: item.priority,
    status: item.status,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    fieldValues: {}
  }));
}/**

 * Update an existing item
 */
export async function updateItem(
  itemId: string,
  data: UpdateItemData,
  userId: string
): Promise<ItemWithFieldValues | null> {
  // First get the item to validate board access
  const itemResult = await query(
    'SELECT board_id, column_id FROM board_items WHERE id = $1',
    [itemId]
  );

  if (itemResult.rows.length === 0) {
    return null;
  }

  const { board_id: boardId, column_id: currentColumnId } = itemResult.rows[0];
  await validateBoardAccess(boardId, userId);

  // If column is being changed, validate the new column
  if (data.columnId && data.columnId !== currentColumnId) {
    await validateColumnAccess(data.columnId, boardId);
  }

  return transaction(async (client) => {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(data.title);
    }

    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(data.description);
    }

    if (data.dueDate !== undefined) {
      updates.push(`due_date = $${paramIndex++}`);
      values.push(data.dueDate);
    }

    if (data.priority !== undefined) {
      updates.push(`priority = $${paramIndex++}`);
      values.push(data.priority);
    }

    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(data.status);
    }

    // Handle column change and reordering
    if (data.columnId !== undefined && data.columnId !== currentColumnId) {
      // Moving to a different column
      const newOrder = data.order !== undefined ? data.order : await getNextItemOrder(data.columnId);
      
      // Shift items in the new column
      await client.query(
        'UPDATE board_items SET "order" = "order" + 1 WHERE column_id = $1 AND "order" >= $2',
        [data.columnId, newOrder]
      );

      // Compact the old column
      await client.query(
        'UPDATE board_items SET "order" = "order" - 1 WHERE column_id = $1 AND "order" > (SELECT "order" FROM board_items WHERE id = $2)',
        [currentColumnId, itemId]
      );

      updates.push(`column_id = $${paramIndex++}`);
      values.push(data.columnId);
      updates.push(`"order" = $${paramIndex++}`);
      values.push(newOrder);
    } else if (data.order !== undefined) {
      // Reordering within the same column
      const currentOrderResult = await client.query(
        'SELECT "order" FROM board_items WHERE id = $1',
        [itemId]
      );
      
      const currentOrder = currentOrderResult.rows[0].order;
      
      if (currentOrder !== data.order) {
        const columnId = data.columnId || currentColumnId;
        
        if (data.order > currentOrder) {
          // Moving down - shift items up
          await client.query(
            'UPDATE board_items SET "order" = "order" - 1 WHERE column_id = $1 AND "order" > $2 AND "order" <= $3 AND id != $4',
            [columnId, currentOrder, data.order, itemId]
          );
        } else {
          // Moving up - shift items down
          await client.query(
            'UPDATE board_items SET "order" = "order" + 1 WHERE column_id = $1 AND "order" >= $2 AND "order" < $3 AND id != $4',
            [columnId, data.order, currentOrder, itemId]
          );
        }
        
        updates.push(`"order" = $${paramIndex++}`);
        values.push(data.order);
      }
    }

    if (updates.length === 0 && !data.fieldValues) {
      // No updates, return current item
      return getItemById(itemId, userId);
    }

    if (updates.length > 0) {
      updates.push(`updated_at = $${paramIndex++}`);
      values.push(new Date());
      values.push(itemId);

      await client.query(
        `UPDATE board_items SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
        values
      );
    }

    // Handle field values update
    if (data.fieldValues) {
      // In a full implementation, you'd update the item_field_values table here
      // For now, we'll just acknowledge that field values were provided
    }

    return getItemById(itemId, userId);
  });
}

/**
 * Delete an item and reorder remaining items in the column
 */
export async function deleteItem(itemId: string, userId: string): Promise<boolean> {
  // First get the item to validate board access
  const itemResult = await query(
    'SELECT board_id, column_id, "order" FROM board_items WHERE id = $1',
    [itemId]
  );

  if (itemResult.rows.length === 0) {
    return false;
  }

  const { board_id: boardId, column_id: columnId, order: deletedOrder } = itemResult.rows[0];
  await validateBoardAccess(boardId, userId);

  return transaction(async (client) => {
    // Delete the item
    const deleteResult = await client.query(
      'DELETE FROM board_items WHERE id = $1',
      [itemId]
    );

    if ((deleteResult.rowCount ?? 0) === 0) {
      return false;
    }

    // Reorder remaining items in the column
    await client.query(
      'UPDATE board_items SET "order" = "order" - 1 WHERE column_id = $1 AND "order" > $2',
      [columnId, deletedOrder]
    );

    return true;
  });
}

/**
 * Reorder items within a column or move items between columns
 */
export async function reorderItems(
  boardId: string,
  itemOrders: { itemId: string; columnId: string; order: number }[],
  userId: string
): Promise<boolean> {
  // Validate board access
  await validateBoardAccess(boardId, userId);

  return transaction(async (client) => {
    // Update each item's position and column
    for (const { itemId, columnId, order } of itemOrders) {
      // Validate that the column belongs to the board
      await validateColumnAccess(columnId, boardId);
      
      await client.query(
        'UPDATE board_items SET column_id = $1, "order" = $2, updated_at = $3 WHERE id = $4 AND board_id = $5',
        [columnId, order, new Date(), itemId, boardId]
      );
    }

    return true;
  });
}

/**
 * Move an item to a different column
 */
export async function moveItemToColumn(
  itemId: string,
  targetColumnId: string,
  targetOrder: number | undefined,
  userId: string
): Promise<ItemWithFieldValues | null> {
  // Get the item to validate board access
  const itemResult = await query(
    'SELECT board_id, column_id FROM board_items WHERE id = $1',
    [itemId]
  );

  if (itemResult.rows.length === 0) {
    return null;
  }

  const { board_id: boardId, column_id: currentColumnId } = itemResult.rows[0];
  await validateBoardAccess(boardId, userId);
  await validateColumnAccess(targetColumnId, boardId);

  if (currentColumnId === targetColumnId) {
    // Same column, just reorder if needed
    if (targetOrder !== undefined) {
      return updateItem(itemId, { order: targetOrder }, userId);
    }
    return getItemById(itemId, userId);
  }

  // Moving to different column
  const newOrder = targetOrder !== undefined ? targetOrder : await getNextItemOrder(targetColumnId);
  
  return updateItem(itemId, { 
    columnId: targetColumnId, 
    order: newOrder 
  }, userId);
}

/**
 * Assign an item to a user (update status/assignment)
 */
export async function assignItem(
  itemId: string,
  assigneeId: string,
  userId: string
): Promise<ItemWithFieldValues | null> {
  // For now, we'll use the status field to indicate assignment
  // In a full implementation, you'd have an assignee field or assignment table
  return updateItem(itemId, { 
    status: Status.IN_PROGRESS 
  }, userId);
}

/**
 * Update item status
 */
export async function updateItemStatus(
  itemId: string,
  status: Status,
  userId: string
): Promise<ItemWithFieldValues | null> {
  return updateItem(itemId, { status }, userId);
}

/**
 * Update item priority
 */
export async function updateItemPriority(
  itemId: string,
  priority: Priority,
  userId: string
): Promise<ItemWithFieldValues | null> {
  return updateItem(itemId, { priority }, userId);
}

/**
 * Bulk update items
 */
export async function bulkUpdateItems(
  boardId: string,
  updates: { itemId: string; data: UpdateItemData }[],
  userId: string
): Promise<ItemWithFieldValues[]> {
  // Validate board access
  await validateBoardAccess(boardId, userId);

  const results: ItemWithFieldValues[] = [];

  return transaction(async () => {
    for (const { itemId, data } of updates) {
      const result = await updateItem(itemId, data, userId);
      if (result) {
        results.push(result);
      }
    }
    return results;
  });
}

/**
 * Search items within a board
 */
export async function searchItems(
  boardId: string,
  searchTerm: string,
  userId: string
): Promise<ItemWithFieldValues[]> {
  // Validate board access
  await validateBoardAccess(boardId, userId);

  const result = await query(
    `SELECT * FROM board_items 
     WHERE board_id = $1 
     AND (title ILIKE $2 OR description ILIKE $2)
     ORDER BY created_at DESC`,
    [boardId, `%${searchTerm}%`]
  );

  return result.rows.map(item => ({
    id: item.id,
    title: item.title,
    description: item.description,
    order: item.order,
    boardId: item.board_id,
    columnId: item.column_id,
    dueDate: item.due_date,
    priority: item.priority,
    status: item.status,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    fieldValues: {}
  }));
}

/**
 * Filter items by criteria
 */
export async function filterItems(
  boardId: string,
  filters: {
    columnId?: string;
    status?: Status;
    priority?: Priority;
    dueDateFrom?: Date;
    dueDateTo?: Date;
  },
  userId: string
): Promise<ItemWithFieldValues[]> {
  // Validate board access
  await validateBoardAccess(boardId, userId);

  let whereClause = 'WHERE board_id = $1';
  const values: any[] = [boardId];
  let paramIndex = 2;

  if (filters.columnId) {
    whereClause += ` AND column_id = $${paramIndex++}`;
    values.push(filters.columnId);
  }

  if (filters.status) {
    whereClause += ` AND status = $${paramIndex++}`;
    values.push(filters.status);
  }

  if (filters.priority) {
    whereClause += ` AND priority = $${paramIndex++}`;
    values.push(filters.priority);
  }

  if (filters.dueDateFrom) {
    whereClause += ` AND due_date >= $${paramIndex++}`;
    values.push(filters.dueDateFrom);
  }

  if (filters.dueDateTo) {
    whereClause += ` AND due_date <= $${paramIndex++}`;
    values.push(filters.dueDateTo);
  }

  const result = await query(
    `SELECT * FROM board_items ${whereClause} ORDER BY column_id, "order" ASC`,
    values
  );

  return result.rows.map(item => ({
    id: item.id,
    title: item.title,
    description: item.description,
    order: item.order,
    boardId: item.board_id,
    columnId: item.column_id,
    dueDate: item.due_date,
    priority: item.priority,
    status: item.status,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    fieldValues: {}
  }));
}

/**
 * Validate item data
 */
export function validateItemData(data: CreateItemData | UpdateItemData): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate title
  if ('title' in data && data.title !== undefined) {
    if (typeof data.title !== 'string' || data.title.trim().length === 0) {
      errors.push('Item title is required and must be a non-empty string');
    }
    if (data.title.length > 500) {
      errors.push('Item title must be less than 500 characters');
    }
  }

  // Validate description
  if ('description' in data && data.description !== undefined && data.description !== null) {
    if (typeof data.description !== 'string') {
      errors.push('Item description must be a string');
    }
  }

  // Validate priority
  if ('priority' in data && data.priority !== undefined) {
    if (!Object.values(Priority).includes(data.priority)) {
      errors.push(`Invalid priority. Must be one of: ${Object.values(Priority).join(', ')}`);
    }
  }

  // Validate status
  if ('status' in data && data.status !== undefined) {
    if (!Object.values(Status).includes(data.status)) {
      errors.push(`Invalid status. Must be one of: ${Object.values(Status).join(', ')}`);
    }
  }

  // Validate order
  if ('order' in data && data.order !== undefined) {
    if (typeof data.order !== 'number' || data.order < 0) {
      errors.push('Order must be a non-negative number');
    }
  }

  // Validate due date
  if ('dueDate' in data && data.dueDate !== undefined && data.dueDate !== null) {
    if (!(data.dueDate instanceof Date) || isNaN(data.dueDate.getTime())) {
      errors.push('Due date must be a valid date');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}