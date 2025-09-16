/**
 * Item Service with WebSocket Integration
 */

class ItemService {
    constructor(websocketService) {
        this.items = [];
        this.currentItem = null;
        this.websocketService = websocketService;
        this.initializeWebSocketListeners();
    }
    
    initializeWebSocketListeners() {
        if (!window.eventBus) return;

        window.eventBus.on('item:update', (data) => {
            const { action, payload } = data;
            
            switch (action) {
                case 'created':
                    this.handleItemCreated(payload);
                    break;
                case 'updated':
                    this.handleItemUpdated(payload);
                    break;
                case 'deleted':
                    this.handleItemDeleted(payload);
                    break;
            }
        });
    }
    
    async makeRequest(endpoint, options = {}) {
        const token = localStorage.getItem('authToken');
        const config = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            ...options
        };
        
        if (options.body) {
            config.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
        }
        
        const response = await fetch(`/api${endpoint}`, config);
        const data = await response.json();
        
        if (!response.ok) throw new Error(data.message || 'Request failed');
        return { success: true, data };
    }
    
    async getItemsByBoard(boardId) {
        try {
            const response = await this.makeRequest(`/boards/${boardId}/items`);
            this.items = response.data.items || [];
            window.eventBus?.emit('item:list_updated', { items: this.items, boardId });
            return this.items;
        } catch (error) {
            window.eventBus?.emit('notification:error', { message: error.message });
            throw error;
        }
    }
    
    async getItemById(itemId) {
        try {
            const response = await this.makeRequest(`/items/${itemId}`);
            const item = response.data;
            this.currentItem = item;
            window.eventBus?.emit('item:selected', { item });
            return item;
        } catch (error) {
            window.eventBus?.emit('notification:error', { message: error.message });
            throw error;
        }
    }
    
    async createItem(boardId, itemData) {
        try {
            const response = await this.makeRequest(`/boards/${boardId}/items`, {
                method: 'POST',
                body: itemData
            });
            
            const newItem = response.data;
            this.items.push(newItem);
            window.eventBus?.emit('item:created', { item: newItem, boardId });
            return newItem;
        } catch (error) {
            window.eventBus?.emit('notification:error', { message: error.message });
            throw error;
        }
    }
    
    async updateItem(itemId, updateData) {
        try {
            const response = await this.makeRequest(`/items/${itemId}`, {
                method: 'PUT',
                body: updateData
            });
            
            const updatedItem = response.data;
            const index = this.items.findIndex(item => item.id === itemId);
            if (index !== -1) {
                this.items[index] = updatedItem;
            }
            
            if (this.currentItem && this.currentItem.id === itemId) {
                this.currentItem = updatedItem;
            }
            
            window.eventBus?.emit('item:updated', { item: updatedItem });
            return updatedItem;
        } catch (error) {
            window.eventBus?.emit('notification:error', { message: error.message });
            throw error;
        }
    }
    
    async deleteItem(itemId) {
        try {
            await this.makeRequest(`/items/${itemId}`, { method: 'DELETE' });
            
            this.items = this.items.filter(item => item.id !== itemId);
            if (this.currentItem && this.currentItem.id === itemId) {
                this.currentItem = null;
            }
            
            window.eventBus?.emit('item:deleted', { itemId });
            return true;
        } catch (error) {
            window.eventBus?.emit('notification:error', { message: error.message });
            throw error;
        }
    }
    
    async moveItem(itemId, moveData) {
        try {
            const response = await this.makeRequest(`/items/${itemId}/move`, {
                method: 'PATCH',
                body: moveData
            });
            
            const movedItem = response.data;
            const index = this.items.findIndex(item => item.id === itemId);
            if (index !== -1) {
                this.items[index] = movedItem;
            }
            
            if (this.currentItem && this.currentItem.id === itemId) {
                this.currentItem = movedItem;
            }
            
            window.eventBus?.emit('item:moved', { item: movedItem, moveData });
            return movedItem;
        } catch (error) {
            window.eventBus?.emit('notification:error', { message: error.message });
            throw error;
        }
    }
    
    handleItemCreated(item) {
        if (!this.items.find(i => i.id === item.id)) {
            this.items.push(item);
            window.eventBus?.emit('item:created', { item, source: 'websocket' });
        }
    }
    
    handleItemUpdated(item) {
        const index = this.items.findIndex(i => i.id === item.id);
        if (index !== -1) {
            this.items[index] = item;
            if (this.currentItem && this.currentItem.id === item.id) {
                this.currentItem = item;
            }
            window.eventBus?.emit('item:updated', { item, source: 'websocket' });
        }
    }
    
    handleItemDeleted(item) {
        this.items = this.items.filter(i => i.id !== item.id);
        if (this.currentItem && this.currentItem.id === item.id) {
            this.currentItem = null;
        }
        window.eventBus?.emit('item:deleted', { itemId: item.id, source: 'websocket' });
    }
    
    getCurrentItem() {
        return this.currentItem;
    }
    
    getAllItems() {
        return this.items;
    }
    
    setCurrentItem(item) {
        this.currentItem = item;
        window.eventBus?.emit('item:selected', { item });
    }
    
    clearCurrentItem() {
        this.currentItem = null;
        window.eventBus?.emit('item:deselected');
    }
}

// Create singleton instance
let itemServiceInstance = null;

const createItemService = (websocketService) => {
    if (!itemServiceInstance) {
        itemServiceInstance = new ItemService(websocketService);
    }
    return itemServiceInstance;
};

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ItemService, createItemService };
} else {
    window.ItemService = ItemService;
    window.createItemService = createItemService;
}