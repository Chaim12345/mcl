import React from 'react';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableCell, 
  TableHeaderCell,
  TableContainer 
} from '@vibe/core';
import { createVibeWrapper } from './base-vibe-wrapper';
import { mapCommonProps } from '@/lib/vibe-wrapper-utils';

// Vibe Table types
export type VibeTableSize = 'small' | 'medium' | 'large';
export type VibeTableColumn = {
  id: string;
  title: string;
  width?: number | string;
  sortable?: boolean;
  sticky?: boolean;
  render?: (value: any, row: any, index: number) => React.ReactNode;
};

export interface VibeTableProps {
  // Core props
  columns: VibeTableColumn[];
  data?: any[];
  
  // State management
  dataState?: {
    isLoading?: boolean;
    isError?: boolean;
  };
  
  // Display states
  emptyState?: React.ReactElement;
  errorState?: React.ReactElement;
  loadingState?: React.ReactElement;
  
  // Styling
  size?: VibeTableSize;
  withoutBorder?: boolean;
  
  // Event handlers
  onRowClick?: (row: any, index: number) => void;
  onCellClick?: (value: any, row: any, column: VibeTableColumn, index: number) => void;
  
  // Selection
  selectable?: boolean;
  selectedRows?: string[];
  onSelectionChange?: (selectedRows: string[]) => void;
  
  // Sorting
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (columnId: string, direction: 'asc' | 'desc') => void;
  
  // Standard props
  className?: string;
  id?: string;
  'data-testid'?: string;
  style?: React.CSSProperties;
  
  // Children for custom table structure
  children?: React.ReactNode;
}

const VibeTable = createVibeWrapper<VibeTableProps>({
  componentName: 'VibeTable',
  vibeComponent: Table,
  propMapper: (props) => {
    const {
      data,
      onRowClick,
      onCellClick,
      selectable,
      selectedRows,
      onSelectionChange,
      sortBy,
      sortDirection,
      onSort,
      loadingState,
      children,
      ...vibeProps
    } = props;

    // If children are provided, use them directly
    if (children) {
      return {
        ...mapCommonProps(vibeProps),
        children,
      };
    }

    // Auto-generate table structure from columns and data
    const tableChildren = [
      // Table Header
      <TableHeader key="header">
        {props.columns.map((column: any) => (
          <TableHeaderCell
            key={column.id}
            title={column.title + (column.sortable && sortBy === column.id ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : '')}
            sticky={column.sticky}
            onSortClicked={column.sortable && onSort ? (direction) => {
              onSort(column.id, direction);
            } : undefined}
            sortState={column.sortable && sortBy === column.id ? sortDirection : 'none'}
          />
        ))}
      </TableHeader>,
      
      // Table Body
      <TableBody key="body">
        {data?.map((row: any, rowIndex: number) => (
          <TableRow
            key={row.id || rowIndex}
            highlighted={selectedRows?.includes(row.id)}
            style={{ cursor: onRowClick ? 'pointer' : undefined }}
          >
            {props.columns.map((column: any) => {
              const value = row[column.id];
              const cellContent = column.render ? column.render(value, row, rowIndex) : value;
              
              return (
                <TableCell
                  key={column.id}
                  sticky={column.sticky}
                >
                  {cellContent}
                </TableCell>
              );
            })}
          </TableRow>
        ))}
      </TableBody>
    ];

    return {
      ...mapCommonProps(vibeProps),
      children: tableChildren,
    };
  }
});

// Table Header wrapper
export interface VibeTableHeaderProps {
  children?: React.ReactNode;
  className?: string;
  id?: string;
  'data-testid'?: string;
}

const VibeTableHeader = createVibeWrapper<VibeTableHeaderProps>({
  componentName: 'VibeTableHeader',
  vibeComponent: TableHeader,
  propMapper: (props) => {
    return {
      ...mapCommonProps(props),
    };
  }
});

// Table Body wrapper
export interface VibeTableBodyProps {
  children?: React.ReactNode;
  className?: string;
  id?: string;
  'data-testid'?: string;
}

const VibeTableBody = createVibeWrapper<VibeTableBodyProps>({
  componentName: 'VibeTableBody',
  vibeComponent: TableBody,
  propMapper: (props) => {
    return {
      ...mapCommonProps(props),
    };
  }
});

// Table Row wrapper
export interface VibeTableRowProps {
  children?: React.ReactNode;
  highlighted?: boolean;
  onClick?: () => void;
  className?: string;
  id?: string;
  'data-testid'?: string;
  style?: React.CSSProperties;
}

const VibeTableRow = createVibeWrapper<VibeTableRowProps>({
  componentName: 'VibeTableRow',
  vibeComponent: TableRow,
  propMapper: (props) => {
    return {
      ...mapCommonProps(props),
    };
  }
});

// Table Cell wrapper
export interface VibeTableCellProps {
  children?: React.ReactNode;
  sticky?: boolean;
  onClick?: () => void;
  className?: string;
  id?: string;
  'data-testid'?: string;
  style?: React.CSSProperties;
}

const VibeTableCell = createVibeWrapper<VibeTableCellProps>({
  componentName: 'VibeTableCell',
  vibeComponent: TableCell,
  propMapper: (props) => {
    return {
      ...mapCommonProps(props),
    };
  }
});

// Table Header Cell wrapper
export interface VibeTableHeaderCellProps {
  children?: React.ReactNode;
  sticky?: boolean;
  onClick?: () => void;
  className?: string;
  id?: string;
  'data-testid'?: string;
  style?: React.CSSProperties;
}

const VibeTableHeaderCell = createVibeWrapper<VibeTableHeaderCellProps>({
  componentName: 'VibeTableHeaderCell',
  vibeComponent: TableHeaderCell,
  propMapper: (props) => {
    return {
      ...mapCommonProps(props),
    };
  }
});

// Table Container wrapper
export interface VibeTableContainerProps {
  children?: React.ReactNode;
  className?: string;
  id?: string;
  'data-testid'?: string;
  style?: React.CSSProperties;
}

const VibeTableContainer = createVibeWrapper<VibeTableContainerProps>({
  componentName: 'VibeTableContainer',
  vibeComponent: TableContainer,
  propMapper: (props) => {
    return {
      ...mapCommonProps(props),
    };
  }
});

export {
  VibeTable,
  VibeTableHeader,
  VibeTableBody,
  VibeTableRow,
  VibeTableCell,
  VibeTableHeaderCell,
  VibeTableContainer
};

export default VibeTable;