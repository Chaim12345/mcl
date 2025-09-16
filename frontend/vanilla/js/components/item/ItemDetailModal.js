/**
 * Item Detail Modal Component
 */

import { Component } from '../base/Component.js';
import { itemService } from '../../services/item.js';
import { boardService } from '../../services/board.js';
import { authService } from '../../services/auth.js';
import { eventBus } from '../../utils/events.js';

export class ItemDetailModal extends Component {
    constructor(container, options = {}) {
        super(container, options);
        
        this.state = {
            isLoading: false,
            item: null,
            board: null,
            comments: [],
            activities: [],
            isEditing: false,
            editData: {},
            activeTab: 'details', // details, comments, activity
            errors: {},
            newComment: '',
            assigneeSearch: '',
            assigneeResults: []
        };
        
        this.itemId = options.itemId || null;
        this.boardId = options.boardId || null;
        
        this.init();
    }
    
    init() {
        if (this.itemId) {
            this.loadItem();
        }
        
        this.render();
        this.bindEvents();
        this.setupEventListeners();
        this.setupFocusTrap();
    }
    
    setupEventListeners() {
        eventBus.on('item:updated', this.handleItemUpdated.bind(this));
        eventBus.on('item:comment_added', this.handleCommentAdded.bind(this));
        eventBus.on('item:activity_loaded', this.handleActivityLoaded.bind(this));
        eventBus.on('item:comments_loaded', this.handleCommentsLoaded.bind(this));
    }
    
    async loadItem() {
        this.setState({ isLoading: true });
        
        try {
            const item = await itemService.getItemById(this.itemId);
            const board = await boardService.getBoardById(item.boardId);
            
            this.setState({
                isLoading: false,
                item,
                board,
                editData: { ...item }
            });
            
            // Load additional data
            this.loadComments();
            this.loadActivity();
        } catch (error) {
            this.setState({
                isLoading: false,
                errors: { load: error.message }
            });
        }
    }
    
    async loadComments() {
        try {
            const comments = await itemService.getComments(this.itemId);
            this.setState({ comments });
        } catch (error) {
            console.error('Error loading comments:', error);
        }
    }
    
    async loadActivity() {
        try {
            const activities = await itemService.getActivity(this.itemId);
            this.setState({ activities });
        } catch (error) {
            console.error('Error loading activity:', error);
        }
    }
    
    // Add enhanced field editing capabilities
    initializeFieldEditors() {
        import('../board/EnhancedCellEditor.js').then(({ EnhancedCellEditor }) => {
            const fieldContainers = this.container.querySelectorAll('.field-editor-container');
            
            fieldContainers.forEach(container => {
                const fieldId = container.dataset.fieldId;
                const columnId = container.dataset.columnId;
                const column = this.state.board?.columns?.find(col => col.id === columnId);
                
                if (!column) return;
                
                const fieldValue = this.state.item?.fieldValues?.find(fv => fv.columnId === columnId);
                const value = fieldValue ? fieldValue.value : null;
                
                const editor = new EnhancedCellEditor(container, {
                    itemId: this.itemId,
                    column: column,
                    value: value,
                    onSave: this.handleFieldSave.bind(this),
                    onCancel: this.handleFieldCancel.bind(this),
                    readOnly: !this.canEditItem()
                });
                
                container._fieldEditor = editor;
            });
        }).catch(error => {
            console.warn('Enhanced field editor not available:', error);
        });
    }
    
    async handleFieldSave(itemId, columnId, value) {
        try {
            const response = await itemService.updateField(itemId, columnId, value);
            
            if (response.success) {
                // Update local state
                if (!this.state.item.fieldValues) {
                    this.state.item.fieldValues = [];
                }
                
                const existingField = this.state.item.fieldValues.find(fv => fv.columnId === columnId);
                if (existingField) {
                    existingField.value = value;
                } else {
                    this.state.item.fieldValues.push({
                        id: `field-${itemId}-${columnId}`,
                        itemId: itemId,
                        columnId: columnId,
                        value: value
                    });
                }
                
                // Trigger re-render of summary section
                this.renderFieldSummary();
                
                // Emit event for other components
                eventBus.emit('item:field-updated', { itemId, columnId, value });
                
                return Promise.resolve();
            } else {
                throw new Error(response.error?.message || 'Failed to update field');
            }
        } catch (error) {
            console.error('Error saving field:', error);
            throw error;
        }
    }
    
    handleFieldCancel(columnId) {
        console.log('Field edit cancelled for column:', columnId);
    }
    
    renderFieldSummary() {
        const summaryContainer = this.container.querySelector('.item-field-summary');
        if (!summaryContainer || !this.state.board?.columns) return;
        
        const displayColumns = this.state.board.columns.filter(col => 
            ['status', 'priority', 'date', 'people'].includes(col.type)
        );
        
        summaryContainer.innerHTML = displayColumns.map(column => {
            const fieldValue = this.state.item?.fieldValues?.find(fv => fv.columnId === column.id);
            const value = fieldValue ? fieldValue.value : null;
            
            return `
                <div class="field-summary-item">
                    <label class="field-summary-label">${this.escapeHtml(column.name)}</label>
                    <div class="field-summary-value field-editor-container" data-field-id="${column.id}" data-column-id="${column.id}">
                        ${this.renderFieldSummaryValue(value, column)}
                    </div>
                </div>
            `;
        }).join('');
        
        // Reinitialize field editors for the summary
        setTimeout(() => this.initializeFieldEditors(), 100);
    }
    
    renderFieldSummaryValue(value, column) {
        // Fallback rendering similar to enhanced cell editor
        switch (column.type) {
            case 'status':
                if (!value) return '<span class="field-placeholder">Set status</span>';
                return `<span class="status-badge status-badge--${this.getStatusClass(value)}">${this.escapeHtml(value)}</span>`;
                
            case 'priority':
                if (!value) return '<span class="field-placeholder">Set priority</span>';
                return `<span class="priority-badge priority-badge--${this.getPriorityClass(value)}">${this.escapeHtml(value)}</span>`;
                
            case 'date':
                if (!value) return '<span class="field-placeholder">Set date</span>';
                const date = new Date(value);
                const isOverdue = date < new Date();
                return `
                    <div class="field-date ${isOverdue ? 'field-date--overdue' : ''}">
                        <svg class="field-date-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                        <span class="field-date-text">${this.formatDate(date)}</span>
                    </div>
                `;
                
            case 'people':
                if (!value || !value.length) return '<span class="field-placeholder">Assign people</span>';
                const people = Array.isArray(value) ? value : [value];
                return `
                    <div class="field-people">
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
                return value ? this.escapeHtml(value.toString()) : '<span class="field-placeholder">No value</span>';
        }
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
    
    formatDate(date) {
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }
    
    getInitials(name) {
        return name.split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    }
    
    canEditItem() {
        // Check if user has permission to edit the item
        return this.state.board?.permissions?.canEdit !== false;
    }
    
    // Cleanup field editors
    cleanupFieldEditors() {
        const fieldContainers = this.container.querySelectorAll('.field-editor-container');
        fieldContainers.forEach(container => {
            if (container._fieldEditor) {
                container._fieldEditor.destroy();
                delete container._fieldEditor;
            }
        });
    }
    
    render() {
        const { 
            isLoading, 
            item, 
            board, 
            comments, 
            activities, 
            isEditing, 
            editData, 
            activeTab, 
            errors, 
            newComment 
        } = this.state;
        
        if (isLoading || !item) {
            return this.renderLoadingState();
        }
        
        const canEdit = this.canEditItem();
        
        this.container.innerHTML = `
            <div class="modal-overlay" data-action="close-modal"></div>
            <div class="modal-content item-detail-modal" role="dialog" aria-labelledby="modal-title" aria-modal="true">
                <div class="modal-header">
                    <div class="modal-title-section">
                        ${isEditing ? `
                            <input 
                                type="text" 
                                class="item-title-input" 
                                value="${this.escapeHtml(editData.name || '')}"
                                data-field="name"
                                placeholder="Item title..."
                                maxlength="200"
                            />
                        ` : `
                            <h2 id="modal-title" class="modal-title">${this.escapeHtml(item.name)}</h2>
                        `}
                        
                        <div class="item-meta">
                            <span class="item-id">ID: ${item.id}</span>
                            <span class="item-board">in ${this.escapeHtml(board?.name || 'Unknown Board')}</span>
                        </div>
                    </div>
                    
                    <div class="modal-actions">
                        ${canEdit ? `
                            ${isEditing ? `
                                <button type="button" class="btn btn--outline" data-action="cancel-edit">
                                    Cancel
                                </button>
                                <button type="button" class="btn btn--primary" data-action="save-edit">
                                    Save Changes
                                </button>
                            ` : `
                                <button type="button" class="btn btn--outline" data-action="start-edit">
                                    <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                                    </svg>
                                    Edit
                                </button>
                                
                                <button type="button" class="btn btn--ghost btn--icon" data-action="item-menu">
                                    <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <circle cx="12" cy="12" r="1"></circle>
                                        <circle cx="19" cy="12" r="1"></circle>
                                        <circle cx="5" cy="12" r="1"></circle>
                                    </svg>
                                </button>
                            `}
                        ` : ''}
                        
                        <button type="button" class="modal-close" data-action="close-modal" aria-label="Close modal">
                            <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                </div>
                
                <div class="modal-tabs">
                    <button 
                        type="button" 
                        class="modal-tab ${activeTab === 'details' ? 'modal-tab--active' : ''}"
                        data-action="switch-tab" 
                        data-tab="details"
                    >
                        Details
                    </button>
                    <button 
                        type="button" 
                        class="modal-tab ${activeTab === 'comments' ? 'modal-tab--active' : ''}"
                        data-action="switch-tab" 
                        data-tab="comments"
                    >
                        Comments <span class="tab-count">${comments.length}</span>
                    </button>
                    <button 
                        type="button" 
                        class="modal-tab ${activeTab === 'activity' ? 'modal-tab--active' : ''}"
                        data-action="switch-tab" 
                        data-tab="activity"
                    >
                        Activity <span class="tab-count">${activities.length}</span>
                    </button>
                </div>
                
                <div class="modal-body">
                    ${this.renderActiveTab()}
                </div>
                
                ${errors.save ? `
                    <div class="modal-footer">
                        <div class="alert alert--error">
                            <svg class="alert-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="15" y1="9" x2="9" y2="15"></line>
                                <line x1="9" y1="9" x2="15" y2="15"></line>
                            </svg>
                            <p>${errors.save}</p>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    renderLoadingState() {
        this.container.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content item-detail-modal">
                <div class="loading-state">
                    <div class="loading-spinner">
                        <svg class="spinner" width="32" height="32" viewBox="0 0 24 24">
                            <circle class="spinner-circle" cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </div>
                    <p class="loading-text">Loading item...</p>
                </div>
            </div>
        `;
    }
    
    renderActiveTab() {
        switch (this.state.activeTab) {
            case 'details':
                return this.renderDetailsTab();
            case 'comments':
                return this.renderCommentsTab();
            case 'activity':
                return this.renderActivityTab();
            default:
                return '';
        }
    }
    
    renderDetailsTab() {
        const { item, board, isEditing, editData, errors } = this.state;
        const canEdit = this.canEditItem();
        
        return `
            <div class="item-details-tab">
                <div class="item-main-content">
                    <div class="item-description-section">
                        <h3 class="section-title">Description</h3>
                        ${isEditing ? `
                            <textarea 
                                class="item-description-input ${errors.description ? 'form-input--error' : ''}"
                                data-field="description"
                                placeholder="Add a description..."
                                rows="4"
                                maxlength="2000"
                            >${this.escapeHtml(editData.description || '')}</textarea>
                            ${errors.description ? `<span class="form-error">${errors.description}</span>` : ''}
                            <div class="form-hint">
                                <span class="form-counter">${(editData.description || '').length}/2000</span>
                            </div>
                        ` : `
                            <div class="item-description">
                                ${item.description ? 
                                    `<p class="description-text">${this.escapeHtml(item.description)}</p>` :
                                    `<p class="description-empty">No description</p>`
                                }
                                ${canEdit && !isEditing ? `
                                    <button type="button" class="btn btn--ghost btn--sm" data-action="start-edit">
                                        <svg class="icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                                        </svg>
                                        Edit
                                    </button>
                                ` : ''}
                            </div>
                        `}
                    </div>
                    
                    ${board && board.columns ? this.renderItemFields() : ''}
                </div>
                
                <div class="item-sidebar">
                    ${this.renderItemProperties()}
                </div>
            </div>
        `;
    }
    
    renderItemFields() {
        const { item, board, isEditing } = this.state;
        const canEdit = this.canEditItem();
        
        return `
            <div class="item-fields-section">
                <h3 class="section-title">Fields</h3>
                <div class="item-fields">
                    ${board.columns.map(column => {
                        const fieldValue = itemService.getFieldValue(item, column.id);
                        
                        return `
                            <div class="item-field" data-column-id="${column.id}">
                                <label class="field-label">
                                    ${this.getColumnTypeIcon(column.type)}
                                    ${this.escapeHtml(column.name)}
                                </label>
                                <div class="field-value">
                                    ${isEditing && canEdit ? 
                                        this.renderFieldEditor(column, fieldValue) :
                                        this.renderFieldDisplay(column, fieldValue)
                                    }
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }
    
    renderFieldEditor(column, value) {
        switch (column.type) {
            case 'text':
                return `
                    <input 
                        type="text" 
                        class="field-input" 
                        data-column-id="${column.id}"
                        value="${this.escapeHtml(value || '')}"
                        placeholder="Enter text..."
                    />
                `;
            case 'status':
                const statusOptions = column.settings?.options || ['To Do', 'In Progress', 'Done'];
                return `
                    <select class="field-select" data-column-id="${column.id}">
                        <option value="">Select status...</option>
                        ${statusOptions.map(option => `
                            <option value="${option}" ${value === option ? 'selected' : ''}>
                                ${this.escapeHtml(option)}
                            </option>
                        `).join('')}
                    </select>
                `;
            case 'priority':
                const priorityOptions = ['Low', 'Medium', 'High', 'Critical'];
                return `
                    <select class="field-select" data-column-id="${column.id}">
                        <option value="">Select priority...</option>
                        ${priorityOptions.map(option => `
                            <option value="${option.toLowerCase()}" ${value === option.toLowerCase() ? 'selected' : ''}>
                                ${option}
                            </option>
                        `).join('')}
                    </select>
                `;
            case 'date':
                return `
                    <input 
                        type="date" 
                        class="field-input" 
                        data-column-id="${column.id}"
                        value="${value ? this.formatDateForInput(value) : ''}"
                    />
                `;
            case 'number':
                return `
                    <input 
                        type="number" 
                        class="field-input" 
                        data-column-id="${column.id}"
                        value="${value || ''}"
                        placeholder="Enter number..."
                    />
                `;
            case 'person':
                return `
                    <div class="person-field">
                        <input 
                            type="text" 
                            class="field-input" 
                            data-column-id="${column.id}"
                            value="${this.escapeHtml(value || '')}"
                            placeholder="Enter name or email..."
                        />
                    </div>
                `;
            default:
                return `
                    <input 
                        type="text" 
                        class="field-input" 
                        data-column-id="${column.id}"
                        value="${this.escapeHtml(value || '')}"
                        placeholder="Enter value..."
                    />
                `;
        }
    }
    
    renderFieldDisplay(column, value) {
        if (!value) {
            return '<span class="field-empty">—</span>';
        }
        
        switch (column.type) {
            case 'status':
                return `<span class="status-badge status-badge--${value.toLowerCase().replace(/\s+/g, '-')}">${this.escapeHtml(value)}</span>`;
            case 'priority':
                return `<span class="priority-badge priority-badge--${value}">${this.getPriorityLabel(value)}</span>`;
            case 'date':
                return `<time datetime="${value}">${this.formatDate(value)}</time>`;
            case 'person':
                return `<span class="person-badge">${this.escapeHtml(value)}</span>`;
            case 'number':
                return `<span class="number-value">${value}</span>`;
            default:
                return `<span class="text-value">${this.escapeHtml(value)}</span>`;
        }
    }
    
    renderItemProperties() {
        const { item } = this.state;
        
        return `
            <div class="item-properties">
                <h3 class="section-title">Properties</h3>
                
                <div class="property-group">
                    <h4 class="property-title">Assignees</h4>
                    <div class="assignee-list">
                        ${item.assignees && item.assignees.length > 0 ? 
                            item.assignees.map(assignee => `
                                <div class="assignee-item">
                                    <div class="assignee-avatar">
                                        ${assignee.avatar ? 
                                            `<img src="${assignee.avatar}" alt="${assignee.name}" />` :
                                            `<div class="assignee-initials">${this.getInitials(assignee.name)}</div>`
                                        }
                                    </div>
                                    <span class="assignee-name">${this.escapeHtml(assignee.name)}</span>
                                    ${this.canEditItem() ? `
                                        <button type="button" class="btn btn--ghost btn--icon" data-action="remove-assignee" data-user-id="${assignee.id}">
                                            <svg class="icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                                <line x1="6" y1="6" x2="18" y2="18"></line>
                                            </svg>
                                        </button>
                                    ` : ''}
                                </div>
                            `).join('') :
                            '<p class="property-empty">No assignees</p>'
                        }
                        ${this.canEditItem() ? `
                            <button type="button" class="btn btn--outline btn--sm" data-action="add-assignee">
                                <svg class="icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="12" y1="8" x2="12" y2="16"></line>
                                    <line x1="8" y1="12" x2="16" y2="12"></line>
                                </svg>
                                Add Assignee
                            </button>
                        ` : ''}
                    </div>
                </div>
                
                <div class="property-group">
                    <h4 class="property-title">Timestamps</h4>
                    <div class="timestamp-list">
                        <div class="timestamp-item">
                            <span class="timestamp-label">Created:</span>
                            <time datetime="${item.createdAt}" title="${this.formatFullDate(item.createdAt)}">
                                ${this.formatRelativeDate(item.createdAt)}
                            </time>
                        </div>
                        <div class="timestamp-item">
                            <span class="timestamp-label">Updated:</span>
                            <time datetime="${item.updatedAt}" title="${this.formatFullDate(item.updatedAt)}">
                                ${this.formatRelativeDate(item.updatedAt)}
                            </time>
                        </div>
                        ${item.createdBy ? `
                            <div class="timestamp-item">
                                <span class="timestamp-label">Created by:</span>
                                <span class="creator-name">${this.escapeHtml(item.createdBy.name || item.createdBy.email)}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }
    
    renderCommentsTab() {
        const { comments, newComment } = this.state;
        const canComment = this.canEditItem();
        
        return `
            <div class="item-comments-tab">
                ${canComment ? `
                    <div class="comment-composer">
                        <div class="comment-composer-header">
                            <h3 class="section-title">Add Comment</h3>
                        </div>
                        <div class="comment-composer-body">
                            <textarea 
                                class="comment-input"
                                data-comment-input
                                placeholder="Write a comment..."
                                rows="3"
                                maxlength="2000"
                            >${newComment}</textarea>
                            <div class="comment-composer-actions">
                                <button type="button" class="btn btn--primary btn--sm" data-action="add-comment">
                                    <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                    </svg>
                                    Add Comment
                                </button>
                            </div>
                        </div>
                    </div>
                ` : ''}
                
                <div class="comments-list">
                    ${comments.length > 0 ? 
                        comments.map(comment => this.renderComment(comment)).join('') :
                        '<div class="empty-state"><p>No comments yet</p></div>'
                    }
                </div>
            </div>
        `;
    }
    
    renderComment(comment) {
        return `
            <div class="comment-item" data-comment-id="${comment.id}">
                <div class="comment-avatar">
                    ${comment.author.avatar ? 
                        `<img src="${comment.author.avatar}" alt="${comment.author.name}" />` :
                        `<div class="comment-initials">${this.getInitials(comment.author.name)}</div>`
                    }
                </div>
                <div class="comment-content">
                    <div class="comment-header">
                        <span class="comment-author">${this.escapeHtml(comment.author.name)}</span>
                        <time class="comment-time" datetime="${comment.createdAt}" title="${this.formatFullDate(comment.createdAt)}">
                            ${this.formatRelativeDate(comment.createdAt)}
                        </time>
                    </div>
                    <div class="comment-body">
                        <p class="comment-text">${this.escapeHtml(comment.content)}</p>
                    </div>
                    ${comment.editHistory && comment.editHistory.length > 0 ? `
                        <div class="comment-edited">
                            <small class="text-muted">edited</small>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    renderActivityTab() {
        const { activities } = this.state;
        
        return `
            <div class="item-activity-tab">
                <div class="activity-list">
                    ${activities.length > 0 ? 
                        activities.map(activity => this.renderActivity(activity)).join('') :
                        '<div class="empty-state"><p>No activity yet</p></div>'
                    }
                </div>
            </div>
        `;
    }
    
    renderActivity(activity) {
        return `
            <div class="activity-item" data-activity-id="${activity.id}">
                <div class="activity-icon">
                    ${this.getActivityIcon(activity.type)}
                </div>
                <div class="activity-content">
                    <div class="activity-description">
                        <span class="activity-user">${this.escapeHtml(activity.user?.name || 'Someone')}</span>
                        <span class="activity-action">${this.getActivityDescription(activity)}</span>
                    </div>
                    <time class="activity-time" datetime="${activity.createdAt}" title="${this.formatFullDate(activity.createdAt)}">
                        ${this.formatRelativeDate(activity.createdAt)}
                    </time>
                </div>
            </div>
        `;
    }
    
    bindEvents() {
        this.container.addEventListener('click', this.handleClick.bind(this));
        this.container.addEventListener('input', this.handleInput.bind(this));
        this.container.addEventListener('change', this.handleChange.bind(this));
        this.container.addEventListener('keydown', this.handleKeyDown.bind(this));
    }
    
    handleClick(event) {
        const action = event.target.closest('[data-action]')?.dataset.action;
        
        switch (action) {
            case 'close-modal':
                this.handleClose();
                break;
            case 'switch-tab':
                this.handleSwitchTab(event.target.dataset.tab);
                break;
            case 'start-edit':
                this.handleStartEdit();
                break;
            case 'cancel-edit':
                this.handleCancelEdit();
                break;
            case 'save-edit':
                this.handleSaveEdit();
                break;
            case 'add-comment':
                this.handleAddComment();
                break;
            case 'add-assignee':
                this.handleAddAssignee();
                break;
            case 'remove-assignee':
                this.handleRemoveAssignee(event.target.closest('[data-user-id]').dataset.userId);
                break;
            case 'item-menu':
                this.handleItemMenu(event.target);
                break;
        }
    }
    
    handleInput(event) {
        if (event.target.dataset.field) {
            const field = event.target.dataset.field;
            this.state.editData[field] = event.target.value;
        } else if (event.target.dataset.commentInput !== undefined) {
            this.state.newComment = event.target.value;
        } else if (event.target.dataset.columnId) {
            const columnId = event.target.dataset.columnId;
            const value = event.target.value;
            
            // Update field value in edit data
            if (!this.state.editData.fieldValues) {
                this.state.editData.fieldValues = [...(this.state.item.fieldValues || [])];
            }
            
            itemService.setFieldValueLocal(this.state.editData, columnId, value);
        }
    }
    
    handleChange(event) {
        // Handle field changes (for selects and other change events)
        if (event.target.dataset.columnId) {
            const columnId = event.target.dataset.columnId;
            const value = event.target.value;
            
            if (!this.state.editData.fieldValues) {
                this.state.editData.fieldValues = [...(this.state.item.fieldValues || [])];
            }
            
            itemService.setFieldValueLocal(this.state.editData, columnId, value);
        }
    }
    
    handleKeyDown(event) {
        // Handle Escape key
        if (event.key === 'Escape') {
            if (this.state.isEditing) {
                this.handleCancelEdit();
            } else {
                this.handleClose();
            }
        }
        
        // Handle Ctrl+Enter for comment submission
        if (event.key === 'Enter' && event.ctrlKey && event.target.dataset.commentInput !== undefined) {
            this.handleAddComment();
        }
    }
    
    handleClose() {
        if (this.options.onClose) {
            this.options.onClose();
        } else {
            this.destroy();
        }
    }
    
    handleSwitchTab(tab) {
        this.setState({ activeTab: tab });
    }
    
    handleStartEdit() {
        this.setState({ 
            isEditing: true,
            editData: { ...this.state.item },
            errors: {}
        });
    }
    
    handleCancelEdit() {
        this.setState({ 
            isEditing: false,
            editData: { ...this.state.item },
            errors: {}
        });
    }
    
    async handleSaveEdit() {
        const { editData } = this.state;
        
        // Validate
        const validation = itemService.validateItemData(editData);
        if (!validation.isValid) {
            this.setState({ errors: validation.errors });
            return;
        }
        
        try {
            const updatedItem = await itemService.updateItem(this.state.item.id, editData);
            
            this.setState({ 
                item: updatedItem,
                isEditing: false,
                errors: {}
            });
            
            if (this.options.onUpdate) {
                this.options.onUpdate(updatedItem);
            }
        } catch (error) {
            this.setState({ errors: { save: error.message } });
        }
    }
    
    async handleAddComment() {
        const content = this.state.newComment.trim();
        
        if (!content) return;
        
        try {
            const comment = await itemService.addComment(this.state.item.id, content);
            
            this.setState({ 
                comments: [...this.state.comments, comment],
                newComment: ''
            });
            
            // Re-render to update comment input
            this.render();
        } catch (error) {
            // Error handled by service
        }
    }
    
    handleAddAssignee() {
        if (this.options.onAddAssignee) {
            this.options.onAddAssignee(this.state.item.id);
        }
    }
    
    async handleRemoveAssignee(userId) {
        try {
            await itemService.removeAssignee(this.state.item.id, userId);
            
            // Update local state
            const updatedItem = {
                ...this.state.item,
                assignees: this.state.item.assignees.filter(a => a.id !== userId)
            };
            
            this.setState({ item: updatedItem });
        } catch (error) {
            // Error handled by service
        }
    }
    
    handleItemMenu(target) {
        if (this.options.onItemMenu) {
            this.options.onItemMenu(this.state.item.id, target);
        }
    }
    
    // Event handlers for service events
    handleItemUpdated({ item }) {
        if (item.id === this.state.item?.id) {
            this.setState({ item });
        }
    }
    
    handleCommentAdded({ itemId, comment }) {
        if (itemId === this.state.item?.id) {
            this.setState({ 
                comments: [...this.state.comments, comment]
            });
        }
    }
    
    handleCommentsLoaded({ itemId, comments }) {
        if (itemId === this.state.item?.id) {
            this.setState({ comments });
        }
    }
    
    handleActivityLoaded({ itemId, activities }) {
        if (itemId === this.state.item?.id) {
            this.setState({ activities });
        }
    }
    
    // Utility methods
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
    
    getPriorityLabel(priority) {
        const labels = {
            low: 'Low',
            medium: 'Medium',
            high: 'High',
            critical: 'Critical'
        };
        return labels[priority] || priority;
    }
    
    getActivityIcon(type) {
        const icons = {
            created: '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line>',
            updated: '<path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>',
            moved: '<path d="M3 12h18m-9-9l9 9-9 9"></path>',
            commented: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>',
            assigned: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>'
        };
        
        return `<svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">${icons[type] || icons.updated}</svg>`;
    }
    
    getActivityDescription(activity) {
        switch (activity.type) {
            case 'item_created':
                return 'created this item';
            case 'item_updated':
                return 'updated this item';
            case 'item_moved':
                return `moved this item to ${activity.data?.newColumn || 'another column'}`;
            case 'comment_added':
                return 'added a comment';
            case 'assignee_added':
                return `assigned ${activity.data?.assigneeName || 'someone'} to this item`;
            case 'assignee_removed':
                return `removed ${activity.data?.assigneeName || 'someone'} from this item`;
            default:
                return 'performed an action on this item';
        }
    }
    
    getInitials(name) {
        if (!name) return 'U';
        return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
    }
    
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
    
    formatDateForInput(dateString) {
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
    }
    
    formatRelativeDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
        
        return this.formatDate(dateString);
    }
    
    formatFullDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    setupFocusTrap() {
        const focusableElements = this.container.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusableElements.length === 0) return;
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        this.container.addEventListener('keydown', (event) => {
            if (event.key === 'Tab') {
                if (event.shiftKey) {
                    if (document.activeElement === firstElement) {
                        event.preventDefault();
                        lastElement.focus();
                    }
                } else {
                    if (document.activeElement === lastElement) {
                        event.preventDefault();
                        firstElement.focus();
                    }
                }
            }
        });
    }
    
    destroy() {
        this.cleanupFieldEditors();
        // Remove event listeners
        eventBus.off('item:updated', this.handleItemUpdated);
        eventBus.off('item:comment_added', this.handleCommentAdded);
        eventBus.off('item:activity_loaded', this.handleActivityLoaded);
        eventBus.off('item:comments_loaded', this.handleCommentsLoaded);
        
        super.destroy();
    }
} 