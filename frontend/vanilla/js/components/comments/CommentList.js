/**
 * CommentList Component - Displays a list of comments for an item
 */

class CommentList {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.itemId = options.itemId || null;
        this.commentService = options.commentService || null;
        this.currentUser = options.currentUser || null;
        this.isEditable = options.isEditable !== false;
        this.showThreaded = options.showThreaded !== false;
        this.onCommentClick = options.onCommentClick || null;
        this.onReplyClick = options.onReplyClick || null;
        this.onEditClick = options.onEditClick || null;
        this.onDeleteClick = options.onDeleteClick || null;
        
        this.comments = [];
        this.isLoading = false;
        this.error = null;
        
        this.init();
    }

    init() {
        this.renderSkeleton();
        this.setupEventListeners();
    }

    setupEventListeners() {
        if (window.eventBus) {
            window.eventBus.on('comment:created', this.handleCommentCreated.bind(this));
            window.eventBus.on('comment:updated', this.handleCommentUpdated.bind(this));
            window.eventBus.on('comment:deleted', this.handleCommentDeleted.bind(this));
            window.eventBus.on('comment:reply_created', this.handleReplyCreated.bind(this));
        }
    }

    /**
     * Set the item ID and load comments
     * @param {string} itemId - The item ID
     */
    setItem(itemId) {
        this.itemId = itemId;
        this.loadComments();
    }

    /**
     * Load comments for the current item
     */
    async loadComments() {
        if (!this.itemId || !this.commentService) {
            this.showError('No item selected or comment service not available');
            return;
        }

        this.setLoading(true);
        this.error = null;

        try {
            let comments;
            if (this.showThreaded) {
                comments = await this.commentService.getThreadedComments(this.itemId);
            } else {
                const flatComments = await this.commentService.getItemComments(this.itemId);
                comments = this.organizeCommentsIntoThreads(flatComments);
            }
            
            this.comments = comments;
            this.render();
        } catch (error) {
            console.error('Error loading comments:', error);
            this.error = error.message;
            this.showError(error.message);
        } finally {
            this.setLoading(false);
        }
    }

    /**
     * Organize flat comments into threaded structure
     * @param {Array} comments - Flat array of comments
     * @returns {Array} Threaded comments
     */
    organizeCommentsIntoThreads(comments) {
        const commentMap = new Map();
        const rootComments = [];

        // Create map of all comments
        comments.forEach(comment => {
            comment.replies = [];
            commentMap.set(comment.id, comment);
        });

        // Organize into threads
        comments.forEach(comment => {
            if (comment.parentId && commentMap.has(comment.parentId)) {
                const parent = commentMap.get(comment.parentId);
                parent.replies.push(comment);
            } else {
                rootComments.push(comment);
            }
        });

        return rootComments;
    }

    /**
     * Set loading state
     * @param {boolean} isLoading - Loading state
     */
    setLoading(isLoading) {
        this.isLoading = isLoading;
        if (isLoading) {
            this.renderSkeleton();
        } else {
            this.render();
        }
    }

    /**
     * Render skeleton loading state
     */
    renderSkeleton() {
        if (!this.container) return;

        this.container.innerHTML = `
            <div class="comment-list">
                <div class="comment-list-header">
                    <h3 class="comment-list-title">
                        <span class="loading-skeleton" style="width: 120px; height: 20px;"></span>
                    </h3>
                    <div class="comment-list-actions">
                        <span class="loading-skeleton" style="width: 100px; height: 32px;"></span>
                    </div>
                </div>
                <div class="comment-list-content">
                    ${this.renderCommentSkeletons()}
                </div>
            </div>
        `;
    }

    /**
     * Render comment skeletons
     */
    renderCommentSkeletons() {
        return Array(3).fill(0).map(() => `
            <div class="comment-skeleton">
                <div class="comment-avatar-skeleton"></div>
                <div class="comment-content-skeleton">
                    <div class="comment-header-skeleton">
                        <span class="loading-skeleton" style="width: 100px; height: 16px;"></span>
                        <span class="loading-skeleton" style="width: 80px; height: 14px;"></span>
                    </div>
                    <div class="comment-text-skeleton">
                        <span class="loading-skeleton" style="width: 100%; height: 14px;"></span>
                        <span class="loading-skeleton" style="width: 80%; height: 14px;"></span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    /**
     * Render the comment list
     */
    render() {
        if (!this.container) return;

        if (this.error) {
            this.showError(this.error);
            return;
        }

        const commentCount = this.getTotalCommentCount();
        
        this.container.innerHTML = `
            <div class="comment-list">
                <div class="comment-list-header">
                    <h3 class="comment-list-title">
                        ${commentCount} ${commentCount === 1 ? 'comment' : 'comments'}
                    </h3>
                    <div class="comment-list-actions">
                        <button class="btn btn-secondary btn-sm" onclick="this.refreshComments()">
                            <i class="icon-refresh"></i> Refresh
                        </button>
                    </div>
                </div>
                
                ${this.renderCommentList()}
            </div>
        `;

        // Add CSS styles
        this.addStyles();
    }

    /**
     * Render the comment list content
     */
    renderCommentList() {
        if (this.comments.length === 0) {
            return `
                <div class="comment-list-empty">
                    <i class="icon-chat"></i>
                    <p>No comments yet. Be the first to comment!</p>
                </div>
            `;
        }

        return `
            <div class="comment-list-content">
                ${this.comments.map(comment => this.renderComment(comment)).join('')}
            </div>
        `;
    }

    /**
     * Render a single comment
     * @param {Object} comment - Comment data
     * @param {number} depth - Nesting depth
     * @returns {string} HTML string
     */
    renderComment(comment, depth = 0) {
        const marginLeft = depth > 0 ? `${Math.min(depth * 20, 60)}px` : '0';
        
        return `
            <div class="comment" data-comment-id="${comment.id}" style="margin-left: ${marginLeft}">
                <div class="comment-avatar">
                    <img src="${comment.author?.avatar || '/assets/default-avatar.png'}" 
                         alt="${comment.author?.name || 'User'}" 
                         class="avatar">
                </div>
                <div class="comment-content">
                    <div class="comment-header">
                        <span class="comment-author">${comment.author?.name || 'Anonymous'}</span>
                        <span class="comment-time" title="${comment.createdAt}">
                            ${this.formatTimeAgo(comment.createdAt)}
                        </span>
                        ${this.renderCommentActions(comment)}
                    </div>
                    <div class="comment-text">${this.renderCommentText(comment.content)}</div>
                    
                    ${comment.replies && comment.replies.length > 0 ? 
                        `<div class="comment-replies">
                            ${comment.replies.map(reply => this.renderComment(reply, depth + 1)).join('')}
                        </div>` : 
                        ''}
                </div>
            </div>
        `;
    }

    /**
     * Render comment actions
     * @param {Object} comment - Comment data
     * @returns {string} HTML string
     */
    renderCommentActions(comment) {
        if (!this.isEditable || !this.currentUser) return '';

        const isAuthor = comment.author?.id === this.currentUser.id;
        const canEdit = isAuthor || this.currentUser.role === 'admin';
        const canDelete = isAuthor || this.currentUser.role === 'admin';
        
        return `
            <div class="comment-actions">
                ${this.onReplyClick ? 
                    `<button class="btn btn-link btn-sm" onclick="this.handleReply('${comment.id}')">
                        <i class="icon-reply"></i> Reply
                    </button>` : ''}
                
                ${canEdit && this.onEditClick ? 
                    `<button class="btn btn-link btn-sm" onclick="this.handleEdit('${comment.id}')">
                        <i class="icon-edit"></i> Edit
                    </button>` : ''}
                
                ${canDelete && this.onDeleteClick ? 
                    `<button class="btn btn-link btn-sm text-danger" onclick="this.handleDelete('${comment.id}')">
                        <i class="icon-delete"></i> Delete
                    </button>` : ''}
            </div>
        `;
    }

    /**
     * Render comment text with basic formatting
     * @param {string} text - Raw comment text
     * @returns {string} Formatted text
     */
    renderCommentText(text) {
        if (!text) return '';
        
        // Basic HTML escaping
        const escaped = text
            .replace(/&/g, '&')
            .replace(/</g, '<')
            .replace(/>/g, '>')
            .replace(/"/g, '"')
            .replace(/'/g, '&#x27;');
        
        // Convert newlines to <br>
        return escaped.replace(/\n/g, '<br>');
    }

    /**
     * Format time ago
     * @param {string} dateString - ISO date string
     * @returns {string} Formatted time
     */
    formatTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return date.toLocaleDateString();
    }

    /**
     * Get total comment count including replies
     * @returns {number} Total comment count
     */
    getTotalCommentCount() {
        let count = 0;
        
        function countRecursive(comments) {
            comments.forEach(comment => {
                count++;
                if (comment.replies && comment.replies.length > 0) {
                    countRecursive(comment.replies);
                }
            });
        }
        
        countRecursive(this.comments);
        return count;
    }

    /**
     * Refresh comments
     */
    async refreshComments() {
        await this.loadComments();
    }

    /**
     * Handle comment created event
     * @param {Object} event - Event data
     */
    handleCommentCreated(event) {
        if (event.itemId === this.itemId) {
            this.loadComments();
        }
    }

    /**
     * Handle comment updated event
     * @param {Object} event - Event data
     */
    handleCommentUpdated(event) {
        if (event.comment && event.comment.itemId === this.itemId) {
            this.loadComments();
        }
    }

    /**
     * Handle comment deleted event
     * @param {Object} event - Event data
     */
    handleCommentDeleted(event) {
        if (event.itemId === this.itemId) {
            this.loadComments();
        }
    }

    /**
     * Handle reply created event
     * @param {Object} event - Event data
     */
    handleReplyCreated(event) {
        if (event.itemId === this.itemId) {
            this.loadComments();
        }
    }

    /**
     * Handle reply button click
     * @param {string} commentId - Comment ID
     */
    handleReply(commentId) {
        if (this.onReplyClick) {
            this.onReplyClick(commentId);
        }
    }

    /**
     * Handle edit button click
     * @param {string} commentId - Comment ID
     */
    handleEdit(commentId) {
        if (this.onEditClick) {
            this.onEditClick(commentId);
        }
    }

    /**
     * Handle delete button click
     * @param {string} commentId - Comment ID
     */
    handleDelete(commentId) {
        if (this.onDeleteClick) {
            this.onDeleteClick(commentId);
        }
    }

    /**
     * Show error message
     * @param {string} message - Error message
     */
    showError(message) {
        if (!this.container) return;
        
        this.container.innerHTML = `
            <div class="comment-list">
                <div class="comment-list-error">
                    <i class="icon-error"></i>
                    <p>${message}</p>
                    <button class="btn btn-secondary" onclick="this.refreshComments()">
                        <i class="icon-refresh"></i> Try Again
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Add CSS styles
     */
    addStyles() {
        if (document.getElementById('comment-list-styles')) return;

        const style = document.createElement('style');
        style.id = 'comment-list-styles';
        style.textContent = `
            .comment-list {
                background: var(--bg-primary);
                border-radius: 8px;
                overflow: hidden;
            }

            .comment-list-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px;
                border-bottom: 1px solid var(--border-color);
            }

            .comment-list-title {
                margin: 0;
                font-size: 18px;
                font-weight: 600;
                color: var(--text-primary);
            }

            .comment-list-actions {
                display: flex;
                gap: 8px;
            }

            .comment-list-content {
                padding: 0;
            }

            .comment-list-empty {
                text-align: center;
                padding: 40px;
                color: var(--text-secondary);
            }

            .comment-list-empty i {
                font-size: 48px;
                margin-bottom: 16px;
                opacity: 0.5;
            }

            .comment-list-error {
                text-align: center;
                padding: 40px;
                color: var(--text-danger);
            }

            .comment {
                display: flex;
                gap: 12px;
                padding: 16px;
                border-bottom: 1px solid var(--border-color);
            }

            .comment:last-child {
                border-bottom: none;
            }

            .comment-avatar {
                flex-shrink: 0;
            }

            .comment-avatar img {
                width: 32px;
                height: 32px;
                border-radius: 50%;
                object-fit: cover;
            }

            .comment-content {
                flex: 1;
                min-width: 0;
            }

            .comment-header {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 4px;
                flex-wrap: wrap;
            }

            .comment-author {
                font-weight: 600;
                color: var(--text-primary);
            }

            .comment-time {
                font-size: 12px;
                color: var(--text-secondary);
            }

            .comment-actions {
                display: flex;
                gap: 8px;
                margin-left: auto;
            }

            .comment-text {
                color: var(--text-primary);
                line-height: 1.5;
            }

            .comment-replies {
                margin-top: 12px;
            }

            /* Loading skeletons */
            .comment-skeleton {
                display: flex;
                gap: 12px;
                padding: 16px;
                border-bottom: 1px solid var(--border-color);
            }

            .comment-avatar-skeleton {
                width: 32px;
                height: 32px;
                border-radius: 50%;
                background: var(--bg-secondary);
            }

            .comment-content-skeleton {
                flex: 1;
            }

            .comment-header-skeleton {
                display: flex;
                gap: 8px;
                margin-bottom: 8px;
            }

            .comment-text-skeleton {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }

            .loading-skeleton {
                background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                background-size: 200% 100%;
                animation: loading 1.5s infinite;
                border-radius: 4px;
            }

            @keyframes loading {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
            }

            /* Responsive */
            @media (max-width: 768px) {
                .comment-list-header {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 8px;
                }

                .comment {
                    padding: 12px;
                }

                .comment-actions {
                    flex-direction: column;
                    gap: 4px;
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * Update current user
     * @param {Object} user - Current user data
     */
    setCurrentUser(user) {
        this.currentUser = user;
        this.render();
    }

    /**
     * Destroy the component
     */
    destroy() {
        if (window.eventBus) {
            window.eventBus.off('comment:created', this.handleCommentCreated.bind(this));
            window.eventBus.off('comment:updated', this.handleCommentUpdated.bind(this));
            window.eventBus.off('comment:deleted', this.handleCommentDeleted.bind(this));
            window.eventBus.off('comment:reply_created', this.handleReplyCreated.bind(this));
        }
        
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CommentList };
} else {
    window.CommentList = CommentList;
}