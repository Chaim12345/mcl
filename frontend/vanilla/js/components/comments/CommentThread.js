/**
 * CommentThread Component - Manages threaded comment discussions
 */

class CommentThread {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.itemId = options.itemId || null;
        this.commentService = options.commentService || null;
        this.currentUser = options.currentUser || null;
        
        this.maxDepth = options.maxDepth || 5;
        this.showComments = options.showComments !== false;
        this.enableReplies = options.enableReplies !== false;
        this.enableEditing = options.enableEditing !== false;
        this.enableLikes = options.enableLikes !== false;
        
        this.comments = [];
        this.threadedComments = [];
        this.isLoading = false;
        this.isExpanded = true;
        
        this.replyingTo = null;
        this.editingComment = null;
        
        this.init();
    }

    init() {
        this.render();
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
    async setItem(itemId) {
        this.itemId = itemId;
        await this.loadComments();
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
            const threadedComments = await this.commentService.getThreadedComments(this.itemId);
            this.threadedComments = threadedComments;
            this.comments = this.flattenComments(threadedComments);
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
     * Flatten threaded comments into a single array
     * @param {Array} threadedComments - Threaded comment structure
     * @returns {Array} Flat array of all comments
     */
    flattenComments(threadedComments) {
        const flat = [];
        
        function flattenRecursive(comments) {
            comments.forEach(comment => {
                flat.push(comment);
                if (comment.replies && comment.replies.length > 0) {
                    flattenRecursive(comment.replies);
                }
            });
        }
        
        flattenRecursive(threadedComments);
        return flat;
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
            <div class="comment-thread">
                <div class="comment-thread-header">
                    <div class="loading-skeleton" style="width: 150px; height: 20px;"></div>
                </div>
                <div class="comment-thread-content">
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
     * Render the comment thread
     */
    render() {
        if (!this.container) return;

        const commentCount = this.getTotalCommentCount();
        
        this.container.innerHTML = `
            <div class="comment-thread">
                <div class="comment-thread-header">
                    <h3 class="comment-thread-title">
                        ${commentCount} ${commentCount === 1 ? 'comment' : 'comments'}
                    </h3>
                    <div class="comment-thread-actions">
                        ${this.renderThreadActions()}
                    </div>
                </div>
                
                ${this.renderThreadContent()}
            </div>
        `;

        this.addStyles();
        this.renderComments();
    }

    /**
     * Render thread actions
     */
    renderThreadActions() {
        return `
            <div class="thread-actions">
                ${this.comments.length > 0 ? 
                    `<button type="button" class="btn btn-sm btn-secondary thread-expand-btn" onclick="this.toggleAllReplies()">
                        ${this.isExpanded ? 'Collapse All' : 'Expand All'}
                    </button>` : ''}
                
                <button type="button" class="btn btn-sm btn-primary thread-refresh-btn" onclick="this.refreshComments()">
                    <i class="icon-refresh"></i> Refresh
                </button>
                
                ${this.enableReplies && this.currentUser ? 
                    `<button type="button" class="btn btn-sm btn-primary thread-reply-btn" onclick="this.startNewComment()">
                        <i class="icon-plus"></i> Add Comment
                    </button>` : ''}
            </div>
        `;
    }

    /**
     * Render thread content
     */
    renderThreadContent() {
        if (this.error) {
            return `
                <div class="comment-thread-error">
                    <i class="icon-error"></i>
                    <p>${this.error}</p>
                    <button type="button" class="btn btn-secondary" onclick="this.refreshComments()">
                        <i class="icon-refresh"></i> Try Again
                    </button>
                </div>
            `;
        }

        if (this.comments.length === 0) {
            return `
                <div class="comment-thread-empty">
                    <i class="icon-chat"></i>
                    <h4>No comments yet</h4>
                    <p>Be the first to share your thoughts!</p>
                    ${this.currentUser && this.enableReplies ? 
                        `<button type="button" class="btn btn-primary" onclick="this.startNewComment()">
                            Add a Comment
                        </button>` : ''}
                </div>
            `;
        }

        return `
            <div class="comment-thread-content">
                ${this.enableReplies && this.currentUser ? 
                    '<div class="comment-thread-form-container"></div>' : ''}
                <div class="comment-thread-list"></div>
            </div>
        `;
    }

    /**
     * Render comments
     */
    renderComments() {
        const listContainer = this.container.querySelector('.comment-thread-list');
        if (!listContainer) return;

        listContainer.innerHTML = '';
        
        this.threadedComments.forEach(comment => {
            this.renderCommentItem(listContainer, comment, 0);
        });
    }

    /**
     * Render individual comment item
     * @param {HTMLElement} container - Container element
     * @param {Object} comment - Comment data
     * @param {number} depth - Current depth level
     */
    renderCommentItem(container, comment, depth) {
        const commentEl = document.createElement('div');
        commentEl.className = 'comment-thread-item';
        
        new CommentItem(commentEl, comment, {
            currentUser: this.currentUser,
            depth: depth,
            maxDepth: this.maxDepth,
            enableReplies: this.enableReplies,
            enableEditing: this.enableEditing,
            enableLikes: this.enableLikes,
            onReply: this.handleReply.bind(this),
            onEdit: this.handleEdit.bind(this),
            onDelete: this.handleDelete.bind(this),
            onLike: this.handleLike.bind(this)
        });

        container.appendChild(commentEl);

        // Render replies recursively
        if (comment.replies && comment.replies.length > 0) {
            const repliesContainer = document.createElement('div');
            repliesContainer.className = 'comment-replies-container';
            comment.replies.forEach(reply => {
                this.renderCommentItem(repliesContainer, reply, depth + 1);
            });
            container.appendChild(repliesContainer);
        }
    }

    /**
     * Handle reply to comment
     * @param {Object} comment - Comment to reply to
     */
    handleReply(comment) {
        this.replyingTo = comment.id;
        this.editingComment = null;
        this.renderCommentForm();
    }

    /**
     * Handle edit comment
     * @param {Object} comment - Comment to edit
     */
    handleEdit(comment) {
        this.editingComment = comment;
        this.replyingTo = null;
        this.renderCommentForm();
    }

    /**
     * Handle delete comment
     * @param {Object} comment - Comment to delete
     */
    async handleDelete(comment) {
        if (!confirm('Are you sure you want to delete this comment?')) return;

        try {
            await this.commentService.deleteComment(comment.id);
            await this.loadComments();
        } catch (error) {
            console.error('Error deleting comment:', error);
            this.showError(error.message);
        }
    }

    /**
     * Handle like comment
     * @param {Object} comment - Comment to like
     */
    async handleLike(comment) {
        try {
            // Like/unlike implementation would go here
            console.log('Like comment:', comment.id);
        } catch (error) {
            console.error('Error liking comment:', error);
        }
    }

    /**
     * Start new comment
     */
    startNewComment() {
        this.replyingTo = null;
        this.editingComment = null;
        this.renderCommentForm();
    }

    /**
     * Render comment form
     */
    renderCommentForm() {
        const formContainer = this.container.querySelector('.comment-thread-form-container');
        if (!formContainer) return;

        const isEdit = this.editingComment !== null;
        const isReply = this.replyingTo !== null && !isEdit;

        formContainer.innerHTML = `
            <div class="comment-form-wrapper">
                <div class="comment-form-header">
                    <h4>${isEdit ? 'Edit Comment' : isReply ? 'Reply to Comment' : 'Add Comment'}</h4>
                    ${isEdit || isReply ? 
                        '<button type="button" class="btn btn-sm btn-secondary form-cancel-btn">Cancel</button>' : 
                        ''}
                </div>
                <div class="comment-form-container"></div>
            </div>
        `;

        const formContainerEl = formContainer.querySelector('.comment-form-container');
        if (formContainerEl) {
            new CommentForm(formContainerEl, {
                itemId: this.itemId,
                commentService: this.commentService,
                currentUser: this.currentUser,
                parentCommentId: this.replyingTo,
                editingCommentId: this.editingComment?.id,
                onSuccess: () => {
                    this.replyingTo = null;
                    this.editingComment = null;
                    this.loadComments();
                },
                onCancel: () => {
                    this.replyingTo = null;
                    this.editingComment = null;
                    this.renderComments();
                }
            });
        }

        // Add cancel button listener
        const cancelBtn = formContainer.querySelector('.form-cancel-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.replyingTo = null;
                this.editingComment = null;
                this.renderComments();
            });
        }
    }

    /**
     * Toggle all replies
     */
    toggleAllReplies() {
        this.isExpanded = !this.isExpanded;
        const replyContainers = this.container.querySelectorAll('.comment-replies-container');
        replyContainers.forEach(container => {
            container.style.display = this.isExpanded ? 'block' : 'none';
        });
        
        const toggleBtn = this.container.querySelector('.thread-expand-btn');
        if (toggleBtn) {
            toggleBtn.textContent = this.isExpanded ? 'Collapse All' : 'Expand All';
        }
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
        
        countRecursive(this.threadedComments);
        return count;
    }

    /**
     * Show error message
     * @param {string} message - Error message
     */
    showError(message) {
        const errorEl = this.container.querySelector('.comment-thread-error');
        if (errorEl) {
            errorEl.querySelector('p').textContent = message;
            errorEl.style.display = 'block';
        }
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
            const comment = this.findCommentInTree(event.comment.id);
            if (comment) {
                Object.assign(comment, event.comment);
                this.renderComments();
            } else {
                this.loadComments();
            }
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
     * Find comment in tree by ID
     * @param {string} commentId - Comment ID
     * @returns {Object|null} Found comment or null
     */
    findCommentInTree(commentId) {
        function findInComments(comments) {
            for (const comment of comments) {
                if (comment.id === commentId) return comment;
                if (comment.replies && comment.replies.length > 0) {
                    const found = findInComments(comment.replies);
                    if (found) return found;
                }
            }
            return null;
        }
        
        return findInComments(this.threadedComments);
    }

    /**
     * Add CSS styles
     */
    addStyles() {
        if (document.getElementById('comment-thread-styles')) return;

        const style = document.createElement('style');
        style.id = 'comment-thread-styles';
        style.textContent = `
            .comment-thread {
                background: var(--bg-primary);
                border: 1px solid var(--border-color);
                border-radius: 8px;
                overflow: hidden;
            }

            .comment-thread-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px;
                border-bottom: 1px solid var(--border-color);
                background: var(--bg-secondary);
            }

            .comment-thread-title {
                margin: 0;
                font-size: 18px;
                font-weight: 600;
                color: var(--text-primary);
            }

            .comment-thread-actions {
                display: flex;
                gap: 8px;
            }

            .thread-actions {
                display: flex;
                gap: 8px;
            }

            .comment-thread-content {
                padding: 0;
            }

            .comment-thread-empty {
                text-align: center;
                padding: 40px;
                color: var(--text-secondary);
            }

            .comment-thread-empty i {
                font-size: 48px;
                margin-bottom: 16px;
                opacity: 0.5;
            }

            .comment-thread-empty h4 {
                margin: 0 0 8px 0;
                font-size: 18px;
            }

            .comment-thread-empty p {
                margin: 0 0 16px 0;
            }

            .comment-thread-error {
                text-align: center;
                padding: 40px;
                color: var(--text-danger);
            }

            .comment-form-wrapper {
                padding: 16px;
                border-bottom: 1px solid var(--border-color);
                background: var(--bg-secondary);
            }

            .comment-form-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 16px;
            }

            .comment-form-header h4 {
                margin: 0;
                font-size: 16px;
                color: var(--text-primary);
            }

            .form-cancel-btn {
                padding: 4px 8px;
                font-size: 12px;
            }

            .comment-form-container {
                margin-top: 12px;
            }

            .comment-thread-list {
                padding: 0;
            }

            .comment-thread-item {
                border-bottom: 1px solid var(--border-color);
            }

            .comment-thread-item:last-child {
                border-bottom: none;
            }

            .comment-replies-container {
                margin-left: 44px;
                border-left: 2px solid var(--border-color);
                padding-left: 12px;
            }

            /* Loading skeletons */
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
                .comment-thread-header {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 8px;
                }

                .comment-thread-actions {
                    width: 100%;
                    justify-content: flex-end;
                }

                .thread-actions {
                    flex-direction: column;
                    width: 100%;
                }

                .comment-replies-container {
                    margin-left: 0;
                    padding-left: 0;
                    border-left: none;
                    border-top: 1px solid var(--border-color);
                    margin-top: 8px;
                    padding-top: 8px;
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * Set current user
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
    module.exports = { CommentThread };
} else {
    window.CommentThread = CommentThread;
}