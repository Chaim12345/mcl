/**
 * CommentForm Component - Form for creating and editing comments
 */

class CommentForm {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.itemId = options.itemId || null;
        this.commentService = options.commentService || null;
        this.currentUser = options.currentUser || null;
        this.parentCommentId = options.parentCommentId || null;
        this.editingCommentId = options.editingCommentId || null;
        
        this.onSubmit = options.onSubmit || null;
        this.onCancel = options.onCancel || null;
        this.onSuccess = options.onSuccess || null;
        this.onError = options.onError || null;
        
        this.isSubmitting = false;
        this.mentionSuggestions = [];
        this.showMentions = false;
        
        this.init();
    }

    init() {
        this.render();
        this.setupEventListeners();
        this.setupMentions();
    }

    setupEventListeners() {
        if (!this.container) return;

        // Form submission
        this.container.addEventListener('submit', this.handleSubmit.bind(this));
        
        // Cancel button
        this.container.addEventListener('click', (e) => {
            if (e.target.classList.contains('comment-form-cancel')) {
                this.handleCancel();
            }
        });

        // Text input for mentions
        const textarea = this.container.querySelector('.comment-textarea');
        if (textarea) {
            textarea.addEventListener('input', this.handleTextInput.bind(this));
            textarea.addEventListener('keydown', this.handleKeyDown.bind(this));
        }

        // Mention selection
        this.container.addEventListener('click', (e) => {
            if (e.target.classList.contains('mention-suggestion')) {
                this.handleMentionSelect(e.target.dataset.userId, e.target.dataset.userName);
            }
        });

        // Close mentions on outside click
        document.addEventListener('click', (e) => {
            if (!this.container.contains(e.target)) {
                this.hideMentions();
            }
        });
    }

    setupMentions() {
        this.mentionSuggestions = [];
        this.showMentions = false;
    }

    /**
     * Set the item ID for the comment
     * @param {string} itemId - The item ID
     */
    setItem(itemId) {
        this.itemId = itemId;
    }

    /**
     * Set the comment to edit
     * @param {Object} comment - Comment to edit
     */
    setEditComment(comment) {
        this.editingCommentId = comment.id;
        this.itemId = comment.itemId;
        
        const textarea = this.container.querySelector('.comment-textarea');
        if (textarea) {
            textarea.value = comment.content || '';
            textarea.focus();
        }
        
        this.updateFormTitle('Edit Comment');
    }

    /**
     * Set parent comment for reply
     * @param {string} parentCommentId - Parent comment ID
     */
    setReplyTo(parentCommentId) {
        this.parentCommentId = parentCommentId;
        this.updateFormTitle('Reply to Comment');
    }

    /**
     * Update form title
     * @param {string} title - New title
     */
    updateFormTitle(title) {
        const titleEl = this.container.querySelector('.comment-form-title');
        if (titleEl) {
            titleEl.textContent = title;
        }
    }

    /**
     * Reset the form
     */
    reset() {
        this.editingCommentId = null;
        this.parentCommentId = null;
        
        const textarea = this.container.querySelector('.comment-textarea');
        if (textarea) {
            textarea.value = '';
        }
        
        this.updateFormTitle('Add Comment');
        this.hideMentions();
    }

    /**
     * Handle form submission
     * @param {Event} e - Submit event
     */
    async handleSubmit(e) {
        e.preventDefault();
        
        if (!this.itemId || !this.commentService || this.isSubmitting) {
            return;
        }

        const textarea = this.container.querySelector('.comment-textarea');
        const content = textarea ? textarea.value.trim() : '';
        
        if (!content) {
            this.showError('Please enter a comment');
            return;
        }

        this.setSubmitting(true);
        this.clearError();

        try {
            let result;
            const commentData = {
                content,
                mentions: this.extractMentions(content)
            };

            if (this.editingCommentId) {
                // Update existing comment
                result = await this.commentService.updateComment(this.editingCommentId, commentData);
            } else {
                // Create new comment
                if (this.parentCommentId) {
                    commentData.parentId = this.parentCommentId;
                }
                result = await this.commentService.createComment(this.itemId, commentData);
            }

            this.reset();
            this.hideMentions();
            
            if (this.onSuccess) {
                this.onSuccess(result);
            }

        } catch (error) {
            console.error('Error submitting comment:', error);
            this.showError(error.message || 'Failed to submit comment');
            
            if (this.onError) {
                this.onError(error);
            }
        } finally {
            this.setSubmitting(false);
        }
    }

    /**
     * Handle cancel action
     */
    handleCancel() {
        this.reset();
        this.hideMentions();
        
        if (this.onCancel) {
            this.onCancel();
        }
    }

    /**
     * Handle text input for mentions
     * @param {Event} e - Input event
     */
    handleTextInput(e) {
        const text = e.target.value;
        const cursorPos = e.target.selectionStart;
        
        // Find @ symbol before cursor
        const textBeforeCursor = text.substring(0, cursorPos);
        const lastAtIndex = textBeforeCursor.lastIndexOf('@');
        
        if (lastAtIndex !== -1 && cursorPos > lastAtIndex) {
            const searchText = textBeforeCursor.substring(lastAtIndex + 1);
            
            // Check if there's no space after @
            if (!searchText.includes(' ')) {
                this.showMentionSuggestions(searchText);
            } else {
                this.hideMentions();
            }
        } else {
            this.hideMentions();
        }
    }

    /**
     * Handle keyboard navigation for mentions
     * @param {Event} e - Keydown event
     */
    handleKeyDown(e) {
        const suggestionsContainer = this.container.querySelector('.mention-suggestions');
        if (!suggestionsContainer || suggestionsContainer.style.display === 'none') {
            return;
        }

        const suggestions = suggestionsContainer.querySelectorAll('.mention-suggestion');
        const activeSuggestion = suggestionsContainer.querySelector('.mention-suggestion.active');
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.navigateMentionSuggestion(1);
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.navigateMentionSuggestion(-1);
                break;
            case 'Enter':
            case 'Tab':
                if (activeSuggestion) {
                    e.preventDefault();
                    this.handleMentionSelect(
                        activeSuggestion.dataset.userId,
                        activeSuggestion.dataset.userName
                    );
                }
                break;
            case 'Escape':
                this.hideMentions();
                break;
        }
    }

    /**
     * Show mention suggestions
     * @param {string} searchText - Search query
     */
    async showMentionSuggestions(searchText) {
        if (!searchText.trim()) {
            this.mentionSuggestions = [];
            this.hideMentions();
            return;
        }

        try {
            // Mock user search - in real app, this would call API
            const users = await this.searchUsers(searchText);
            this.mentionSuggestions = users;
            this.renderMentionSuggestions();
        } catch (error) {
            console.error('Error searching users:', error);
            this.hideMentions();
        }
    }

    /**
     * Search users for mentions
     * @param {string} searchText - Search query
     * @returns {Promise<Array>} User suggestions
     */
    async searchUsers(searchText) {
        // Mock implementation - replace with real API call
        const mockUsers = [
            { id: '1', name: 'John Doe', email: 'john@example.com' },
            { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
            { id: '3', name: 'Bob Johnson', email: 'bob@example.com' }
        ];
        
        return mockUsers.filter(user => 
            user.name.toLowerCase().includes(searchText.toLowerCase()) ||
            user.email.toLowerCase().includes(searchText.toLowerCase())
        );
    }

    /**
     * Render mention suggestions
     */
    renderMentionSuggestions() {
        const container = this.container.querySelector('.mention-suggestions');
        if (!container) return;

        if (this.mentionSuggestions.length === 0) {
            container.style.display = 'none';
            return;
        }

        container.innerHTML = this.mentionSuggestions.map((user, index) => `
            <div class="mention-suggestion ${index === 0 ? 'active' : ''}" 
                 data-user-id="${user.id}" 
                 data-user-name="${user.name}">
                <div class="mention-avatar">
                    <img src="/assets/default-avatar.png" alt="${user.name}">
                </div>
                <div class="mention-info">
                    <div class="mention-name">${user.name}</div>
                    <div class="mention-email">${user.email}</div>
                </div>
            </div>
        `).join('');

        container.style.display = 'block';
    }

    /**
     * Navigate mention suggestions
     * @param {number} direction - 1 for down, -1 for up
     */
    navigateMentionSuggestion(direction) {
        const suggestions = this.container.querySelectorAll('.mention-suggestion');
        const active = this.container.querySelector('.mention-suggestion.active');
        
        let newIndex = 0;
        if (active) {
            const currentIndex = Array.from(suggestions).indexOf(active);
            newIndex = Math.max(0, Math.min(suggestions.length - 1, currentIndex + direction));
        }
        
        suggestions.forEach((s, i) => {
            s.classList.toggle('active', i === newIndex);
        });
        
        // Scroll into view
        const newActive = suggestions[newIndex];
        if (newActive) {
            newActive.scrollIntoView({ block: 'nearest' });
        }
    }

    /**
     * Handle mention selection
     * @param {string} userId - User ID
     * @param {string} userName - User name
     */
    handleMentionSelect(userId, userName) {
        const textarea = this.container.querySelector('.comment-textarea');
        if (!textarea) return;

        const text = textarea.value;
        const cursorPos = textarea.selectionStart;
        
        // Find @ symbol before cursor
        const textBeforeCursor = text.substring(0, cursorPos);
        const lastAtIndex = textBeforeCursor.lastIndexOf('@');
        
        if (lastAtIndex !== -1) {
            const beforeAt = text.substring(0, lastAtIndex);
            const afterCursor = text.substring(cursorPos);
            
            // Replace @mention with @userName
            const newText = `${beforeAt}@${userName} ${afterCursor}`;
            textarea.value = newText;
            
            // Set cursor position after mention
            const newCursorPos = lastAtIndex + userName.length + 2;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
            
            textarea.focus();
        }

        this.hideMentions();
    }

    /**
     * Hide mention suggestions
     */
    hideMentions() {
        const container = this.container.querySelector('.mention-suggestions');
        if (container) {
            container.style.display = 'none';
        }
        this.mentionSuggestions = [];
    }

    /**
     * Extract mentions from text
     * @param {string} text - Comment text
     * @returns {Array} Array of mentioned user IDs
     */
    extractMentions(text) {
        const mentionRegex = /@(\w+(?:\s+\w+)*)/g;
        const mentions = [];
        let match;
        
        while ((match = mentionRegex.exec(text)) !== null) {
            // In real app, this would map names to user IDs
            mentions.push(match[1]);
        }
        
        return mentions;
    }

    /**
     * Set submitting state
     * @param {boolean} submitting - Submitting state
     */
    setSubmitting(submitting) {
        this.isSubmitting = submitting;
        
        const submitBtn = this.container.querySelector('.comment-form-submit');
        const cancelBtn = this.container.querySelector('.comment-form-cancel');
        
        if (submitBtn) {
            submitBtn.disabled = submitting;
            submitBtn.innerHTML = submitting 
                ? '<i class="icon-loading"></i> Submitting...' 
                : (this.editingCommentId ? 'Update' : 'Submit');
        }
        
        if (cancelBtn) {
            cancelBtn.disabled = submitting;
        }
        
        const textarea = this.container.querySelector('.comment-textarea');
        if (textarea) {
            textarea.disabled = submitting;
        }
    }

    /**
     * Show error message
     * @param {string} message - Error message
     */
    showError(message) {
        const errorEl = this.container.querySelector('.comment-form-error');
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.style.display = 'block';
        }
    }

    /**
     * Clear error message
     */
    clearError() {
        const errorEl = this.container.querySelector('.comment-form-error');
        if (errorEl) {
            errorEl.textContent = '';
            errorEl.style.display = 'none';
        }
    }

    /**
     * Render the form
     */
    render() {
        if (!this.container) return;

        const isEdit = !!this.editingCommentId;
        const isReply = !!this.parentCommentId;
        const title = isEdit ? 'Edit Comment' : (isReply ? 'Reply to Comment' : 'Add Comment');
        
        this.container.innerHTML = `
            <div class="comment-form">
                <div class="comment-form-header">
                    <h3 class="comment-form-title">${title}</h3>
                </div>
                
                <form class="comment-form-form">
                    <div class="comment-form-field">
                        <textarea 
                            class="comment-textarea" 
                            placeholder="${isReply ? 'Write a reply...' : 'Write a comment...'}"
                            rows="3"
                            required
                        ></textarea>
                        <div class="mention-suggestions"></div>
                    </div>
                    
                    ${this.renderFormattingToolbar()}
                    
                    <div class="comment-form-error" style="display: none;"></div>
                    
                    <div class="comment-form-actions">
                        ${isEdit || isReply ? 
                            '<button type="button" class="btn btn-secondary comment-form-cancel">Cancel</button>' : 
                            ''}
                        <button type="submit" class="btn btn-primary comment-form-submit">
                            ${isEdit ? 'Update' : 'Submit'}
                        </button>
                    </div>
                </form>
            </div>
        `;

        this.addStyles();
    }

    /**
     * Render formatting toolbar
     */
    renderFormattingToolbar() {
        return `
            <div class="comment-form-toolbar">
                <div class="toolbar-group">
                    <button type="button" class="toolbar-btn" title="Bold" data-format="bold">
                        <i class="icon-bold"></i>
                    </button>
                    <button type="button" class="toolbar-btn" title="Italic" data-format="italic">
                        <i class="icon-italic"></i>
                    </button>
                    <button type="button" class="toolbar-btn" title="Code" data-format="code">
                        <i class="icon-code"></i>
                    </button>
                </div>
                <div class="toolbar-group">
                    <button type="button" class="toolbar-btn" title="Mention user" data-format="mention">
                        <i class="icon-at"></i>
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Add CSS styles
     */
    addStyles() {
        if (document.getElementById('comment-form-styles')) return;

        const style = document.createElement('style');
        style.id = 'comment-form-styles';
        style.textContent = `
            .comment-form {
                background: var(--bg-primary);
                border: 1px solid var(--border-color);
                border-radius: 8px;
                padding: 16px;
                margin-bottom: 16px;
            }

            .comment-form-header {
                margin-bottom: 16px;
            }

            .comment-form-title {
                margin: 0;
                font-size: 16px;
                font-weight: 600;
                color: var(--text-primary);
            }

            .comment-form-form {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .comment-form-field {
                position: relative;
            }

            .comment-textarea {
                width: 100%;
                min-height: 80px;
                padding: 12px;
                border: 1px solid var(--border-color);
                border-radius: 6px;
                font-family: inherit;
                font-size: 14px;
                line-height: 1.5;
                resize: vertical;
                background: var(--bg-primary);
                color: var(--text-primary);
            }

            .comment-textarea:focus {
                outline: none;
                border-color: var(--color-primary);
                box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
            }

            .comment-textarea:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }

            .mention-suggestions {
                position: absolute;
                top: 100%;
                left: 0;
                right: 0;
                background: var(--bg-primary);
                border: 1px solid var(--border-color);
                border-radius: 6px;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                max-height: 200px;
                overflow-y: auto;
                z-index: 1000;
                display: none;
            }

            .mention-suggestion {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 12px;
                cursor: pointer;
                border-bottom: 1px solid var(--border-color);
            }

            .mention-suggestion:last-child {
                border-bottom: none;
            }

            .mention-suggestion:hover,
            .mention-suggestion.active {
                background: var(--bg-secondary);
            }

            .mention-avatar img {
                width: 24px;
                height: 24px;
                border-radius: 50%;
            }

            .mention-info {
                flex: 1;
                min-width: 0;
            }

            .mention-name {
                font-weight: 600;
                font-size: 14px;
                color: var(--text-primary);
            }

            .mention-email {
                font-size: 12px;
                color: var(--text-secondary);
            }

            .comment-form-toolbar {
                display: flex;
                gap: 8px;
                padding: 8px 0;
                border-bottom: 1px solid var(--border-color);
            }

            .toolbar-group {
                display: flex;
                gap: 4px;
                border-right: 1px solid var(--border-color);
                padding-right: 8px;
                margin-right: 8px;
            }

            .toolbar-group:last-child {
                border-right: none;
                padding-right: 0;
                margin-right: 0;
            }

            .toolbar-btn {
                padding: 4px 8px;
                border: none;
                background: none;
                color: var(--text-secondary);
                cursor: pointer;
                border-radius: 4px;
            }

            .toolbar-btn:hover {
                background: var(--bg-secondary);
                color: var(--text-primary);
            }

            .comment-form-error {
                color: var(--text-danger);
                font-size: 14px;
                margin: 0;
            }

            .comment-form-actions {
                display: flex;
                gap: 8px;
                justify-content: flex-end;
            }

            /* Responsive */
            @media (max-width: 768px) {
                .comment-form {
                    padding: 12px;
                }

                .comment-form-actions {
                    flex-direction: column;
                }

                .comment-form-actions .btn {
                    width: 100%;
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
    }

    /**
     * Destroy the component
     */
    destroy() {
        if (this.container) {
            this.container.innerHTML = '';
        }
        this.hideMentions();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CommentForm };
} else {
    window.CommentForm = CommentForm;
}