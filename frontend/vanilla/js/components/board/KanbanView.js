/**
 * Monday.com-style Kanban Board Component
 */

import { apiClient } from '../../services/ApiClient.js';
import { sanitizeHTML } from '../../utils/sanitize.js';

export class KanbanView {
    constructor(container) {
        this.container = container;
        this.apiClient = apiClient;
        this.boardId = null;
        this.columns = [];
        this.items = [];
        this.draggedItem = null;
        this.draggedColumn = null;
    }

    async init(boardId) {
        this.boardId = boardId;
        await this.loadBoard();
        this.render();
        this.attachEventListeners();
    }

    async loadBoard() {
        try {
            // Load board data - using demo data for now
            this.columns = this.createDemoColumns();
            this.items = this.createDemoItems();
        } catch (error) {
            console.error('Failed to load Kanban board:', error);
            this.columns = this.createDemoColumns();
            this.items = this.createDemoItems();
        }
    }

    createDemoColumns() {
        return [
            { id: 'col-1', title: 'To Do', color: '#e2445c', order: 1 },
            { id: 'col-2', title: 'In Progress', color: '#fdab3d', order: 2 },
            { id: 'col-3', title: 'Review', color: '#a25ddc', order: 3 },
            { id: 'col-4', title: 'Done', color: '#00c875', order: 4 }
        ];
    }

    createDemoItems() {
        const priorities = ['low', 'medium', 'high', 'critical'];
        const assignees = ['JS', 'SW', 'MJ', 'LB', 'TD'];
        const itemTitles = [
            'Design new landing page',
            'Implement user authentication',
            'Fix mobile responsiveness',
            'Write API documentation',
            'Set up CI/CD pipeline',
            'Create user onboarding flow',
            'Optimize database queries',
            'Add search functionality',
            'Implement real-time notifications',
            'Conduct user testing',
            'Update privacy policy',
            'Migrate to new hosting'
        ];

        return itemTitles.map((title, index) => ({
            id: `item-${index + 1}`,
            title: title,
            description: `Detailed description for ${title.toLowerCase()}`,
            columnId: this.columns[index % this.columns.length].id,
            priority: priorities[Math.floor(Math.random() * priorities.length)],
            assignee: assignees[Math.floor(Math.random() * assignees.length)],
            dueDate: new Date(Date.now() + (Math.random() * 14) * 24 * 60 * 60 * 1000),
            tags: this.generateTags(),
            attachments: Math.floor(Math.random() * 3),
            comments: Math.floor(Math.random() * 5),
            subtasks: {
                completed: Math.floor(Math.random() * 3),
                total: Math.floor(Math.random() * 5) + 2
            }
        }));
    }

    generateTags() {
        const allTags = ['Frontend', 'Backend', 'Design', 'Testing', 'Documentation', 'Bug', 'Feature'];
        const numTags = Math.floor(Math.random() * 3) + 1;
        const shuffled = allTags.sort(() => 0.5 - Math.random());
        return shuffled.slice(0, numTags);
    }

    render() {
        const html = `
            <div class="kanban-board">
                <div class="kanban-header">
                    <h2>Kanban Board</h2>
                    <div class="kanban-actions">
                        <button class="btn btn-outline btn-sm" onclick="this.addColumn()">+ Add Column</button>
                        <button class="btn btn-primary btn-sm" onclick="this.addItem()">+ Add Item</button>
                    </div>
                </div>
                <div class="kanban-columns" id="kanban-columns">
                    ${this.renderColumns()}
                </div>
            </div>
        `;

        this.container.innerHTML = sanitizeHTML(html);
    }

    renderColumns() {
        return this.columns.map(column => {
            const columnItems = this.items.filter(item => item.columnId === column.id);
            
            return `
                <div class="kanban-column" data-column-id="${column.id}" draggable="true">
                    <div class="column-header" style="border-top: 4px solid ${column.color}">
                        <div class="column-title">
                            <h3>${column.title}</h3>
                            <span class="item-count">${columnItems.length}</span>
                        </div>
                        <div class="column-actions">
                            <button class="btn btn-icon btn-sm" onclick="this.editColumn('${column.id}')">
                                <span>⋮</span>
                            </button>
                        </div>
                    </div>
                    <div class="column-items" data-column-id="${column.id}">
                        ${this.renderItems(columnItems)}
                    </div>
                    <div class="add-item-zone" onclick="this.addItemToColumn('${column.id}')">
                        <span class="add-item-text">+ Add an item</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderItems(items) {
        return items.map(item => `
            <div class="kanban-item" data-item-id="${item.id}" draggable="true">
                <div class="item-header">
                    <div class="item-priority priority-${item.priority}"></div>
                    <div class="item-actions">
                        <button class="btn btn-icon btn-xs" onclick="this.editItem('${item.id}')">
                            <span>⋯</span>
                        </button>
                    </div>
                </div>
                <div class="item-content">
                    <h4 class="item-title">${item.title}</h4>
                    ${item.description ? `<p class="item-description">${item.description}</p>` : ''}
                </div>
                <div class="item-tags">
                    ${item.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
                <div class="item-footer">
                    <div class="item-assignee">${item.assignee}</div>
                    <div class="item-meta">
                        ${item.attachments > 0 ? `<span class="meta-item">📎 ${item.attachments}</span>` : ''}
                        ${item.comments > 0 ? `<span class="meta-item">💬 ${item.comments}</span>` : ''}
                        ${item.subtasks.total > 0 ? `<span class="meta-item">☑️ ${item.subtasks.completed}/${item.subtasks.total}</span>` : ''}
                    </div>
                    <div class="item-due-date ${this.getDueDateClass(item.dueDate)}">
                        ${this.formatDueDate(item.dueDate)}
                    </div>
                </div>
            </div>
        `).join('');
    }

    attachEventListeners() {
        // Drag and drop for items
        this.container.addEventListener('dragstart', this.handleDragStart.bind(this));
        this.container.addEventListener('dragover', this.handleDragOver.bind(this));
        this.container.addEventListener('drop', this.handleDrop.bind(this));
        this.container.addEventListener('dragend', this.handleDragEnd.bind(this));

        // Click handlers
        this.container.addEventListener('click', this.handleClick.bind(this));
    }

    handleDragStart(e) {
        if (e.target.classList.contains('kanban-item')) {
            this.draggedItem = e.target;
            e.target.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', e.target.outerHTML);
        } else if (e.target.classList.contains('kanban-column')) {
            this.draggedColumn = e.target;
            e.target.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        }
    }

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        const columnItems = e.target.closest('.column-items');
        if (columnItems && this.draggedItem) {
            const afterElement = this.getDragAfterElement(columnItems, e.clientY);
            if (afterElement == null) {
                columnItems.appendChild(this.draggedItem);
            } else {
                columnItems.insertBefore(this.draggedItem, afterElement);
            }
        }
    }

    handleDrop(e) {
        e.preventDefault();
        
        if (this.draggedItem) {
            const newColumn = e.target.closest('.column-items');
            if (newColumn) {
                const columnId = newColumn.dataset.columnId;
                const itemId = this.draggedItem.dataset.itemId;
                this.moveItem(itemId, columnId);
            }
        } else if (this.draggedColumn) {
            const targetColumn = e.target.closest('.kanban-column');
            if (targetColumn && targetColumn !== this.draggedColumn) {
                this.reorderColumns(this.draggedColumn, targetColumn);
            }
        }
    }

    handleDragEnd(e) {
        if (this.draggedItem) {
            this.draggedItem.classList.remove('dragging');
            this.draggedItem = null;
        }
        if (this.draggedColumn) {
            this.draggedColumn.classList.remove('dragging');
            this.draggedColumn = null;
        }
    }

    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.kanban-item:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    async moveItem(itemId, newColumnId) {
        try {
            // Update item in data
            const item = this.items.find(i => i.id === itemId);
            if (item) {
                item.columnId = newColumnId;
                
                // In a real app, this would make an API call
                await this.updateItemColumn(itemId, newColumnId);
                
                // Update column counts
                this.updateColumnCounts();
            }
        } catch (error) {
            console.error('Failed to move item:', error);
            // Revert the move
            this.render();
        }
    }

    async updateItemColumn(itemId, columnId) {
        // In a real app, this would make an API call
        console.log(`Moving item ${itemId} to column ${columnId}`);
    }

    updateColumnCounts() {
        this.columns.forEach(column => {
            const count = this.items.filter(item => item.columnId === column.id).length;
            const countElement = this.container.querySelector(`[data-column-id="${column.id}"] .item-count`);
            if (countElement) {
                countElement.textContent = count;
            }
        });
    }

    addColumn() {
        const columnName = prompt('Enter column name:');
        if (columnName) {
            const newColumn = {
                id: `col-${Date.now()}`,
                title: columnName,
                color: this.getRandomColor(),
                order: this.columns.length + 1
            };
            
            this.columns.push(newColumn);
            this.render();
            this.attachEventListeners();
        }
    }

    addItem() {
        const itemTitle = prompt('Enter item title:');
        if (itemTitle) {
            const newItem = {
                id: `item-${Date.now()}`,
                title: itemTitle,
                description: '',
                columnId: this.columns[0].id,
                priority: 'medium',
                assignee: 'UN',
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                tags: [],
                attachments: 0,
                comments: 0,
                subtasks: { completed: 0, total: 0 }
            };
            
            this.items.push(newItem);
            this.render();
            this.attachEventListeners();
        }
    }

    addItemToColumn(columnId) {
        const itemTitle = prompt('Enter item title:');
        if (itemTitle) {
            const newItem = {
                id: `item-${Date.now()}`,
                title: itemTitle,
                description: '',
                columnId: columnId,
                priority: 'medium',
                assignee: 'UN',
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                tags: [],
                attachments: 0,
                comments: 0,
                subtasks: { completed: 0, total: 0 }
            };
            
            this.items.push(newItem);
            this.render();
            this.attachEventListeners();
        }
    }

    editItem(itemId) {
        console.log('Edit item:', itemId);
        // In a real app, this would open an item details modal
    }

    editColumn(columnId) {
        console.log('Edit column:', columnId);
        // In a real app, this would open a column settings modal
    }

    getDueDateClass(dueDate) {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        if (dueDate < today) return 'overdue';
        if (dueDate < tomorrow) return 'due-today';
        return 'due-future';
    }

    formatDueDate(date) {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === tomorrow.toDateString()) {
            return 'Tomorrow';
        } else {
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
    }

    getRandomColor() {
        const colors = ['#e2445c', '#fdab3d', '#a25ddc', '#00c875', '#0086c0', '#ff7575'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    handleClick(e) {
        // Handle various click events
        e.stopPropagation();
    }
}

