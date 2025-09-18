/**
 * Enhanced Item Display and Editing Component
 * Handles item table rows with inline editing, detail modal/sidebar
 */

import { api } from '../../services/api.js';
import { showNotification } from '../../utils/notifications-enhanced.js';
import { validateField } from '../../validation/validation-system.js';

export class ItemDisplayEditor {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            boardId: options.boardId,
            editable: options.editable !== false,
            showDetailSidebar: options.showDetailSidebar !== false,
            ...options
        };
        
        this.items = [];
        this.columns = [];
        this.editingCell = null;
        this.selectedItems = new Set();
        this.detailSidebar = null;
        this.currentDetailItem = null;
        
        this.init();
    }

    async init() {
        await this.loadData();
        this.render();
        this.setupEventListeners();
    }

    async loadData() {
        try {
            // Load items for the board
            if (this.options.boardId) {
                const response = await api.items.getByBoard(this.options.boardId);
                this.items = response.data || [];
            } else {
                this.items = this.createDemoItems();
            }
            
            // Load column definitions
            this.columns = this.getColumnDefinitions();
            
        } catch (error) {
            console.error('Error loading item data:', error);
            this.items = this.createDemoItems();
            this.columns = this.getColumnDefinitions();
        }
    }

    createDemoItems() {
        return [
            {
                id: '1',
                name: 'Design new landing page',
                status: 'working',
                priority: 'high',
                assignee: { id: 'user1', name: 'John Doe', avatar: '/assets/images/avatar1.jpg' },
                dueDate: '2025-09-20',
                description: 'Create a modern, responsive landing page with focus on conversion',
                tags: ['design', 'frontend'],
                progress: 65,
                createdAt: '2025-09-15T10:00:00Z',
                updatedAt: '2025-09-17T14:30:00Z'
            },
            {
                id: '2',
                name: 'Implement user authentication',
                status: 'done',
                priority: 'critical',
                assignee: { id: 'user2', name: 'Jane Smith', avatar: '/assets/images/avatar2.jpg' },
                dueDate: '2025-09-18',
                description: 'JWT-based authentication system with refresh tokens',
                tags: ['backend', 'security'],
                progress: 100,
                createdAt: '2025-09-10T09:00:00Z',
                updatedAt: '2025-09-18T16:45:00Z'
            },
            {
                id: '3',
                name: 'Write API documentation',
                status: 'todo',
                priority: 'medium',
                assignee: { id: 'user3', name: 'Mike Johnson', avatar: '/assets/images/avatar3.jpg' },
                dueDate: '2025-09-30',
                description: 'Comprehensive API documentation using OpenAPI 3.0',
                tags: ['documentation', 'api'],
                progress: 0,
                createdAt: '2025-09-16T11:00:00Z',
                updatedAt: '2025-09-16T11:00:00Z'
            }
        ];
    }

    getColumnDefinitions() {
        return [
            { id: 'name', name: 'Item', type: 'text', width: 250, required: true },
            { id: 'status', name: 'Status', type: 'status', width: 120, 
              options: [
                { value: 'todo', label: 'To Do', color: '#c4c4c4' },
                { value: 'working', label: 'Working on it', color: '#fdab3d' },
                { value: 'stuck', label: 'Stuck', color: '#e2445c' },
                { value: 'done', label: 'Done', color: '#00c875' }
              ]
            },
            { id: 'priority', name: 'Priority', type: 'priority', width: 100,
              options: [
                { value: 'low', label: 'Low', color: '#579bfc' },
                { value: 'medium', label: 'Medium', color: '#fdab3d' },
                { value: 'high', label: 'High', color: '#e2445c' },
                { value: 'critical', label: 'Critical', color: '#401694' }
              ]
            },
            { id: 'assignee', name: 'Person', type: 'person', width: 150 },
            { id: 'dueDate', name: 'Due Date', type: 'date', width: 120 },
            { id: 'progress', name: 'Progress', type: 'progress', width: 100 },
            { id: 'tags', name: 'Tags', type: 'tags', width: 150 }
        ];
    }

    render() {
        this.container.innerHTML = `
            <div class="item-display-editor">
                <div class="item-table-container">
                    <div class="table-header">
                        <div class="header-actions">
                            <button class="btn btn-primary add-item-btn">
                                <span class="btn-icon">+</span>
                                Add Item
                            </button>
                            <div class="bulk-actions ${this.selectedItems.size > 0 ? 'visible' : ''}">
                                <span class="selection-count">${this.selectedItems.size} selected</span>
                                <button class="btn btn-sm btn-outline bulk-delete-btn">Delete</button>
                                <button class="btn btn-sm btn-outline bulk-duplicate-btn">Duplicate</button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="item-table-scroll">
                        <table class="item-table">
                            <thead>
                                <tr>
                                    <th class="select-column">
                                        <input type="checkbox" class="select-all-checkbox" aria-label="Select all items">
                                    </th>
                                    ${this.columns.map(col => `
                                        <th class="column-header" style="width: ${col.width}px" data-column="${col.id}">
                                            <div class="column-content">
                                                <span class="column-name">${col.name}</span>
                                                ${col.required ? '<span class="required-indicator">*</span>' : ''}
                                            </div>
                                        </th>
                                    `).join('')}
                                    <th class="actions-column">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${this.renderItems()}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                ${this.options.showDetailSidebar ? this.renderDetailSidebar() : ''}
            </div>
        `;
        
        this.attachEventListeners();
    }

    renderItems() {
        return this.items.map(item => `
            <tr class="item-row ${this.selectedItems.has(item.id) ? 'selected' : ''}" data-item-id="${item.id}">
                <td class="select-cell">
                    <input type="checkbox" class="item-checkbox" data-item-id="${item.id}" 
                           ${this.selectedItems.has(item.id) ? 'checked' : ''}>
                </td>
                ${this.columns.map(col => `
                    <td class="item-cell ${this.options.editable ? 'editable' : ''}" 
                        data-column="${col.id}" 
                        data-type="${col.type}"
                        data-item-id="${item.id}">
                        ${this.renderCellContent(item, col)}
                    </td>
                `).join('')}
                <td class="actions-cell">
                    <div class="item-actions">
                        <button class="btn btn-sm btn-ghost detail-btn" data-item-id="${item.id}" title="View details">
                            👁️
                        </button>
                        <button class="btn btn-sm btn-ghost edit-btn" data-item-id="${item.id}" title="Edit item">
                            ✏️
                        </button>
                        <button class="btn btn-sm btn-ghost delete-btn" data-item-id="${item.id}" title="Delete item">
                            🗑️
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    renderCellContent(item, column) {
        const value = item[column.id];
        
        switch (column.type) {
            case 'text':
                return `<div class="text-cell">${value || ''}</div>`;
                
            case 'status':
                const statusOption = column.options.find(opt => opt.value === value);
                return statusOption ? `
                    <div class="status-cell" style="background-color: ${statusOption.color}">
                        ${statusOption.label}
                    </div>
                ` : '<div class="status-cell empty">Not set</div>';
                
            case 'priority':
                const priorityOption = column.options.find(opt => opt.value === value);
                return priorityOption ? `
                    <div class="priority-cell" style="background-color: ${priorityOption.color}">
                        ${priorityOption.label}
                    </div>
                ` : '<div class="priority-cell empty">Not set</div>';
                
            case 'person':
                return value ? `
                    <div class="person-cell">
                        <img src="${value.avatar || '/assets/images/default-avatar.png'}" 
                             alt="${value.name}" class="person-avatar">
                        <span class="person-name">${value.name}</span>
                    </div>
                ` : '<div class="person-cell empty">Unassigned</div>';
                
            case 'date':
                return value ? `
                    <div class="date-cell">${new Date(value).toLocaleDateString()}</div>
                ` : '<div class="date-cell empty">No date</div>';
                
            case 'progress':
                const progress = value || 0;
                return `
                    <div class="progress-cell">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progress}%"></div>
                        </div>
                        <span class="progress-text">${progress}%</span>
                    </div>
                `;
                
            case 'tags':
                return value && value.length > 0 ? `
                    <div class="tags-cell">
                        ${value.map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                ` : '<div class="tags-cell empty">No tags</div>';
                
            default:
                return `<div class="default-cell">${value || ''}</div>`;
        }
    }

    renderDetailSidebar() {
        return `
            <div class="detail-sidebar ${this.currentDetailItem ? 'open' : ''}">
                <div class="sidebar-header">
                    <h3>Item Details</h3>
                    <button class="btn btn-sm btn-ghost close-sidebar-btn">×</button>
                </div>
                <div class="sidebar-content">
                    ${this.currentDetailItem ? this.renderItemDetails(this.currentDetailItem) : 
                      '<div class="no-selection">Select an item to view details</div>'}
                </div>
            </div>
        `;
    }

    renderItemDetails(item) {
        return `
            <div class="item-details">
                <div class="detail-section">
                    <h4>Basic Information</h4>
                    <div class="detail-field">
                        <label>Name</label>
                        <input type="text" class="detail-input" data-field="name" value="${item.name || ''}">
                    </div>
                    <div class="detail-field">
                        <label>Description</label>
                        <textarea class="detail-textarea" data-field="description" rows="3">${item.description || ''}</textarea>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4>Status & Priority</h4>
                    <div class="detail-field">
                        <label>Status</label>
                        <select class="detail-select" data-field="status">
                            ${this.getStatusOptions(item.status)}
                        </select>
                    </div>
                    <div class="detail-field">
                        <label>Priority</label>
                        <select class="detail-select" data-field="priority">
                            ${this.getPriorityOptions(item.priority)}
                        </select>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4>Assignment & Dates</h4>
                    <div class="detail-field">
                        <label>Assignee</label>
                        <div class="assignee-selector">
                            ${item.assignee ? `
                                <div class="current-assignee">
                                    <img src="${item.assignee.avatar}" alt="${item.assignee.name}" class="assignee-avatar">
                                    <span>${item.assignee.name}</span>
                                    <button class="btn btn-sm btn-ghost remove-assignee-btn">×</button>
                                </div>
                            ` : '<button class="btn btn-sm btn-outline assign-btn">Assign Person</button>'}
                        </div>
                    </div>
                    <div class="detail-field">
                        <label>Due Date</label>
                        <input type="date" class="detail-input" data-field="dueDate" value="${item.dueDate || ''}">
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4>Progress & Tags</h4>
                    <div class="detail-field">
                        <label>Progress</label>
                        <div class="progress-input-container">
                            <input type="range" class="progress-slider" data-field="progress" 
                                   min="0" max="100" value="${item.progress || 0}">
                            <span class="progress-value">${item.progress || 0}%</span>
                        </div>
                    </div>
                    <div class="detail-field">
                        <label>Tags</label>
                        <div class="tags-input-container">
                            <div class="current-tags">
                                ${(item.tags || []).map(tag => `
                                    <span class="tag editable">
                                        ${tag}
                                        <button class="remove-tag-btn">×</button>
                                    </span>
                                `).join('')}
                            </div>
                            <input type="text" class="add-tag-input" placeholder="Add tag...">
                        </div>
                    </div>
                </div>
                
                <div class="detail-actions">
                    <button class="btn btn-primary save-details-btn">Save Changes</button>
                    <button class="btn btn-secondary cancel-details-btn">Cancel</button>
                    <button class="btn btn-danger delete-item-btn" data-item-id="${item.id}">Delete Item</button>
                </div>
            </div>
        `;
    }

    getStatusOptions(currentStatus) {
        const statusColumn = this.columns.find(col => col.id === 'status');
        return statusColumn.options.map(option => `
            <option value="${option.value}" ${option.value === currentStatus ? 'selected' : ''}>
                ${option.label}
            </option>
        `).join('');
    }

    getPriorityOptions(currentPriority) {
        const priorityColumn = this.columns.find(col => col.id === 'priority');
        return priorityColumn.options.map(option => `
            <option value="${option.value}" ${option.value === currentPriority ? 'selected' : ''}>
                ${option.label}
            </option>
        `).join('');
    }

    attachEventListeners() {
        // Add item button
        const addItemBtn = this.container.querySelector('.add-item-btn');
        if (addItemBtn) {
            addItemBtn.addEventListener('click', () => this.addNewItem());
        }

        // Select all checkbox
        const selectAllCheckbox = this.container.querySelector('.select-all-checkbox');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', (e) => this.toggleSelectAll(e.target.checked));
        }

        // Individual item checkboxes
        const itemCheckboxes = this.container.querySelectorAll('.item-checkbox');
        itemCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => this.toggleItemSelection(e.target.dataset.itemId, e.target.checked));
        });

        // Editable cells
        if (this.options.editable) {
            const editableCells = this.container.querySelectorAll('.item-cell.editable');
            editableCells.forEach(cell => {
                cell.addEventListener('click', (e) => this.startCellEdit(cell));
            });
        }

        // Action buttons
        const detailButtons = this.container.querySelectorAll('.detail-btn');
        detailButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showItemDetails(btn.dataset.itemId);
            });
        });

        const editButtons = this.container.querySelectorAll('.edit-btn');
        editButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.editItem(btn.dataset.itemId);
            });
        });

        const deleteButtons = this.container.querySelectorAll('.delete-btn');
        deleteButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteItem(btn.dataset.itemId);
            });
        });

        // Bulk actions
        const bulkDeleteBtn = this.container.querySelector('.bulk-delete-btn');
        if (bulkDeleteBtn) {
            bulkDeleteBtn.addEventListener('click', () => this.bulkDeleteItems());
        }

        const bulkDuplicateBtn = this.container.querySelector('.bulk-duplicate-btn');
        if (bulkDuplicateBtn) {
            bulkDuplicateBtn.addEventListener('click', () => this.bulkDuplicateItems());
        }

        // Detail sidebar
        const closeSidebarBtn = this.container.querySelector('.close-sidebar-btn');
        if (closeSidebarBtn) {
            closeSidebarBtn.addEventListener('click', () => this.closeDetailSidebar());
        }

        // Detail form inputs
        this.attachDetailFormListeners();
    }

    attachDetailFormListeners() {
        // Save details button
        const saveDetailsBtn = this.container.querySelector('.save-details-btn');
        if (saveDetailsBtn) {
            saveDetailsBtn.addEventListener('click', () => this.saveItemDetails());
        }

        // Cancel details button
        const cancelDetailsBtn = this.container.querySelector('.cancel-details-btn');
        if (cancelDetailsBtn) {
            cancelDetailsBtn.addEventListener('click', () => this.cancelItemDetails());
        }

        // Progress slider
        const progressSlider = this.container.querySelector('.progress-slider');
        if (progressSlider) {
            progressSlider.addEventListener('input', (e) => {
                const valueSpan = this.container.querySelector('.progress-value');
                if (valueSpan) {
                    valueSpan.textContent = `${e.target.value}%`;
                }
            });
        }

        // Add tag input
        const addTagInput = this.container.querySelector('.add-tag-input');
        if (addTagInput) {
            addTagInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && e.target.value.trim()) {
                    this.addTag(e.target.value.trim());
                    e.target.value = '';
                }
            });
        }

        // Remove tag buttons
        const removeTagBtns = this.container.querySelectorAll('.remove-tag-btn');
        removeTagBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tag = e.target.closest('.tag');
                if (tag) {
                    tag.remove();
                }
            });
        });
    }

    // Item management methods
    async addNewItem() {
        const newItem = {
            name: 'New Item',
            status: 'todo',
            priority: 'medium',
            assignee: null,
            dueDate: null,
            description: '',
            tags: [],
            progress: 0
        };

        try {
            if (this.options.boardId) {
                const response = await api.items.create(this.options.boardId, newItem);
                this.items.push(response.data);
            } else {
                // Demo mode
                newItem.id = Date.now().toString();
                this.items.push(newItem);
            }
            
            this.render();
            showNotification('Item created successfully', 'success');
        } catch (error) {
            console.error('Error creating item:', error);
            showNotification('Failed to create item', 'error');
        }
    }

    async deleteItem(itemId) {
        if (!confirm('Are you sure you want to delete this item?')) {
            return;
        }

        try {
            if (this.options.boardId) {
                await api.items.delete(itemId);
            }
            
            this.items = this.items.filter(item => item.id !== itemId);
            this.selectedItems.delete(itemId);
            
            if (this.currentDetailItem && this.currentDetailItem.id === itemId) {
                this.closeDetailSidebar();
            }
            
            this.render();
            showNotification('Item deleted successfully', 'success');
        } catch (error) {
            console.error('Error deleting item:', error);
            showNotification('Failed to delete item', 'error');
        }
    }

    showItemDetails(itemId) {
        const item = this.items.find(i => i.id === itemId);
        if (item) {
            this.currentDetailItem = { ...item }; // Create a copy for editing
            this.render();
        }
    }

    closeDetailSidebar() {
        this.currentDetailItem = null;
        this.render();
    }

    async saveItemDetails() {
        if (!this.currentDetailItem) return;

        try {
            // Collect form data
            const formData = this.collectDetailFormData();
            const updatedItem = { ...this.currentDetailItem, ...formData };

            if (this.options.boardId) {
                const response = await api.items.update(updatedItem.id, updatedItem);
                // Update local item
                const index = this.items.findIndex(item => item.id === updatedItem.id);
                if (index > -1) {
                    this.items[index] = response.data;
                }
            } else {
                // Demo mode
                const index = this.items.findIndex(item => item.id === updatedItem.id);
                if (index > -1) {
                    this.items[index] = updatedItem;
                }
            }

            this.currentDetailItem = null;
            this.render();
            showNotification('Item updated successfully', 'success');
        } catch (error) {
            console.error('Error updating item:', error);
            showNotification('Failed to update item', 'error');
        }
    }

    collectDetailFormData() {
        const formData = {};
        
        // Text inputs
        const textInputs = this.container.querySelectorAll('.detail-input, .detail-textarea, .detail-select');
        textInputs.forEach(input => {
            if (input.dataset.field) {
                formData[input.dataset.field] = input.value;
            }
        });

        // Progress slider
        const progressSlider = this.container.querySelector('.progress-slider');
        if (progressSlider) {
            formData.progress = parseInt(progressSlider.value);
        }

        // Tags
        const tagElements = this.container.querySelectorAll('.current-tags .tag');
        formData.tags = Array.from(tagElements).map(tag => tag.textContent.trim().replace('×', ''));

        return formData;
    }

    // Selection methods
    toggleSelectAll(checked) {
        if (checked) {
            this.items.forEach(item => this.selectedItems.add(item.id));
        } else {
            this.selectedItems.clear();
        }
        this.render();
    }

    toggleItemSelection(itemId, checked) {
        if (checked) {
            this.selectedItems.add(itemId);
        } else {
            this.selectedItems.delete(itemId);
        }
        this.updateBulkActions();
    }

    updateBulkActions() {
        const bulkActions = this.container.querySelector('.bulk-actions');
        const selectionCount = this.container.querySelector('.selection-count');
        
        if (bulkActions && selectionCount) {
            if (this.selectedItems.size > 0) {
                bulkActions.classList.add('visible');
                selectionCount.textContent = `${this.selectedItems.size} selected`;
            } else {
                bulkActions.classList.remove('visible');
            }
        }
    }

    // Bulk operations
    async bulkDeleteItems() {
        if (this.selectedItems.size === 0) return;
        
        if (!confirm(`Are you sure you want to delete ${this.selectedItems.size} items?`)) {
            return;
        }

        try {
            const itemIds = Array.from(this.selectedItems);
            
            if (this.options.boardId) {
                await api.items.bulkDelete(itemIds);
            }
            
            this.items = this.items.filter(item => !this.selectedItems.has(item.id));
            this.selectedItems.clear();
            
            this.render();
            showNotification(`${itemIds.length} items deleted successfully`, 'success');
        } catch (error) {
            console.error('Error deleting items:', error);
            showNotification('Failed to delete items', 'error');
        }
    }

    async bulkDuplicateItems() {
        if (this.selectedItems.size === 0) return;

        try {
            const itemIds = Array.from(this.selectedItems);
            const itemsToDuplicate = this.items.filter(item => itemIds.includes(item.id));
            
            for (const item of itemsToDuplicate) {
                const duplicatedItem = {
                    ...item,
                    id: undefined, // Let the server assign new ID
                    name: `${item.name} (Copy)`,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                
                if (this.options.boardId) {
                    const response = await api.items.create(this.options.boardId, duplicatedItem);
                    this.items.push(response.data);
                } else {
                    // Demo mode
                    duplicatedItem.id = Date.now().toString() + Math.random();
                    this.items.push(duplicatedItem);
                }
            }
            
            this.selectedItems.clear();
            this.render();
            showNotification(`${itemsToDuplicate.length} items duplicated successfully`, 'success');
        } catch (error) {
            console.error('Error duplicating items:', error);
            showNotification('Failed to duplicate items', 'error');
        }
    }

    // Utility methods
    addTag(tagText) {
        if (!this.currentDetailItem) return;
        
        if (!this.currentDetailItem.tags) {
            this.currentDetailItem.tags = [];
        }
        
        if (!this.currentDetailItem.tags.includes(tagText)) {
            this.currentDetailItem.tags.push(tagText);
            this.render();
        }
    }
}
