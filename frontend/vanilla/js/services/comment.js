/**
 * Comment Service - Handles API interactions and real-time updates for comments
 */

class CommentService {
    constructor(websocketService) {
        this.comments = [];
        this.itemComments = new Map(); // Map<itemId, comments[]>
        this.websocketService = websocketService;
        this.initializeWebSocketListeners();
    }

    /**
     * Initialize WebSocket event listeners for real-time comment updates
     */
    initializeWebSocketListeners() {
        if (!window.eventBus) return;

        // Listen for comment updates via WebSocket
        window.eventBus.on('websocket:comment_update', (data) => {
            const { action, payload } = data;
            this.handleCommentUpdate(action, payload);
        });

        // Also listen for comment events via the generic comment:* pattern
        window.eventBus.on('comment:update', (data) => {
            const { action, payload } = data;
            this.handleCommentUpdate(action, payload);
        });
    }

    /**
     * Make authenticated API requests
     */
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

    /**
     * Get comments for a specific item
     * @param {string} itemId - The item ID
     * @returns {Promise<Array>} Array of comments
     */
    async getItemComments(itemId) {
        try {
            const response = await this.makeRequest(`/items/${itemId}/comments`);
            const comments = response.data.comments || [];
            
            // Store comments in memory
            this.itemComments.set(itemId, comments);
            
            // Subscribe to comment updates via WebSocket
            this.websocketService?.subscribe(`item:${itemId}`);
            
            window.eventBus?.emit('comment:list_updated', { comments, itemId });
            return comments;
        } catch (error) {
            window.eventBus?.emit('notification:error', { message: error.message });
            throw error;
        }
    }

    /**
     * Get threaded comments for an item
     * @param {string} itemId - The item ID
     * @returns {Promise<Array>} Array of threaded comments
     */
    async getThreadedComments(itemId) {
        try {
            const response = await this.makeRequest(`/items/${itemId}/comments/threaded`);
            const threadedComments = response.data.comments || [];
            
            // Flatten and store all comments from threaded structure
            const allComments = this.flattenThreadedComments(threadedComments);
            this.itemComments.set(itemId, allComments);
            
            window.eventBus?.emit('comment:threaded_updated', { threadedComments, itemId });
            return threadedComments;
        } catch (error) {
            window.eventBus?.emit('notification:error', { message: error.message });
            throw error;
        }
    }

    /**
     * Create a new comment
     * @param {string} itemId - The item ID
     * @param {Object} commentData - Comment data
     * @returns {Promise<Object>} Created comment
     */
    async createComment(itemId, commentData) {
        try {
            const response = await this.makeRequest(`/items/${itemId}/comments`, {
                method: 'POST',
                body: commentData
            });

            const newComment = response.data;
            
            // Add to memory
            const comments = this.itemComments.get(itemId) || [];
            comments.push(newComment);
            this.itemComments.set(itemId, comments);
            
            // Emit events
            window.eventBus?.emit('comment:created', { comment: newComment, itemId });
            
            return newComment;
        } catch (error) {
            window.eventBus?.emit('notification:error', { message: error.message });
            throw error;
        }
    }

    /**
     * Update an existing comment
     * @param {string} commentId - The comment ID
     * @param {Object} updateData - Updated comment data
     * @returns {Promise<Object>} Updated comment
     */
    async updateComment(commentId, updateData) {
        try {
            const response = await this.makeRequest(`/comments/${commentId}`, {
                method: 'PUT',
                body: updateData
            });

            const updatedComment = response.data;
            
            // Update in memory
            const itemId = updatedComment.itemId;
            if (this.itemComments.has(itemId)) {
                const comments = this.itemComments.get(itemId);
                const index = comments.findIndex(c => c.id === commentId);
                if (index !== -1) {
                    comments[index] = updatedComment;
                }
            }
            
            window.eventBus?.emit('comment:updated', { comment: updatedComment });
            
            return updatedComment;
        } catch (error) {
            window.eventBus?.emit('notification:error', { message: error.message });
            throw error;
        }
    }

    /**
     * Delete a comment
     * @param {string} commentId - The comment ID
     * @returns {Promise<boolean>} Success status
     */
    async deleteComment(commentId) {
        try {
            // Get comment first to find itemId
            const comment = this.findCommentById(commentId);
            if (!comment) {
                throw new Error('Comment not found');
            }

            await this.makeRequest(`/comments/${commentId}`, {
                method: 'DELETE'
            });

            // Remove from memory
            const itemId = comment.itemId;
            if (this.itemComments.has(itemId)) {
                const comments = this.itemComments.get(itemId);
                const filteredComments = comments.filter(c => c.id !== commentId);
                this.itemComments.set(itemId, filteredComments);
            }
            
            window.eventBus?.emit('comment:deleted', { commentId, itemId });
            
            return true;
        } catch (error) {
            window.eventBus?.emit('notification:error', { message: error.message });
            throw error;
        }
    }

    /**
     * Reply to a comment
     * @param {string} itemId - The item ID
     * @param {string} parentCommentId - The parent comment ID
     * @param {Object} replyData - Reply data
     * @returns {Promise<Object>} Created reply
     */
    async replyToComment(itemId, parentCommentId, replyData) {
        try {
            const response = await this.makeRequest(`/items/${itemId}/comments`, {
                method: 'POST',
                body: {
                    ...replyData,
                    parentId: parentCommentId
                }
            });

            const replyComment = response.data;
            
            // Add to memory
            const comments = this.itemComments.get(itemId) || [];
            comments.push(replyComment);
            this.itemComments.set(itemId, comments);
            
            window.eventBus?.emit('comment:reply_created', { 
                reply: replyComment, 
                parentId: parentCommentId,
                itemId 
            });
            
            return replyComment;
        } catch (error) {
            window.eventBus?.emit('notification:error', { message: error.message });
            throw error;
        }
    }

    /**
     * Get comments by user ID
     * @param {string} userId - The user ID
     * @returns {Promise<Array>} User's comments
     */
    async getUserComments(userId) {
        try {
            const response = await this.makeRequest(`/users/${userId}/comments`);
            return response.data.comments || [];
        } catch (error) {
            window.eventBus?.emit('notification:error', { message: error.message });
            throw error;
        }
    }

    /**
     * Handle real-time comment updates from WebSocket
     * @param {string} action - Update action
     * @param {Object} payload - Update payload
     */
    handleCommentUpdate(action, payload) {
        if (!payload) return;

        const { comment, itemId } = payload;
        if (!comment || !itemId) return;

        switch (action) {
            case 'created':
                this.handleCommentCreated(comment, itemId);
                break;
            case 'updated':
                this.handleCommentUpdated(comment);
                break;
            case 'deleted':
                this.handleCommentDeleted(comment);
                break;
        }
    }

    /**
     * Handle comment created via WebSocket
     */
    handleCommentCreated(comment, itemId) {
        const comments = this.itemComments.get(itemId) || [];
        if (!comments.find(c => c.id === comment.id)) {
            comments.push(comment);
            this.itemComments.set(itemId, comments);
            
            window.eventBus?.emit('comment:created', { 
                comment, 
                itemId, 
                source: 'websocket' 
            });
        }
    }

    /**
     * Handle comment updated via WebSocket
     */
    handleCommentUpdated(comment) {
        const itemId = comment.itemId;
        if (this.itemComments.has(itemId)) {
            const comments = this.itemComments.get(itemId);
            const index = comments.findIndex(c => c.id === comment.id);
            if (index !== -1) {
                comments[index] = comment;
                window.eventBus?.emit('comment:updated', { 
                    comment, 
                    source: 'websocket' 
                });
            }
        }
    }

    /**
     * Handle comment deleted via WebSocket
     */
    handleCommentDeleted(comment) {
        const itemId = comment.itemId;
        if (this.itemComments.has(itemId)) {
            const comments = this.itemComments.get(itemId);
            const filteredComments = comments.filter(c => c.id !== comment.id);
            this.itemComments.set(itemId, filteredComments);
            
            window.eventBus?.emit('comment:deleted', { 
                commentId: comment.id, 
                itemId, 
                source: 'websocket' 
            });
        }
    }

    /**
     * Find a comment by ID in memory
     * @param {string} commentId - The comment ID
     * @returns {Object|null} Found comment or null
     */
    findCommentById(commentId) {
        for (const [itemId, comments] of this.itemComments) {
            const comment = comments.find(c => c.id === commentId);
            if (comment) return comment;
        }
        return null;
    }

    /**
     * Flatten threaded comments into a flat array
     * @param {Array} threadedComments - Array of threaded comments
     * @returns {Array} Flat array of all comments
     */
    flattenThreadedComments(threadedComments) {
        const flattened = [];
        
        function flattenRecursive(comments) {
            comments.forEach(comment => {
                flattened.push(comment);
                if (comment.replies && comment.replies.length > 0) {
                    flattenRecursive(comment.replies);
                }
            });
        }
        
        flattenRecursive(threadedComments);
        return flattened;
    }

    /**
     * Get comments for an item from memory
     * @param {string} itemId - The item ID
     * @returns {Array} Comments for the item
     */
    getCommentsForItem(itemId) {
        return this.itemComments.get(itemId) || [];
    }

    /**
     * Clear comments for an item
     * @param {string} itemId - The item ID
     */
    clearCommentsForItem(itemId) {
        this.itemComments.delete(itemId);
    }

    /**
     * Subscribe to comment updates for an item
     * @param {string} itemId - The item ID
     */
    subscribeToItemComments(itemId) {
        this.websocketService?.subscribe(`item:${itemId}`);
    }

    /**
     * Unsubscribe from comment updates for an item
     * @param {string} itemId - The item ID
     */
    unsubscribeFromItemComments(itemId) {
        this.websocketService?.unsubscribe(`item:${itemId}`);
    }

    /**
     * Get comment count for an item
     * @param {string} itemId - The item ID
     * @returns {number} Number of comments
     */
    getCommentCount(itemId) {
        return this.getCommentsForItem(itemId).length;
    }

    /**
     * Get comment count including replies
     * @param {string} itemId - The item ID
     * @returns {number} Total comment count including replies
     */
    getTotalCommentCount(itemId) {
        const comments = this.getCommentsForItem(itemId);
        let total = comments.length;
        
        comments.forEach(comment => {
            if (comment.replies && comment.replies.length > 0) {
                total += comment.replies.length;
            }
        });
        
        return total;
    }

    /**
     * Cleanup resources
     */
    destroy() {
        this.comments = [];
        this.itemComments.clear();
    }
}

// Create singleton instance
let commentServiceInstance = null;

const createCommentService = (websocketService) => {
    if (!commentServiceInstance) {
        commentServiceInstance = new CommentService(websocketService);
    }
    return commentServiceInstance;
};

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CommentService, createCommentService };
} else {
    window.CommentService = CommentService;
    window.createCommentService = createCommentService;
}