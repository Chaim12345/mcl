/**
 * Item Service for Vanilla JavaScript Frontend
 */

import { authService } from './auth.js';
import { boardService } from './board.js';
import { eventBus } from '../utils/events.js';
import { state } from '../utils/state.js';

// Configuration constants
const API_BASE_URL = '/api';

/**
 * Item Service Class
 */
class ItemService {
    constructor() {
        this.items = [];
        this.currentItem = null;
        
        // Initialize from state
        this.initializeFromState();
    }
    
    /**
     * Initialize item state
     */
    initializeFromState() {
        const currentState = state.get('item');
        if (currentState) {
            this.items = currentState.list || [];
            this.currentItem = currentState.current || null;
        }
    }
    
    /**
     * Make authenticated API request
     */
    async makeRequest(endpoint, options = {}) {
        return await authService.makeRequest(endpoint, options);
    }
    
    /**
     * Get all items for a board
     */
    async getItemsByBoard(boardId) {
        try {
            const response = await this.makeRequest(`/boards/${boardId}/items`);
            
            if (response.success) {
                this.items = response.data.items || [];
                this.updateGlobalState();
                
                eventBus.emit('item:list_updated', { items: this.items, boardId });
                return this.items;
            } else {
                throw new Error(response.message || 'Failed to fetch items');
            }
        } catch (error) {
            eventBus.emit('notification:error', { message: error.message });
            throw error;
        }
    }
    
    /**
     * Get item by ID
     */
    async getItemById(itemId) {
        try {
            const response = await this.makeRequest(`/items/${itemId}`);
            
            if (response.success) {
                const item = response.data;
                this.currentItem = item;
                this.updateGlobalState();
                
                eventBus.emit('item:selected', { item });
                return item;
            } else {
                throw new Error(response.message || 'Failed to fetch item');
            }
        } catch (error) {
            eventBus.emit('notification:error', { message: error.message });
            throw error;
        }
    }
    
    /**
     * Create new item
     */
    async createItem(boardId, itemData) {
        try {
            const response = await this.makeRequest(`/boards/${boardId}/items`, {
                method: 'POST',
                body: JSON.stringify(itemData)
            });
            
            if (response.success) {
                const newItem = response.data;
                this.items.push(newItem);
                this.updateGlobalState();
                
                eventBus.emit('item:created', { item: newItem, boardId });
                eventBus.emit('notification:success', { 
                    message: `Item "${newItem.name}" created successfully!` 
                });
                
                return newItem;
            } else {
                throw new Error(response.message || 'Failed to create item');
            }
        } catch (error) {
            eventBus.emit('notification:error', { message: error.message });
            throw error;
        }
    }
    
    /**
     * Update item
     */
    async updateItem(itemId, updateData) {
        try {
            const response = await this.makeRequest(`/items/${itemId}`, {
                method: 'PUT',
                body: JSON.stringify(updateData)
            });
            
            if (response.success) {
                const updatedItem = response.data;
                
                // Update in local list
                const index = this.items.findIndex(item => item.id === itemId);
                if (index !== -1) {
                    this.items[index] = updatedItem;
                }
                
                // Update current item if it's the one being updated
                if (this.currentItem && this.currentItem.id === itemId) {
                    this.currentItem = updatedItem;
                }
                
                this.updateGlobalState();
                
                eventBus.emit('item:updated', { item: updatedItem });
                
                return updatedItem;
            } else {
                throw new Error(response.message || 'Failed to update item');
            }
        } catch (error) {
            eventBus.emit('notification:error', { message: error.message });
            throw error;
        }
    }
    
    /**
     * Delete item
     */
    async deleteItem(itemId) {
        try {
            const response = await this.makeRequest(`/items/${itemId}`, {
                method: 'DELETE'
            });
            
            if (response.success) {
                // Remove from local list
                this.items = this.items.filter(item => item.id !== itemId);
                
                // Clear current item if it's the one being deleted
                if (this.currentItem && this.currentItem.id === itemId) {
                    this.currentItem = null;
                }
                
                this.updateGlobalState();
                
                eventBus.emit('item:deleted', { itemId });
                eventBus.emit('notification:success', { 
                    message: 'Item deleted successfully!' 
                });
                
                return true;
            } else {
                throw new Error(response.message || 'Failed to delete item');
            }
        } catch (error) {
            eventBus.emit('notification:error', { message: error.message });
            throw error;
        }
    }
    
    /**
     * Duplicate item
     */
    async duplicateItem(itemId, newName = null) {
        try {
            const originalItem = await this.getItemById(itemId);
            
            const duplicateData = {
                name: newName || `${originalItem.name} (Copy)`,
                description: originalItem.description,
                fieldValues: originalItem.fieldValues,
                tags: originalItem.tags
            };
            
            const duplicatedItem = await this.createItem(originalItem.boardId, duplicateData);
            
            eventBus.emit('notification:success', { 
                message: `Item duplicated as "${duplicatedItem.name}"!` 
            });
            
            return duplicatedItem;
        } catch (error) {
            eventBus.emit('notification:error', { message: error.message });
            throw error;
        }
    }
    
    /**
     * Move item to different position or column
     */
    async moveItem(itemId, moveData) {
        try {
            const response = await this.makeRequest(`/items/${itemId}/move`, {
                method: 'PATCH',
                body: JSON.stringify(moveData)
            });
            
            if (response.success) {
                const movedItem = response.data;
                
                // Update in local list
                const index = this.items.findIndex(item => item.id === itemId);
                if (index !== -1) {
                    this.items[index] = movedItem;
                }
                
                // Update current item if it's the one being moved
                if (this.currentItem && this.currentItem.id === itemId) {
                    this.currentItem = movedItem;
                }
                
                this.updateGlobalState();
                
                eventBus.emit('item:moved', { item: movedItem, moveData });
                
                return movedItem;
            } else {
                throw new Error(response.message || 'Failed to move item');
            }
        } catch (error) {
            eventBus.emit('notification:error', { message: error.message });
            throw error;
        }
    }
    
    /**
     * Update item field value
     */
    async updateFieldValue(itemId, columnId, value) {
        try {
            const response = await this.makeRequest(`/items/${itemId}/fields`, {
                method: 'PATCH',
                body: JSON.stringify({ columnId, value })
            });
            
            if (response.success) {
                const updatedItem = response.data;
                
                // Update in local list
                const index = this.items.findIndex(item => item.id === itemId);
                if (index !== -1) {
                    this.items[index] = updatedItem;
                }
                
                // Update current item if it's the one being updated
                if (this.currentItem && this.currentItem.id === itemId) {
                    this.currentItem = updatedItem;
                }
                
                this.updateGlobalState();
                
                eventBus.emit('item:field_updated', { 
                    item: updatedItem, 
                    columnId, 
                    value 
                });
                
                return updatedItem;
            } else {
                throw new Error(response.message || 'Failed to update field value');
            }
        } catch (error) {
            eventBus.emit('notification:error', { message: error.message });
            throw error;
        }
    }
    
    /**
     * Add assignee to item
     */
    async addAssignee(itemId, userId) {
        try {
            const response = await this.makeRequest(`/items/${itemId}/assignees`, {
                method: 'POST',
                body: JSON.stringify({ userId })
            });
            
            if (response.success) {
                const updatedItem = response.data;
                this.updateItemInList(updatedItem);
                
                eventBus.emit('item:assignee_added', { item: updatedItem, userId });
                
                return updatedItem;
            } else {
                throw new Error(response.message || 'Failed to add assignee');
            }
        } catch (error) {
            eventBus.emit('notification:error', { message: error.message });
            throw error;
        }
    }
    
    /**
     * Remove assignee from item
     */
    async removeAssignee(itemId, userId) {
        try {
            const response = await this.makeRequest(`/items/${itemId}/assignees/${userId}`, {
                method: 'DELETE'
            });
            
            if (response.success) {
                const updatedItem = response.data;
                this.updateItemInList(updatedItem);
                
                eventBus.emit('item:assignee_removed', { item: updatedItem, userId });
                
                return updatedItem;
            } else {
                throw new Error(response.message || 'Failed to remove assignee');
            }
        } catch (error) {
            eventBus.emit('notification:error', { message: error.message });
            throw error;
        }
    }
    
    /**
     * Add comment to item
     */
    async addComment(itemId, content, parentId = null) {
        try {
            const response = await this.makeRequest(`/items/${itemId}/comments`, {
                method: 'POST',
                body: JSON.stringify({ content, parentId })
            });
            
            if (response.success) {
                const comment = response.data;
                
                eventBus.emit('item:comment_added', { itemId, comment });
                eventBus.emit('notification:success', { 
                    message: 'Comment added successfully!' 
                });
                
                return comment;
            } else {
                throw new Error(response.message || 'Failed to add comment');
            }
        } catch (error) {
            eventBus.emit('notification:error', { message: error.message });
            throw error;
        }
    }
    
    /**
     * Get comments for item
     */
    async getComments(itemId) {
        try {
            const response = await this.makeRequest(`/items/${itemId}/comments`);
            
            if (response.success) {
                const comments = response.data.comments || [];
                
                eventBus.emit('item:comments_loaded', { itemId, comments });
                
                return comments;
            } else {
                throw new Error(response.message || 'Failed to fetch comments');
            }
        } catch (error) {
            eventBus.emit('notification:error', { message: error.message });
            throw error;
        }
    }
    
    /**
     * Get activity for item
     */
    async getActivity(itemId) {
        try {
            const response = await this.makeRequest(`/items/${itemId}/activity`);
            
            if (response.success) {
                const activities = response.data.activities || [];
                
                eventBus.emit('item:activity_loaded', { itemId, activities });
                
                return activities;
            } else {
                throw new Error(response.message || 'Failed to fetch activity');
            }
        } catch (error) {
            eventBus.emit('notification:error', { message: error.message });
            throw error;
        }
    }
    
    /**
     * Search items
     */
    async searchItems(query, options = {}) {
        try {
            const queryParams = new URLSearchParams({
                q: query,
                ...options
            });
            
            const response = await this.makeRequest(`/items/search?${queryParams}`);
            
            if (response.success) {
                const results = response.data.items || [];
                
                eventBus.emit('item:search_results', { query, results, options });
                
                return results;
            } else {
                throw new Error(response.message || 'Failed to search items');
            }
        } catch (error) {
            eventBus.emit('notification:error', { message: error.message });
            throw error;
        }
    }
    
    /**
     * Get my assigned items
     */
    async getMyItems(options = {}) {
        try {
            const queryParams = new URLSearchParams(options);
            const response = await this.makeRequest(`/items/my?${queryParams}`);
            
            if (response.success) {
                const myItems = response.data.items || [];
                
                eventBus.emit('item:my_items_loaded', { items: myItems, options });
                
                return myItems;
            } else {
                throw new Error(response.message || 'Failed to fetch my items');
            }
        } catch (error) {
            eventBus.emit('notification:error', { message: error.message });
            throw error;
        }
    }
    
    /**
     * Helper method to update item in local list
     */
    updateItemInList(updatedItem) {
        const index = this.items.findIndex(item => item.id === updatedItem.id);
        if (index !== -1) {
            this.items[index] = updatedItem;
        }
        
        if (this.currentItem && this.currentItem.id === updatedItem.id) {
            this.currentItem = updatedItem;
        }
        
        this.updateGlobalState();
    }
    
    /**
     * Get field value for item
     */
    getFieldValue(item, columnId) {
        const fieldValue = item.fieldValues?.find(fv => fv.columnId === columnId);
        return fieldValue ? fieldValue.value : null;
    }
    
    /**
     * Set field value for item (local only)
     */
    setFieldValueLocal(item, columnId, value) {
        if (!item.fieldValues) {
            item.fieldValues = [];
        }
        
        const existingIndex = item.fieldValues.findIndex(fv => fv.columnId === columnId);
        
        if (existingIndex !== -1) {
            item.fieldValues[existingIndex].value = value;
            item.fieldValues[existingIndex].updatedAt = new Date().toISOString();
        } else {
            item.fieldValues.push({
                columnId,
                value,
                updatedAt: new Date().toISOString()
            });
        }
        
        return item;
    }
    
    /**
     * Validate item data
     */
    validateItemData(itemData) {
        const errors = {};
        
        if (!itemData.name || itemData.name.trim().length === 0) {
            errors.name = 'Item name is required';
        }
        
        if (itemData.name && itemData.name.length > 200) {
            errors.name = 'Item name must be less than 200 characters';
        }
        
        if (itemData.description && itemData.description.length > 2000) {
            errors.description = 'Description must be less than 2000 characters';
        }
        
        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    }
    
    /**
     * Get current item
     */
    getCurrentItem() {
        return this.currentItem;
    }
    
    /**
     * Set current item
     */
    setCurrentItem(item) {
        this.currentItem = item;
        this.updateGlobalState();
        
        if (item) {
            eventBus.emit('item:selected', { item });
        } else {
            eventBus.emit('item:deselected');
        }
    }
    
    /**
     * Clear current item
     */
    clearCurrentItem() {
        this.setCurrentItem(null);
    }
    
    /**
     * Get all items
     */
    getAllItems() {
        return this.items;
    }
    
    /**
     * Filter items by criteria
     */
    filterItems(criteria) {
        return this.items.filter(item => {
            // Filter by status
            if (criteria.status) {
                const statusValue = this.getFieldValue(item, criteria.statusColumnId);
                if (statusValue !== criteria.status) return false;
            }
            
            // Filter by priority
            if (criteria.priority) {
                const priorityValue = this.getFieldValue(item, criteria.priorityColumnId);
                if (priorityValue !== criteria.priority) return false;
            }
            
            // Filter by assignee
            if (criteria.assignee) {
                if (!item.assignees || !item.assignees.includes(criteria.assignee)) {
                    return false;
                }
            }
            
            // Filter by due date range
            if (criteria.dueDateFrom || criteria.dueDateTo) {
                const dueDateValue = this.getFieldValue(item, criteria.dueDateColumnId);
                if (!dueDateValue) return false;
                
                const dueDate = new Date(dueDateValue);
                if (criteria.dueDateFrom && dueDate < new Date(criteria.dueDateFrom)) {
                    return false;
                }
                if (criteria.dueDateTo && dueDate > new Date(criteria.dueDateTo)) {
                    return false;
                }
            }
            
            // Filter by search query
            if (criteria.query) {
                const query = criteria.query.toLowerCase();
                const nameMatch = item.name.toLowerCase().includes(query);
                const descMatch = item.description && item.description.toLowerCase().includes(query);
                if (!nameMatch && !descMatch) return false;
            }
            
            return true;
        });
    }
    
    /**
     * Sort items by criteria
     */
    sortItems(items, sortBy = 'created', sortOrder = 'desc') {
        return [...items].sort((a, b) => {
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
                    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
                    aValue = priorityOrder[a.priority] || 0;
                    bValue = priorityOrder[b.priority] || 0;
                    break;
                case 'position':
                    aValue = a.position || 0;
                    bValue = b.position || 0;
                    break;
                default:
                    return 0;
            }
            
            if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    }
    
    /**
     * Update global state
     */
    updateGlobalState() {
        state.set('item', {
            current: this.currentItem,
            list: this.items
        });
    }
    
    /**
     * Clear all items
     */
    clearItems() {
        this.items = [];
        this.currentItem = null;
        this.updateGlobalState();
    }
    
    /**
     * Cleanup resources
     */
    destroy() {
        this.clearItems();
    }
}

// Create and export singleton instance
export const itemService = new ItemService();

// Export the class for testing
export { ItemService }; 