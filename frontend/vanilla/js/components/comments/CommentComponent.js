import { Component } from '../base/Component.js';

export class CommentComponent extends Component {
    constructor(container, options = {}) {
        super(container);
        this.options = {
            itemId: null,
            currentUser: null,
            allowReplies: true,
            allowMentions: true,
            maxDepth: 3,
            ...options
        };
        
        this.comments = [];
        this.isLoading = false;
        this.newCommentText = '';
        this.replyingTo = null;
        this.editingComment = null;
    }

    async render() {
        this.container.innerHTML = `
            <div class="comments-section">
                <div class="comments-header">
                    <h3>Comments</h3>
                    <span class="comments-count">${this.comments.length}</span>
                </div>
                
                <div class="new-comment-form">
                    <div class="comment-input-container">
                        <div class="user-avatar">
                            ${this.getUserAvatar(this.options.currentUser)}
                        </div>
                        <div class="comment-input-wrapper">
                            <textarea 
                                id="new-comment-input"
                                class="comment-input" 
                                placeholder="Write a comment..."
                                rows="2"
                            ></textarea>
                            <div class="comment-actions">
                                <button class="btn btn-sm btn-secondary cancel-comment-btn" style="display: none;">Cancel</button>
                                <button class="btn btn-sm btn-primary post-comment-btn" disabled>Post</button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="comments-list">
                    ${this.isLoading ? this.renderLoading() : this.renderComments()}
                </div>
            </div>
        `;
        
        this.attachEventListeners();
        await this.loadComments();
    }

    renderComments() {
        if (this.comments.length === 0) {
            return `
                <div class="empty-comments">
                    <p>No comments yet. Be the first to comment!</p>
                </div>
            `;
        }
        
        return this.comments
            .filter(comment => !comment.parentId)
            .map(comment => this.renderComment(comment))
            .join('');
    }

    renderComment(comment, depth = 0) {
        const hasReplies = this.comments.some(c => c.parentId === comment.id);
        const replies = this.comments.filter(c => c.parentId === comment.id);
        const canReply = this.options.allowReplies && depth < this.options.maxDepth;
        const isEditing = this.editingComment === comment.id;
        const isCurrentUser = this.options.currentUser?.id === comment.userId;
        
        return `
            <div class="comment-item" data-comment-id="${comment.id}" style="margin-left: ${depth * 20}px;">
                <div class="comment-content">
                    <div class="comment-header">
                        <div class="user-info">
                            <div class="user-avatar">
                                ${this.getUserAvatar(comment.user)}
                            </div>
                            <div class="user-details">
                                <span class="user-name">${this.escapeHtml(comment.user?.name || 'Unknown User')}</span>
                                <span class="comment-time">${this.formatTimeAgo(comment.createdAt)}</span>
                            </div>
                        </div>
                        <div class="comment-menu">
                            <button class="btn btn-xs btn-ghost comment-menu-btn">⋯</button>
                            <div class="comment-menu-dropdown" style="display: none;">
                                ${canReply ? '<button class="reply-btn">Reply</button>' : ''}
                                ${isCurrentUser ? '<button class="edit-btn">Edit</button>' : ''}
                                ${isCurrentUser ? '<button class="delete-btn">Delete</button>' : ''}
                                <button class="report-btn">Report</button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="comment-body">
                        ${isEditing ? this.renderEditForm(comment) : this.renderCommentText(comment.text)}
                    </div>
                    
                    <div class="comment-actions">
                        ${canReply ? `<button class="btn btn-xs btn-ghost reply-comment-btn" data-comment-id="${comment.id}">Reply</button>` : ''}
                        <button class="btn btn-xs btn-ghost like-comment-btn" data-comment-id="${comment.id}">
                            ${comment.liked ? '❤️' : '🤍'} ${comment.likesCount || 0}
                        </button>
                    </div>
                </div>
                
                ${this.replyingTo === comment.id ? this.renderReplyForm(comment.id) : ''}
                
                ${hasReplies ? `
                    <div class="comment-replies">
                        ${replies.map(reply => this.renderComment(reply, depth + 1)).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderCommentText(text) {
        // Process mentions and formatting
        let processedText = this.escapeHtml(text);
        
        // Convert mentions (@username) to clickable links
        if (this.options.allowMentions) {
            processedText = processedText.replace(
                /@(\w+)/g, 
                '<span class="mention" data-user="$1">@$1</span>'
            );
        }
        
        // Convert URLs to links
        processedText = processedText.replace(
            /(https?:\/\/[^\s]+)/g,
            '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
        );
        
        // Convert line breaks
        processedText = processedText.replace(/\n/g, '<br>');
        
        return `<div class="comment-text">${processedText}</div>`;
    }

    renderEditForm(comment) {
        return `
            <div class="edit-comment-form">
                <textarea class="comment-input edit-comment-input" rows="3">${this.escapeHtml(comment.text)}</textarea>
                <div class="comment-actions">
                    <button class="btn btn-sm btn-secondary cancel-edit-btn">Cancel</button>
                    <button class="btn btn-sm btn-primary save-edit-btn" data-comment-id="${comment.id}">Save</button>
                </div>
            </div>
        `;
    }

    renderReplyForm(parentId) {
        return `
            <div class="reply-comment-form" data-parent-id="${parentId}">
                <div class="comment-input-container">
                    <div class="user-avatar">
                        ${this.getUserAvatar(this.options.currentUser)}
                    </div>
                    <div class="comment-input-wrapper">
                        <textarea class="comment-input reply-comment-input" placeholder="Write a reply..." rows="2"></textarea>
                        <div class="comment-actions">
                            <button class="btn btn-sm btn-secondary cancel-reply-btn">Cancel</button>
                            <button class="btn btn-sm btn-primary post-reply-btn" data-parent-id="${parentId}">Reply</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderLoading() {
        return `
            <div class="comments-loading">
                <div class="loading-spinner"></div>
                <p>Loading comments...</p>
            </div>
        `;
    }

    getUserAvatar(user) {
        if (!user) return '<div class="avatar-placeholder">?</div>';
        
        if (user.avatar) {
            return `<img src="${user.avatar}" alt="${user.name}" class="avatar-image">`;
        } else {
            const initial = (user.name || 'U').charAt(0).toUpperCase();
            return `<div class="avatar-placeholder">${initial}</div>`;
        }
    }

    formatTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) return 'just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
        
        return date.toLocaleDateString();
    }

    attachEventListeners() {
        const container = this.container;
        
        // New comment input
        const newCommentInput = container.querySelector('#new-comment-input');
        const postCommentBtn = container.querySelector('.post-comment-btn');
        
        newCommentInput?.addEventListener('input', (e) => {
            this.newCommentText = e.target.value.trim();
            postCommentBtn.disabled = !this.newCommentText;
            
            // Auto-expand textarea
            e.target.style.height = 'auto';
            e.target.style.height = e.target.scrollHeight + 'px';
        });
        
        postCommentBtn?.addEventListener('click', () => {
            this.postComment(this.newCommentText);
        });
        
        // Reply buttons
        container.querySelectorAll('.reply-comment-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const commentId = e.target.dataset.commentId;
                this.showReplyForm(commentId);
            });
        });
        
        // Like buttons
        container.querySelectorAll('.like-comment-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const commentId = e.target.dataset.commentId;
                this.toggleLike(commentId);
            });
        });
        
        // Comment menu buttons
        container.querySelectorAll('.comment-menu-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.toggleCommentMenu(e.target);
            });
        });
        
        // Edit and delete buttons
        container.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const commentId = e.target.closest('.comment-item').dataset.commentId;
                this.startEditing(commentId);
            });
        });
        
        container.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const commentId = e.target.closest('.comment-item').dataset.commentId;
                this.deleteComment(commentId);
            });
        });
        
        // Cancel buttons
        container.querySelectorAll('.cancel-reply-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.cancelReply();
            });
        });
        
        container.querySelectorAll('.cancel-edit-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.cancelEdit();
            });
        });
        
        // Save edit button
        container.querySelectorAll('.save-edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const commentId = e.target.dataset.commentId;
                const newText = e.target.closest('.edit-comment-form').querySelector('.edit-comment-input').value.trim();
                this.saveEdit(commentId, newText);
            });
        });
        
        // Post reply button
        container.querySelectorAll('.post-reply-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const parentId = e.target.dataset.parentId;
                const replyText = e.target.closest('.reply-comment-form').querySelector('.reply-comment-input').value.trim();
                this.postReply(parentId, replyText);
            });
        });
        
        // Mention clicks
        container.querySelectorAll('.mention').forEach(mention => {
            mention.addEventListener('click', (e) => {
                const username = e.target.dataset.user;
                this.handleMentionClick(username);
            });
        });
    }

    async loadComments() {
        if (!this.options.itemId) return;
        
        this.isLoading = true;
        this.render();
        
        try {
            // Mock API call - replace with actual API
            const response = await fetch(`/api/items/${this.options.itemId}/comments`);
            if (response.ok) {
                this.comments = await response.json();
            } else {
                // Mock data for development
                this.comments = this.getMockComments();
            }
        } catch (error) {
            console.error('Error loading comments:', error);
            this.comments = this.getMockComments();
        } finally {
            this.isLoading = false;
            this.render();
        }
    }

    getMockComments() {
        return [
            {
                id: '1',
                text: 'This looks great! Really like the new design approach.',
                userId: 'user1',
                user: { id: 'user1', name: 'John Doe', avatar: null },
                createdAt: new Date(Date.now() - 3600000).toISOString(),
                likesCount: 2,
                liked: false,
                parentId: null
            },
            {
                id: '2',
                text: 'Thanks @john! I worked hard on getting the colors right.',
                userId: 'user2',
                user: { id: 'user2', name: 'Jane Smith', avatar: null },
                createdAt: new Date(Date.now() - 1800000).toISOString(),
                likesCount: 1,
                liked: true,
                parentId: '1'
            },
            {
                id: '3',
                text: 'Can we schedule a review meeting for this? I have some feedback to share.',
                userId: 'user3',
                user: { id: 'user3', name: 'Mike Johnson', avatar: null },
                createdAt: new Date(Date.now() - 900000).toISOString(),
                likesCount: 0,
                liked: false,
                parentId: null
            }
        ];
    }

    async postComment(text) {
        if (!text.trim()) return;
        
        try {
            // Mock API call
            const newComment = {
                id: Date.now().toString(),
                text: text.trim(),
                userId: this.options.currentUser?.id || 'current-user',
                user: this.options.currentUser || { id: 'current-user', name: 'You' },
                createdAt: new Date().toISOString(),
                likesCount: 0,
                liked: false,
                parentId: null
            };
            
            this.comments.push(newComment);
            this.newCommentText = '';
            this.render();
            
            this.emit('comment:posted', { comment: newComment });
        } catch (error) {
            console.error('Error posting comment:', error);
        }
    }

    async postReply(parentId, text) {
        if (!text.trim()) return;
        
        try {
            const newReply = {
                id: Date.now().toString(),
                text: text.trim(),
                userId: this.options.currentUser?.id || 'current-user',
                user: this.options.currentUser || { id: 'current-user', name: 'You' },
                createdAt: new Date().toISOString(),
                likesCount: 0,
                liked: false,
                parentId: parentId
            };
            
            this.comments.push(newReply);
            this.replyingTo = null;
            this.render();
            
            this.emit('comment:replied', { comment: newReply, parentId });
        } catch (error) {
            console.error('Error posting reply:', error);
        }
    }

    showReplyForm(commentId) {
        this.replyingTo = commentId;
        this.render();
    }

    cancelReply() {
        this.replyingTo = null;
        this.render();
    }

    startEditing(commentId) {
        this.editingComment = commentId;
        this.render();
    }

    cancelEdit() {
        this.editingComment = null;
        this.render();
    }

    async saveEdit(commentId, newText) {
        if (!newText.trim()) return;
        
        try {
            const comment = this.comments.find(c => c.id === commentId);
            if (comment) {
                comment.text = newText.trim();
                comment.updatedAt = new Date().toISOString();
            }
            
            this.editingComment = null;
            this.render();
            
            this.emit('comment:edited', { commentId, newText });
        } catch (error) {
            console.error('Error saving edit:', error);
        }
    }

    async deleteComment(commentId) {
        if (!confirm('Are you sure you want to delete this comment?')) return;
        
        try {
            this.comments = this.comments.filter(c => c.id !== commentId && c.parentId !== commentId);
            this.render();
            
            this.emit('comment:deleted', { commentId });
        } catch (error) {
            console.error('Error deleting comment:', error);
        }
    }

    async toggleLike(commentId) {
        try {
            const comment = this.comments.find(c => c.id === commentId);
            if (comment) {
                comment.liked = !comment.liked;
                comment.likesCount = Math.max(0, comment.likesCount + (comment.liked ? 1 : -1));
            }
            
            this.render();
            
            this.emit('comment:liked', { commentId, liked: comment.liked });
        } catch (error) {
            console.error('Error toggling like:', error);
        }
    }

    toggleCommentMenu(btn) {
        const dropdown = btn.nextElementSibling;
        const isVisible = dropdown.style.display !== 'none';
        
        // Close all other dropdowns
        this.container.querySelectorAll('.comment-menu-dropdown').forEach(d => {
            d.style.display = 'none';
        });
        
        // Toggle current dropdown
        dropdown.style.display = isVisible ? 'none' : 'block';
    }

    handleMentionClick(username) {
        this.emit('mention:clicked', { username });
    }

    // Public methods
    addComment(comment) {
        this.comments.push(comment);
        this.render();
    }

    updateComment(commentId, updates) {
        const comment = this.comments.find(c => c.id === commentId);
        if (comment) {
            Object.assign(comment, updates);
            this.render();
        }
    }

    removeComment(commentId) {
        this.comments = this.comments.filter(c => c.id !== commentId && c.parentId !== commentId);
        this.render();
    }

    getComments() {
        return this.comments;
    }

    getCommentsCount() {
        return this.comments.length;
    }
}