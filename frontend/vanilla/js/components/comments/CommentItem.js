/**
 * CommentItem Component - Individual comment display with interactions
 */

class CommentItem {
    constructor(container, comment, options = {}) {
        this.container = typeof container === 'string' ? document.getElementById(container) : container;
        this.comment = comment;
        this.currentUser = options.currentUser || null;
        this.isEditable = options.isEditable !== false;
        this.depth = options.depth || 0;
        this.maxDepth = options.maxDepth || 5;
        
        this.onReply = options.onReply || null;
        this.onEdit = options.onEdit || null;
        this.onDelete = options.onDelete || null;
        this.onLike = options.onLike || null;
        this.onUserClick = options.onUserClick || null;
        
        this.isExpanded = true;
        this.isEditing = false;
        
        this.init();
    }

    init() {
        this.render();
        this.setupEventListeners();
    }

    setupEventListeners() {
        if (!this.container) return;

        // Reply button
        const replyBtn = this.container.querySelector('.comment-reply-btn');
        if (replyBtn) {
            replyBtn.addEventListener('click', this.handleReply.bind(this));
        }

        // Edit button
        const editBtn = this.container.querySelector('.comment-edit-btn');
        if (editBtn) {
            editBtn.addEventListener('click', this.handleEdit.bind(this));
        }

        // Delete button
        const deleteBtn = this.container.querySelector('.comment-delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', this.handleDelete.bind(this));
        }

        // Like button
        const likeBtn = this.container.querySelector('.comment-like-btn');
        if (likeBtn) {
            likeBtn.addEventListener('click', this.handleLike.bind(this));
        }

        // User avatar/name click
        const userElements = this.container.querySelectorAll('.comment-user-avatar, .comment-user-name');
        userElements.forEach(el => {
            el.addEventListener('click', this.handleUserClick.bind(this));
        });

        // Expand/collapse replies
        const toggleBtn = this.container.querySelector('.comment-toggle-replies');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', this.handleToggleReplies.bind(this));
        }
    }

    /**
     * Render the comment
     */
    render() {
        if (!this.container) return;

        const canEdit = this.canEdit();
        const canDelete = this.canDelete();
        const canReply = this.depth < this.maxDepth;
        const hasReplies = this.comment.replies && this.comment.replies.length > 0;

        this.container.innerHTML = `
            <div class="comment-item ${this.isEditing ? 'editing' : ''}" data-comment-id="${this.comment.id}">
                <div class="comment-item-avatar">
                    <img 
                        src="${this.comment.author?.avatar || '/assets/default-avatar.png'}" 
                        alt="${this.comment.author?.name || 'User'}" 
                        class="comment-user-avatar"
                    >
                </div>
                
                <div class="comment-item-content">
                    <div class="comment-item-header">
                        <div class="comment-user-info">
                            <span class="comment-user-name">${this.comment.author?.name || 'Anonymous'}</span>
                            ${this.renderUserBadge()}
                        </div>
                        
                        <div class="comment-timestamp">
                            <time datetime="${this.comment.createdAt}" title="${this.formatFullDate(this.comment.createdAt)}">
                                ${this.formatTimeAgo(this.comment.createdAt)}
                            </time>
                            ${this.comment.updatedAt !== this.comment.createdAt ? 
                                `<span class="comment-edited">(edited)</span>` : ''}
                        </div>
                    </div>
                    
                    <div class="comment-item-body">
                        ${this.isEditing ? this.renderEditForm() : this.renderContent()}
                    </div>
                    
                    <div class="comment-item-actions">
                        ${this.renderActions(hasReplies, canReply, canEdit, canDelete)}
                    </div>
                    
                    ${hasReplies ? this.renderReplies() : ''}
                </div>
            </div>
        `;

        this.addStyles();
    }

    /**
     * Render user badge (role, etc.)
     */
    renderUserBadge() {
        const role = this.comment.author?.role;
        if (!role || role === 'member') return '';
        
        const badgeClass = `badge badge-${role}`;
        const badgeText = role.charAt(0).toUpperCase() + role.slice(1);
        
        return `<span class="${badgeClass}">${badgeText}</span>`;
    }

    /**
     * Render comment content
     */
    renderContent() {
        const content = this.comment.content || '';
        
        // Basic HTML sanitization and formatting
        const sanitized = this.sanitizeContent(content);
        const formatted = this.formatContent(sanitized);
        
        return `
            <div class="comment-text">${formatted}</div>
            ${this.comment.attachments && this.comment.attachments.length > 0 ? 
                this.renderAttachments() : ''}
        `;
    }

    /**
     * Render edit form
     */
    renderEditForm() {
        return `
            <div class="comment-edit-form">
                <textarea class="comment-edit-textarea" rows="3">${this.comment.content || ''}</textarea>
                <div class="comment-edit-actions">
                    <button type="button" class="btn btn-sm btn-primary comment-save-edit">Save</button>
                    <button type="button" class="btn btn-sm btn-secondary comment-cancel-edit">Cancel</button>
                </div>
            </div>
        `;
    }

    /**
     * Render comment attachments
     */
    renderAttachments() {
        return `
            <div class="comment-attachments">
                ${this.comment.attachments.map(attachment => `
                    <div class="comment-attachment">
                        <i class="icon-attachment"></i>
                        <a href="${attachment.url}" target="_blank" class="attachment-link">
                            ${attachment.name}
                        </a>
                    </div>
                `).join('')}
            </div>
        `;
    }

    /**
     * Render comment actions
     */
    renderActions(hasReplies, canReply, canEdit, canDelete) {
        const replyCount = hasReplies ? this.comment.replies.length : 0;
        
        return `
            <div class="comment-actions">
                ${this.renderLikeButton()}
                
                ${canReply ? 
                    `<button type="button" class="btn btn-link comment-reply-btn">
                        <i class="icon-reply"></i> Reply ${replyCount > 0 ? `(${replyCount})` : ''}
                    </button>` : ''}
                
                ${hasReplies && replyCount > 0 ? 
                    `<button type="button" class="btn btn-link comment-toggle-replies">
                        <i class="icon-chevron-${this.isExpanded ? 'up' : 'down'}"></i>
                        ${this.isExpanded ? 'Hide' : 'Show'} ${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}
                    </button>` : ''}
                
                ${canEdit ? 
                    `<button type="button" class="btn btn-link comment-edit-btn">
                        <i class="icon-edit"></i> Edit
                    </button>` : ''}
                
                ${canDelete ? 
                    `<button type="button" class="btn btn-link comment-delete-btn text-danger">
                        <i class="icon-delete"></i> Delete
                    </button>` : ''}
            </div>
        `;
    }

    /**
     * Render like button
     */
    renderLikeButton() {
        const isLiked = this.comment.likes?.includes(this.currentUser?.id);
        const likeCount = this.comment.likes?.length || 0;
        
        return `
            <button type="button" class="btn btn-link comment-like-btn ${isLiked ? 'liked' : ''}">
                <i class="icon-heart${isLiked ? '-filled' : ''}"></i>
                ${likeCount > 0 ? likeCount : 'Like'}
            </button>
        `;
    }

    /**
     * Render replies
     */
    renderReplies() {
        if (!this.comment.replies || this.comment.replies.length === 0) return '';

        return `
            <div class="comment-replies ${!this.isExpanded ? 'collapsed' : ''}">
                ${this.comment.replies.map(reply => `
                    <div class="comment-reply">
                        ${new CommentItem(
                            document.createElement('div'), 
                            reply, 
                            {
                                currentUser: this.currentUser,
                                isEditable: this.isEditable,
                                depth: this.depth + 1,
                                maxDepth: this.maxDepth,
                                onReply: this.onReply,
                                onEdit: this.onEdit,
                                onDelete: this.onDelete,
                                onLike: this.onLike,
                                onUserClick: this.onUserClick
                            }
                        ).container.outerHTML}
                    </div>
                `).join('')}
            </div>
        `;
    }

    /**
     * Sanitize content
     */
    sanitizeContent(content) {
        // Basic HTML sanitization
        return content
            .replace(/&/g, '&')
            .replace(/</g, '<')
            .replace(/>/g, '>')
            .replace(/"/g, '"')
            .replace(/'/g, '&#x27;');
    }

    /**
     * Format content with mentions and links
     */
    formatContent(content) {
        // Convert newlines to <br>
        let formatted = content.replace(/\n/g, '<br>');
        
        // Format mentions (@username)
        formatted = formatted.replace(/@(\w+(?:\s+\w+)*)/g, '<span class="mention">@$1</span>');
        
        // Format URLs
        formatted = formatted.replace(
            /(https?:\/\/[^\s]+)/g, 
            '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
        );
        
        return formatted;
    }

    /**
     * Format relative time
     */
    formatTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        
        const seconds = Math.floor(diffMs / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) {
            return days === 1 ? '1 day ago' : `${days} days ago`;
        } else if (hours > 0) {
            return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
        } else if (minutes > 0) {
            return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
        } else {
            return 'just now';
        }
    }

    /**
     * Format full date
     */
    formatFullDate(dateString) {
        return new Date(dateString).toLocaleString();
    }

    /**
     * Check if current user can edit this comment
     */
    canEdit() {
        if (!this.currentUser || !this.comment.author) return false;
        return this.comment.author.id === this.currentUser.id || 
               this.currentUser.role === 'admin' || 
               this.currentUser.role === 'moderator';
    }

    /**
     * Check if current user can delete this comment
     */
    canDelete() {
        return this.canEdit(); // Same permissions for now
    }

    /**
     * Handle reply action
     */
    handleReply() {
        if (this.onReply) {
            this.onReply(this.comment);
        }
    }

    /**
     * Handle edit action
     */
    handleEdit() {
        if (this.onEdit) {
            this.onEdit(this.comment);
        }
    }

    /**
     * Handle delete action
     */
    handleDelete() {
        if (this.onDelete) {
            this.onDelete(this.comment);
        } else {
            // Default delete confirmation
            if (confirm('Are you sure you want to delete this comment?')) {
                // Call delete API
            }
        }
    }

    /**
     * Handle like action
     */
    handleLike() {
        if (this.onLike) {
            this.onLike(this.comment);
        }
    }

    /**
     * Handle user click
     */
    handleUserClick(e) {
        e.preventDefault();
        if (this.onUserClick) {
            this.onUserClick(this.comment.author);
        }
    }

    /**
     * Handle toggle replies
     */
    handleToggleReplies() {
        this.isExpanded = !this.isExpanded;
        const repliesEl = this.container.querySelector('.comment-replies');
        if (repliesEl) {
            repliesEl.classList.toggle('collapsed', !this.isExpanded);
        }
        
        const toggleBtn = this.container.querySelector('.comment-toggle-replies');
        if (toggleBtn) {
            const replyCount = this.comment.replies?.length || 0;
            toggleBtn.innerHTML = `
                <i class="icon-chevron-${this.isExpanded ? 'up' : 'down'}"></i>
                ${this.isExpanded ? 'Hide' : 'Show'} ${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}
            `;
        }
    }

    /**
     * Update the comment data
     * @param {Object} comment - Updated comment data
     */
    updateComment(comment) {
        this.comment = comment;
        this.render();
    }

    /**
     * Add CSS styles
     */
    addStyles() {
        if (document.getElementById('comment-item-styles')) return;

        const style = document.createElement('style');
        style.id = 'comment-item-styles';
        style.textContent = `
            .comment-item {
                display: flex;
                gap: 12px;
                padding: 12px;
                border-bottom: 1px solid var(--border-color);
                transition: background-color 0.2s;
            }

            .comment-item:hover {
                background-color: var(--bg-secondary);
            }

            .comment-item.editing {
                background-color: var(--bg-secondary);
            }

            .comment-item-avatar {
                flex-shrink: 0;
            }

            .comment-user-avatar {
                width: 32px;
                height: 32px;
                border-radius: 50%;
                object-fit: cover;
                cursor: pointer;
            }

            .comment-item-content {
                flex: 1;
                min-width: 0;
            }

            .comment-item-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 4px;
                flex-wrap: wrap;
            }

            .comment-user-info {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 14px;
            }

            .comment-user-name {
                font-weight: 600;
                color: var(--text-primary);
                cursor: pointer;
            }

            .comment-user-name:hover {
                text-decoration: underline;
            }

            .badge {
                padding: 2px 6px;
                border-radius: 10px;
                font-size: 11px;
                font-weight: 500;
            }

            .badge-admin {
                background: var(--color-danger);
                color: white;
            }

            .badge-moderator {
                background: var(--color-warning);
                color: white;
            }

            .comment-timestamp {
                font-size: 12px;
                color: var(--text-secondary);
                display: flex;
                align-items: center;
                gap: 4px;
            }

            .comment-edited {
                font-style: italic;
                opacity: 0.7;
            }

            .comment-item-body {
                margin-bottom: 8px;
            }

            .comment-text {
                color: var(--text-primary);
                line-height: 1.5;
                font-size: 14px;
            }

            .mention {
                color: var(--color-primary);
                font-weight: 600;
            }

            .comment-attachments {
                margin-top: 8px;
            }

            .comment-attachment {
                display: flex;
                align-items: center;
                gap: 4px;
                font-size: 12px;
            }

            .attachment-link {
                color: var(--color-primary);
                text-decoration: none;
            }

            .attachment-link:hover {
                text-decoration: underline;
            }

            .comment-edit-form {
                margin-top: 8px;
            }

            .comment-edit-textarea {
                width: 100%;
                min-height: 60px;
                padding: 8px;
                border: 1px solid var(--border-color);
                border-radius: 4px;
                font-family: inherit;
                font-size: 14px;
                resize: vertical;
            }

            .comment-edit-actions {
                display: flex;
                gap: 8px;
                margin-top: 8px;
            }

            .comment-item-actions {
                display: flex;
                gap: 12px;
                align-items: center;
                flex-wrap: wrap;
            }

            .comment-actions {
                display: flex;
                gap: 8px;
                align-items: center;
            }

            .comment-actions .btn {
                padding: 4px 8px;
                font-size: 12px;
            }

            .comment-like-btn.liked {
                color: var(--color-danger);
            }

            .comment-replies {
                margin-top: 12px;
                border-left: 2px solid var(--border-color);
                padding-left: 12px;
            }

            .comment-replies.collapsed {
                display: none;
            }

            .comment-reply {
                margin-bottom: 8px;
            }

            .comment-reply:last-child {
                margin-bottom: 0;
            }

            /* Responsive */
            @media (max-width: 768px) {
                .comment-item {
                    flex-direction: column;
                    gap: 8px;
                }

                .comment-item-avatar {
                    align-self: flex-start;
                }

                .comment-item-header {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 4px;
                }

                .comment-timestamp {
                    align-self: flex-start;
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * Destroy the component
     */
    destroy() {
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CommentItem };
} else {
    window.CommentItem = CommentItem;
}