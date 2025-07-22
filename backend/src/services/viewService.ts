import { query, transaction } from '../db/client.js';
import { validateBoardAccess } from './boardService.js';
import { FilterGroup, SortDefinition } from './filterService.js';
import { generateId } from '../utils/id.js';

/**
 * Enhanced view definition with additional metadata
 */
export interface ViewDefinition {
  id?: string;
  name: string;
  boardId: string;
  filter?: FilterGroup;
  sorts?: SortDefinition[];
  isDefault?: boolean;
  isShared?: boolean;
  isGlobal?: boolean;
  isTemplate?: boolean;
  columnsConfig?: ColumnsConfig;
  layoutConfig?: LayoutConfig;
  teamAccess?: TeamAccess;
  icon?: string;
  color?: string;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Column configuration for a view
 */
export interface ColumnsConfig {
  visibleColumns: string[];
  columnWidths: Record<string, number>;
  columnOrder: string[];
}

/**
 * Layout configuration for a view
 */
export interface LayoutConfig {
  type: 'table' | 'kanban' | 'calendar' | 'gantt' | 'list';
  groupBy?: string;
  expandedGroups?: string[];
  rowHeight?: 'small' | 'medium' | 'large';
  showEmptyColumns?: boolean;
}

/**
 * Team access configuration for a view
 */
export interface TeamAccess {
  accessType: 'private' | 'team' | 'public';
  permissions: Record<string, 'view' | 'edit' | 'manage'>;
}

/**
 * View permission level
 */
export enum ViewPermissionLevel {
  VIEW = 'view',
  EDIT = 'edit',
  MANAGE = 'manage'
}

/**
 * View template definition
 */
export interface ViewTemplate {
  id?: string;
  name: string;
  description?: string;
  filter?: FilterGroup;
  sorts?: SortDefinition[];
  columnsConfig?: ColumnsConfig;
  layoutConfig?: LayoutConfig;
  icon?: string;
  color?: string;
  category?: string;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Save a view definition
 */
export async function saveView(
  viewDef: ViewDefinition,
  userId: string
): Promise<ViewDefinition> {
  // Validate board access
  await validateBoardAccess(viewDef.boardId, userId);
  
  const now = new Date();
  const viewId = viewDef.id || generateId();
  
  return transaction(async (client) => {
    // If this is a default view, unset any existing default
    if (viewDef.isDefault) {
      await client.query(
        `UPDATE saved_views 
         SET is_default = FALSE 
         WHERE board_id = $1 AND created_by = $2 AND is_default = TRUE`,
        [viewDef.boardId, userId]
      );
    }
    
    // Insert or update the view
    const result = await client.query(
      `INSERT INTO saved_views (
         id, name, board_id, filter_json, sort_json, is_default, is_shared,
         columns_config, layout_config, team_access, is_global, is_template,
         icon, color, created_by, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         filter_json = EXCLUDED.filter_json,
         sort_json = EXCLUDED.sort_json,
         is_default = EXCLUDED.is_default,
         is_shared = EXCLUDED.is_shared,
         columns_config = EXCLUDED.columns_config,
         layout_config = EXCLUDED.layout_config,
         team_access = EXCLUDED.team_access,
         is_global = EXCLUDED.is_global,
         is_template = EXCLUDED.is_template,
         icon = EXCLUDED.icon,
         color = EXCLUDED.color,
         updated_at = EXCLUDED.updated_at
       RETURNING *`,
      [
        viewId,
        viewDef.name,
        viewDef.boardId,
        viewDef.filter ? JSON.stringify(viewDef.filter) : null,
        viewDef.sorts ? JSON.stringify(viewDef.sorts) : null,
        viewDef.isDefault || false,
        viewDef.isShared || false,
        viewDef.columnsConfig ? JSON.stringify(viewDef.columnsConfig) : null,
        viewDef.layoutConfig ? JSON.stringify(viewDef.layoutConfig) : null,
        viewDef.teamAccess ? JSON.stringify(viewDef.teamAccess) : null,
        viewDef.isGlobal || false,
        viewDef.isTemplate || false,
        viewDef.icon || null,
        viewDef.color || null,
        userId,
        viewDef.createdAt || now,
        now
      ]
    );
    
    // If this is a default view, update the board_default_views table
    if (viewDef.isDefault) {
      await client.query(
        `INSERT INTO board_default_views (id, board_id, view_id, is_global, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (board_id, is_global) DO UPDATE SET
           view_id = EXCLUDED.view_id,
           updated_at = EXCLUDED.updated_at`,
        [
          generateId(),
          viewDef.boardId,
          viewId,
          viewDef.isGlobal || false,
          now,
          now
        ]
      );
    }
    
    const savedView = result.rows[0];
    return {
      id: savedView.id,
      name: savedView.name,
      boardId: savedView.board_id,
      filter: savedView.filter_json ? JSON.parse(savedView.filter_json) : undefined,
      sorts: savedView.sort_json ? JSON.parse(savedView.sort_json) : undefined,
      isDefault: savedView.is_default,
      isShared: savedView.is_shared,
      isGlobal: savedView.is_global,
      isTemplate: savedView.is_template,
      columnsConfig: savedView.columns_config ? JSON.parse(savedView.columns_config) : undefined,
      layoutConfig: savedView.layout_config ? JSON.parse(savedView.layout_config) : undefined,
      teamAccess: savedView.team_access ? JSON.parse(savedView.team_access) : undefined,
      icon: savedView.icon,
      color: savedView.color,
      createdBy: savedView.created_by,
      createdAt: savedView.created_at,
      updatedAt: savedView.updated_at
    };
  });
}

/**
 * Get all saved views for a board
 */
export async function getSavedViews(
  boardId: string,
  userId: string,
  options: {
    includeShared?: boolean;
    includeGlobal?: boolean;
    includeTemplates?: boolean;
  } = {}
): Promise<ViewDefinition[]> {
  // Validate board access
  await validateBoardAccess(boardId, userId);
  
  const { includeShared = true, includeGlobal = true, includeTemplates = false } = options;
  
  // Build the WHERE clause based on options
  let whereConditions = ['board_id = $1'];
  const params = [boardId];
  
  // Add user-specific condition
  if (includeShared && includeGlobal) {
    whereConditions.push('(created_by = $2 OR is_shared = TRUE OR is_global = TRUE)');
    params.push(userId);
  } else if (includeShared) {
    whereConditions.push('(created_by = $2 OR is_shared = TRUE)');
    params.push(userId);
  } else if (includeGlobal) {
    whereConditions.push('(created_by = $2 OR is_global = TRUE)');
    params.push(userId);
  } else {
    whereConditions.push('created_by = $2');
    params.push(userId);
  }
  
  // Handle templates
  if (!includeTemplates) {
    whereConditions.push('(is_template = FALSE OR is_template IS NULL)');
  }
  
  const whereClause = whereConditions.join(' AND ');
  
  // Get views with permissions
  const result = await query(
    `SELECT v.*, 
       COALESCE(vp.permission_level, CASE 
         WHEN v.created_by = $2 THEN 'manage'
         WHEN v.is_shared = TRUE THEN 'view'
         WHEN v.is_global = TRUE THEN 'view'
         ELSE NULL
       END) as permission_level
     FROM saved_views v
     LEFT JOIN view_permissions vp ON v.id = vp.view_id AND vp.user_id = $2
     WHERE ${whereClause}
     ORDER BY v.is_default DESC, v.created_at DESC`,
    params
  );
  
  return result.rows.map(row => mapViewFromRow(row));
}

/**
 * Get the default view for a board
 */
export async function getDefaultView(
  boardId: string,
  userId: string,
  options: {
    useGlobal?: boolean;
  } = {}
): Promise<ViewDefinition | null> {
  // Validate board access
  await validateBoardAccess(boardId, userId);
  
  const { useGlobal = true } = options;
  
  // First try to get the user's personal default view
  let result = await query(
    `SELECT v.* FROM saved_views v
     JOIN board_default_views d ON v.id = d.view_id
     WHERE d.board_id = $1 AND v.created_by = $2 AND d.is_global = FALSE
     LIMIT 1`,
    [boardId, userId]
  );
  
  // If no personal default and useGlobal is true, try to get the global default
  if (result.rows.length === 0 && useGlobal) {
    result = await query(
      `SELECT v.* FROM saved_views v
       JOIN board_default_views d ON v.id = d.view_id
       WHERE d.board_id = $1 AND d.is_global = TRUE
       LIMIT 1`,
      [boardId]
    );
  }
  
  // If still no default, try to get any default view for the board
  if (result.rows.length === 0) {
    result = await query(
      `SELECT * FROM saved_views
       WHERE board_id = $1 AND is_default = TRUE
       ORDER BY created_at DESC
       LIMIT 1`,
      [boardId]
    );
  }
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return mapViewFromRow(result.rows[0]);
}

/**
 * Delete a saved view
 */
export async function deleteView(
  viewId: string,
  userId: string
): Promise<boolean> {
  // First get the view to validate board access
  const viewResult = await query(
    `SELECT v.board_id, v.created_by, 
       COALESCE(vp.permission_level, CASE 
         WHEN v.created_by = $2 THEN 'manage'
         ELSE NULL
       END) as permission_level
     FROM saved_views v
     LEFT JOIN view_permissions vp ON v.id = vp.view_id AND vp.user_id = $2
     WHERE v.id = $1`,
    [viewId, userId]
  );
  
  if (viewResult.rows.length === 0) {
    return false;
  }
  
  const { board_id: boardId, created_by: createdBy, permission_level: permissionLevel } = viewResult.rows[0];
  
  // Validate board access
  await validateBoardAccess(boardId, userId);
  
  // Check if user has permission to delete the view
  if (createdBy !== userId && permissionLevel !== ViewPermissionLevel.MANAGE) {
    throw new Error('You do not have permission to delete this view');
  }
  
  return transaction(async (client) => {
    // Delete any default view references
    await client.query(
      'DELETE FROM board_default_views WHERE view_id = $1',
      [viewId]
    );
    
    // Delete any view permissions
    await client.query(
      'DELETE FROM view_permissions WHERE view_id = $1',
      [viewId]
    );
    
    // Delete the view
    const result = await client.query(
      'DELETE FROM saved_views WHERE id = $1',
      [viewId]
    );
    
    return (result.rowCount ?? 0) > 0;
  });
}

/**
 * Share a view with other team members
 */
export async function shareView(
  viewId: string,
  isShared: boolean,
  userId: string
): Promise<ViewDefinition | null> {
  // First get the view to validate board access and ownership
  const viewResult = await query(
    'SELECT * FROM saved_views WHERE id = $1 AND created_by = $2',
    [viewId, userId]
  );
  
  if (viewResult.rows.length === 0) {
    return null;
  }
  
  // Validate board access
  await validateBoardAccess(viewResult.rows[0].board_id, userId);
  
  // Update the view
  const result = await query(
    `UPDATE saved_views 
     SET is_shared = $1, updated_at = $2
     WHERE id = $3 AND created_by = $4
     RETURNING *`,
    [isShared, new Date(), viewId, userId]
  );
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return mapViewFromRow(result.rows[0]);
}

/**
 * Set a view as the default for a board
 */
export async function setDefaultView(
  viewId: string,
  boardId: string,
  userId: string,
  options: {
    isGlobal?: boolean;
  } = {}
): Promise<boolean> {
  // Validate board access
  await validateBoardAccess(boardId, userId);
  
  const { isGlobal = false } = options;
  
  // Check if the view exists and belongs to the board
  const viewResult = await query(
    'SELECT board_id FROM saved_views WHERE id = $1',
    [viewId]
  );
  
  if (viewResult.rows.length === 0 || viewResult.rows[0].board_id !== boardId) {
    return false;
  }
  
  return transaction(async (client) => {
    // Update the view to be default
    await client.query(
      `UPDATE saved_views 
       SET is_default = TRUE, updated_at = $1
       WHERE id = $2`,
      [new Date(), viewId]
    );
    
    // Update or insert into board_default_views
    await client.query(
      `INSERT INTO board_default_views (id, board_id, view_id, is_global, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (board_id, is_global) DO UPDATE SET
         view_id = EXCLUDED.view_id,
         updated_at = EXCLUDED.updated_at`,
      [
        generateId(),
        boardId,
        viewId,
        isGlobal,
        new Date(),
        new Date()
      ]
    );
    
    return true;
  });
}

/**
 * Set view permissions for a user
 */
export async function setViewPermission(
  viewId: string,
  targetUserId: string,
  permissionLevel: ViewPermissionLevel,
  userId: string
): Promise<boolean> {
  // First get the view to validate board access and ownership
  const viewResult = await query(
    'SELECT board_id, created_by FROM saved_views WHERE id = $1',
    [viewId]
  );
  
  if (viewResult.rows.length === 0) {
    return false;
  }
  
  const { board_id: boardId, created_by: createdBy } = viewResult.rows[0];
  
  // Validate board access
  await validateBoardAccess(boardId, userId);
  
  // Check if user has permission to set permissions
  if (createdBy !== userId) {
    throw new Error('Only the view creator can set permissions');
  }
  
  // Insert or update the permission
  const result = await query(
    `INSERT INTO view_permissions (id, view_id, user_id, permission_level, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (view_id, user_id) DO UPDATE SET
       permission_level = EXCLUDED.permission_level,
       updated_at = EXCLUDED.updated_at`,
    [
      generateId(),
      viewId,
      targetUserId,
      permissionLevel,
      new Date(),
      new Date()
    ]
  );
  
  return (result.rowCount ?? 0) > 0;
}

/**
 * Get view permissions for a view
 */
export async function getViewPermissions(
  viewId: string,
  userId: string
): Promise<{ userId: string; permissionLevel: ViewPermissionLevel }[]> {
  // First get the view to validate board access and ownership
  const viewResult = await query(
    'SELECT board_id, created_by FROM saved_views WHERE id = $1',
    [viewId]
  );
  
  if (viewResult.rows.length === 0) {
    return [];
  }
  
  const { board_id: boardId, created_by: createdBy } = viewResult.rows[0];
  
  // Validate board access
  await validateBoardAccess(boardId, userId);
  
  // Check if user has permission to view permissions
  if (createdBy !== userId) {
    throw new Error('Only the view creator can view permissions');
  }
  
  // Get all permissions for the view
  const result = await query(
    'SELECT user_id, permission_level FROM view_permissions WHERE view_id = $1',
    [viewId]
  );
  
  return result.rows.map(row => ({
    userId: row.user_id,
    permissionLevel: row.permission_level as ViewPermissionLevel
  }));
}

/**
 * Copy a view
 */
export async function copyView(
  sourceViewId: string,
  newName: string,
  userId: string
): Promise<ViewDefinition | null> {
  // First get the view to validate board access
  const viewResult = await query(
    'SELECT board_id FROM saved_views WHERE id = $1',
    [sourceViewId]
  );
  
  if (viewResult.rows.length === 0) {
    return null;
  }
  
  const { board_id: boardId } = viewResult.rows[0];
  
  // Validate board access
  await validateBoardAccess(boardId, userId);
  
  // Use the database function to copy the view
  const result = await query(
    'SELECT copy_view($1, $2, $3) as new_view_id',
    [sourceViewId, newName, userId]
  );
  
  if (result.rows.length === 0) {
    return null;
  }
  
  const newViewId = result.rows[0].new_view_id;
  
  // Get the new view
  const newViewResult = await query(
    'SELECT * FROM saved_views WHERE id = $1',
    [newViewId]
  );
  
  if (newViewResult.rows.length === 0) {
    return null;
  }
  
  return mapViewFromRow(newViewResult.rows[0]);
}

/**
 * Helper function to map a database row to a ViewDefinition
 */
function mapViewFromRow(row: any): ViewDefinition {
  return {
    id: row.id,
    name: row.name,
    boardId: row.board_id,
    filter: row.filter_json ? JSON.parse(row.filter_json) : undefined,
    sorts: row.sort_json ? JSON.parse(row.sort_json) : undefined,
    isDefault: row.is_default,
    isShared: row.is_shared,
    isGlobal: row.is_global,
    isTemplate: row.is_template,
    columnsConfig: row.columns_config ? JSON.parse(row.columns_config) : undefined,
    layoutConfig: row.layout_config ? JSON.parse(row.layout_config) : undefined,
    teamAccess: row.team_access ? JSON.parse(row.team_access) : undefined,
    icon: row.icon,
    color: row.color,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}/**

 * Create a view template
 */
export async function createViewTemplate(
  template: ViewTemplate,
  userId: string
): Promise<ViewTemplate> {
  const now = new Date();
  const templateId = template.id || generateId();
  
  const result = await query(
    `INSERT INTO view_templates (
       id, name, description, filter_json, sort_json, columns_config, layout_config,
       icon, color, category, created_by, created_at, updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING *`,
    [
      templateId,
      template.name,
      template.description || null,
      template.filter ? JSON.stringify(template.filter) : null,
      template.sorts ? JSON.stringify(template.sorts) : null,
      template.columnsConfig ? JSON.stringify(template.columnsConfig) : null,
      template.layoutConfig ? JSON.stringify(template.layoutConfig) : null,
      template.icon || null,
      template.color || null,
      template.category || 'General',
      userId,
      now,
      now
    ]
  );
  
  const savedTemplate = result.rows[0];
  return {
    id: savedTemplate.id,
    name: savedTemplate.name,
    description: savedTemplate.description,
    filter: savedTemplate.filter_json ? JSON.parse(savedTemplate.filter_json) : undefined,
    sorts: savedTemplate.sort_json ? JSON.parse(savedTemplate.sort_json) : undefined,
    columnsConfig: savedTemplate.columns_config ? JSON.parse(savedTemplate.columns_config) : undefined,
    layoutConfig: savedTemplate.layout_config ? JSON.parse(savedTemplate.layout_config) : undefined,
    icon: savedTemplate.icon,
    color: savedTemplate.color,
    category: savedTemplate.category,
    createdBy: savedTemplate.created_by,
    createdAt: savedTemplate.created_at,
    updatedAt: savedTemplate.updated_at
  };
}

/**
 * Get all view templates
 */
export async function getViewTemplates(
  options: {
    category?: string;
    createdBy?: string;
  } = {}
): Promise<ViewTemplate[]> {
  const { category, createdBy } = options;
  
  let whereClause = '';
  const params: any[] = [];
  
  if (category && createdBy) {
    whereClause = 'WHERE category = $1 AND created_by = $2';
    params.push(category, createdBy);
  } else if (category) {
    whereClause = 'WHERE category = $1';
    params.push(category);
  } else if (createdBy) {
    whereClause = 'WHERE created_by = $1';
    params.push(createdBy);
  }
  
  const result = await query(
    `SELECT * FROM view_templates
     ${whereClause}
     ORDER BY category, name`,
    params
  );
  
  return result.rows.map(row => ({
    id: row.id,
    name: row.name,
    description: row.description,
    filter: row.filter_json ? JSON.parse(row.filter_json) : undefined,
    sorts: row.sort_json ? JSON.parse(row.sort_json) : undefined,
    columnsConfig: row.columns_config ? JSON.parse(row.columns_config) : undefined,
    layoutConfig: row.layout_config ? JSON.parse(row.layout_config) : undefined,
    icon: row.icon,
    color: row.color,
    category: row.category,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}

/**
 * Create a view from a template
 */
export async function createViewFromTemplate(
  templateId: string,
  boardId: string,
  viewName: string,
  userId: string
): Promise<ViewDefinition | null> {
  // Validate board access
  await validateBoardAccess(boardId, userId);
  
  // Get the template
  const templateResult = await query(
    'SELECT * FROM view_templates WHERE id = $1',
    [templateId]
  );
  
  if (templateResult.rows.length === 0) {
    return null;
  }
  
  const template = templateResult.rows[0];
  
  // Create a new view from the template
  const viewId = generateId();
  const now = new Date();
  
  const result = await query(
    `INSERT INTO saved_views (
       id, name, board_id, filter_json, sort_json, columns_config, layout_config,
       icon, color, created_by, created_at, updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [
      viewId,
      viewName,
      boardId,
      template.filter_json,
      template.sort_json,
      template.columns_config,
      template.layout_config,
      template.icon,
      template.color,
      userId,
      now,
      now
    ]
  );
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return mapViewFromRow(result.rows[0]);
}

/**
 * Delete a view template
 */
export async function deleteViewTemplate(
  templateId: string,
  userId: string
): Promise<boolean> {
  // Check if the template exists and belongs to the user
  const templateResult = await query(
    'SELECT created_by FROM view_templates WHERE id = $1',
    [templateId]
  );
  
  if (templateResult.rows.length === 0) {
    return false;
  }
  
  // Only the creator can delete the template
  if (templateResult.rows[0].created_by !== userId) {
    throw new Error('Only the template creator can delete it');
  }
  
  // Delete the template
  const result = await query(
    'DELETE FROM view_templates WHERE id = $1',
    [templateId]
  );
  
  return (result.rowCount ?? 0) > 0;
}

/**
 * Apply multi-column sorting to a query
 */
export async function applySorting(
  boardId: string,
  sorts: SortDefinition[],
  userId: string,
  options: {
    limit?: number;
    offset?: number;
  } = {}
): Promise<any[]> {
  // Validate board access
  await validateBoardAccess(boardId, userId);
  
  const { limit = 100, offset = 0 } = options;
  
  // Build the ORDER BY clause
  let orderByClause = '';
  
  if (sorts && sorts.length > 0) {
    const orderClauses = sorts.map(sort => {
      // Map field names to database columns
      let fieldName: string;
      switch (sort.field) {
        case 'title':
          fieldName = 'i.title';
          break;
        case 'description':
          fieldName = 'i.description';
          break;
        case 'status':
          fieldName = 'i.status';
          break;
        case 'priority':
          fieldName = 'i.priority';
          break;
        case 'dueDate':
          fieldName = 'i.due_date';
          break;
        case 'columnId':
          fieldName = 'i.column_id';
          break;
        case 'createdAt':
          fieldName = 'i.created_at';
          break;
        case 'updatedAt':
          fieldName = 'i.updated_at';
          break;
        default:
          // For custom fields, we would need to join with field values table
          fieldName = `i.${sort.field}`;
      }
      
      return `${fieldName} ${sort.direction}`;
    });
    
    orderByClause = `ORDER BY ${orderClauses.join(', ')}`;
  } else {
    // Default sorting
    orderByClause = 'ORDER BY i.column_id ASC, i."order" ASC';
  }
  
  // Execute the query
  const result = await query(
    `SELECT i.* FROM board_items i
     WHERE i.board_id = $1
     ${orderByClause}
     LIMIT $2 OFFSET $3`,
    [boardId, limit, offset]
  );
  
  return result.rows;
}

/**
 * Validate a view definition
 */
export function validateView(view: ViewDefinition): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Validate required fields
  if (!view.name || view.name.trim().length === 0) {
    errors.push('View name is required');
  }
  
  if (!view.boardId) {
    errors.push('Board ID is required');
  }
  
  // Validate layout config if provided
  if (view.layoutConfig) {
    const validLayoutTypes = ['table', 'kanban', 'calendar', 'gantt', 'list'];
    if (!validLayoutTypes.includes(view.layoutConfig.type)) {
      errors.push(`Invalid layout type. Must be one of: ${validLayoutTypes.join(', ')}`);
    }
    
    if (view.layoutConfig.rowHeight && !['small', 'medium', 'large'].includes(view.layoutConfig.rowHeight)) {
      errors.push('Invalid row height. Must be one of: small, medium, large');
    }
  }
  
  // Validate columns config if provided
  if (view.columnsConfig) {
    if (view.columnsConfig.visibleColumns && !Array.isArray(view.columnsConfig.visibleColumns)) {
      errors.push('Visible columns must be an array');
    }
    
    if (view.columnsConfig.columnOrder && !Array.isArray(view.columnsConfig.columnOrder)) {
      errors.push('Column order must be an array');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}