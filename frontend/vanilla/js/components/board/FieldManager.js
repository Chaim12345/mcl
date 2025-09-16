/**
 * Field Manager Component
 */

import { Component } from '../base/Component.js';
import { boardService } from '../../services/board.js';
import { eventBus } from '../../utils/events.js';

export class FieldManager extends Component {
    constructor(container, options = {}) {
        super(container, options);
        
        this.state = {
            isLoading: false,
            board: null,
            columns: [],
            editingColumn: null,
            isCreating: false,
            draggedColumn: null,
            errors: {},
            newColumn: {
                name: '',
                type: 'text',
                settings: {}
            }
        };
        
        this.boardId = options.boardId || null;
        
        this.fieldTypes = [
            {
                id: 'text',
                name: 'Text',
                description: 'Single line of text',
                icon: 'type',
                configurable: false
            },
            {
                id: 'status',
                name: 'Status',
                description: 'Status dropdown with custom options',
                icon: 'circle',
                configurable: true,
                defaultSettings: {
                    options: ['To Do', 'In Progress', 'Done'],
                    defaultValue: 'To Do'
                }
            },
            {
                id: 'priority',
                name: 'Priority',
                description: 'Priority level (Low, Medium, High, Critical)',
                icon: 'zap',
                configurable: false
            },
            {
                id: 'person',
                name: 'Person',
                description: 'Assign to a person',
                icon: 'user',
                configurable: false
            },
            {
                id: 'date',
                name: 'Date',
                description: 'Date picker',
                icon: 'calendar',
                configurable: false
            },
            {
                id: 'number',
                name: 'Number',
                description: 'Numeric value',
                icon: 'hash',
                configurable: true,
                defaultSettings: {
                    min: null,
                    max: null,
                    step: 1,
                    unit: ''
                }
            }
        ];
        
        this.init();
    }
    
    init() {
        if (this.boardId) {
            this.loadBoard();
        }
        
        this.render();
        this.bindEvents();
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        eventBus.on('board:updated', this.handleBoardUpdated.bind(this));
        eventBus.on('column:created', this.handleColumnCreated.bind(this));
        eventBus.on('column:updated', this.handleColumnUpdated.bind(this));
        eventBus.on('column:deleted', this.handleColumnDeleted.bind(this));
    }
    
    async loadBoard() {
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
    
    render() {
        const { 
            isLoading, 
            board, 
            columns, 
            editingColumn, 
            isCreating, 
            newColumn, 
            errors 
        } = this.state;
        
        if (isLoading) {
            return this.renderLoadingState();
        }
        
        if (!board) {
            return this.renderErrorState();
        }
        
        this.container.innerHTML = `
            <div class="field-manager">
                <div class="field-manager-header">
                    <div class="field-manager-title">
                        <h2 class="heading-lg">Manage Fields</h2>
                        <p class="text-muted">
                            Configure columns and field types for "${this.escapeHtml(board.name)}"
                        </p>
                    </div>
                    
                    <div class="field-manager-actions">
                        <button type="button" class="btn btn--outline" data-action="close-manager">
                            Close
                        </button>
                    </div>
                </div>
                
                <div class="field-manager-content">
                    <div class="field-list-section">
                        <div class="section-header">
                            <h3 class="section-title">Current Fields</h3>
                            <button type="button" class="btn btn--primary btn--sm" data-action="start-create-field">
                                <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="12" y1="8" x2="12" y2="16"></line>
                                    <line x1="8" y1="12" x2="16" y2="12"></line>
                                </svg>
                                Add Field
                            </button>
                        </div>
                        
                        <div class="field-list" data-sortable="true">
                            ${columns.length > 0 ? 
                                columns.map((column, index) => this.renderColumnItem(column, index)).join('') :
                                '<div class="empty-state"><p>No fields configured yet. Add your first field to get started.</p></div>'
                            }
                        </div>
                    </div>
                    
                    ${isCreating || editingColumn ? `
                        <div class="field-editor-section">
                            ${isCreating ? this.renderFieldCreator() : this.renderFieldEditor()}
                        </div>
                    ` : `
                        <div class="field-types-section">
                            <h3 class="section-title">Available Field Types</h3>
                            <div class="field-types-grid">
                                ${this.fieldTypes.map(type => this.renderFieldType(type)).join('')}
                            </div>
                        </div>
                    `}
                </div>
                
                ${errors.operation ? `
                    <div class="field-manager-error">
                        <div class="alert alert--error">
                            <svg class="alert-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="15" y1="9" x2="9" y2="15"></line>
                                <line x1="9" y1="9" x2="15" y2="15"></line>
                            </svg>
                            <p>${errors.operation}</p>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    renderLoadingState() {
        this.container.innerHTML = `
            <div class="field-manager">
                <div class="loading-state">
                    <div class="loading-spinner">
                        <svg class="spinner" width="32" height="32" viewBox="0 0 24 24">
                            <circle class="spinner-circle" cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </div>
                    <p class="loading-text">Loading board fields...</p>
                </div>
            </div>
        `;
    }
    
    renderErrorState() {
        this.container.innerHTML = `
            <div class="field-manager">
                <div class="error-state">
                    <h3>Failed to load board</h3>
                    <p>Unable to load the board configuration.</p>
                    <button type="button" class="btn btn--primary" data-action="retry-load">
                        Retry
                    </button>
                </div>
            </div>
        `;
    }
    
    renderColumnItem(column, index) {
        const fieldType = this.fieldTypes.find(t => t.id === column.type);
        const canEdit = this.canEditColumn(column);
        const canDelete = this.canDeleteColumn(column);
        
        return `
            <div class="field-item" data-column-id="${column.id}" data-index="${index}" draggable="true">
                <div class="field-item-drag-handle">
                    <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <circle cx="9" cy="12" r="1"></circle>
                        <circle cx="9" cy="5" r="1"></circle>
                        <circle cx="9" cy="19" r="1"></circle>
                        <circle cx="15" cy="12" r="1"></circle>
                        <circle cx="15" cy="5" r="1"></circle>
                        <circle cx="15" cy="19" r="1"></circle>
                    </svg>
                </div>
                
                <div class="field-item-icon">
                    ${this.getFieldTypeIcon(column.type)}
                </div>
                
                <div class="field-item-content">
                    <div class="field-item-header">
                        <h4 class="field-item-name">${this.escapeHtml(column.name)}</h4>
                        <span class="field-item-type">${fieldType ? fieldType.name : column.type}</span>
                    </div>
                    
                    ${column.settings && Object.keys(column.settings).length > 0 ? `
                        <div class="field-item-settings">
                            ${this.renderColumnSettings(column)}
                        </div>
                    ` : ''}
                </div>
                
                <div class="field-item-actions">
                    ${canEdit ? `
                        <button type="button" class="btn btn--ghost btn--icon" data-action="edit-column" data-column-id="${column.id}" title="Edit field">
                            <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                            </svg>
                        </button>
                    ` : ''}
                    
                    <button type="button" class="btn btn--ghost btn--icon" data-action="duplicate-column" data-column-id="${column.id}" title="Duplicate field">
                        <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                    </button>
                    
                    ${canDelete ? `
                        <button type="button" class="btn btn--ghost btn--icon btn--danger" data-action="delete-column" data-column-id="${column.id}" title="Delete field">
                            <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <polyline points="3,6 5,6 21,6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    renderColumnSettings(column) {
        switch (column.type) {
            case 'status':
                return `
                    <div class="field-setting">
                        <span class="setting-label">Options:</span>
                        <span class="setting-value">${(column.settings.options || []).join(', ')}</span>
                    </div>
                `;
            case 'number':
                const settings = [];
                if (column.settings.min !== null) settings.push(`Min: ${column.settings.min}`);
                if (column.settings.max !== null) settings.push(`Max: ${column.settings.max}`);
                if (column.settings.unit) settings.push(`Unit: ${column.settings.unit}`);
                return settings.length > 0 ? `
                    <div class="field-setting">
                        <span class="setting-value">${settings.join(', ')}</span>
                    </div>
                ` : '';
            default:
                return '';
        }
    }
    
    renderFieldType(fieldType) {
        return `
            <div class="field-type-card" data-action="select-field-type" data-type="${fieldType.id}">
                <div class="field-type-icon">
                    ${this.getFieldTypeIcon(fieldType.id)}
                </div>
                <div class="field-type-content">
                    <h4 class="field-type-name">${fieldType.name}</h4>
                    <p class="field-type-description">${fieldType.description}</p>
                </div>
                ${fieldType.configurable ? `
                    <div class="field-type-badge">
                        <span class="badge badge--sm">Configurable</span>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    renderFieldCreator() {
        const { newColumn, errors } = this.state;
        const selectedType = this.fieldTypes.find(t => t.id === newColumn.type);
        
        return `
            <div class="field-editor">
                <div class="field-editor-header">
                    <h3 class="section-title">Create New Field</h3>
                    <div class="field-editor-actions">
                        <button type="button" class="btn btn--ghost" data-action="cancel-create">Cancel</button>
                        <button type="button" class="btn btn--primary" data-action="create-field" ${!this.isCreateFormValid() ? 'disabled' : ''}>
                            Create Field
                        </button>
                    </div>
                </div>
                
                <div class="field-editor-form">
                    <div class="form-group">
                        <label for="field-name" class="form-label">Field Name *</label>
                        <input 
                            type="text" 
                            id="field-name" 
                            class="form-input ${errors.name ? 'form-input--error' : ''}"
                            value="${newColumn.name}"
                            data-field="name"
                            placeholder="Enter field name..."
                            maxlength="50"
                        />
                        ${errors.name ? `<span class="form-error">${errors.name}</span>` : ''}
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Field Type *</label>
                        <div class="field-type-selector">
                            ${this.fieldTypes.map(type => `
                                <label class="field-type-option ${newColumn.type === type.id ? 'field-type-option--selected' : ''}">
                                    <input type="radio" name="fieldType" value="${type.id}" ${newColumn.type === type.id ? 'checked' : ''} />
                                    <div class="field-type-option-content">
                                        <div class="field-type-option-icon">
                                            ${this.getFieldTypeIcon(type.id)}
                                        </div>
                                        <div class="field-type-option-text">
                                            <span class="field-type-option-name">${type.name}</span>
                                            <span class="field-type-option-desc">${type.description}</span>
                                        </div>
                                    </div>
                                </label>
                            `).join('')}
                        </div>
                    </div>
                    
                    ${selectedType && selectedType.configurable ? this.renderFieldTypeSettings(selectedType, newColumn.settings) : ''}
                </div>
            </div>
        `;
    }
    
    renderFieldEditor() {
        const { editingColumn, errors } = this.state;
        const selectedType = this.fieldTypes.find(t => t.id === editingColumn.type);
        
        return `
            <div class="field-editor">
                <div class="field-editor-header">
                    <h3 class="section-title">Edit Field</h3>
                    <div class="field-editor-actions">
                        <button type="button" class="btn btn--ghost" data-action="cancel-edit">Cancel</button>
                        <button type="button" class="btn btn--primary" data-action="save-field" ${!this.isEditFormValid() ? 'disabled' : ''}>
                            Save Changes
                        </button>
                    </div>
                </div>
                
                <div class="field-editor-form">
                    <div class="form-group">
                        <label for="edit-field-name" class="form-label">Field Name *</label>
                        <input 
                            type="text" 
                            id="edit-field-name" 
                            class="form-input ${errors.name ? 'form-input--error' : ''}"
                            value="${editingColumn.name}"
                            data-field="name"
                            placeholder="Enter field name..."
                            maxlength="50"
                        />
                        ${errors.name ? `<span class="form-error">${errors.name}</span>` : ''}
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Field Type</label>
                        <div class="field-type-display">
                            <div class="field-type-display-icon">
                                ${this.getFieldTypeIcon(editingColumn.type)}
                            </div>
                            <div class="field-type-display-content">
                                <span class="field-type-display-name">${selectedType ? selectedType.name : editingColumn.type}</span>
                                <span class="field-type-display-desc">${selectedType ? selectedType.description : 'Custom field type'}</span>
                            </div>
                        </div>
                        <p class="form-hint">Field type cannot be changed after creation</p>
                    </div>
                    
                    ${selectedType && selectedType.configurable ? this.renderFieldTypeSettings(selectedType, editingColumn.settings) : ''}
                </div>
            </div>
        `;
    }
    
    renderFieldTypeSettings(fieldType, settings = {}) {
        switch (fieldType.id) {
            case 'status':
                return `
                    <div class="form-group">
                        <label class="form-label">Status Options</label>
                        <div class="status-options-editor">
                            <div class="status-options-list">
                                ${(settings.options || fieldType.defaultSettings.options).map((option, index) => `
                                    <div class="status-option-item">
                                        <input 
                                            type="text" 
                                            class="status-option-input" 
                                            value="${this.escapeHtml(option)}"
                                            data-option-index="${index}"
                                            placeholder="Status name..."
                                        />
                                        <button type="button" class="btn btn--ghost btn--icon" data-action="remove-status-option" data-index="${index}">
                                            <svg class="icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                                <line x1="6" y1="6" x2="18" y2="18"></line>
                                            </svg>
                                        </button>
                                    </div>
                                `).join('')}
                            </div>
                            <button type="button" class="btn btn--outline btn--sm" data-action="add-status-option">
                                <svg class="icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="12" y1="8" x2="12" y2="16"></line>
                                    <line x1="8" y1="12" x2="16" y2="12"></line>
                                </svg>
                                Add Option
                            </button>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Default Value</label>
                        <select class="form-select" data-setting="defaultValue">
                            <option value="">No default</option>
                            ${(settings.options || fieldType.defaultSettings.options).map(option => `
                                <option value="${option}" ${settings.defaultValue === option ? 'selected' : ''}>
                                    ${this.escapeHtml(option)}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                `;
            case 'number':
                return `
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Minimum Value</label>
                            <input 
                                type="number" 
                                class="form-input" 
                                data-setting="min"
                                value="${settings.min || ''}"
                                placeholder="No minimum"
                            />
                        </div>
                        <div class="form-group">
                            <label class="form-label">Maximum Value</label>
                            <input 
                                type="number" 
                                class="form-input" 
                                data-setting="max"
                                value="${settings.max || ''}"
                                placeholder="No maximum"
                            />
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Step</label>
                            <input 
                                type="number" 
                                class="form-input" 
                                data-setting="step"
                                value="${settings.step || 1}"
                                min="0.01"
                                step="0.01"
                            />
                        </div>
                        <div class="form-group">
                            <label class="form-label">Unit</label>
                            <input 
                                type="text" 
                                class="form-input" 
                                data-setting="unit"
                                value="${settings.unit || ''}"
                                placeholder="e.g. $, %, hours"
                                maxlength="10"
                            />
                        </div>
                    </div>
                `;
            default:
                return '';
        }
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
            case 'close-manager':
                this.handleClose();
                break;
            case 'start-create-field':
                this.handleStartCreateField();
                break;
            case 'select-field-type':
                this.handleSelectFieldType(event.target.closest('[data-type]').dataset.type);
                break;
            case 'cancel-create':
                this.handleCancelCreate();
                break;
            case 'create-field':
                this.handleCreateField();
                break;
            case 'edit-column':
                this.handleEditColumn(event.target.closest('[data-column-id]').dataset.columnId);
                break;
            case 'cancel-edit':
                this.handleCancelEdit();
                break;
            case 'save-field':
                this.handleSaveField();
                break;
            case 'duplicate-column':
                this.handleDuplicateColumn(event.target.closest('[data-column-id]').dataset.columnId);
                break;
            case 'delete-column':
                this.handleDeleteColumn(event.target.closest('[data-column-id]').dataset.columnId);
                break;
            case 'add-status-option':
                this.handleAddStatusOption();
                break;
            case 'remove-status-option':
                this.handleRemoveStatusOption(parseInt(event.target.closest('[data-index]').dataset.index));
                break;
            case 'retry-load':
                this.loadBoard();
                break;
        }
    }
    
    handleInput(event) {
        if (event.target.dataset.field) {
            const field = event.target.dataset.field;
            const value = event.target.value;
            
            if (this.state.isCreating) {
                this.state.newColumn[field] = value;
            } else if (this.state.editingColumn) {
                this.state.editingColumn[field] = value;
            }
            
            this.validateForm();
        } else if (event.target.dataset.setting) {
            const setting = event.target.dataset.setting;
            const value = event.target.type === 'number' ? parseFloat(event.target.value) || null : event.target.value;
            
            if (this.state.isCreating) {
                this.state.newColumn.settings[setting] = value;
            } else if (this.state.editingColumn) {
                this.state.editingColumn.settings[setting] = value;
            }
        } else if (event.target.dataset.optionIndex !== undefined) {
            const index = parseInt(event.target.dataset.optionIndex);
            const value = event.target.value;
            
            const options = this.state.isCreating ? 
                this.state.newColumn.settings.options : 
                this.state.editingColumn.settings.options;
                
            if (options && options[index] !== undefined) {
                options[index] = value;
            }
        }
    }
    
    handleChange(event) {
        if (event.target.name === 'fieldType') {
            this.handleSelectFieldType(event.target.value);
        } else if (event.target.dataset.setting) {
            const setting = event.target.dataset.setting;
            const value = event.target.value;
            
            if (this.state.isCreating) {
                this.state.newColumn.settings[setting] = value;
            } else if (this.state.editingColumn) {
                this.state.editingColumn.settings[setting] = value;
            }
        }
    }
    
    // Drag and drop handlers
    handleDragStart(event) {
        if (event.target.classList.contains('field-item')) {
            const columnId = event.target.dataset.columnId;
            this.setState({ draggedColumn: columnId });
            event.dataTransfer.setData('text/plain', columnId);
        }
    }
    
    handleDragOver(event) {
        if (this.state.draggedColumn) {
            event.preventDefault();
        }
    }
    
    handleDrop(event) {
        event.preventDefault();
        
        if (!this.state.draggedColumn) return;
        
        const targetItem = event.target.closest('.field-item');
        if (!targetItem) return;
        
        const targetColumnId = targetItem.dataset.columnId;
        const sourceColumnId = this.state.draggedColumn;
        
        if (sourceColumnId !== targetColumnId) {
            this.reorderColumns(sourceColumnId, targetColumnId);
        }
        
        this.setState({ draggedColumn: null });
    }
    
    // Action handlers
    handleClose() {
        if (this.options.onClose) {
            this.options.onClose();
        } else {
            this.destroy();
        }
    }
    
    handleStartCreateField() {
        this.setState({ 
            isCreating: true,
            editingColumn: null,
            newColumn: {
                name: '',
                type: 'text',
                settings: {}
            },
            errors: {}
        });
    }
    
    handleSelectFieldType(typeId) {
        const fieldType = this.fieldTypes.find(t => t.id === typeId);
        
        if (this.state.isCreating) {
            this.state.newColumn.type = typeId;
            this.state.newColumn.settings = fieldType && fieldType.defaultSettings ? 
                { ...fieldType.defaultSettings } : {};
        }
        
        this.render();
    }
    
    handleCancelCreate() {
        this.setState({ 
            isCreating: false,
            newColumn: {
                name: '',
                type: 'text',
                settings: {}
            },
            errors: {}
        });
    }
    
    async handleCreateField() {
        if (!this.isCreateFormValid()) return;
        
        try {
            const columnData = {
                name: this.state.newColumn.name.trim(),
                type: this.state.newColumn.type,
                settings: this.state.newColumn.settings,
                position: this.state.columns.length
            };
            
            // Note: This would use a board/column service
            const response = await boardService.makeRequest(`/boards/${this.boardId}/columns`, {
                method: 'POST',
                body: JSON.stringify(columnData)
            });
            
            if (response.success) {
                this.setState({
                    columns: [...this.state.columns, response.data],
                    isCreating: false,
                    newColumn: {
                        name: '',
                        type: 'text',
                        settings: {}
                    },
                    errors: {}
                });
                
                eventBus.emit('column:created', { column: response.data });
                eventBus.emit('notification:success', { 
                    message: `Field "${response.data.name}" created successfully!` 
                });
            }
        } catch (error) {
            this.setState({ errors: { operation: error.message } });
        }
    }
    
    handleEditColumn(columnId) {
        const column = this.state.columns.find(c => c.id === columnId);
        if (column) {
            this.setState({ 
                editingColumn: { ...column },
                isCreating: false,
                errors: {}
            });
        }
    }
    
    handleCancelEdit() {
        this.setState({ 
            editingColumn: null,
            errors: {}
        });
    }
    
    async handleSaveField() {
        if (!this.isEditFormValid()) return;
        
        try {
            const updateData = {
                name: this.state.editingColumn.name.trim(),
                settings: this.state.editingColumn.settings
            };
            
            const response = await boardService.makeRequest(`/boards/${this.boardId}/columns/${this.state.editingColumn.id}`, {
                method: 'PUT',
                body: JSON.stringify(updateData)
            });
            
            if (response.success) {
                const updatedColumns = this.state.columns.map(c => 
                    c.id === this.state.editingColumn.id ? response.data : c
                );
                
                this.setState({
                    columns: updatedColumns,
                    editingColumn: null,
                    errors: {}
                });
                
                eventBus.emit('column:updated', { column: response.data });
                eventBus.emit('notification:success', { 
                    message: `Field "${response.data.name}" updated successfully!` 
                });
            }
        } catch (error) {
            this.setState({ errors: { operation: error.message } });
        }
    }
    
    async handleDuplicateColumn(columnId) {
        const column = this.state.columns.find(c => c.id === columnId);
        if (!column) return;
        
        try {
            const duplicateData = {
                name: `${column.name} (Copy)`,
                type: column.type,
                settings: { ...column.settings },
                position: this.state.columns.length
            };
            
            const response = await boardService.makeRequest(`/boards/${this.boardId}/columns`, {
                method: 'POST',
                body: JSON.stringify(duplicateData)
            });
            
            if (response.success) {
                this.setState({
                    columns: [...this.state.columns, response.data]
                });
                
                eventBus.emit('column:created', { column: response.data });
                eventBus.emit('notification:success', { 
                    message: `Field duplicated as "${response.data.name}"!` 
                });
            }
        } catch (error) {
            this.setState({ errors: { operation: error.message } });
        }
    }
    
    async handleDeleteColumn(columnId) {
        const column = this.state.columns.find(c => c.id === columnId);
        if (!column) return;
        
        const confirmed = confirm(`Are you sure you want to delete the "${column.name}" field? This will remove all data in this field from all items.`);
        
        if (confirmed) {
            try {
                const response = await boardService.makeRequest(`/boards/${this.boardId}/columns/${columnId}`, {
                    method: 'DELETE'
                });
                
                if (response.success) {
                    this.setState({
                        columns: this.state.columns.filter(c => c.id !== columnId),
                        editingColumn: this.state.editingColumn?.id === columnId ? null : this.state.editingColumn
                    });
                    
                    eventBus.emit('column:deleted', { columnId });
                    eventBus.emit('notification:success', { 
                        message: `Field "${column.name}" deleted successfully!` 
                    });
                }
            } catch (error) {
                this.setState({ errors: { operation: error.message } });
            }
        }
    }
    
    handleAddStatusOption() {
        const options = this.state.isCreating ? 
            this.state.newColumn.settings.options : 
            this.state.editingColumn.settings.options;
            
        if (options) {
            options.push('New Option');
            this.render();
        }
    }
    
    handleRemoveStatusOption(index) {
        const options = this.state.isCreating ? 
            this.state.newColumn.settings.options : 
            this.state.editingColumn.settings.options;
            
        if (options && options.length > 1) {
            options.splice(index, 1);
            this.render();
        }
    }
    
    async reorderColumns(sourceColumnId, targetColumnId) {
        const sourceIndex = this.state.columns.findIndex(c => c.id === sourceColumnId);
        const targetIndex = this.state.columns.findIndex(c => c.id === targetColumnId);
        
        if (sourceIndex === -1 || targetIndex === -1) return;
        
        const newColumns = [...this.state.columns];
        const [movedColumn] = newColumns.splice(sourceIndex, 1);
        newColumns.splice(targetIndex, 0, movedColumn);
        
        // Update positions
        newColumns.forEach((column, index) => {
            column.position = index;
        });
        
        this.setState({ columns: newColumns });
        
        try {
            await boardService.makeRequest(`/boards/${this.boardId}/columns/reorder`, {
                method: 'PATCH',
                body: JSON.stringify({
                    columns: newColumns.map((c, index) => ({ id: c.id, position: index }))
                })
            });
            
            eventBus.emit('columns:reordered', { columns: newColumns });
        } catch (error) {
            // Revert on error
            this.loadBoard();
            this.setState({ errors: { operation: error.message } });
        }
    }
    
    // Event handlers for service events
    handleBoardUpdated({ board }) {
        if (board.id === this.boardId) {
            this.setState({ 
                board,
                columns: board.columns || []
            });
        }
    }
    
    handleColumnCreated({ column }) {
        if (column.boardId === this.boardId) {
            const existingIndex = this.state.columns.findIndex(c => c.id === column.id);
            if (existingIndex === -1) {
                this.setState({
                    columns: [...this.state.columns, column]
                });
            }
        }
    }
    
    handleColumnUpdated({ column }) {
        const updatedColumns = this.state.columns.map(c => 
            c.id === column.id ? column : c
        );
        this.setState({ columns: updatedColumns });
    }
    
    handleColumnDeleted({ columnId }) {
        this.setState({
            columns: this.state.columns.filter(c => c.id !== columnId),
            editingColumn: this.state.editingColumn?.id === columnId ? null : this.state.editingColumn
        });
    }
    
    // Validation methods
    validateForm() {
        const errors = {};
        
        if (this.state.isCreating) {
            if (!this.state.newColumn.name.trim()) {
                errors.name = 'Field name is required';
            } else if (this.state.newColumn.name.length > 50) {
                errors.name = 'Field name must be less than 50 characters';
            }
        } else if (this.state.editingColumn) {
            if (!this.state.editingColumn.name.trim()) {
                errors.name = 'Field name is required';
            } else if (this.state.editingColumn.name.length > 50) {
                errors.name = 'Field name must be less than 50 characters';
            }
        }
        
        this.setState({ errors });
    }
    
    isCreateFormValid() {
        return this.state.newColumn.name.trim().length > 0 && 
               this.state.newColumn.name.length <= 50;
    }
    
    isEditFormValid() {
        return this.state.editingColumn?.name.trim().length > 0 && 
               this.state.editingColumn.name.length <= 50;
    }
    
    // Permission methods
    canEditColumn(column) {
        // Add permission logic here
        return true;
    }
    
    canDeleteColumn(column) {
        // Prevent deletion if it's the only column or has special restrictions
        return this.state.columns.length > 1;
    }
    
    // Utility methods
    getFieldTypeIcon(type) {
        const icons = {
            text: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14,2 14,8 20,8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line>',
            status: '<circle cx="12" cy="12" r="3"></circle><path d="M12 1v6m0 6v6"></path>',
            priority: '<polygon points="13,2 3,14 12,14 11,22 21,10 12,10"></polygon>',
            person: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>',
            date: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>',
            number: '<line x1="4" y1="9" x2="20" y2="9"></line><line x1="4" y1="15" x2="20" y2="15"></line><line x1="10" y1="3" x2="8" y2="21"></line><line x1="16" y1="3" x2="14" y2="21"></line>'
        };
        
        return `<svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">${icons[type] || icons.text}</svg>`;
    }
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    destroy() {
        // Remove event listeners
        eventBus.off('board:updated', this.handleBoardUpdated);
        eventBus.off('column:created', this.handleColumnCreated);
        eventBus.off('column:updated', this.handleColumnUpdated);
        eventBus.off('column:deleted', this.handleColumnDeleted);
        
        super.destroy();
    }
} 