import { query } from '../db/client.js';
import { validateBoardAccess } from './boardService.js';
import { Priority, Status } from '../models/types.js';

/**
 * Filter condition types for building dynamic queries
 */
export enum FilterOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  CONTAINS = 'contains',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  GREATER_THAN_EQUALS = 'greater_than_equals',
  LESS_THAN_EQUALS = 'less_than_equals',
  BETWEEN = 'between',
  IN = 'in',
}

/**
 * Logical operators for combining filter conditions
 */
export enum LogicalOperator {
  AND = 'AND',
  OR = 'OR',
}

/**
 * Filter condition for a single field
 */
export interface FilterCondition {
  field: string;
  operator: FilterOperator;
  value: any;
  valueEnd?: any; // For BETWEEN operator
}

/**
 * Filter group with logical operator and conditions
 */
export interface FilterGroup {
  operator: LogicalOperator;
  conditions: (FilterCondition | FilterGroup)[];
}

/**
 * Filter definition with metadata
 */
export interface FilterDefinition {
  id?: string;
  name: string;
  boardId: string;
  filter: FilterGroup;
  isDefault?: boolean;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Sort direction for column sorting
 */
export enum SortDirection {
  ASC = 'ASC',
  DESC = 'DESC',
}

/**
 * Sort definition for a column
 */
export interface SortDefinition {
  field: string;
  direction: SortDirection;
}

/**
 * View definition with filters and sorting
 */
export interface ViewDefinition {
  id?: string;
  name: string;
  boardId: string;
  filter?: FilterGroup;
  sorts?: SortDefinition[];
  isDefault?: boolean;
  isShared?: boolean;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Build a SQL WHERE clause from a filter group
 */
function buildWhereClause(
  filter: FilterGroup | FilterCondition,
  params: any[],
  tableAlias: string = 'i'
): { sql: string; paramIndex: number } {
  // Handle filter group (with nested conditions)
  if ('operator' in filter && 'conditions' in filter) {
    const group = filter as FilterGroup;
    
    if (group.conditions.length === 0) {
      return { sql: '1=1', paramIndex: params.length + 1 };
    }
    
    const conditions: string[] = [];
    let paramIndex = params.length + 1;
    
    for (const condition of group.conditions) {
      const result = buildWhereClause(condition, params, tableAlias);
      conditions.push(result.sql);
      paramIndex = result.paramIndex;
    }
    
    const operator = group.operator === LogicalOperator.AND ? 'AND' : 'OR';
    return { 
      sql: `(${conditions.join(` ${operator} `)})`, 
      paramIndex 
    };
  }
  
  // Handle single condition
  const condition = filter as FilterCondition;
  let paramIndex = params.length + 1;
  let sql: string;
  
  // Map field names to database columns
  let fieldName: string;
  switch (condition.field) {
    case 'title':
      fieldName = `${tableAlias}.title`;
      break;
    case 'description':
      fieldName = `${tableAlias}.description`;
      break;
    case 'status':
      fieldName = `${tableAlias}.status`;
      break;
    case 'priority':
      fieldName = `${tableAlias}.priority`;
      break;
    case 'dueDate':
      fieldName = `${tableAlias}.due_date`;
      break;
    case 'columnId':
      fieldName = `${tableAlias}.column_id`;
      break;
    case 'createdAt':
      fieldName = `${tableAlias}.created_at`;
      break;
    case 'updatedAt':
      fieldName = `${tableAlias}.updated_at`;
      break;
    default:
      // For custom fields, we would need to join with field values table
      // This is a simplified version
      fieldName = `${tableAlias}.${condition.field}`;
  }
  
  // Build SQL based on operator
  switch (condition.operator) {
    case FilterOperator.EQUALS:
      if (condition.value === null) {
        sql = `${fieldName} IS NULL`;
      } else {
        sql = `${fieldName} = $${paramIndex}`;
        params.push(condition.value);
        paramIndex++;
      }
      break;
      
    case FilterOperator.NOT_EQUALS:
      if (condition.value === null) {
        sql = `${fieldName} IS NOT NULL`;
      } else {
        sql = `${fieldName} <> $${paramIndex}`;
        params.push(condition.value);
        paramIndex++;
      }
      break;
      
    case FilterOperator.CONTAINS:
      sql = `${fieldName} ILIKE $${paramIndex}`;
      params.push(`%${condition.value}%`);
      paramIndex++;
      break;
      
    case FilterOperator.GREATER_THAN:
      sql = `${fieldName} > $${paramIndex}`;
      params.push(condition.value);
      paramIndex++;
      break;
      
    case FilterOperator.LESS_THAN:
      sql = `${fieldName} < $${paramIndex}`;
      params.push(condition.value);
      paramIndex++;
      break;
      
    case FilterOperator.GREATER_THAN_EQUALS:
      sql = `${fieldName} >= $${paramIndex}`;
      params.push(condition.value);
      paramIndex++;
      break;
      
    case FilterOperator.LESS_THAN_EQUALS:
      sql = `${fieldName} <= $${paramIndex}`;
      params.push(condition.value);
      paramIndex++;
      break;
      
    case FilterOperator.BETWEEN:
      sql = `${fieldName} BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
      params.push(condition.value);
      params.push(condition.valueEnd);
      paramIndex += 2;
      break;
      
    case FilterOperator.IN:
      if (Array.isArray(condition.value) && condition.value.length > 0) {
        const placeholders = condition.value.map((_, i) => `$${paramIndex + i}`).join(', ');
        sql = `${fieldName} IN (${placeholders})`;
        params.push(...condition.value);
        paramIndex += condition.value.length;
      } else {
        // Empty IN clause would cause SQL error, so use FALSE instead
        sql = '1=0';
      }
      break;
      
    default:
      sql = '1=1'; // Default to no filter if operator is unknown
  }
  
  return { sql, paramIndex };
}

/**
 * Build a SQL ORDER BY clause from sort definitions
 */
function buildOrderByClause(sorts: SortDefinition[], tableAlias: string = 'i'): string {
  if (!sorts || sorts.length === 0) {
    return `${tableAlias}.column_id ASC, ${tableAlias}."order" ASC`;
  }
  
  const orderClauses = sorts.map(sort => {
    // Map field names to database columns
    let fieldName: string;
    switch (sort.field) {
      case 'title':
        fieldName = `${tableAlias}.title`;
        break;
      case 'description':
        fieldName = `${tableAlias}.description`;
        break;
      case 'status':
        fieldName = `${tableAlias}.status`;
        break;
      case 'priority':
        fieldName = `${tableAlias}.priority`;
        break;
      case 'dueDate':
        fieldName = `${tableAlias}.due_date`;
        break;
      case 'columnId':
        fieldName = `${tableAlias}.column_id`;
        break;
      case 'createdAt':
        fieldName = `${tableAlias}.created_at`;
        break;
      case 'updatedAt':
        fieldName = `${tableAlias}.updated_at`;
        break;
      default:
        // For custom fields, we would need to join with field values table
        fieldName = `${tableAlias}.${sort.field}`;
    }
    
    return `${fieldName} ${sort.direction}`;
  });
  
  return orderClauses.join(', ');
}

/**
 * Filter items by complex criteria
 */
export async function filterBoardItems(
  boardId: string,
  filter: FilterGroup,
  userId: string,
  sorts?: SortDefinition[]
) {
  // Validate board access
  await validateBoardAccess(boardId, userId);
  
  const params: unknown[] = [boardId];
  const { sql: whereClause } = buildWhereClause(filter, params);
  const orderByClause = buildOrderByClause(sorts || []);
  
  const result = await query(
    `SELECT i.* FROM board_items i
     WHERE i.board_id = $1 AND ${whereClause}
     ORDER BY ${orderByClause}`,
    params
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
    fieldValues: {} // In a full implementation, you'd join with field values
  }));
}

/**
 * Save a filter definition
 */
export async function saveFilter(
  filterDef: FilterDefinition,
  userId: string
): Promise<FilterDefinition> {
  // Validate board access
  await validateBoardAccess(filterDef.boardId, userId);
  
  const now = new Date();
  const filterId = filterDef.id || `filter_${Date.now()}`;
  
  // If this is a default filter, unset any existing default
  if (filterDef.isDefault) {
    await query(
      `UPDATE saved_filters 
       SET is_default = FALSE 
       WHERE board_id = $1 AND created_by = $2 AND is_default = TRUE`,
      [filterDef.boardId, userId]
    );
  }
  
  // Insert or update the filter
  const result = await query(
    `INSERT INTO saved_filters (
       id, name, board_id, filter_json, is_default, created_by, created_at, updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       filter_json = EXCLUDED.filter_json,
       is_default = EXCLUDED.is_default,
       updated_at = EXCLUDED.updated_at
     RETURNING *`,
    [
      filterId,
      filterDef.name,
      filterDef.boardId,
      JSON.stringify(filterDef.filter),
      filterDef.isDefault || false,
      userId,
      filterDef.createdAt || now,
      now
    ]
  );
  
  const savedFilter = result.rows[0];
  return {
    id: savedFilter.id,
    name: savedFilter.name,
    boardId: savedFilter.board_id,
    filter: JSON.parse(savedFilter.filter_json),
    isDefault: savedFilter.is_default,
    createdBy: savedFilter.created_by,
    createdAt: savedFilter.created_at,
    updatedAt: savedFilter.updated_at
  };
}

/**
 * Get all saved filters for a board
 */
export async function getSavedFilters(
  boardId: string,
  userId: string
): Promise<FilterDefinition[]> {
  // Validate board access
  await validateBoardAccess(boardId, userId);
  
  const result = await query(
    `SELECT * FROM saved_filters
     WHERE board_id = $1 AND created_by = $2
     ORDER BY created_at DESC`,
    [boardId, userId]
  );
  
  return result.rows.map(row => ({
    id: row.id,
    name: row.name,
    boardId: row.board_id,
    filter: JSON.parse(row.filter_json),
    isDefault: row.is_default,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}

/**
 * Delete a saved filter
 */
export async function deleteFilter(
  filterId: string,
  userId: string
): Promise<boolean> {
  // First get the filter to validate board access
  const filterResult = await query(
    'SELECT board_id FROM saved_filters WHERE id = $1',
    [filterId]
  );
  
  if (filterResult.rows.length === 0) {
    return false;
  }
  
  // Validate board access
  await validateBoardAccess(filterResult.rows[0].board_id, userId);
  
  // Delete the filter
  const result = await query(
    'DELETE FROM saved_filters WHERE id = $1 AND created_by = $2',
    [filterId, userId]
  );
  
  return (result.rowCount ?? 0) > 0;
}

/**
 * Create a simple filter from basic criteria
 */
export function createSimpleFilter(criteria: {
  columnId?: string;
  status?: Status;
  priority?: Priority;
  dueDateFrom?: Date;
  dueDateTo?: Date;
  searchTerm?: string;
}): FilterGroup {
  const conditions: FilterCondition[] = [];
  
  if (criteria.columnId) {
    conditions.push({
      field: 'columnId',
      operator: FilterOperator.EQUALS,
      value: criteria.columnId
    });
  }
  
  if (criteria.status) {
    conditions.push({
      field: 'status',
      operator: FilterOperator.EQUALS,
      value: criteria.status
    });
  }
  
  if (criteria.priority) {
    conditions.push({
      field: 'priority',
      operator: FilterOperator.EQUALS,
      value: criteria.priority
    });
  }
  
  if (criteria.dueDateFrom && criteria.dueDateTo) {
    conditions.push({
      field: 'dueDate',
      operator: FilterOperator.BETWEEN,
      value: criteria.dueDateFrom,
      valueEnd: criteria.dueDateTo
    });
  } else if (criteria.dueDateFrom) {
    conditions.push({
      field: 'dueDate',
      operator: FilterOperator.GREATER_THAN_EQUALS,
      value: criteria.dueDateFrom
    });
  } else if (criteria.dueDateTo) {
    conditions.push({
      field: 'dueDate',
      operator: FilterOperator.LESS_THAN_EQUALS,
      value: criteria.dueDateTo
    });
  }
  
  if (criteria.searchTerm) {
    // Create a sub-group for search with OR conditions
    const searchConditions: FilterCondition[] = [
      {
        field: 'title',
        operator: FilterOperator.CONTAINS,
        value: criteria.searchTerm
      },
      {
        field: 'description',
        operator: FilterOperator.CONTAINS,
        value: criteria.searchTerm
      }
    ];
    
    const searchGroup: FilterGroup = {
      operator: LogicalOperator.OR,
      conditions: searchConditions
    };
    // Type assertion to handle the union type properly
    (conditions as (FilterCondition | FilterGroup)[]).push(searchGroup);
  }
  
  return {
    operator: LogicalOperator.AND,
    conditions
  };
}

/**
 * Validate a filter definition
 */
export function validateFilter(filter: FilterGroup): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  function validateFilterGroup(group: FilterGroup): void {
    if (!group.operator || !Object.values(LogicalOperator).includes(group.operator)) {
      errors.push(`Invalid logical operator: ${group.operator}`);
    }
    
    if (!Array.isArray(group.conditions)) {
      errors.push('Filter conditions must be an array');
      return;
    }
    
    if (group.conditions.length === 0) {
      errors.push('Filter must have at least one condition');
      return;
    }
    
    for (const condition of group.conditions) {
      if ('operator' in condition && 'conditions' in condition) {
        // Nested group
        validateFilterGroup(condition as FilterGroup);
      } else {
        // Single condition
        validateFilterCondition(condition as FilterCondition);
      }
    }
  }
  
  function validateFilterCondition(condition: FilterCondition): void {
    if (!condition.field) {
      errors.push('Filter condition must have a field');
    }
    
    if (!condition.operator || !Object.values(FilterOperator).includes(condition.operator)) {
      errors.push(`Invalid filter operator: ${condition.operator}`);
    }
    
    // Validate value based on operator
    if (condition.operator === FilterOperator.BETWEEN && condition.valueEnd === undefined) {
      errors.push('BETWEEN operator requires both value and valueEnd');
    }
    
    if (condition.operator === FilterOperator.IN && 
        (!Array.isArray(condition.value) || condition.value.length === 0)) {
      errors.push('IN operator requires a non-empty array value');
    }
  }
  
  validateFilterGroup(filter);
  
  return {
    isValid: errors.length === 0,
    errors
  };
}