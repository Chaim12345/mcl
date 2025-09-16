/**
 * CommentsIntegration - Utility for integrating comments with BoardView and ItemDetail
 */

class CommentsIntegration {
    constructor(options = {}) {
        this.commentService = options.commentService || window.commentService;
        this.currentUser = options.currentUser || null;
        this.container = options.container || document.body;
        
        this.activeThreads = new Map(); // Map<itemId, CommentThread>
        this.isInitialized = false;
    }

    /**
     * Initialize comments integration
     */
    async initialize() {
        if (!this.commentService) {
            console.error('Comment service not available');
            return;
        }

        this.isInitialized = true;
        this.setupEventListeners();
    }

    /**
     * Setup event listeners for item selection
     */
    setupEventListeners() {
        if (!window.eventBus) return;

        // Listen for item selection events
        window.eventBus.on('item:selected', (data) => {
            if (data.item) {
                this.showCommentsForItem(data.item.id, data.item);
            }
        });

        // Listen for item deselection events
        window.eventBus.on('item:deselected', () => {
            this.hideComments();
        });

        // Listen for modal/drawer close events
        window.eventBus.on('modal:closed', () => {
            this.hideComments();
        });

        // Listen for board changes
        window.eventBus.on('board:selected', () => {
            this.hideComments();
        });
    }

    /**
     * Show comments for a specific item
     * @param {string} itemId - The item ID
     * @param {Object} itemData - Additional item data
     * @param {Object} options - Display options
     */
    showCommentsForItem(itemId, itemData = {}, options = {}) {
        if (!this.isInitialized) {
            console.error('Comments integration not initialized');
            return;
        }

        // Remove existing comment containers
        this.hideComments();

        // Create container for comments
        const containerId = `comments-container-${itemId}`;
        let container = document.getElementById(containerId);

        if (!container) {
            container = this.createCommentsContainer(containerId, itemData, options);
        }

        // Create comment thread
        const threadOptions = {
            itemId: itemId,
            commentService: this.commentService,
            currentUser: this.currentUser,
            maxDepth: options.maxDepth || 3,
            enableReplies: options.enableReplies !== false,
            enableEditing: options.enableEditing !== false,
            enableLikes: options.enableLikes !== false,
            ...options
        };

        const commentThread = new CommentThread(containerId, threadOptions);
        this.activeThreads.set(itemId, commentThread);

        // Load comments
        commentThread.setItem(itemId);

        return commentThread;
    }

    /**
     * Create comments container
     * @param {string} containerId - Container ID
     * @param {Object} itemData - Item data
     * @param {Object} options - Display options
     * @returns {HTMLElement} Created container
     */
    createCommentsContainer(containerId, itemData, options) {
        const container = document.createElement('div');
        container.id = containerId;
        container.className = 'comments-integration-container';

        // Determine placement based on context
        const placement = options.placement || 'sidebar';
        
        switch (placement) {
            case 'sidebar':
                this.placeInSidebar(container, itemData);
                break;
            case 'modal':
                this.placeInModal(container, itemData);
                break;
            case 'drawer':
                this.placeInDrawer(container, itemData);
                break;
            case 'inline':
                this.placeInline(container, itemData, options.targetElement);
                break;
            default:
                this.placeInSidebar(container, itemData);
        }

        return container;
    }

    /**
     * Place comments in sidebar
     * @param {HTMLElement} container - Container element
     * @param {Object} itemData - Item data
     */
    placeInSidebar(container, itemData) {
        container.style.cssText = `
            position: fixed;
            top: 0;
            right: 0;
            width: 400px;
            height: 100vh;
            background: var(--bg-primary);
            border-left: 1px solid var(--border-color);
            box-shadow: -2px 0 8px rgba(0,0,0,0.1);
            z-index: 1000;
            overflow-y: auto;
            transition: transform 0.3s ease;
        `;
        
        // Add header
        const header = document.createElement('div');
        header.className = 'comments-sidebar-header';
        header.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px; border-bottom: 1px solid var(--border-color);">
                <h3 style="margin: 0; font-size: 16px;">Comments - ${itemData.title || 'Item'}</h3>
                <button class="btn btn-sm btn-secondary" onclick="window.commentsIntegration.hideComments()">
                    <i class="icon-close"></i>
                </button>
            </div>
        `;
        
        container.appendChild(header);
        
        // Add close button functionality
        const closeBtn = header.querySelector('.btn');
        closeBtn.addEventListener('click', () => this.hideComments());
        
        document.body.appendChild(container);
    }

    /**
     * Place comments in modal
     * @param {HTMLElement} container - Container element
     * @param {Object} itemData - Item data
     */
    placeInModal(container, itemData) {
        container.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 90%;
            max-width: 600px;
            max-height: 80vh;
            background: var(--bg-primary);
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            z-index: 1001;
            overflow: hidden;
        `;

        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 1000;
        `;
        overlay.addEventListener('click', () => this.hideComments());

        // Add header
        const header = document.createElement('div');
        header.className = 'comments-modal-header';
        header.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px; border-bottom: 1px solid var(--border-color);">
                <h3 style="margin: 0; font-size: 18px;">Comments</h3>
                <button class="btn btn-sm btn-secondary" onclick="window.commentsIntegration.hideComments()">
                    <i class="icon-close"></i>
                </button>
            </div>
        `;
        
        container.appendChild(header);
        document.body.appendChild(overlay);
        document.body.appendChild(container);
    }

    /**
     * Place comments inline with target element
     * @param {HTMLElement} container - Container element
     * @param {Object} itemData - Item data
     * @param {HTMLElement} targetElement - Target element
     */
    placeInline(container, itemData, targetElement) {
        if (!targetElement) {
            document.body.appendChild(container);
            return;
        }

        container.style.cssText = `
            margin: 16px 0;
            border: 1px solid var(--border-color);
            border-radius: 8px;
            background: var(--bg-primary);
        `;

        const wrapper = document.createElement('div');
        wrapper.className = 'comments-inline-wrapper';
        wrapper.appendChild(container);
        
        targetElement.appendChild(wrapper);
    }

    /**
     * Hide comments
     */
    hideComments() {
        // Remove all active threads
        this.activeThreads.forEach((thread, itemId) => {
            thread.destroy();
        });
        this.activeThreads.clear();

        // Remove containers
        const containers = document.querySelectorAll('.comments-integration-container');
        containers.forEach(container => container.remove());

        // Remove overlays
        const overlays = document.querySelectorAll('div[style*="rgba(0,0,0,0.5)"]');
        overlays.forEach(overlay => overlay.remove());
    }

    /**
     * Get comment count for an item
     * @param {string} itemId - Item ID
     * @returns {Promise<number>} Comment count
     */
    async getCommentCount(itemId) {
        if (!this.commentService) return 0;
        
        try {
            const comments = await this.commentService.getItemComments(itemId);
            return comments.length;
        } catch (error) {
            console.error('Error getting comment count:', error);
            return 0;
        }
    }

    /**
     * Show comment indicator on items
     * @param {HTMLElement} itemElement - Item element
     * @param {number} count - Comment count
     */
    showCommentIndicator(itemElement, count) {
        if (!itemElement || count === 0) return;

        let indicator = itemElement.querySelector('.comment-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'comment-indicator';
            indicator.style.cssText = `
                position: absolute;
                top: 4px;
                right: 4px;
                background: var(--color-primary);
                color: white;
                border-radius: 50%;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 10px;
                font-weight: bold;
            `;
            itemElement.style.position = 'relative';
            itemElement.appendChild(indicator);
        }

        indicator.textContent = count > 9 ? '9+' : count;
    }

    /**
     * Hide comment indicator
     * @param {HTMLElement} itemElement - Item element
     */
    hideCommentIndicator(itemElement) {
        const indicator = itemElement?.querySelector('.comment-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    /**
     * Update comment indicators for all items
     * @param {Array} items - Array of items
     */
    async updateCommentIndicators(items) {
        if (!Array.isArray(items)) return;

        for (const item of items) {
            if (item.id) {
                const count = await this.getCommentCount(item.id);
                const element = document.querySelector(`[data-item-id="${item.id}"]`);
                if (element) {
                    this.showCommentIndicator(element, count);
                }
            }
        }
    }

    /**
     * Destroy integration
     */
    destroy() {
        this.hideComments();
        this.isInitialized = false;
    }
}

// Make it globally available
window.CommentsIntegration = CommentsIntegration;
window.commentsIntegration = new CommentsIntegration();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CommentsIntegration };
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.commentsIntegration.initialize();
    });
} else {
    window.commentsIntegration.initialize();
}