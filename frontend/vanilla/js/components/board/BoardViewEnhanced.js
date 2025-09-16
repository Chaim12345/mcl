/**
 * Enhanced Board View Component with WebSocket Integration
 */

class BoardViewEnhanced {
    constructor(container, options = {}) {
        this.container = container;
        this.options = options;
        
        this.state = {
            isLoading: false,
            board: null,
            items: [],
            columns: [],
            viewMode: 'table',
            searchQuery: '',
            sortBy: 'created',
            sortOrder: 'desc',
            selectedItems: [],
            showColumnManager: false,
            showBoardSettings: false,
            errors: {},
            lastUpdate: null,
            syncStatus: 'connected'
        };
        
        this.boardId = options.boardId || null;
        this.websocketService = options.websocketService || window.WebSocketService;
        
        this.init();
    }
    
    init() {
        if (this.boardId) {
            this.loadBoard();
            this.loadItems();
        }
        
        this.setupWebSocketListeners();
        this.render();
        this.bindEvents();
    }
    
    setupWebSocketListeners() {
        if (!window.eventBus) return;
        
        // Board updates
        window.eventBus.on('board:update', (data) => {
            if (data.action === 'updated' && data.payload.id === this.boardId) {
                this.handleBoardUpdated(data.payload);
            }
        });
        
        // Item updates
        window.eventBus.on('item:update', (data) => {
            if (data.action === 'created' && data.payload.boardId === this.boardId) {
                this.handleItemCreated(data.payload);
            } else if (data.action === 'updated' && data.payload.boardId === this.boardId) {
                this.handleItemUpdated(data.payload);
            } else if (data.action === 'deleted' && data.payload.boardId === this.boardId) {
                this.handleItemDeleted(data.payload.id);
            }
        });
        
        // Connection status
        window.eventBus.on('websocket:connected', () => {
            this.setState({ syncStatus: 'connected' });
        });
        
        window.eventBus.on('websocket:disconnected', () => {
            this.setState({ syncStatus: 'disconnected' });
        });
    }
    
    async loadBoard() {
        if (!this.boardId) return;
        
        this.setState({ isLoading: true });
        
        try {
            const response = await fetch(`/api/boards/${this.boardId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });
            
            const board = await response.json();
            this.setState({
                isLoading: false,
                board,
                columns: board.columns || []
            });
            
            // Subscribe to board updates
            this.websocketService?.subscribeToBoard(this.boardId);
            
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
            const response = await fetch(`/api/boards/${this.boardId}/items`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });
            
            const data = await response.json();
            this.setState({ items: data.items || [] });
            
        } catch (error) {
            console.error('Error loading items:', error);
        }
    }
    
    handleBoardUpdated(board) {
        if (board.id === this.boardId) {
            this.setState({
                board,
                columns: board.columns || []
            });
            
            // Show notification
            this.showNotification('Board Updated', 'The board has been updated');
        }
    }
    
    handleItemCreated(item) {
        if (item.boardId === this.boardId && !this.state.items.find(i => i.id === item.id)) {
            this.setState({ items: [...this.state.items, item] });
            this.showNotification('New Item', `Item "${item.name}" was created`);
        }
    }
    
    handleItemUpdated(item) {
        const items = [...this.state.items];
        const index = items.findIndex(i => i.id === item.id);
        
        if (index !== -1) {
            items[index] = item;
            this.setState({ items });
            this.showNotification('Item Updated', `Item "${item.name}" was updated`);
        }
    }
    
    handleItemDeleted(itemId) {
        this.setState({
            items: this.state.items.filter(i => i.id !== itemId),
            selectedItems: this.state.selectedItems.filter(id => id !== itemId)
        });
        this.showNotification('Item Deleted', 'An item was deleted');
    }
    
    setState(newState) {
        Object.assign(this.state, newState);
        this.render();
    }
    
    render() {
        const { isLoading, board, items, errors } = this.state;
        
        if (!board) {
            this.container.innerHTML = `
                <div class="board-view">
                    <div class="loading-state">
                        ${isLoading ? 'Loading board...' : 'No board selected'}
                    </div>
                </div>
            `;
            return;
        }
        
        const filteredItems = this.filterAndSortItems(items);
        
        this.container.innerHTML = `
            <div class="board-view">
                <div class="board-header">
                    <h1>${board.name}</h1>
                    <div class="board-meta">
                        <span>${items.length} items</span>
                        <span class="sync-status ${this.state.syncStatus}">
                            ${this.state.syncStatus}
                        </span>
                    </div>
                </div>
                
                <div class="board-controls">
                    <input type="text" placeholder="Search items..." data-search-input>
                    <button data-action="add-item">Add Item</button>
                </div>
                
                <div class="board-content">
                    ${errors.load ? `
                        <div class="error-message">${errors.load}</div>
                    ` : `
                        <table class="board-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${filteredItems.map(item => this.renderTableRow(item)).join('')}
                            </tbody>
                        </table>
                    `}
                </div>
                
                ${this.renderSyncStatus()}
            </div>
        `;
        
        this.bindEvents();
    }
    
    renderTableRow(item) {
        return `
            <tr data-item-id="${item.id}">
                <td>${item.name || 'Untitled'}</td>
                <td>
                    <span class="status-badge">${item.status || 'None'}</span>
                </td>
                <td>
                    <button class="btn-sm" data-action="edit" data-item-id="${item.id}">Edit</button>
                    <button class="btn-sm btn-danger" data-action="delete" data-item-id="${item.id}">Delete</button>
                </td>
            </tr>
        `;
    }
    
    renderSyncStatus() {
        return `
            <div class="sync-status-bar">
                <span class="sync-icon ${this.state.syncStatus}"></span>
                <span>Real-time updates: ${this.state.syncStatus}</span>
            </div>
        `;
    }
    
    filterAndSortItems(items) {
        let filtered = items;
        
        if (this.state.searchQuery) {
            const query = this.state.searchQuery.toLowerCase();
            filtered = filtered.filter(item => 
                item.name?.toLowerCase().includes(query) ||
                item.description?.toLowerCase().includes(query)
            );
        }
        
        // Sort items
        filtered.sort((a, b) => {
            let aVal = a[this.state.sortBy] || '';
            let bVal = b[this.state.sortBy] || '';
            
            if (this.state.sortOrder === 'desc') {
                return bVal > aVal ? 1 : -1;
            }
            return aVal > bVal ? 1 : -1;
        });
        
        return filtered;
    }
    
    bindEvents() {
        // Search
        const searchInput = this.container.querySelector('[data-search-input]');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.setState({ searchQuery: e.target.value });
            });
        }
        
        // Actions
        this.container.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            const itemId = e.target.dataset.itemId;
            
            switch (action) {
                case 'add-item':
                    this.handleAddItem();
                    break;
                case 'edit':
                    this.handleEditItem(itemId);
                    break;
                case 'delete':
                    this.handleDeleteItem(itemId);
                    break;
            }
        });
    }
    
    async handleAddItem() {
        const name = prompt('Item name:');
        if (!name) return;
        
        try {
            const response = await fetch(`/api/boards/${this.boardId}/items`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify({ name })
            });
            
            const newItem = await response.json();
            this.setState({ items: [...this.state.items, newItem] });
            
        } catch (error) {
            console.error('Error adding item:', error);
        }
    }
    
    async handleEditItem(itemId) {
        const item = this.state.items.find(i => i.id === itemId);
        if (!item) return;
        
        const newName = prompt('New name:', item.name);
        if (!newName || newName === item.name) return;
        
        try {
            const response = await fetch(`/api/items/${itemId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify({ name: newName })
            });
            
            const updatedItem = await response.json();
            this.handleItemUpdated(updatedItem);
            
        } catch (error) {
            console.error('Error updating item:', error);
        }
    }
    
    async handleDeleteItem(itemId) {
        if (!confirm('Are you sure you want to delete this item?')) return;
        
        try {
            await fetch(`/api/items/${itemId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });
            
            this.handleItemDeleted(itemId);
            
        } catch (error) {
            console.error('Error deleting item:', error);
        }
    }
    
    showNotification(title, message) {
        if (!window.eventBus) return;
        
        window.eventBus.emit('notification:show', {
            id: `board-${Date.now()}`,
            type: 'info',
            title,
            message,
            duration: 3000
        });
    }
    
    destroy() {
        if (this.websocketService && this.boardId) {
            this.websocketService.unsubscribe(`board:${this.boardId}`);
        }
    }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BoardViewEnhanced };
} else {
    window.BoardViewEnhanced = BoardViewEnhanced;
}