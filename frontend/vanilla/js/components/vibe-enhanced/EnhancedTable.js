/**
 * Enhanced Table Component
 * Monday.com Vibe-inspired table with advanced features like sorting, filtering, virtual scrolling
 */

import { Component } from '../base/Component.js';

export class EnhancedTable extends Component {
    constructor(container, options = {}) {
        super(container, options);
        
        this.state = {
            data: options.data || [],
            filteredData: [],
            sortColumn: null,
            sortDirection: 'asc',
            selectedRows: new Set(),
            searchQuery: '',
            loading: false,
            error: null,
            page: 1,
            pageSize: options.pageSize || 50,
            virtualScrolling: options.virtualScrolling || false,
            ...options.initialState
        };
        
        // Table configuration
        this.columns = options.columns || [];
        this.selectable = options.selectable !== false;
        this.sortable = options.sortable !== false;
        this.filterable = options.filterable !== false;
        this.searchable = options.searchable !== false;
        this.paginated = options.paginated || false;
        this.resizable = options.resizable || false;
        this.reorderable = options.reorderable || false;
        this.editable = options.editable || false;
        this.rowHeight = options.rowHeight || 48;
        this.headerHeight = options.headerHeight || 56;
        this.stickyHeader = options.stickyHeader !== false;
        
        // Callbacks
        this.onRowClick = options.onRowClick;
        this.onRowDoubleClick = options.onRowDoubleClick;
        this.onSelectionChange = options.onSelectionChange;
        this.onSort = options.onSort;
        this.onFilter = options.onFilter;
        this.onEdit = options.onEdit;
        this.onColumnResize = options.onColumnResize;
        this.onColumnReorder = options.onColumnReorder;
        
        // Virtual scrolling setup
        this.visibleRange = { start: 0, end: 20 };
        this.scrollContainer = null;
        this.tableBody = null;
        
        this.init();
    }
    
    init() {
        this.filterData();
        this.render();
        this.bindEvents();
        
        if (this.state.virtualScrolling) {
            this.setupVirtualScrolling();
        }
    }
    
    render() {
        this.container.innerHTML = `
            <div class="enhanced-table" data-testid="enhanced-table">
                ${this.renderToolbar()}
                <div class="table-container ${this.state.virtualScrolling ? 'virtual-scrolling' : ''}">
                    ${this.renderTable()}
                </div>
                ${this.renderPagination()}
                ${this.renderLoading()}
            </div>
        `;
    }
    
    renderToolbar() {
        if (!this.searchable && !this.filterable) return '';
        
        return `
            <div class="table-toolbar">
                ${this.renderSearch()}
                ${this.renderActions()}
            </div>
        `;
    }
    
    renderSearch() {
        if (!this.searchable) return '';
        
        return `
            <div class="table-search">
                <div class="search-input-wrapper">
                    <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <circle cx="11" cy="11" r="8"></circle>
                        <path d="M21 21l-4.35-4.35"></path>
                    </svg>
                    <input 
                        type="text" 
                        class="search-input" 
                        placeholder="Search table..."
                        value="${this.escapeHtml(this.state.searchQuery)}"
                    />
                    ${this.state.searchQuery ? `
                        <button type="button" class="search-clear" title="Clear search">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    renderActions() {
        const selectedCount = this.state.selectedRows.size;
        
        return `
            <div class="table-actions">
                ${selectedCount > 0 ? `
                    <div class="selection-info">
                        <span class="selection-count">${selectedCount} selected</span>
                        <button type="button" class="btn-clear-selection" title="Clear selection">
                            Clear
                        </button>
                    </div>
                ` : ''}
                
                <div class="table-controls">
                    ${this.filterable ? `
                        <button type="button" class="btn-filter" title="Filter table">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46"></polygon>
                            </svg>
                        </button>
                    ` : ''}
                    
                    <button type="button" class="btn-export" title="Export table">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7,10 12,15 17,10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }
    
    renderTable() {
        return `
            <table class="table ${this.stickyHeader ? 'sticky-header' : ''}">
                ${this.renderTableHeader()}
                ${this.renderTableBody()}
            </table>
        `;
    }
    
    renderTableHeader() {
        return `
            <thead class="table-header">
                <tr class="header-row">
                    ${this.selectable ? `
                        <th class="header-cell header-cell--checkbox">
                            <label class="checkbox-wrapper">
                                <input 
                                    type="checkbox" 
                                    class="select-all-checkbox"
                                    ${this.isAllSelected() ? 'checked' : ''}
                                    ${this.isSomeSelected() ? 'indeterminate' : ''}
                                />
                                <span class="checkbox-mark"></span>
                            </label>
                        </th>
                    ` : ''}
                    
                    ${this.columns.map((column, index) => this.renderHeaderCell(column, index)).join('')}
                </tr>
            </thead>
        `;
    }
    
    renderHeaderCell(column, index) {
        const sortable = this.sortable && column.sortable !== false;
        const resizable = this.resizable && column.resizable !== false;
        const isSorted = this.state.sortColumn === column.key;
        const sortDirection = isSorted ? this.state.sortDirection : null;
        
        return `
            <th 
                class="header-cell ${sortable ? 'sortable' : ''} ${isSorted ? 'sorted' : ''}"
                data-column="${column.key}"
                data-index="${index}"
                style="${column.width ? `width: ${column.width}px; min-width: ${column.minWidth || 100}px;` : ''}"
            >
                <div class="header-content">
                    <span class="header-text">${this.escapeHtml(column.title || column.key)}</span>
                    
                    ${sortable ? `
                        <button type="button" class="sort-button" data-column="${column.key}">
                            <svg class="sort-icon ${sortDirection || ''}" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="m7 14 5-5 5 5"></path>
                                <path d="m7 10 5 5 5-5" opacity="${sortDirection === 'desc' ? '1' : '0.3'}"></path>
                            </svg>
                        </button>
                    ` : ''}
                    
                    ${resizable ? `
                        <div class="resize-handle" data-column="${column.key}"></div>
                    ` : ''}
                </div>
            </th>
        `;
    }
    
    renderTableBody() {
        if (this.state.loading) {
            return `<tbody class="table-body loading"></tbody>`;
        }
        
        if (this.state.error) {
            return `
                <tbody class="table-body error">
                    <tr><td colspan="${this.getColumnCount()}" class="error-cell">
                        Error loading data: ${this.escapeHtml(this.state.error)}
                    </td></tr>
                </tbody>
            `;
        }
        
        if (this.state.filteredData.length === 0) {
            return `
                <tbody class="table-body empty">
                    <tr><td colspan="${this.getColumnCount()}" class="empty-cell">
                        ${this.state.searchQuery ? 'No results found' : 'No data available'}
                    </td></tr>
                </tbody>
            `;
        }
        
        return `
            <tbody class="table-body" ${this.state.virtualScrolling ? `style="height: ${this.state.filteredData.length * this.rowHeight}px;"` : ''}>
                ${this.renderRows()}
            </tbody>
        `;
    }
    
    renderRows() {
        const dataToRender = this.state.virtualScrolling 
            ? this.getVisibleRows() 
            : this.getPaginatedData();
        
        return dataToRender.map((row, index) => this.renderRow(row, index)).join('');
    }
    
    renderRow(row, index) {
        const isSelected = this.state.selectedRows.has(row.id || index);
        const rowIndex = this.state.virtualScrolling ? this.visibleRange.start + index : index;
        
        return `
            <tr 
                class="table-row ${isSelected ? 'selected' : ''} ${row.disabled ? 'disabled' : ''}"
                data-row-id="${row.id || index}"
                data-row-index="${rowIndex}"
                ${this.state.virtualScrolling ? `style="transform: translateY(${rowIndex * this.rowHeight}px); position: absolute; width: 100%;"` : ''}
            >
                ${this.selectable ? `
                    <td class="table-cell cell--checkbox">
                        <label class="checkbox-wrapper">
                            <input 
                                type="checkbox" 
                                class="row-checkbox"
                                ${isSelected ? 'checked' : ''}
                                ${row.disabled ? 'disabled' : ''}
                                data-row-id="${row.id || index}"
                            />
                            <span class="checkbox-mark"></span>
                        </label>
                    </td>
                ` : ''}
                
                ${this.columns.map(column => this.renderCell(row, column, rowIndex)).join('')}
            </tr>
        `;
    }
    
    renderCell(row, column, rowIndex) {
        const value = this.getCellValue(row, column);
        const formattedValue = this.formatCellValue(value, column);
        const editable = this.editable && column.editable !== false;
        
        return `
            <td 
                class="table-cell cell--${column.type || 'text'} ${editable ? 'editable' : ''}"
                data-column="${column.key}"
                data-row-index="${rowIndex}"
                ${column.width ? `style="width: ${column.width}px;"` : ''}
            >
                <div class="cell-content">
                    ${editable ? `
                        <div class="cell-editor" style="display: none;">
                            ${this.renderCellEditor(value, column)}
                        </div>
                        <div class="cell-display">
                            ${formattedValue}
                        </div>
                    ` : formattedValue}
                </div>
            </td>
        `;
    }
    
    renderCellEditor(value, column) {
        switch (column.type) {
            case 'select':
                return `
                    <select class="cell-input">
                        ${(column.options || []).map(option => `
                            <option value="${option.value}" ${option.value === value ? 'selected' : ''}>
                                ${this.escapeHtml(option.label)}
                            </option>
                        `).join('')}
                    </select>
                `;
                
            case 'number':
                return `
                    <input 
                        type="number" 
                        class="cell-input" 
                        value="${value || ''}"
                        ${column.min !== undefined ? `min="${column.min}"` : ''}
                        ${column.max !== undefined ? `max="${column.max}"` : ''}
                        ${column.step !== undefined ? `step="${column.step}"` : ''}
                    />
                `;
                
            case 'date':
                return `
                    <input 
                        type="date" 
                        class="cell-input" 
                        value="${value ? new Date(value).toISOString().split('T')[0] : ''}"
                    />
                `;
                
            case 'checkbox':
                return `
                    <label class="checkbox-wrapper">
                        <input type="checkbox" class="cell-input" ${value ? 'checked' : ''} />
                        <span class="checkbox-mark"></span>
                    </label>
                `;
                
            default:
                return `
                    <input 
                        type="text" 
                        class="cell-input" 
                        value="${this.escapeHtml(value || '')}"
                        ${column.maxLength ? `maxlength="${column.maxLength}"` : ''}
                    />
                `;
        }
    }
    
    renderPagination() {
        if (!this.paginated || this.state.virtualScrolling) return '';
        
        const totalPages = Math.ceil(this.state.filteredData.length / this.state.pageSize);
        const currentPage = this.state.page;
        
        if (totalPages <= 1) return '';
        
        return `
            <div class="table-pagination">
                <div class="pagination-info">
                    Showing ${this.getPaginationStart()} - ${this.getPaginationEnd()} of ${this.state.filteredData.length} items
                </div>
                
                <div class="pagination-controls">
                    <button 
                        type="button" 
                        class="pagination-btn" 
                        data-page="1"
                        ${currentPage === 1 ? 'disabled' : ''}
                    >
                        First
                    </button>
                    
                    <button 
                        type="button" 
                        class="pagination-btn" 
                        data-page="${currentPage - 1}"
                        ${currentPage === 1 ? 'disabled' : ''}
                    >
                        Previous
                    </button>
                    
                    <span class="pagination-current">
                        Page ${currentPage} of ${totalPages}
                    </span>
                    
                    <button 
                        type="button" 
                        class="pagination-btn" 
                        data-page="${currentPage + 1}"
                        ${currentPage === totalPages ? 'disabled' : ''}
                    >
                        Next
                    </button>
                    
                    <button 
                        type="button" 
                        class="pagination-btn" 
                        data-page="${totalPages}"
                        ${currentPage === totalPages ? 'disabled' : ''}
                    >
                        Last
                    </button>
                </div>
            </div>
        `;
    }
    
    renderLoading() {
        if (!this.state.loading) return '';
        
        return `
            <div class="table-loading-overlay">
                <div class="loading-spinner">
                    <svg class="spinner" width="24" height="24" viewBox="0 0 24 24">
                        <circle class="spinner-circle" cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    <span class="loading-text">Loading data...</span>
                </div>
            </div>
        `;
    }
    
    // ... (continued in next part due to length)
    
    getCellValue(row, column) {
        if (column.accessor) {
            return column.accessor(row);
        }
        
        return this.getNestedValue(row, column.key);
    }
    
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }
    
    formatCellValue(value, column) {
        if (value === null || value === undefined) {
            return '<span class="cell-empty">—</span>';
        }
        
        if (column.formatter) {
            return column.formatter(value);
        }
        
        switch (column.type) {
            case 'date':
                return new Date(value).toLocaleDateString();
                
            case 'datetime':
                return new Date(value).toLocaleString();
                
            case 'number':
                return Number(value).toLocaleString();
                
            case 'currency':
                return new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: column.currency || 'USD'
                }).format(value);
                
            case 'percentage':
                return `${(Number(value) * 100).toFixed(1)}%`;
                
            case 'boolean':
            case 'checkbox':
                return value ? '✓' : '✗';
                
            case 'tags':
                if (Array.isArray(value)) {
                    return value.map(tag => `<span class="tag">${this.escapeHtml(tag)}</span>`).join('');
                }
                return this.escapeHtml(value);
                
            default:
                return this.escapeHtml(String(value));
        }
    }
    
    // Event handling and interactions continue...
    
    bindEvents() {
        const container = this.container;
        
        // Search
        const searchInput = container.querySelector('.search-input');
        if (searchInput) {
            searchInput.addEventListener('input', this.handleSearch.bind(this));
        }
        
        const searchClear = container.querySelector('.search-clear');
        if (searchClear) {
            searchClear.addEventListener('click', this.handleSearchClear.bind(this));
        }
        
        // Sorting
        container.addEventListener('click', (event) => {
            const sortButton = event.target.closest('.sort-button');
            if (sortButton) {
                this.handleSort(sortButton.dataset.column);
            }
        });
        
        // Selection
        const selectAllCheckbox = container.querySelector('.select-all-checkbox');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', this.handleSelectAll.bind(this));
        }
        
        container.addEventListener('change', (event) => {
            const rowCheckbox = event.target.closest('.row-checkbox');
            if (rowCheckbox) {
                this.handleRowSelection(rowCheckbox.dataset.rowId, rowCheckbox.checked);
            }
        });
        
        // Row clicks
        container.addEventListener('click', (event) => {
            const row = event.target.closest('.table-row');
            if (row && !event.target.closest('.checkbox-wrapper, .cell-editor')) {
                this.handleRowClick(row, event);
            }
        });
        
        container.addEventListener('dblclick', (event) => {
            const row = event.target.closest('.table-row');
            if (row) {
                this.handleRowDoubleClick(row, event);
            }
        });
        
        // Cell editing
        if (this.editable) {
            container.addEventListener('click', (event) => {
                const editableCell = event.target.closest('.table-cell.editable');
                if (editableCell) {
                    this.startCellEdit(editableCell);
                }
            });
        }
        
        // Virtual scrolling
        if (this.state.virtualScrolling) {
            this.scrollContainer = container.querySelector('.table-container');
            if (this.scrollContainer) {
                this.scrollContainer.addEventListener('scroll', this.handleScroll.bind(this));
            }
        }
        
        // Pagination
        container.addEventListener('click', (event) => {
            const pageBtn = event.target.closest('.pagination-btn');
            if (pageBtn && !pageBtn.disabled) {
                this.goToPage(parseInt(pageBtn.dataset.page));
            }
        });
    }
    
    // Data operations
    filterData() {
        let filtered = [...this.state.data];
        
        // Apply search filter
        if (this.state.searchQuery) {
            const query = this.state.searchQuery.toLowerCase();
            filtered = filtered.filter(row => {
                return this.columns.some(column => {
                    const value = this.getCellValue(row, column);
                    return String(value || '').toLowerCase().includes(query);
                });
            });
        }
        
        // Apply sorting
        if (this.state.sortColumn) {
            const column = this.columns.find(col => col.key === this.state.sortColumn);
            if (column) {
                filtered.sort((a, b) => {
                    const aVal = this.getCellValue(a, column);
                    const bVal = this.getCellValue(b, column);
                    
                    let comparison = 0;
                    if (aVal < bVal) comparison = -1;
                    else if (aVal > bVal) comparison = 1;
                    
                    return this.state.sortDirection === 'desc' ? -comparison : comparison;
                });
            }
        }
        
        this.state.filteredData = filtered;
    }
    
    // Public API methods
    setData(data) {
        this.state.data = data;
        this.state.selectedRows.clear();
        this.filterData();
        this.render();
        this.bindEvents();
        
        if (this.state.virtualScrolling) {
            this.setupVirtualScrolling();
        }
    }
    
    addRow(row) {
        this.state.data.push(row);
        this.filterData();
        this.render();
        this.bindEvents();
    }
    
    removeRow(id) {
        this.state.data = this.state.data.filter(row => row.id !== id);
        this.state.selectedRows.delete(id);
        this.filterData();
        this.render();
        this.bindEvents();
    }
    
    updateRow(id, updates) {
        const rowIndex = this.state.data.findIndex(row => row.id === id);
        if (rowIndex !== -1) {
            this.state.data[rowIndex] = { ...this.state.data[rowIndex], ...updates };
            this.filterData();
            this.render();
            this.bindEvents();
        }
    }
    
    getSelectedRows() {
        return this.state.data.filter(row => this.state.selectedRows.has(row.id));
    }
    
    clearSelection() {
        this.state.selectedRows.clear();
        this.render();
        this.bindEvents();
    }
    
    selectAll() {
        this.state.filteredData.forEach(row => {
            if (row.id && !row.disabled) {
                this.state.selectedRows.add(row.id);
            }
        });
        this.render();
        this.bindEvents();
    }
    
    // Helper methods continue...
    escapeHtml(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.toString().replace(/[&<>"']/g, (m) => map[m]);
    }
}