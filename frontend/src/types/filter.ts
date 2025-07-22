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
  createdAt?: string;
  updatedAt?: string;
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
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Field type for filter UI
 */
export interface FilterField {
  id: string;
  name: string;
  type: 'text' | 'status' | 'people' | 'date' | 'tags' | 'number';
  options?: { label: string; value: string }[];
}

/**
 * Filter preset for quick filters
 */
export interface FilterPreset {
  id: string;
  name: string;
  filter: FilterGroup;
  icon?: string;
}