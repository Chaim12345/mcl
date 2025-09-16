/**
 * Item Create Dialog Component
 */

import { Component } from '../base/Component.js';
import { itemService } from '../../services/item.js';
import { boardService } from '../../services/board.js';
import { eventBus } from '../../utils/events.js';

export class ItemCreateDialog extends Component {
    constructor(container, options = {}) {
        super(container, options);
        
        this.state = {
            isLoading: false,
            board: null,
            errors: {},
            formData: {
                name: '',
                description: '',
                fieldValues: {},
                assignees: [],
                tags: []
            }
        };
        
        this.boardId = options.boardId || null;
        this.columnId = options.columnId || null; // Pre-select column for kanban
        this.position = options.position || null; // Insert at specific position
        
        this.validationRules = {
            name: [
                { rule: 'required', message: 'Item name is required' },
                { rule: 'minLength', value: 1, message: 'Name must be at least 1 character' },
                { rule: 'maxLength', value: 200, message: 'Name must be less than 200 characters' }
            ],
            description: [
                { rule: 'maxLength', value: 2000, message: 'Description must be less than 2000 characters' }
            ]
        };
        
        this.init();
    }
    
    init() {
        if (this.boardId) {
            this.loadBoard();
        }
        
        this.render();
        this.bindEvents();
        this.focusFirstInput();
        
        // Trap focus within dialog
        this.setupFocusTrap();
    }
    
    async loadBoard() {
        this.setState({ isLoading: true });
        
        try {
            const board = await boardService.getBoardById(this.boardId);
            
            // Initialize field values based on column
            const fieldValues = {};
            if (this.columnId && board.columns) {
                const statusColumn = board.columns.find(col => col.type === 'status');
                if (statusColumn) {
                    fieldValues[statusColumn.id] = this.columnId;
                }
            }
            
            this.setState({
                isLoading: false,
                board,
                formData: {
                    ...this.state.formData,
                    fieldValues
                }
            });
        } catch (error) {
            this.setState({
                isLoading: false,
                errors: { load: error.message }
            });
        }
    }
    
    render() {
        const { isLoading, board, formData, errors } = this.state;
        
        if (isLoading) {
            return this.renderLoadingState();
        }
        
        this.container.innerHTML = `
            <div class="dialog-overlay" data-action="close-dialog"></div>
            <div class="dialog-content item-create-dialog" role="dialog" aria-labelledby="dialog-title" aria-modal="true">
                <div class="dialog-header">
                    <h2 id="dialog-title" class="dialog-title">Create New Item</h2>
                    <button type="button" class="dialog-close" data-action="close-dialog" aria-label="Close dialog">
                        <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                
                <form class="dialog-form" novalidate>
                    <div class="form-group">
                        <label for="item-name" class="form-label">Item Name *</label>
                        <input 
                            type="text" 
                            id="item-name" 
                            name="name" 
                            class="form-input ${errors.name ? 'form-input--error' : ''}"
                            placeholder="Enter item name..."
                            value="${formData.name}"
                            maxlength="200"
                            required
                            autofocus
                        />
                        ${errors.name ? `<span class="form-error">${errors.name}</span>` : ''}
                        <div class="form-hint">
                            <span class="form-counter">${formData.name.length}/200</span>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="item-description" class="form-label">Description</label>
                        <textarea 
                            id="item-description" 
                            name="description" 
                            class="form-textarea ${errors.description ? 'form-input--error' : ''}"
                            placeholder="Optional: Add a description..."
                            rows="3"
                            maxlength="2000"
                        >${formData.description}</textarea>
                        ${errors.description ? `<span class="form-error">${errors.description}</span>` : ''}
                        <div class="form-hint">
                            <span class="form-counter">${formData.description.length}/2000</span>
                        </div>
                    </div>
                    
                    ${board && board.columns ? this.renderFieldInputs() : ''}
                    
                    ${this.renderAssigneeSection()}
                    
                    ${board ? `
                        <div class="board-info">
                            <div class="board-info-icon">
                                <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                    <rect x="9" y="9" width="6" height="6"></rect>
                                </svg>
                            </div>
                            <div class="board-info-content">
                                <span class="board-info-label">Item will be created in:</span>
                                <span class="board-info-name">${this.escapeHtml(board.name)}</span>
                            </div>
                        </div>
                    ` : ''}
                </form>
                
                <div class="dialog-footer">
                    <div class="dialog-actions">
                        <button type="button" class="btn btn--ghost" data-action="close-dialog" ${isLoading ? 'disabled' : ''}>
                            Cancel
                        </button>
                        
                        <button type="button" class="btn btn--primary" data-action="create-item" ${isLoading || !this.isFormValid() ? 'disabled' : ''}>
                            ${isLoading ? `
                                <svg class="spinner" width="16" height="16" viewBox="0 0 24 24">
                                    <circle class="spinner-circle" cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
                                </svg>
                                Creating Item...
                            ` : `
                                Create Item
                                <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <polyline points="20,6 9,17 4,12"></polyline>
                                </svg>
                            `}
                        </button>
                    </div>
                </div>
                
                ${errors.submit ? `
                    <div class="dialog-error">
                        <div class="alert alert--error">
                            <svg class="alert-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="15" y1="9" x2="9" y2="15"></line>
                                <line x1="9" y1="9" x2="15" y2="15"></line>
                            </svg>
                            <p>${errors.submit}</p>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    renderLoadingState() {
        this.container.innerHTML = `
            <div class="dialog-overlay"></div>
            <div class="dialog-content item-create-dialog">
                <div class="loading-state">
                    <div class="loading-spinner">
                        <svg class="spinner" width="32" height="32" viewBox="0 0 24 24">
                            <circle class="spinner-circle" cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </div>
                    <p class="loading-text">Loading board...</p>
                </div>
            </div>
        `;
    }
    
    renderFieldInputs() {
        const { board, formData } = this.state;
        
        return `
            <div class="item-fields-section">
                <h3 class="section-title">Fields</h3>
                <div class="item-fields">
                    ${board.columns.map(column => {
                        const value = formData.fieldValues[column.id] || '';
                        
                        return `
                            <div class="form-group">
                                <label class="form-label">
                                    ${this.getColumnTypeIcon(column.type)}
                                    ${this.escapeHtml(column.name)}
                                </label>
                                ${this.renderFieldInput(column, value)}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }
    
    renderFieldInput(column, value) {
        switch (column.type) {
            case 'text':
                return `
                    <input 
                        type="text" 
                        class="form-input" 
                        data-column-id="${column.id}"
                        value="${this.escapeHtml(value)}"
                        placeholder="Enter text..."
                    />
                `;
            case 'status':
                const statusOptions = column.settings?.options || ['To Do', 'In Progress', 'Done'];
                return `
                    <select class="form-select" data-column-id="${column.id}">
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
                    <select class="form-select" data-column-id="${column.id}">
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
                        class="form-input" 
                        data-column-id="${column.id}"
                        value="${value ? this.formatDateForInput(value) : ''}"
                    />
                `;
            case 'number':
                return `
                    <input 
                        type="number" 
                        class="form-input" 
                        data-column-id="${column.id}"
                        value="${value}"
                        placeholder="Enter number..."
                        step="any"
                    />
                `;
            case 'person':
                return `
                    <input 
                        type="text" 
                        class="form-input" 
                        data-column-id="${column.id}"
                        value="${this.escapeHtml(value)}"
                        placeholder="Enter name or email..."
                    />
                `;
            default:
                return `
                    <input 
                        type="text" 
                        class="form-input" 
                        data-column-id="${column.id}"
                        value="${this.escapeHtml(value)}"
                        placeholder="Enter value..."
                    />
                `;
        }
    }
    
    renderAssigneeSection() {
        const { formData } = this.state;
        
        return `
            <div class="assignee-section">
                <h3 class="section-title">Assignees</h3>
                <div class="assignee-input-container">
                    <input 
                        type="text" 
                        class="form-input" 
                        data-assignee-input
                        placeholder="Search for users to assign..."
                    />
                    <button type="button" class="btn btn--outline btn--sm" data-action="search-assignees">
                        Search
                    </button>
                </div>
                
                ${formData.assignees.length > 0 ? `
                    <div class="selected-assignees">
                        <h4 class="assignee-list-title">Selected Assignees:</h4>
                        <div class="assignee-tags">
                            ${formData.assignees.map((assignee, index) => `
                                <div class="assignee-tag">
                                    <div class="assignee-tag-avatar">
                                        ${assignee.avatar ? 
                                            `<img src="${assignee.avatar}" alt="${assignee.name}" />` :
                                            `<div class="assignee-tag-initials">${this.getInitials(assignee.name)}</div>`
                                        }
                                    </div>
                                    <span class="assignee-tag-name">${this.escapeHtml(assignee.name)}</span>
                                    <button type="button" class="assignee-tag-remove" data-action="remove-assignee" data-index="${index}">
                                        <svg class="icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                            <line x1="18" y1="6" x2="6" y2="18"></line>
                                            <line x1="6" y1="6" x2="18" y2="18"></line>
                                        </svg>
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <div class="form-note">
                    <svg class="form-note-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="16" x2="12" y2="12"></line>
                        <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                    <p class="form-note-text">
                        You can assign team members to this item to track responsibility.
                    </p>
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
            case 'close-dialog':
                this.handleClose();
                break;
            case 'create-item':
                this.handleCreateItem();
                break;
            case 'search-assignees':
                this.handleSearchAssignees();
                break;
            case 'remove-assignee':
                this.handleRemoveAssignee(parseInt(event.target.closest('[data-index]').dataset.index));
                break;
        }
    }
    
    handleInput(event) {
        const { name, value } = event.target;
        
        if (name) {
            this.state.formData[name] = value;
            
            // Clear field error on change
            if (this.state.errors[name]) {
                delete this.state.errors[name];
                this.render();
            }
        } else if (event.target.dataset.columnId) {
            const columnId = event.target.dataset.columnId;
            this.state.formData.fieldValues[columnId] = value;
        }
    }
    
    handleChange(event) {
        if (event.target.dataset.columnId) {
            const columnId = event.target.dataset.columnId;
            const value = event.target.value;
            this.state.formData.fieldValues[columnId] = value;
        }
    }
    
    handleKeyDown(event) {
        // Handle Escape key
        if (event.key === 'Escape') {
            this.handleClose();
        }
        
        // Handle Enter key for form submission
        if (event.key === 'Enter' && event.ctrlKey) {
            event.preventDefault();
            this.handleCreateItem();
        }
    }
    
    handleClose() {
        if (this.options.onClose) {
            this.options.onClose();
        } else {
            this.destroy();
        }
    }
    
    async handleCreateItem() {
        if (this.state.isLoading || !this.isFormValid()) return;
        
        this.setState({ isLoading: true, errors: {} });
        
        try {
            // Prepare item data
            const itemData = {
                name: this.state.formData.name.trim(),
                description: this.state.formData.description.trim(),
                fieldValues: this.prepareFieldValues(),
                assignees: this.state.formData.assignees.map(a => a.id),
                position: this.position
            };
            
            // Add column-specific data for kanban
            if (this.columnId) {
                itemData.columnId = this.columnId;
            }
            
            const item = await itemService.createItem(this.boardId, itemData);
            
            this.setState({ isLoading: false });
            
            if (this.options.onSuccess) {
                this.options.onSuccess(item);
            }
            
            this.handleClose();
        } catch (error) {
            this.setState({
                isLoading: false,
                errors: { submit: error.message }
            });
        }
    }
    
    handleSearchAssignees() {
        // This would typically open an assignee search modal
        if (this.options.onSearchAssignees) {
            this.options.onSearchAssignees();
        }
    }
    
    handleRemoveAssignee(index) {
        const assignees = [...this.state.formData.assignees];
        assignees.splice(index, 1);
        this.state.formData.assignees = assignees;
        this.render();
    }
    
    prepareFieldValues() {
        const fieldValues = [];
        
        Object.keys(this.state.formData.fieldValues).forEach(columnId => {
            const value = this.state.formData.fieldValues[columnId];
            if (value !== '' && value !== null && value !== undefined) {
                fieldValues.push({
                    columnId,
                    value,
                    updatedAt: new Date().toISOString()
                });
            }
        });
        
        return fieldValues;
    }
    
    validateField(fieldName) {
        const value = this.state.formData[fieldName];
        const rules = this.validationRules[fieldName];
        
        if (!rules) return true;
        
        for (const rule of rules) {
            const isValid = this.validateRule(value, rule);
            if (!isValid) {
                this.setState({
                    errors: {
                        ...this.state.errors,
                        [fieldName]: rule.message
                    }
                });
                return false;
            }
        }
        
        // Clear error if valid
        const errors = { ...this.state.errors };
        delete errors[fieldName];
        this.setState({ errors });
        return true;
    }
    
    validateRule(value, rule) {
        switch (rule.rule) {
            case 'required':
                return value && value.trim().length > 0;
            case 'minLength':
                return value && value.length >= rule.value;
            case 'maxLength':
                return !value || value.length <= rule.value;
            default:
                return true;
        }
    }
    
    isFormValid() {
        return this.state.formData.name.trim().length > 0 && Object.keys(this.state.errors).length === 0;
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
    
    getInitials(name) {
        if (!name) return 'U';
        return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
    }
    
    formatDateForInput(dateString) {
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
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
    
    focusFirstInput() {
        setTimeout(() => {
            const firstInput = this.container.querySelector('input:not([type="hidden"]):not([disabled])');
            if (firstInput) {
                firstInput.focus();
            }
        }, 100);
    }
    
    // Add assignee (called externally)
    addAssignee(assignee) {
        if (!this.state.formData.assignees.find(a => a.id === assignee.id)) {
            this.state.formData.assignees.push(assignee);
            this.render();
        }
    }
    
    destroy() {
        super.destroy();
    }
} 