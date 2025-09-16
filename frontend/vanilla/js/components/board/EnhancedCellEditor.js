/**
 * Enhanced Cell Editor Component
 * Provides inline editing capabilities for various field types
 */

import { Component } from '../base/Component.js';
import { eventBus } from '../../utils/events.js';

export class EnhancedCellEditor extends Component {
    constructor(container, options = {}) {
        super(container, options);
        
        this.state = {
            isEditing: false,
            editingCell: null,
            originalValue: null,
            currentValue: null,
            isLoading: false,
            validationError: null
        };
        
        this.itemId = options.itemId;
        this.column = options.column;
        this.value = options.value;
        this.onSave = options.onSave || (() => {});
        this.onCancel = options.onCancel || (() => {});
        this.readOnly = options.readOnly || false;
        
        this.init();
    }
    
    init() {
        this.render();
        this.bindEvents();
    }
    
    bindEvents() {
        this.container.addEventListener('click', this.handleCellClick.bind(this));
        this.container.addEventListener('dblclick', this.handleCellDoubleClick.bind(this));
        this.container.addEventListener('keydown', this.handleKeyDown.bind(this));
        
        // Global click listener to handle clicking outside
        document.addEventListener('click', this.handleDocumentClick.bind(this));
    }
    
    handleCellClick(e) {
        if (this.readOnly || this.state.isEditing) return;
        
        // For checkbox fields, toggle immediately
        if (this.column.type === 'checkbox') {
            this.toggleCheckbox();
        }
    }
    
    handleCellDoubleClick(e) {
        if (this.readOnly) return;
        this.startEditing();
    }
    
    handleKeyDown(e) {
        if (!this.state.isEditing) return;
        
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.saveValue();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            this.cancelEditing();
        }
    }
    
    handleDocumentClick(e) {
        if (!this.state.isEditing) return;
        
        // If click is outside the editing cell, save changes
        if (!this.container.contains(e.target)) {
            this.saveValue();
        }
    }
    
    startEditing() {
        if (this.readOnly) return;
        
        this.setState({
            isEditing: true,
            editingCell: this.column.id,
            originalValue: this.value,
            currentValue: this.value,
            validationError: null
        });
        
        this.render();
        this.focusInput();
    }
    
    cancelEditing() {
        this.setState({
            isEditing: false,
            editingCell: null,
            currentValue: this.state.originalValue,
            validationError: null
        });
        
        this.render();
        this.onCancel(this.column.id);
    }
    
    async saveValue() {
        const newValue = this.state.currentValue;
        const validationError = this.validateValue(newValue);
        
        if (validationError) {
            this.setState({ validationError });
            return;
        }
        
        this.setState({ isLoading: true });
        
        try {
            await this.onSave(this.itemId, this.column.id, newValue);
            this.value = newValue;
            this.setState({
                isEditing: false,
                editingCell: null,
                isLoading: false,
                validationError: null
            });
            this.render();
        } catch (error) {
            this.setState({
                isLoading: false,
                validationError: error.message || 'Failed to save changes'
            });
        }
    }
    
    async toggleCheckbox() {
        const newValue = !this.value;
        this.setState({ isLoading: true });
        
        try {
            await this.onSave(this.itemId, this.column.id, newValue);
            this.value = newValue;
            this.setState({ isLoading: false });
            this.render();
        } catch (error) {
            this.setState({ 
                isLoading: false,
                validationError: error.message || 'Failed to update checkbox'
            });
        }
    }
    
    validateValue(value) {
        const settings = this.column.settings || {};
        
        switch (this.column.type) {
            case 'text':
            case 'multiline':
                if (settings.required && (!value || value.trim() === '')) {
                    return 'This field is required';
                }
                if (settings.maxLength && value && value.length > settings.maxLength) {
                    return `Text must be ${settings.maxLength} characters or less`;
                }
                if (settings.minLength && value && value.length < settings.minLength) {
                    return `Text must be at least ${settings.minLength} characters`;
                }
                break;
                
            case 'email':
                if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                    return 'Must be a valid email address';
                }
                break;
                
            case 'url':
                if (value && !/^https?:\/\/.+/.test(value)) {
                    return 'Must be a valid URL starting with http:// or https://';
                }
                break;
                
            case 'number':
                if (value !== null && value !== undefined && value !== '') {
                    const num = parseFloat(value);
                    if (isNaN(num)) {
                        return 'Must be a valid number';
                    }
                    if (settings.min !== undefined && num < settings.min) {
                        return `Must be at least ${settings.min}`;
                    }
                    if (settings.max !== undefined && num > settings.max) {
                        return `Must be at most ${settings.max}`;
                    }
                }
                break;
        }
        
        return null;
    }
    
    focusInput() {
        const input = this.container.querySelector('.cell-editor-input');
        if (input) {
            input.focus();
            if (input.select) {
                input.select();
            }
        }
    }
    
    updateValue(newValue) {
        this.setState({ currentValue: newValue, validationError: null });
    }
    
    render() {
        if (this.state.isEditing) {
            this.container.innerHTML = this.renderEditMode();
        } else {
            this.container.innerHTML = this.renderDisplayMode();
        }
        
        this.bindEditEvents();
    }
    
    bindEditEvents() {
        if (!this.state.isEditing) return;
        
        const input = this.container.querySelector('.cell-editor-input');
        const saveBtn = this.container.querySelector('[data-action="save"]');
        const cancelBtn = this.container.querySelector('[data-action="cancel"]');
        const selectElement = this.container.querySelector('.cell-editor-select');
        
        if (input) {
            input.addEventListener('input', (e) => {
                this.updateValue(e.target.value);
            });
            
            input.addEventListener('change', (e) => {
                if (this.column.type === 'date') {
                    this.updateValue(e.target.value);
                }
            });
        }
        
        if (selectElement) {
            selectElement.addEventListener('change', (e) => {
                this.updateValue(e.target.value);
                // Auto-save for select fields
                setTimeout(() => this.saveValue(), 100);
            });
        }
        
        if (saveBtn) {
            saveBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.saveValue();
            });
        }
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.cancelEditing();
            });
        }
    }
    
    renderDisplayMode() {
        const value = this.value;
        const column = this.column;
        const isLoading = this.state.isLoading;
        
        let displayContent = this.getDisplayContent(value, column);
        
        return `
            <div class="cell-display ${this.readOnly ? 'cell-display--readonly' : 'cell-display--editable'} ${isLoading ? 'cell-display--loading' : ''}">
                ${displayContent}
                ${this.state.validationError ? `
                    <div class="cell-error">
                        <span class="cell-error-text">${this.escapeHtml(this.state.validationError)}</span>
                    </div>
                ` : ''}
                ${isLoading ? `
                    <div class="cell-loading">
                        <svg class="loading-spinner" width="16" height="16" viewBox="0 0 24 24">
                            <circle class="spinner-circle" cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    renderEditMode() {
        const column = this.column;
        const value = this.state.currentValue;
        const error = this.state.validationError;
        const isLoading = this.state.isLoading;
        
        return `
            <div class="cell-editor ${isLoading ? 'cell-editor--loading' : ''}">
                ${this.getEditContent(value, column)}
                ${error ? `
                    <div class="cell-error">
                        <span class="cell-error-text">${this.escapeHtml(error)}</span>
                    </div>
                ` : ''}
                ${this.shouldShowActions(column) ? `
                    <div class="cell-editor-actions">
                        <button type="button" class="btn btn--sm btn--primary" data-action="save" ${isLoading ? 'disabled' : ''}>
                            ${isLoading ? 'Saving...' : 'Save'}
                        </button>
                        <button type="button" class="btn btn--sm btn--outline" data-action="cancel" ${isLoading ? 'disabled' : ''}>
                            Cancel
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    getDisplayContent(value, column) {
        switch (column.type) {
            case 'text':
            case 'email':
            case 'url':
                return `
                    <span class="cell-text ${!value ? 'cell-text--placeholder' : ''}">
                        ${value ? this.escapeHtml(value) : `Click to add ${column.type}`}
                    </span>
                `;
                
            case 'multiline':
                return `
                    <div class="cell-multiline ${!value ? 'cell-text--placeholder' : ''}">
                        ${value ? 
                            `<div class="cell-multiline-content">${this.escapeHtml(value).replace(/\n/g, '<br>')}</div>` :
                            'Click to add description'
                        }
                    </div>
                `;
                
            case 'number':
                const unit = column.settings?.unit || '';
                return `
                    <span class="cell-number ${!value && value !== 0 ? 'cell-text--placeholder' : ''}">
                        ${value !== null && value !== undefined ? 
                            `<span class="number-value">${value}</span>${unit ? `<span class="number-unit">${unit}</span>` : ''}` :
                            'Set number'
                        }
                    </span>
                `;
                
            case 'checkbox':
                return `
                    <div class="cell-checkbox">
                        <div class="checkbox-display ${value ? 'checkbox-display--checked' : ''}">
                            <svg class="checkbox-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                ${value ? 
                                    '<path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>' :
                                    '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>'
                                }
                            </svg>
                            <span class="checkbox-label">${value ? 'Completed' : 'Not completed'}</span>
                        </div>
                    </div>
                `;
                
            case 'status':
                return this.renderStatusDisplay(value, column);
                
            case 'priority':
                return this.renderPriorityDisplay(value, column);
                
            case 'date':
                return this.renderDateDisplay(value, column);
                
            case 'tags':
                return this.renderTagsDisplay(value, column);
                
            case 'people':
                return this.renderPeopleDisplay(value, column);
                
            default:
                return `<span class="cell-text--placeholder">Unsupported field type: ${column.type}</span>`;
        }
    }
    
    getEditContent(value, column) {
        const placeholder = column.settings?.placeholder || `Enter ${column.name.toLowerCase()}`;
        const required = column.settings?.required ? 'required' : '';
        
        switch (column.type) {
            case 'text':
            case 'email':
            case 'url':
                const inputType = column.type === 'email' ? 'email' : column.type === 'url' ? 'url' : 'text';
                return `
                    <input 
                        type="${inputType}"
                        class="cell-editor-input"
                        value="${this.escapeHtml(value || '')}"
                        placeholder="${placeholder}"
                        ${required}
                        ${column.settings?.maxLength ? `maxlength="${column.settings.maxLength}"` : ''}
                    />
                `;
                
            case 'multiline':
                return `
                    <textarea 
                        class="cell-editor-input cell-editor-textarea"
                        placeholder="${placeholder}"
                        ${required}
                        ${column.settings?.maxLength ? `maxlength="${column.settings.maxLength}"` : ''}
                    >${this.escapeHtml(value || '')}</textarea>
                `;
                
            case 'number':
                return `
                    <div class="cell-editor-number">
                        <input 
                            type="number"
                            class="cell-editor-input"
                            value="${value !== null && value !== undefined ? value : ''}"
                            placeholder="${placeholder}"
                            ${column.settings?.min !== undefined ? `min="${column.settings.min}"` : ''}
                            ${column.settings?.max !== undefined ? `max="${column.settings.max}"` : ''}
                            ${column.settings?.step ? `step="${column.settings.step}"` : 'step="any"'}
                            ${required}
                        />
                        ${column.settings?.unit ? `
                            <span class="cell-editor-unit">${column.settings.unit}</span>
                        ` : ''}
                    </div>
                `;
                
            case 'status':
            case 'priority':
                const options = column.settings?.options || [];
                return `
                    <select class="cell-editor-select cell-editor-input">
                        <option value="">Select ${column.type}</option>
                        ${options.map(option => `
                            <option value="${this.escapeHtml(option)}" ${value === option ? 'selected' : ''}>
                                ${this.escapeHtml(option)}
                            </option>
                        `).join('')}
                    </select>
                `;
                
            case 'date':
                const dateValue = value ? new Date(value).toISOString().split('T')[0] : '';
                return `
                    <input 
                        type="date"
                        class="cell-editor-input"
                        value="${dateValue}"
                        ${required}
                    />
                `;
                
            case 'tags':
                const tagsValue = Array.isArray(value) ? value.join(', ') : (value || '');
                return `
                    <input 
                        type="text"
                        class="cell-editor-input"
                        value="${this.escapeHtml(tagsValue)}"
                        placeholder="Enter tags separated by commas"
                    />
                `;
                
            default:
                return '<span class="cell-error-text">Editing not supported for this field type</span>';
        }
    }
    
    shouldShowActions(column) {
        return !['status', 'priority'].includes(column.type);
    }
    
    renderStatusDisplay(value, column) {
        if (!value) {
            return '<span class="cell-text--placeholder">Set status</span>';
        }
        
        const statusClass = this.getStatusClass(value);
        return `
            <div class="cell-status">
                <span class="status-badge status-badge--${statusClass}">
                    ${this.escapeHtml(value)}
                </span>
            </div>
        `;
    }
    
    renderPriorityDisplay(value, column) {
        if (!value) {
            return '<span class="cell-text--placeholder">Set priority</span>';
        }
        
        const priorityClass = this.getPriorityClass(value);
        return `
            <div class="cell-priority">
                <span class="priority-badge priority-badge--${priorityClass}">
                    ${this.getPriorityIcon(value)}
                    ${this.escapeHtml(value)}
                </span>
            </div>
        `;
    }
    
    renderDateDisplay(value, column) {
        if (!value) {
            return '<span class="cell-text--placeholder">Set date</span>';
        }
        
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
    }
    
    renderTagsDisplay(value, column) {
        if (!value || !value.length) {
            return '<span class="cell-text--placeholder">Add tags</span>';
        }
        
        const tags = Array.isArray(value) ? value : [value];
        const maxVisible = 3;
        
        return `
            <div class="cell-tags">
                ${tags.slice(0, maxVisible).map(tag => `
                    <span class="tag">${this.escapeHtml(tag)}</span>
                `).join('')}
                ${tags.length > maxVisible ? `
                    <span class="tag tag--more">+${tags.length - maxVisible}</span>
                ` : ''}
            </div>
        `;
    }
    
    renderPeopleDisplay(value, column) {
        if (!value || !value.length) {
            return '<span class="cell-text--placeholder">Assign people</span>';
        }
        
        const people = Array.isArray(value) ? value : [value];
        const maxVisible = 3;
        
        return `
            <div class="cell-people">
                ${people.slice(0, maxVisible).map(person => `
                    <div class="person-avatar" title="${this.escapeHtml(person.name || person.email)}">
                        ${person.avatar ? 
                            `<img src="${person.avatar}" alt="${person.name}" />` :
                            `<span class="person-initials">${this.getInitials(person.name || person.email)}</span>`
                        }
                    </div>
                `).join('')}
                ${people.length > maxVisible ? `
                    <div class="person-avatar person-avatar--more">
                        <span class="person-count">+${people.length - maxVisible}</span>
                    </div>
                ` : ''}
            </div>
        `;
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
    
    getPriorityIcon(priority) {
        return `
            <svg class="priority-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M7 13l3 3 7-7"></path>
                <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"></path>
                <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"></path>
            </svg>
        `;
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
    
    destroy() {
        document.removeEventListener('click', this.handleDocumentClick.bind(this));
        super.destroy();
    }
} 