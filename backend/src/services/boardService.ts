import { query, transaction } from '../db/client.js';
import { generateId } from '../utils/id.js';
import { isWorkspaceMember } from './workspaceService.js';

export interface CreateBoardData {
  name: string;
  description?: string;
  icon?: string;
  workspaceId: string;
}

export interface UpdateBoardData {
  name?: string;
  description?: string;
  icon?: string;
}

export interface BoardColumn {
  id: string;
  name: string;
  order: number;
  boardId: string;
  fieldType: 'text' | 'status' | 'people' | 'date' | 'tags' | 'number' | 'checkbox';
  options?: string[]; // For status, tags, etc.
  required?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateColumnData {
  name: string;
  fieldType: 'text' | 'status' | 'people' | 'date' | 'tags' | 'number' | 'checkbox';
  options?: string[];
  required?: boolean;
  order?: number;
}

export interface UpdateColumnData {
  name?: string;
  fieldType?: 'text' | 'status' | 'people' | 'date' | 'tags' | 'number' | 'checkbox';
  options?: string[];
  required?: boolean;
  order?: number;
}

export interface BoardItem {
  id: string;
  title: string;
  description: string | null;
  order: number;
  boardId: string;
  columnId: string;
  dueDate: Date | null;
  priority: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BoardWithDetails {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  workspaceId: string;
  createdAt: Date;
  updatedAt: Date;
  columns: BoardColumn[];
  items: BoardItem[];
}

/**
 * Default columns to create when a new board is created
 */
const DEFAULT_COLUMNS = [
  { name: 'To Do', order: 0 },
  { name: 'In Progress', order: 1 },
  { name: 'Review', order: 2 },
  { name: 'Done', order: 3 }
];

/**
 * Validate that a user has access to a workspace
 */
async function validateWorkspaceAccess(workspaceId: string, userId: string): Promise<void> {
  const membershipInfo = await isWorkspaceMember(workspaceId, userId);
  if (!membershipInfo.isMember) {
    throw new Error('User does not have access to this workspace');
  }
}

/**
 * Create a new board with default columns
 */
export async function createBoard(data: CreateBoardData, userId: string): Promise<BoardWithDetails> {
  // Validate workspace access
  await validateWorkspaceAccess(data.workspaceId, userId);

  return transaction(async (client) => {
    const boardId = generateId();
    const now = new Date();

    // Create the board
    await client.query(
      `INSERT INTO boards (id, name, description, icon, "workspaceId", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [boardId, data.name, data.description || null, data.icon || null, data.workspaceId, now, now]
    );

    // Create default columns
    for (const columnData of DEFAULT_COLUMNS) {
      const columnId = generateId();
      await client.query(
        `INSERT INTO board_columns (id, name, "order", board_id, field_type, required, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [columnId, columnData.name, columnData.order, boardId, 'status', false, now, now]
      );
    }

    return boardId;
  }).then(async (boardId) => {
    // Get the complete board with columns and items
    const board = await getBoardById(boardId, userId);
    if (!board) {
      throw new Error('Failed to create board');
    }
    return board;
  });
}

/**
 * Get board by ID with columns and items
 */
export async function getBoardById(boardId: string, userId: string): Promise<BoardWithDetails | null> {
  // First get the board to check workspace access
  const boardResult = await query(
    'SELECT * FROM boards WHERE id = $1',
    [boardId]
  );

  if (boardResult.rows.length === 0) {
    return null;
  }

  const board = boardResult.rows[0];
  
  // Validate workspace access
  await validateWorkspaceAccess(board.workspaceId, userId);

  // Get board with columns and items
  const result = await query(
    `SELECT 
      b.id as board_id, b.name as board_name, b.description as board_description, 
      b.icon as board_icon, b."workspaceId" as workspace_id, b."createdAt" as board_created_at, 
      b."updatedAt" as board_updated_at,
      c.id as column_id, c.name as column_name, c."order" as column_order,
      c.field_type, c.options, c.required,
      c.created_at as column_created_at, c.updated_at as column_updated_at,
      i.id as item_id, i.title as item_title, i.description as item_description,
      i."order" as item_order, i.due_date, i.priority, i.status,
      i.created_at as item_created_at, i.updated_at as item_updated_at
     FROM boards b
     LEFT JOIN board_columns c ON b.id = c.board_id
     LEFT JOIN board_items i ON b.id = i.board_id AND c.id = i.column_id
     WHERE b.id = $1
     ORDER BY c."order" ASC, i."order" ASC`,
    [boardId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const firstRow = result.rows[0];
  const boardWithDetails: BoardWithDetails = {
    id: firstRow.board_id,
    name: firstRow.board_name,
    description: firstRow.board_description,
    icon: firstRow.board_icon,
    workspaceId: firstRow.workspace_id,
    createdAt: firstRow.board_created_at,
    updatedAt: firstRow.board_updated_at,
    columns: [],
    items: []
  };

  // Build columns and items from joined results
  const columnsMap = new Map<string, BoardColumn>();
  
  for (const row of result.rows) {
    // Add column if not already added
    if (row.column_id && !columnsMap.has(row.column_id)) {
      const column: BoardColumn = {
        id: row.column_id,
        name: row.column_name,
        order: row.column_order,
        boardId: row.board_id,
        fieldType: row.field_type,
        options: row.options ? JSON.parse(row.options) : undefined,
        required: row.required,
        createdAt: row.column_created_at,
        updatedAt: row.column_updated_at
      };
      columnsMap.set(row.column_id, column);
      boardWithDetails.columns.push(column);
    }

    // Add item if exists
    if (row.item_id) {
      const item: BoardItem = {
        id: row.item_id,
        title: row.item_title,
        description: row.item_description,
        order: row.item_order,
        boardId: row.board_id,
        columnId: row.column_id,
        dueDate: row.due_date,
        priority: row.priority,
        status: row.status,
        createdAt: row.item_created_at,
        updatedAt: row.item_updated_at
      };
      boardWithDetails.items.push(item);
    }
  }

  return boardWithDetails;
}

/**
 * Get all boards for a workspace
 */
export async function getBoardsForWorkspace(workspaceId: string, userId: string): Promise<BoardWithDetails[]> {
  // Validate workspace access
  await validateWorkspaceAccess(workspaceId, userId);

  const result = await query(
    `SELECT 
      b.id as board_id, b.name as board_name, b.description as board_description, 
      b.icon as board_icon, b."workspaceId" as workspace_id, b."createdAt" as board_created_at, 
      b."updatedAt" as board_updated_at,
      c.id as column_id, c.name as column_name, c."order" as column_order,
      c.field_type, c.options, c.required,
      c."createdAt" as column_created_at, c."updatedAt" as column_updated_at,
      i.id as item_id, i.title as item_title, i.description as item_description,
      i."order" as item_order, i.due_date, i.priority, i.status,
      i.created_at as item_created_at, i.updated_at as item_updated_at
     FROM boards b
     LEFT JOIN board_columns c ON b.id = c.board_id
     LEFT JOIN board_items i ON b.id = i.board_id AND c.id = i.column_id
     WHERE b."workspaceId" = $1
     ORDER BY b.created_at DESC, c."order" ASC, i."order" ASC`,
    [workspaceId]
  );

  // Group results by board
  const boardsMap = new Map<string, BoardWithDetails>();

  for (const row of result.rows) {
    if (!boardsMap.has(row.board_id)) {
      boardsMap.set(row.board_id, {
        id: row.board_id,
        name: row.board_name,
        description: row.board_description,
        icon: row.board_icon,
        workspaceId: row.workspace_id,
        createdAt: row.board_created_at,
        updatedAt: row.board_updated_at,
        columns: [],
        items: []
      });
    }

    const board = boardsMap.get(row.board_id)!;
    
    // Add column if not already added
    if (row.column_id && !board.columns.find(c => c.id === row.column_id)) {
      board.columns.push({
        id: row.column_id,
        name: row.column_name,
        order: row.column_order,
        boardId: row.board_id,
        fieldType: row.field_type,
        options: row.options ? JSON.parse(row.options) : undefined,
        required: row.required,
        createdAt: row.column_created_at,
        updatedAt: row.column_updated_at
      });
    }

    // Add item if exists
    if (row.item_id && !board.items.find(i => i.id === row.item_id)) {
      board.items.push({
        id: row.item_id,
        title: row.item_title,
        description: row.item_description,
        order: row.item_order,
        boardId: row.board_id,
        columnId: row.column_id,
        dueDate: row.due_date,
        priority: row.priority,
        status: row.status,
        createdAt: row.item_created_at,
        updatedAt: row.item_updated_at
      });
    }
  }

  return Array.from(boardsMap.values());
}

/**
 * Update board information
 */
export async function updateBoard(
  boardId: string, 
  data: UpdateBoardData,
  userId: string
): Promise<BoardWithDetails | null> {
  // First get the board to check workspace access
  const boardResult = await query(
    'SELECT "workspaceId" FROM boards WHERE id = $1',
    [boardId]
  );

  if (boardResult.rows.length === 0) {
    return null;
  }

  // Validate workspace access
  await validateWorkspaceAccess(boardResult.rows[0].workspaceId, userId);

  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (data.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(data.name);
  }

  if (data.description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    values.push(data.description);
  }

  if (data.icon !== undefined) {
    updates.push(`icon = $${paramIndex++}`);
    values.push(data.icon);
  }

  if (updates.length === 0) {
    return getBoardById(boardId, userId);
  }

  updates.push(`updated_at = $${paramIndex++}`);
  values.push(new Date());
  values.push(boardId);

  await query(
    `UPDATE boards SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
    values
  );

  return getBoardById(boardId, userId);
}

/**
 * Delete a board and all related data
 */
export async function deleteBoard(boardId: string, userId: string): Promise<boolean> {
  // First get the board to check workspace access
  const boardResult = await query(
    'SELECT "workspaceId" FROM boards WHERE id = $1',
    [boardId]
  );

  if (boardResult.rows.length === 0) {
    return false;
  }

  // Validate workspace access
  await validateWorkspaceAccess(boardResult.rows[0].workspaceId, userId);

  const result = await query(
    'DELETE FROM boards WHERE id = $1',
    [boardId]
  );

  return (result.rowCount ?? 0) > 0;
}

// ===== DYNAMIC COLUMN MANAGEMENT =====

/**
 * Validate board access for column operations
 */
export async function validateBoardAccess(boardId: string, userId: string): Promise<string> {
  const boardResult = await query(
    'SELECT "workspaceId" FROM boards WHERE id = $1',
    [boardId]
  );

  if (boardResult.rows.length === 0) {
    throw new Error('Board not found');
  }

  const workspaceId = boardResult.rows[0].workspaceId;
  await validateWorkspaceAccess(workspaceId, userId);
  
  return workspaceId;
}

/**
 * Get the next order value for a new column
 */
async function getNextColumnOrder(boardId: string): Promise<number> {
  const result = await query(
    'SELECT MAX("order") as max_order FROM board_columns WHERE board_id = $1',
    [boardId]
  );
  
  const maxOrder = result.rows[0]?.max_order;
  return maxOrder !== null ? maxOrder + 1 : 0;
}

/**
 * Create a new column for a board
 */
export async function createColumn(
  boardId: string,
  data: CreateColumnData,
  userId: string
): Promise<BoardColumn> {
  // Validate board access
  await validateBoardAccess(boardId, userId);

  const columnId = generateId();
  const now = new Date();
  const order = data.order !== undefined ? data.order : await getNextColumnOrder(boardId);

  // If a specific order is provided, shift existing columns
  if (data.order !== undefined) {
    await query(
      'UPDATE board_columns SET "order" = "order" + 1 WHERE board_id = $1 AND "order" >= $2',
      [boardId, data.order]
    );
  }

  const result = await query(
    `INSERT INTO board_columns (id, name, "order", board_id, field_type, options, required, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      columnId,
      data.name,
      order,
      boardId,
      data.fieldType,
      data.options ? JSON.stringify(data.options) : null,
      data.required || false,
      now,
      now
    ]
  );

  const column = result.rows[0];
  return {
    id: column.id,
    name: column.name,
    order: column.order,
    boardId: column.board_id,
    fieldType: column.field_type,
    options: column.options ? JSON.parse(column.options) : undefined,
    required: column.required,
    createdAt: column.created_at,
    updatedAt: column.updated_at
  };
}

/**
 * Update a column
 */
export async function updateColumn(
  columnId: string,
  data: UpdateColumnData,
  userId: string
): Promise<BoardColumn | null> {
  // First get the column to validate board access
  const columnResult = await query(
    'SELECT board_id FROM board_columns WHERE id = $1',
    [columnId]
  );

  if (columnResult.rows.length === 0) {
    return null;
  }

  const boardId = columnResult.rows[0].board_id;
  await validateBoardAccess(boardId, userId);

  const updates: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (data.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(data.name);
  }

  if (data.fieldType !== undefined) {
    updates.push(`field_type = $${paramIndex++}`);
    values.push(data.fieldType);
  }

  if (data.options !== undefined) {
    updates.push(`options = $${paramIndex++}`);
    values.push(data.options ? JSON.stringify(data.options) : null);
  }

  if (data.required !== undefined) {
    updates.push(`required = $${paramIndex++}`);
    values.push(data.required);
  }

  if (data.order !== undefined) {
    // Handle reordering
    const currentOrderResult = await query(
      'SELECT "order" FROM board_columns WHERE id = $1',
      [columnId]
    );
    
    const currentOrder = currentOrderResult.rows[0].order;
    
    if (currentOrder !== data.order) {
      // Shift other columns to make space
      if (data.order > currentOrder) {
        // Moving down - shift columns up
        await query(
          'UPDATE board_columns SET "order" = "order" - 1 WHERE board_id = $1 AND "order" > $2 AND "order" <= $3 AND id != $4',
          [boardId, currentOrder, data.order, columnId]
        );
      } else {
        // Moving up - shift columns down
        await query(
          'UPDATE board_columns SET "order" = "order" + 1 WHERE board_id = $1 AND "order" >= $2 AND "order" < $3 AND id != $4',
          [boardId, data.order, currentOrder, columnId]
        );
      }
      
      updates.push(`"order" = $${paramIndex++}`);
      values.push(data.order);
    }
  }

  if (updates.length === 0) {
    // No updates, return current column
    const result = await query(
      'SELECT * FROM board_columns WHERE id = $1',
      [columnId]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const column = result.rows[0];
    return {
      id: column.id,
      name: column.name,
      order: column.order,
      boardId: column.board_id,
      fieldType: column.field_type,
      options: column.options ? JSON.parse(column.options) : undefined,
      required: column.required,
      createdAt: column.created_at,
      updatedAt: column.updated_at
    };
  }

  updates.push(`updated_at = $${paramIndex++}`);
  values.push(new Date());
  values.push(columnId);

  const result = await query(
    `UPDATE board_columns SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    return null;
  }

  const column = result.rows[0];
  return {
    id: column.id,
    name: column.name,
    order: column.order,
    boardId: column.board_id,
    fieldType: column.field_type,
    options: column.options ? JSON.parse(column.options) : undefined,
    required: column.required,
    createdAt: column.created_at,
    updatedAt: column.updated_at
  };
}

/**
 * Delete a column and reorder remaining columns
 */
export async function deleteColumn(columnId: string, userId: string): Promise<boolean> {
  // First get the column to validate board access
  const columnResult = await query(
    'SELECT board_id, "order" FROM board_columns WHERE id = $1',
    [columnId]
  );

  if (columnResult.rows.length === 0) {
    return false;
  }

  const { board_id: boardId, order: deletedOrder } = columnResult.rows[0];
  await validateBoardAccess(boardId, userId);

  return transaction(async (client) => {
    // Delete the column
    const deleteResult = await client.query(
      'DELETE FROM board_columns WHERE id = $1',
      [columnId]
    );

    if ((deleteResult.rowCount ?? 0) === 0) {
      return false;
    }

    // Reorder remaining columns
    await client.query(
      'UPDATE board_columns SET "order" = "order" - 1 WHERE board_id = $1 AND "order" > $2',
      [boardId, deletedOrder]
    );

    return true;
  });
}

/**
 * Reorder columns in a board
 */
export async function reorderColumns(
  boardId: string,
  columnOrders: { columnId: string; order: number }[],
  userId: string
): Promise<boolean> {
  // Validate board access
  await validateBoardAccess(boardId, userId);

  return transaction(async (client) => {
    // Update each column's order
    for (const { columnId, order } of columnOrders) {
      await client.query(
        'UPDATE board_columns SET "order" = $1, updated_at = $2 WHERE id = $3 AND board_id = $4',
        [order, new Date(), columnId, boardId]
      );
    }

    return true;
  });
}

/**
 * Get all columns for a board
 */
export async function getColumnsForBoard(boardId: string, userId: string): Promise<BoardColumn[]> {
  // Validate board access
  await validateBoardAccess(boardId, userId);

  const result = await query(
    'SELECT * FROM board_columns WHERE board_id = $1 ORDER BY "order" ASC',
    [boardId]
  );

  return result.rows.map(column => ({
    id: column.id,
    name: column.name,
    order: column.order,
    boardId: column.board_id,
    fieldType: column.field_type,
    options: column.options ? JSON.parse(column.options) : undefined,
    required: column.required,
    createdAt: column.created_at,
    updatedAt: column.updated_at
  }));
}

/**
 * Validate field type and options
 */
export function validateColumnData(data: CreateColumnData | UpdateColumnData): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate field type
  const validFieldTypes = ['text', 'status', 'people', 'date', 'tags', 'number', 'checkbox'];
  if (data.fieldType && !validFieldTypes.includes(data.fieldType)) {
    errors.push(`Invalid field type. Must be one of: ${validFieldTypes.join(', ')}`);
  }

  // Validate options for specific field types
  if (data.fieldType === 'status' || data.fieldType === 'tags') {
    if (!data.options || !Array.isArray(data.options) || data.options.length === 0) {
      errors.push(`Field type '${data.fieldType}' requires at least one option`);
    }
  }

  // Validate name
  if ('name' in data && data.name !== undefined) {
    if (typeof data.name !== 'string' || data.name.trim().length === 0) {
      errors.push('Column name is required and must be a non-empty string');
    }
    if (data.name.length > 255) {
      errors.push('Column name must be less than 255 characters');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}