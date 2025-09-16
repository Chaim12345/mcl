/**
 * Board View Component
 */

import { Component } from '../base/Component.js';
import { boardService } from '../../services/board.js';
import { workspaceService } from '../../services/workspace.js';
import { authService } from '../../services/auth.js';
import { eventBus } from '../../utils/events.js';

export class BoardView extends Component {
    constructor(container, options = {}) {
        super(container, options);
        
        this.state = {
            isLoading: false,
            board: null,
            items: [],
            columns: [],
            viewMode: 'table', // table, kanban
            searchQuery: '',
            sortBy: 'created',
            sortOrder: 'desc',
            filterBy: {},
            selectedItems: [],
            showColumnManager: false,
            showBoardSettings: false,
            editingColumn: null,
            editingItem: null,
            errors: {}
        };
        
        this.boardId = options.boardId || null;
        
        this.init();
    }
    
    init() {
        if (this.boardId) {
            this.loadBoard();
            this.loadItems();
        }
        
        this.render();
        this.bindEvents();
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Listen for board and item events
        eventBus.on('board:updated', this.handleBoardUpdated.bind(this));
        eventBus.on('board:switched', this.handleBoardSwitched.bind(this));
        eventBus.on('item:created', this.handleItemCreated.bind(this));
        eventBus.on('item:updated', this.handleItemUpdated.bind(this));
        eventBus.on('item:deleted', this.handleItemDeleted.bind(this));
        eventBus.on('column:created', this.handleColumnCreated.bind(this));
        eventBus.on('column:updated', this.handleColumnUpdated.bind(this));
        eventBus.on('column:deleted', this.handleColumnDeleted.bind(this));
    }
    
    async loadBoard() {
        if (!this.boardId) return;
        
        this.setState({ isLoading: true });
        
        try {
            const board = await boardService.getBoardById(this.boardId);
            this.setState({
                isLoading: false,
                board,
                columns: board.columns || []
            });
        } catch (error) {
            this.setState({
                isLoading: false,
                errors: { load: error.message }
            });
        }
    }
    
    async loadItems() {
        if (!this.boardId) return;
        
        try {
            // Note: This would typically be a separate item service
            const response = await boardService.makeRequest(`/boards/${this.boardId}/items`);
            
            if (response.success) {
                this.setState({ items: response.data.items || [] });
            }
        } catch (error) {
            console.error('Error loading items:', error);
        }
    }
    
    render() {
        const { 
            isLoading, 
            board, 
            items, 
            columns, 
            viewMode, 
            searchQuery, 
            sortBy, 
            sortOrder, 
            filterBy,
            selectedItems, 
            showColumnManager, 
            showBoardSettings, 
            errors 
        } = this.state;
        
        if (showColumnManager) {
            this.renderColumnManager();
            return;
        }
        
        if (showBoardSettings) {
            this.renderBoardSettings();
            return;
        }
        
        if (!board) {
            return this.renderLoadingState();
        }
        
        const filteredItems = this.filterAndSortItems(items, searchQuery, sortBy, sortOrder, filterBy);
        const canManageBoard = this.canManageBoard();
        
        this.container.innerHTML = `
            <div class="board-view">
                <div class="board-header">
                    <div class="board-header-main">
                        <div class="board-title-section">
                            <div class="board-icon">${board.icon || '📋'}</div>
                            <div class="board-title-content">
                                <h1 class="board-title">${this.escapeHtml(board.name)}</h1>
                                ${board.description ? `
                                    <p class="board-description">${this.escapeHtml(board.description)}</p>
                                ` : ''}
                            </div>
                            
                            <div class="board-meta">
                                <span class="board-meta-item">
                                    <svg class="icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                        <rect x="9" y="9" width="6" height="6"></rect>
                                    </svg>
                                    ${items.length} items
                                </span>
                                <span class="board-meta-item">
                                    <svg class="icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                        <circle cx="12" cy="7" r="4"></circle>
                                    </svg>
                                    ${board.memberCount || 0} members
                                </span>
                            </div>
                        </div>
                        
                        <div class="board-actions">
                            ${canManageBoard ? `
                                <button type="button" class="btn btn--outline" data-action="add-item">
                                    <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <line x1="12" y1="8" x2="12" y2="16"></line>
                                        <line x1="8" y1="12" x2="16" y2="12"></line>
                                    </svg>
                                    Add Item
                                </button>
                                
                                <button type="button" class="btn btn--outline" data-action="manage-columns">
                                    <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <rect x="3" y="3" width="6" height="18" rx="2"></rect>
                                        <rect x="11" y="3" width="4" height="18" rx="2"></rect>
                                        <rect x="17" y="3" width="4" height="18" rx="2"></rect>
                                    </svg>
                                    Manage Columns
                                </button>
                            ` : ''}
                            
                            <button type="button" class="btn btn--ghost btn--icon board-favorite-btn ${boardService.isFavorite(board.id) ? 'board-favorite-btn--active' : ''}" data-action="toggle-favorite">
                                <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"></polygon>
                                </svg>
                            </button>
                            
                            ${canManageBoard ? `
                                <button type="button" class="btn btn--ghost btn--icon" data-action="board-settings">
                                    <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <circle cx="12" cy="12" r="3"></circle>
                                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                                    </svg>
                                </button>
                            ` : ''}
                            
                            <button type="button" class="btn btn--ghost btn--icon" data-action="board-menu">
                                <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <circle cx="12" cy="12" r="1"></circle>
                                    <circle cx="19" cy="12" r="1"></circle>
                                    <circle cx="5" cy="12" r="1"></circle>
                                </svg>
                            </button>
                        </div>
                    </div>
                    
                    <div class="board-controls">
                        <div class="board-controls-left">
                            <div class="search-box">
                                <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <circle cx="11" cy="11" r="8"></circle>
                                    <path d="m21 21-4.35-4.35"></path>
                                </svg>
                                <input 
                                    type="text" 
                                    class="search-input" 
                                    placeholder="Search items..."
                                    value="${searchQuery}"
                                    data-search-input
                                />
                            </div>
                            
                            <div class="filter-controls">
                                <button type="button" class="btn btn--outline btn--sm" data-action="show-filters">
                                    <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46"></polygon>
                                    </svg>
                                    Filter
                                    ${Object.keys(filterBy).length > 0 ? `<span class="filter-count">${Object.keys(filterBy).length}</span>` : ''}
                                </button>
                            </div>
                        </div>
                        
                        <div class="board-controls-right">
                            <div class="sort-controls">
                                <select class="sort-select" data-sort-by>
                                    <option value="created" ${sortBy === 'created' ? 'selected' : ''}>Sort by Created</option>
                                    <option value="updated" ${sortBy === 'updated' ? 'selected' : ''}>Sort by Updated</option>
                                    <option value="name" ${sortBy === 'name' ? 'selected' : ''}>Sort by Name</option>
                                    <option value="priority" ${sortBy === 'priority' ? 'selected' : ''}>Sort by Priority</option>
                                </select>
                                
                                <button 
                                    type="button" 
                                    class="btn btn--ghost sort-order-btn" 
                                    data-action="toggle-sort-order"
                                    title="${sortOrder === 'asc' ? 'Sort Descending' : 'Sort Ascending'}"
                                >
                                    <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        ${sortOrder === 'asc' ? 
                                            '<path d="m3 16 4 4 4-4"></path><path d="M7 20V4"></path><path d="m21 8-4-4-4 4"></path><path d="M17 4v16"></path>' :
                                            '<path d="m3 8 4-4 4 4"></path><path d="M7 4v16"></path><path d="m21 16-4 4-4-4"></path><path d="M17 20V4"></path>'
                                        }
                                    </svg>
                                </button>
                            </div>
                            
                            <div class="view-controls">
                                <div class="view-toggle">
                                    <button 
                                        type="button" 
                                        class="view-toggle-btn ${viewMode === 'table' ? 'view-toggle-btn--active' : ''}" 
                                        data-action="set-view-mode" 
                                        data-view="table"
                                        title="Table view"
                                    >
                                        <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                            <path d="M3 3h18v18H3z"></path>
                                            <path d="M9 3v18"></path>
                                            <path d="M3 9h18"></path>
                                            <path d="M3 15h18"></path>
                                        </svg>
                                    </button>
                                    <button 
                                        type="button" 
                                        class="view-toggle-btn ${viewMode === 'kanban' ? 'view-toggle-btn--active' : ''}" 
                                        data-action="set-view-mode" 
                                        data-view="kanban"
                                        title="Kanban view"
                                    >
                                        <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                            <rect x="3" y="3" width="6" height="18" rx="2"></rect>
                                            <rect x="11" y="3" width="4" height="18" rx="2"></rect>
                                            <rect x="17" y="3" width="4" height="18" rx="2"></rect>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    ${selectedItems.length > 0 && canManageBoard ? `
                        <div class="bulk-actions">
                            <span class="bulk-count">${selectedItems.length} selected</span>
                            <button type="button" class="btn btn--outline" data-action="bulk-edit">
                                <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                                </svg>
                                Edit
                            </button>
                            <button type="button" class="btn btn--outline" data-action="bulk-move">
                                <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path d="M3 12h18m-9-9l9 9-9 9"></path>
                                </svg>
                                Move
                            </button>
                            <button type="button" class="btn btn--outline btn--danger" data-action="bulk-delete">
                                <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <polyline points="3,6 5,6 21,6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                                Delete
                            </button>
                        </div>
                    ` : ''}
                </div>
                
                ${errors.load ? `
                    <div class="alert alert--error">
                        <svg class="alert-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="15" y1="9" x2="9" y2="15"></line>
                            <line x1="9" y1="9" x2="15" y2="15"></line>
                        </svg>
                        <p>${errors.load}</p>
                    </div>
                ` : ''}
                
                <div class="board-content">
                    ${isLoading ? this.renderLoadingState() : this.renderBoardContent(filteredItems, viewMode, columns)}
                </div>
            </div>
        `;
    }
    
    renderLoadingState() {
        return `
            <div class="loading-state">
                <div class="loading-spinner">
                    <svg class="spinner" width="32" height="32" viewBox="0 0 24 24">
                        <circle class="spinner-circle" cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
                    </svg>
                </div>
                <p class="loading-text">Loading board...</p>
            </div>
        `;
    }
    
    renderBoardContent(items, viewMode, columns) {
        if (viewMode === 'kanban') {
            return this.renderKanbanView(items, columns);
        } else {
            return this.renderTableView(items, columns);
        }
    }
    
    renderTableView(items, columns) {
        const canManage = this.canManageBoard();
        
        if (columns.length === 0) {
            return this.renderEmptyColumns();
        }
        
        return `
            <div class="board-table-container">
                <table class="board-table">
                    <thead>
                        <tr>
                            ${canManage ? `
                                <th class="board-table-cell board-table-cell--checkbox">
                                    <label class="checkbox-label">
                                        <input 
                                            type="checkbox" 
                                            data-select-all
                                            ${this.isAllSelected(items) ? 'checked' : ''}
                                        />
                                        <span class="checkbox-checkmark"></span>
                                    </label>
                                </th>
                            ` : ''}
                            ${columns.map(column => `
                                <th class="board-table-cell board-table-cell--${column.type}" data-column-id="${column.id}">
                                    <div class="column-header">
                                        <div class="column-header-content">
                                            ${this.getColumnTypeIcon(column.type)}
                                            <span class="column-title">${this.escapeHtml(column.name)}</span>
                                        </div>
                                        ${canManage ? `
                                            <button type="button" class="btn btn--ghost btn--icon column-menu-btn" data-action="column-menu" data-column-id="${column.id}">
                                                <svg class="icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                    <circle cx="12" cy="12" r="1"></circle>
                                                    <circle cx="19" cy="12" r="1"></circle>
                                                    <circle cx="5" cy="12" r="1"></circle>
                                                </svg>
                                            </button>
                                        ` : ''}
                                    </div>
                                </th>
                            `).join('')}
                            ${canManage ? `
                                <th class="board-table-cell board-table-cell--actions">Actions</th>
                            ` : ''}
                        </tr>
                    </thead>
                    <tbody>
                        ${items.length > 0 ? 
                            items.map(item => this.renderTableRow(item, columns, canManage)).join('') :
                            this.renderEmptyTableRow(columns, canManage)
                        }
                    </tbody>
                </table>
            </div>
        `;
    }
    
    renderTableRow(item, columns, canManage) {
        const isSelected = this.state.selectedItems.includes(item.id);
        
        return `
            <tr class="board-table-row" data-item-id="${item.id}">
                ${canManage ? `
                    <td class="board-table-cell board-table-cell--checkbox">
                        <label class="checkbox-label">
                            <input 
                                type="checkbox" 
                                data-select-item
                                data-item-id="${item.id}"
                                ${isSelected ? 'checked' : ''}
                            />
                            <span class="checkbox-checkmark"></span>
                        </label>
                    </td>
                ` : ''}
                ${columns.map(column => `
                    <td class="board-table-cell board-table-cell--${column.type}" data-column-id="${column.id}">
                        ${this.renderCellValue(item, column)}
                    </td>
                `).join('')}
                ${canManage ? `
                    <td class="board-table-cell board-table-cell--actions">
                        <div class="item-actions">
                            <button 
                                type="button" 
                                class="btn btn--ghost btn--icon" 
                                data-action="edit-item" 
                                data-item-id="${item.id}"
                                title="Edit item"
                            >
                                <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                                </svg>
                            </button>
                            <button 
                                type="button" 
                                class="btn btn--ghost btn--icon" 
                                data-action="delete-item" 
                                data-item-id="${item.id}"
                                title="Delete item"
                            >
                                <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <polyline points="3,6 5,6 21,6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                            </button>
                        </div>
                    </td>
                ` : ''}
            </tr>
        `;
    }
    
    renderEmptyTableRow(columns, canManage) {
        const colSpan = columns.length + (canManage ? 2 : 0);
        
        return `
            <tr class="board-table-row board-table-row--empty">
                <td class="board-table-cell" colspan="${colSpan}">
                    <div class="empty-state empty-state--inline">
                        <p class="empty-state-title">No items found</p>
                        <p class="empty-state-description">
                            ${this.state.searchQuery ? 
                                'No items match your search criteria.' :
                                'Start by adding your first item to this board.'
                            }
                        </p>
                        ${canManage && !this.state.searchQuery ? `
                            <button type="button" class="btn btn--primary btn--sm" data-action="add-item">
                                Add First Item
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }
    
    renderKanbanView(items, columns) {
        const statusColumns = columns.filter(col => col.type === 'status');
        
        if (statusColumns.length === 0) {
            return `
                <div class="kanban-empty-state">
                    <div class="empty-state">
                        <div class="empty-state-icon">
                            <svg class="icon-large" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <rect x="3" y="3" width="6" height="18" rx="2"></rect>
                                <rect x="11" y="3" width="4" height="18" rx="2"></rect>
                                <rect x="17" y="3" width="4" height="18" rx="2"></rect>
                            </svg>
                        </div>
                        <h3 class="empty-state-title">No Status Columns</h3>
                        <p class="empty-state-description">
                            Kanban view requires at least one status column. Add status columns to use this view.
                        </p>
                        ${this.canManageBoard() ? `
                            <button type="button" class="btn btn--primary" data-action="manage-columns">
                                <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <rect x="3" y="3" width="6" height="18" rx="2"></rect>
                                    <rect x="11" y="3" width="4" height="18" rx="2"></rect>
                                    <rect x="17" y="3" width="4" height="18" rx="2"></rect>
                                </svg>
                                Add Status Columns
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }
        
        return `
            <div class="kanban-board">
                ${statusColumns.map(column => this.renderKanbanColumn(column, items)).join('')}
                ${this.canManageBoard() ? `
                    <div class="kanban-column kanban-column--add">
                        <button type="button" class="kanban-add-column" data-action="add-status-column">
                            <svg class="icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="8" x2="12" y2="16"></line>
                                <line x1="8" y1="12" x2="16" y2="12"></line>
                            </svg>
                            Add Column
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    renderKanbanColumn(column, items) {
        const columnItems = items.filter(item => {
            const fieldValue = item.fieldValues?.find(fv => fv.columnId === column.id);
            return fieldValue ? fieldValue.value === column.id : false;
        });
        
        return `
            <div class="kanban-column" data-column-id="${column.id}">
                <div class="kanban-column-header">
                    <div class="kanban-column-title">
                        <h3 class="column-name">${this.escapeHtml(column.name)}</h3>
                        <span class="column-count">${columnItems.length}</span>
                    </div>
                    ${this.canManageBoard() ? `
                        <button type="button" class="btn btn--ghost btn--icon" data-action="column-menu" data-column-id="${column.id}">
                            <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <circle cx="12" cy="12" r="1"></circle>
                                <circle cx="19" cy="12" r="1"></circle>
                                <circle cx="5" cy="12" r="1"></circle>
                            </svg>
                        </button>
                    ` : ''}
                </div>
                
                <div class="kanban-column-content" data-column-id="${column.id}" data-droppable="true">
                    ${columnItems.map(item => this.renderKanbanCard(item, column)).join('')}
                    
                    ${this.canManageBoard() ? `
                        <button type="button" class="kanban-add-item" data-action="add-item" data-column-id="${column.id}">
                            <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="8" x2="12" y2="16"></line>
                                <line x1="8" y1="12" x2="16" y2="12"></line>
                            </svg>
                            Add Item
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    renderKanbanCard(item, column) {
        const isSelected = this.state.selectedItems.includes(item.id);
        
        return `
            <div class="kanban-card ${isSelected ? 'kanban-card--selected' : ''}" data-item-id="${item.id}" draggable="true">
                ${this.canManageBoard() ? `
                    <div class="kanban-card-select">
                        <label class="checkbox-label">
                            <input 
                                type="checkbox" 
                                data-select-item
                                data-item-id="${item.id}"
                                ${isSelected ? 'checked' : ''}
                            />
                            <span class="checkbox-checkmark"></span>
                        </label>
                    </div>
                ` : ''}
                
                <div class="kanban-card-content" data-action="edit-item" data-item-id="${item.id}">
                    <h4 class="kanban-card-title">${this.escapeHtml(item.name || 'Untitled')}</h4>
                    
                    ${item.description ? `
                        <p class="kanban-card-description">${this.escapeHtml(item.description)}</p>
                    ` : ''}
                    
                    <div class="kanban-card-meta">
                        ${item.assigneeId ? `
                            <div class="kanban-card-assignee">
                                <div class="assignee-avatar">
                                    ${item.assignee?.avatar ? 
                                        `<img src="${item.assignee.avatar}" alt="${item.assignee.name}" />` :
                                        `<div class="assignee-initials">${this.getInitials(item.assignee?.name || 'U')}</div>`
                                    }
                                </div>
                            </div>
                        ` : ''}
                        
                        ${item.dueDate ? `
                            <div class="kanban-card-due-date ${this.isDueDateOverdue(item.dueDate) ? 'kanban-card-due-date--overdue' : ''}">
                                <svg class="icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                    <line x1="16" y1="2" x2="16" y2="6"></line>
                                    <line x1="8" y1="2" x2="8" y2="6"></line>
                                    <line x1="3" y1="10" x2="21" y2="10"></line>
                                </svg>
                                ${this.formatDate(item.dueDate)}
                            </div>
                        ` : ''}
                        
                        ${item.priority ? `
                            <div class="kanban-card-priority kanban-card-priority--${item.priority}">
                                ${this.getPriorityIcon(item.priority)}
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                ${this.canManageBoard() ? `
                    <div class="kanban-card-actions">
                        <button type="button" class="btn btn--ghost btn--icon" data-action="edit-item" data-item-id="${item.id}">
                            <svg class="icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                            </svg>
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    renderEmptyColumns() {
        return `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <svg class="icon-large" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <rect x="3" y="3" width="6" height="18" rx="2"></rect>
                        <rect x="11" y="3" width="4" height="18" rx="2"></rect>
                        <rect x="17" y="3" width="4" height="18" rx="2"></rect>
                    </svg>
                </div>
                <h3 class="empty-state-title">No Columns Configured</h3>
                <p class="empty-state-description">
                    This board doesn't have any columns yet. Add columns to start organizing your items.
                </p>
                ${this.canManageBoard() ? `
                    <button type="button" class="btn btn--primary" data-action="manage-columns">
                        <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <rect x="3" y="3" width="6" height="18" rx="2"></rect>
                            <rect x="11" y="3" width="4" height="18" rx="2"></rect>
                            <rect x="17" y="3" width="4" height="18" rx="2"></rect>
                        </svg>
                        Add Columns
                    </button>
                ` : ''}
            </div>
        `;
    }
    
    async renderColumnManager() {
        try {
            // For now, implement a basic column manager
            const modalContainer = document.createElement('div');
            modalContainer.className = 'modal-overlay';
            modalContainer.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Manage Columns</h2>
                        <button class="modal-close-btn" data-action="close-modal">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="columns-list">
                            ${this.columns.map(column => `
                                <div class="column-item" data-column-id="${column.id}">
                                    <input type="text" value="${column.name}" class="column-name-input" />
                                    <select class="column-type-select">
                                        <option value="text" ${column.type === 'text' ? 'selected' : ''}>Text</option>
                                        <option value="number" ${column.type === 'number' ? 'selected' : ''}>Number</option>
                                        <option value="status" ${column.type === 'status' ? 'selected' : ''}>Status</option>
                                        <option value="priority" ${column.type === 'priority' ? 'selected' : ''}>Priority</option>
                                        <option value="date" ${column.type === 'date' ? 'selected' : ''}>Date</option>
                                    </select>
                                    <button class="btn btn-sm btn-danger delete-column-btn" data-column-id="${column.id}">Delete</button>
                                </div>
                            `).join('')}
                        </div>
                        <button id="add-column-btn" class="btn btn-primary">Add Column</button>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" data-action="close-modal">Cancel</button>
                        <button class="btn btn-primary" data-action="save-columns">Save Changes</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modalContainer);
            
            // Add event listeners
            modalContainer.addEventListener('click', (e) => {
                if (e.target.dataset.action === 'close-modal' || e.target.classList.contains('modal-overlay')) {
                    document.body.removeChild(modalContainer);
                }
                if (e.target.dataset.action === 'save-columns') {
                    this.saveColumnChanges(modalContainer);
                    document.body.removeChild(modalContainer);
                }
                if (e.target.id === 'add-column-btn') {
                    this.addNewColumn(modalContainer);
                }
                if (e.target.classList.contains('delete-column-btn')) {
                    this.deleteColumn(e.target.dataset.columnId, modalContainer);
                }
            });
            
        } catch (error) {
            console.error('Error loading column manager:', error);
        }
    }
    
    async renderBoardSettings() {
        try {
            // For now, implement basic board settings
            const modalContainer = document.createElement('div');
            modalContainer.className = 'modal-overlay';
            modalContainer.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Board Settings</h2>
                        <button class="modal-close-btn" data-action="close-modal">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label for="board-name">Board Name</label>
                            <input type="text" id="board-name" value="${this.board?.name || ''}" class="form-input" />
                        </div>
                        <div class="form-group">
                            <label for="board-description">Description</label>
                            <textarea id="board-description" class="form-input" rows="3">${this.board?.description || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="board-public" ${this.board?.isPublic ? 'checked' : ''} />
                                Make board public
                            </label>
                        </div>
                        <div class="form-group">
                            <label>Board Template</label>
                            <select id="board-template" class="form-input">
                                <option value="kanban">Kanban Board</option>
                                <option value="table">Table View</option>
                                <option value="timeline">Timeline View</option>
                            </select>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" data-action="close-modal">Cancel</button>
                        <button class="btn btn-primary" data-action="save-settings">Save Changes</button>
                        <button class="btn btn-danger" data-action="delete-board">Delete Board</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modalContainer);
            
            // Add event listeners
            modalContainer.addEventListener('click', (e) => {
                if (e.target.dataset.action === 'close-modal' || e.target.classList.contains('modal-overlay')) {
                    document.body.removeChild(modalContainer);
                }
                if (e.target.dataset.action === 'save-settings') {
                    this.saveBoardSettings(modalContainer);
                    document.body.removeChild(modalContainer);
                }
                if (e.target.dataset.action === 'delete-board') {
                    this.confirmDeleteBoard(modalContainer);
                }
            });
            
        } catch (error) {
            console.error('Error loading board settings:', error);
        }
    }
    
    renderCellValue(item, column) {
        const fieldValue = item.fieldValues?.find(fv => fv.columnId === column.id);
        const value = fieldValue ? fieldValue.value : null;
        const canManage = this.canManageBoard();
        
        // Create a unique cell ID for the editor
        const cellId = `cell-${item.id}-${column.id}`;
        
        // Return a container that will be enhanced with the cell editor
        return `
            <div 
                class="enhanced-cell" 
                data-cell-id="${cellId}"
                data-item-id="${item.id}"
                data-column-id="${column.id}"
                data-column-type="${column.type}"
                data-can-edit="${canManage}"
                data-value="${this.escapeHtml(JSON.stringify(value))}"
                data-column-settings="${this.escapeHtml(JSON.stringify(column.settings || {}))}"
                data-column-name="${this.escapeHtml(column.name)}"
            >
                ${this.renderBasicCellValue(value, column)}
            </div>
        `;
    }
    
    renderBasicCellValue(value, column) {
        // Fallback rendering for when EnhancedCellEditor is not available
        switch (column.type) {
            case 'text':
            case 'email':
            case 'url':
                return `<span class="cell-text ${!value ? 'cell-text--placeholder' : ''}">${value ? this.escapeHtml(value) : `Add ${column.type}`}</span>`;
                
            case 'multiline':
                return `<div class="cell-multiline ${!value ? 'cell-text--placeholder' : ''}">${value ? this.escapeHtml(value).replace(/\n/g, '<br>') : 'Add description'}</div>`;
                
            case 'number':
                const unit = column.settings?.unit || '';
                return `<span class="cell-number ${!value && value !== 0 ? 'cell-text--placeholder' : ''}">${value !== null && value !== undefined ? `${value}${unit}` : 'Set number'}</span>`;
                
            case 'checkbox':
                return `
                    <div class="cell-checkbox">
                        <svg class="checkbox-icon ${value ? 'checkbox-icon--checked' : ''}" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            ${value ? 
                                '<path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>' :
                                '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>'
                            }
                        </svg>
                        <span class="checkbox-label">${value ? 'Completed' : 'Not completed'}</span>
                    </div>
                `;
                
            case 'status':
                if (!value) return '<span class="cell-text--placeholder">Set status</span>';
                const statusClass = this.getStatusClass(value);
                return `<span class="status-badge status-badge--${statusClass}">${this.escapeHtml(value)}</span>`;
                
            case 'priority':
                if (!value) return '<span class="cell-text--placeholder">Set priority</span>';
                const priorityClass = this.getPriorityClass(value);
                return `<span class="priority-badge priority-badge--${priorityClass}">${this.getPriorityIcon()}${this.escapeHtml(value)}</span>`;
                
            case 'date':
                if (!value) return '<span class="cell-text--placeholder">Set date</span>';
                const date = new Date(value);
                const isOverdue = date < new Date();
                return `
                    <div class="cell-date ${isOverdue ? 'cell-date--overdue' : ''}">
                        <svg class="cell-date-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                        <span class="cell-date-text">${this.formatDate(date)}</span>
                    </div>
                `;
                
            case 'tags':
                if (!value || !value.length) return '<span class="cell-text--placeholder">Add tags</span>';
                const tags = Array.isArray(value) ? value : [value];
                return `
                    <div class="cell-tags">
                        ${tags.slice(0, 3).map(tag => `<span class="tag">${this.escapeHtml(tag)}</span>`).join('')}
                        ${tags.length > 3 ? `<span class="tag tag--more">+${tags.length - 3}</span>` : ''}
                    </div>
                `;
                
            case 'people':
                if (!value || !value.length) return '<span class="cell-text--placeholder">Assign people</span>';
                const people = Array.isArray(value) ? value : [value];
                return `
                    <div class="cell-people">
                        ${people.slice(0, 3).map(person => `
                            <div class="person-avatar" title="${this.escapeHtml(person.name || person.email)}">
                                ${person.avatar ? 
                                    `<img src="${person.avatar}" alt="${person.name}" />` :
                                    `<span class="person-initials">${this.getInitials(person.name || person.email)}</span>`
                                }
                            </div>
                        `).join('')}
                        ${people.length > 3 ? `<div class="person-avatar person-avatar--more"><span>+${people.length - 3}</span></div>` : ''}
                    </div>
                `;
                
            default:
                return `<span class="cell-text--placeholder">Unsupported: ${column.type}</span>`;
        }
    }
    
    // Enhanced cell editors management
    initializeCellEditors() {
        // Import and initialize EnhancedCellEditor for all cells
        import('./EnhancedCellEditor.js').then(({ EnhancedCellEditor }) => {
            const cells = this.container.querySelectorAll('.enhanced-cell[data-can-edit="true"]');
            
            cells.forEach(cellElement => {
                const itemId = cellElement.dataset.itemId;
                const columnId = cellElement.dataset.columnId;
                const columnType = cellElement.dataset.columnType;
                const columnName = cellElement.dataset.columnName;
                const value = JSON.parse(cellElement.dataset.value || 'null');
                const settings = JSON.parse(cellElement.dataset.columnSettings || '{}');
                
                const column = {
                    id: columnId,
                    type: columnType,
                    name: columnName,
                    settings: settings
                };
                
                const editor = new EnhancedCellEditor(cellElement, {
                    itemId: itemId,
                    column: column,
                    value: value,
                    onSave: this.handleCellSave.bind(this),
                    onCancel: this.handleCellCancel.bind(this),
                    readOnly: false
                });
                
                // Store reference for cleanup
                cellElement._cellEditor = editor;
            });
        }).catch(error => {
            console.warn('Enhanced cell editor not available, falling back to basic editing:', error);
        });
    }
    
    async handleCellSave(itemId, columnId, value) {
        try {
            // Update item field value via API
            const response = await boardService.makeRequest(`/items/${itemId}/fields/${columnId}`, {
                method: 'PUT',
                body: JSON.stringify({ value }),
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.success) {
                // Update local state
                const item = this.state.items.find(i => i.id === itemId);
                if (item) {
                    if (!item.fieldValues) item.fieldValues = [];
                    
                    const existingFieldValue = item.fieldValues.find(fv => fv.columnId === columnId);
                    if (existingFieldValue) {
                        existingFieldValue.value = value;
                    } else {
                        item.fieldValues.push({
                            id: `field-${itemId}-${columnId}`,
                            itemId: itemId,
                            columnId: columnId,
                            value: value
                        });
                    }
                }
                
                // Emit event for other components
                eventBus.emit('item:field-updated', { itemId, columnId, value });
                
                return Promise.resolve();
            } else {
                throw new Error(response.error?.message || 'Failed to update field');
            }
        } catch (error) {
            console.error('Error saving cell value:', error);
            throw error;
        }
    }
    
    handleCellCancel(columnId) {
        // Handle cell edit cancellation if needed
        console.log('Cell edit cancelled for column:', columnId);
    }
    
    // Cleanup cell editors
    cleanupCellEditors() {
        const cells = this.container.querySelectorAll('.enhanced-cell[data-can-edit="true"]');
        cells.forEach(cellElement => {
            if (cellElement._cellEditor) {
                cellElement._cellEditor.destroy();
                delete cellElement._cellEditor;
            }
        });
    }
    
    getStatusClass(status) {
        const statusMap = {
            'todo': 'gray',
            'in progress': 'blue',
            'in-progress': 'blue',
            'done': 'green',
            'completed': 'green',
            'blocked': 'red',
            'cancelled': 'gray',
            'on hold': 'yellow',
            'on-hold': 'yellow'
        };
        return statusMap[status.toLowerCase()] || 'gray';
    }
    
    getPriorityClass(priority) {
        const priorityMap = {
            'low': 'blue',
            'medium': 'yellow',
            'high': 'orange',
            'urgent': 'red',
            'critical': 'red'
        };
        return priorityMap[priority.toLowerCase()] || 'gray';
    }
    
    getPriorityIcon() {
        return `
            <svg class="priority-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M7 13l3 3 7-7"></path>
                <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"></path>
                <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"></path>
            </svg>
        `;
    }
    
    getInitials(name) {
        return name.split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    }
    
    // Override the render method to initialize cell editors after rendering
    render() {
        // Call parent render method
        super.render();
        
        // Initialize cell editors after DOM is updated
        setTimeout(() => {
            this.initializeCellEditors();
        }, 100);
    }
    
    bindEvents() {
        this.container.addEventListener('click', this.handleClick.bind(this));
        this.container.addEventListener('input', this.handleInput.bind(this));
        this.container.addEventListener('change', this.handleChange.bind(this));
        this.container.addEventListener('dragstart', this.handleDragStart.bind(this));
        this.container.addEventListener('dragover', this.handleDragOver.bind(this));
        this.container.addEventListener('drop', this.handleDrop.bind(this));
    }
    
    handleClick(event) {
        const action = event.target.closest('[data-action]')?.dataset.action;
        
        switch (action) {
            case 'add-item':
                this.handleAddItem(event.target.closest('[data-column-id]')?.dataset.columnId);
                break;
            case 'edit-item':
                this.handleEditItem(event.target.closest('[data-item-id]').dataset.itemId);
                break;
            case 'delete-item':
                this.handleDeleteItem(event.target.closest('[data-item-id]').dataset.itemId);
                break;
            case 'manage-columns':
                this.handleManageColumns();
                break;
            case 'add-status-column':
                this.handleAddStatusColumn();
                break;
            case 'column-menu':
                this.handleColumnMenu(event.target.closest('[data-column-id]').dataset.columnId, event.target);
                break;
            case 'board-settings':
                this.handleBoardSettings();
                break;
            case 'board-menu':
                this.handleBoardMenu(event.target);
                break;
            case 'toggle-favorite':
                this.handleToggleFavorite();
                break;
            case 'set-view-mode':
                this.handleSetViewMode(event.target.dataset.view);
                break;
            case 'toggle-sort-order':
                this.handleToggleSortOrder();
                break;
            case 'show-filters':
                this.handleShowFilters();
                break;
            case 'bulk-edit':
                this.handleBulkEdit();
                break;
            case 'bulk-move':
                this.handleBulkMove();
                break;
            case 'bulk-delete':
                this.handleBulkDelete();
                break;
            case 'close-column-manager':
                this.setState({ showColumnManager: false });
                break;
            case 'close-board-settings':
                this.setState({ showBoardSettings: false });
                break;
        }
    }
    
    handleInput(event) {
        if (event.target.dataset.searchInput !== undefined) {
            this.setState({ searchQuery: event.target.value });
        }
    }
    
    handleChange(event) {
        if (event.target.dataset.sortBy !== undefined) {
            this.setState({ sortBy: event.target.value });
        } else if (event.target.dataset.selectAll !== undefined) {
            this.handleSelectAll(event.target.checked);
        } else if (event.target.dataset.selectItem !== undefined) {
            this.handleSelectItem(event.target.dataset.itemId, event.target.checked);
        }
    }
    
    // Drag and Drop handlers
    handleDragStart(event) {
        if (event.target.classList.contains('kanban-card')) {
            event.dataTransfer.setData('text/plain', event.target.dataset.itemId);
        }
    }
    
    handleDragOver(event) {
        if (event.target.closest('[data-droppable="true"]')) {
            event.preventDefault();
        }
    }
    
    handleDrop(event) {
        event.preventDefault();
        const columnElement = event.target.closest('[data-droppable="true"]');
        if (columnElement) {
            const itemId = event.dataTransfer.getData('text/plain');
            const columnId = columnElement.dataset.columnId;
            this.handleMoveItem(itemId, columnId);
        }
    }
    
    // Action handlers
    handleAddItem(columnId = null) {
        if (this.options.onAddItem) {
            this.options.onAddItem(columnId);
        }
    }
    
    handleEditItem(itemId) {
        if (this.options.onEditItem) {
            this.options.onEditItem(itemId);
        }
    }
    
    async handleDeleteItem(itemId) {
        const confirmed = confirm('Are you sure you want to delete this item?');
        if (confirmed) {
            try {
                // Note: This would typically use an item service
                await boardService.makeRequest(`/items/${itemId}`, { method: 'DELETE' });
                this.loadItems(); // Refresh items
            } catch (error) {
                // Error handling
            }
        }
    }
    
    async handleMoveItem(itemId, columnId) {
        try {
            // Note: This would typically use an item service
            await boardService.makeRequest(`/items/${itemId}/move`, {
                method: 'PATCH',
                body: JSON.stringify({ columnId })
            });
            this.loadItems(); // Refresh items
        } catch (error) {
            // Error handling
        }
    }
    
    handleManageColumns() {
        this.setState({ showColumnManager: true });
    }
    
    handleAddStatusColumn() {
        // This would typically open a column creation dialog
        if (this.options.onAddColumn) {
            this.options.onAddColumn('status');
        }
    }
    
    handleColumnMenu(columnId, target) {
        if (this.options.onColumnMenu) {
            this.options.onColumnMenu(columnId, target);
        }
    }
    
    handleBoardSettings() {
        this.setState({ showBoardSettings: true });
    }
    
    handleBoardMenu(target) {
        if (this.options.onBoardMenu) {
            this.options.onBoardMenu(this.state.board.id, target);
        }
    }
    
    handleToggleFavorite() {
        if (this.state.board) {
            boardService.toggleFavorite(this.state.board.id);
            this.render(); // Re-render to update favorite state
        }
    }
    
    handleSetViewMode(viewMode) {
        this.setState({ viewMode });
        // Save preference to localStorage
        localStorage.setItem('board_view_mode', viewMode);
    }
    
    handleToggleSortOrder() {
        const newOrder = this.state.sortOrder === 'asc' ? 'desc' : 'asc';
        this.setState({ sortOrder: newOrder });
    }
    
    handleShowFilters() {
        if (this.options.onShowFilters) {
            this.options.onShowFilters();
        }
    }
    
    handleSelectAll(checked) {
        const selectableItems = this.state.items.map(item => item.id);
        this.setState({
            selectedItems: checked ? selectableItems : []
        });
    }
    
    handleSelectItem(itemId, checked) {
        const selectedItems = [...this.state.selectedItems];
        
        if (checked) {
            if (!selectedItems.includes(itemId)) {
                selectedItems.push(itemId);
            }
        } else {
            const index = selectedItems.indexOf(itemId);
            if (index > -1) {
                selectedItems.splice(index, 1);
            }
        }
        
        this.setState({ selectedItems });
    }
    
    handleBulkEdit() {
        if (this.options.onBulkEdit) {
            this.options.onBulkEdit(this.state.selectedItems);
        }
    }
    
    handleBulkMove() {
        if (this.options.onBulkMove) {
            this.options.onBulkMove(this.state.selectedItems);
        }
    }
    
    async handleBulkDelete() {
        const confirmed = confirm(`Are you sure you want to delete ${this.state.selectedItems.length} item(s)?`);
        if (confirmed) {
            try {
                await Promise.all(
                    this.state.selectedItems.map(itemId => 
                        boardService.makeRequest(`/items/${itemId}`, { method: 'DELETE' })
                    )
                );
                this.setState({ selectedItems: [] });
                this.loadItems(); // Refresh items
            } catch (error) {
                // Error handling
            }
        }
    }
    
    // Event handlers for service events
    handleBoardUpdated({ board }) {
        if (board.id === this.boardId) {
            this.setState({ board, columns: board.columns || [] });
        }
    }
    
    handleBoardSwitched({ board }) {
        this.boardId = board.id;
        this.loadBoard();
        this.loadItems();
    }
    
    handleItemCreated({ item }) {
        if (item.boardId === this.boardId) {
            this.setState({ items: [...this.state.items, item] });
        }
    }
    
    handleItemUpdated({ item }) {
        const items = [...this.state.items];
        const index = items.findIndex(i => i.id === item.id);
        
        if (index !== -1) {
            items[index] = item;
            this.setState({ items });
        }
    }
    
    handleItemDeleted({ itemId }) {
        this.setState({
            items: this.state.items.filter(i => i.id !== itemId),
            selectedItems: this.state.selectedItems.filter(id => id !== itemId)
        });
    }
    
    handleColumnCreated({ column }) {
        if (column.boardId === this.boardId) {
            this.setState({ columns: [...this.state.columns, column] });
        }
    }
    
    handleColumnUpdated({ column }) {
        const columns = [...this.state.columns];
        const index = columns.findIndex(c => c.id === column.id);
        
        if (index !== -1) {
            columns[index] = column;
            this.setState({ columns });
        }
    }
    
    handleColumnDeleted({ columnId }) {
        this.setState({
            columns: this.state.columns.filter(c => c.id !== columnId)
        });
    }
    
    // Utility methods
    filterAndSortItems(items, searchQuery, sortBy, sortOrder, filterBy) {
        let filtered = items;
        
        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(item => 
                (item.name && item.name.toLowerCase().includes(query)) ||
                (item.description && item.description.toLowerCase().includes(query))
            );
        }
        
        // Apply filters
        Object.keys(filterBy).forEach(key => {
            const value = filterBy[key];
            if (value) {
                filtered = filtered.filter(item => {
                    const fieldValue = item.fieldValues?.find(fv => fv.columnId === key);
                    return fieldValue && fieldValue.value === value;
                });
            }
        });
        
        // Sort items
        filtered.sort((a, b) => {
            let aValue, bValue;
            
            switch (sortBy) {
                case 'name':
                    aValue = (a.name || '').toLowerCase();
                    bValue = (b.name || '').toLowerCase();
                    break;
                case 'created':
                    aValue = new Date(a.createdAt);
                    bValue = new Date(b.createdAt);
                    break;
                case 'updated':
                    aValue = new Date(a.updatedAt);
                    bValue = new Date(b.updatedAt);
                    break;
                case 'priority':
                    const priorityOrder = { high: 3, medium: 2, low: 1 };
                    aValue = priorityOrder[a.priority] || 0;
                    bValue = priorityOrder[b.priority] || 0;
                    break;
                default:
                    return 0;
            }
            
            if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
        
        return filtered;
    }
    
    isAllSelected(items) {
        return items.length > 0 && items.every(item => this.state.selectedItems.includes(item.id));
    }
    
    canManageBoard() {
        return this.state.board && workspaceService.hasPermission('write');
    }
    
    getColumnTypeIcon(type) {
        const icons = {
            text: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14,2 14,8 20,8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line>',
            status: '<circle cx="12" cy="12" r="3"></circle><path d="M12 1v6m0 6v6"></path>',
            priority: '<polygon points="13,2 3,14 12,14 11,22 21,10 12,10"></polygon>',
            person: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>',
            date: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>',
            number: '<line x1="4" y1="9" x2="20" y2="9"></line><line x1="4" y1="15" x2="20" y2="15"></line><line x1="10" y1="3" x2="8" y2="21"></line><line x1="16" y1="3" x2="14" y2="21"></line>'
        };
        
        return `<svg class="icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">${icons[type] || icons.text}</svg>`;
    }
    
    getPriorityIcon(priority) {
        const icons = {
            high: '<svg class="icon" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="13,2 3,14 12,14 11,22 21,10 12,10"></polygon></svg>',
            medium: '<svg class="icon" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"></circle></svg>',
            low: '<svg class="icon" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path></svg>'
        };
        return icons[priority] || '';
    }
    
    getPriorityLabel(priority) {
        const labels = {
            high: 'High',
            medium: 'Medium',
            low: 'Low'
        };
        return labels[priority] || priority;
    }
    
    getInitials(name) {
        return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
    }
    
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
    }
    
    isDueDateOverdue(dueDate) {
        return new Date(dueDate) < new Date();
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    destroy() {
        this.cleanupCellEditors();
        // Remove event listeners
        eventBus.off('board:updated', this.handleBoardUpdated);
        eventBus.off('board:switched', this.handleBoardSwitched);
        eventBus.off('item:created', this.handleItemCreated);
        eventBus.off('item:updated', this.handleItemUpdated);
        eventBus.off('item:deleted', this.handleItemDeleted);
        eventBus.off('column:created', this.handleColumnCreated);
        eventBus.off('column:updated', this.handleColumnUpdated);
        eventBus.off('column:deleted', this.handleColumnDeleted);
        
        super.destroy();
    }
} 