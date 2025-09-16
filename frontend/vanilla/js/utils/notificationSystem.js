/**
 * Notification System for Real-time Updates
 * Provides visual notifications for WebSocket events
 */

class NotificationSystem {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.container = null;
        this.notifications = [];
        this.maxVisibleNotifications = 5;
        
        this.init();
    }
    
    init() {
        this.createContainer();
        this.setupEventListeners();
    }
    
    /**
     * Create notification container
     */
    createContainer() {
        this.container = document.createElement('div');
        this.container.className = 'notification-container';
        this.container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            width: 300px;
            max-height: 80vh;
            overflow-y: auto;
        `;
        
        document.body.appendChild(this.container);
        
        // Add styles
        this.addStyles();
    }
    
    /**
     * Add notification styles
     */
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .notification-container {
                pointer-events: none;
            }
            
            .notification-item {
                pointer-events: auto;
                margin-bottom: 10px;
                padding: 12px 16px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                background: white;
                border-left: 4px solid #007bff;
                animation: slideIn 0.3s ease-out;
                transition: all 0.3s ease;
                cursor: pointer;
            }
            
            .notification-item:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
            }
            
            .notification-item.success {
                border-left-color: #28a745;
            }
            
            .notification-item.warning {
                border-left-color: #ffc107;
            }
            
            .notification-item.error {
                border-left-color: #dc3545;
            }
            
            .notification-item.info {
                border-left-color: #17a2b8;
            }
            
            .notification-title {
                font-weight: 600;
                font-size: 14px;
                margin-bottom: 2px;
                color: #333;
            }
            
            .notification-message {
                font-size: 12px;
                color: #666;
                margin-bottom: 4px;
            }
            
            .notification-meta {
                font-size: 11px;
                color: #999;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            
            .notification-close {
                background: none;
                border: none;
                font-size: 16px;
                cursor: pointer;
                color: #999;
            }
            
            .notification-close:hover {
                color: #333;
            }
            
            @keyframes slideIn {
                from {
                    opacity: 0;
                    transform: translateX(100%);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
            
            @keyframes slideOut {
                from {
                    opacity: 1;
                    transform: translateX(0);
                }
                to {
                    opacity: 0;
                    transform: translateX(100%);
                }
            }
            
            .notification-item.fade-out {
                animation: slideOut 0.3s ease-in forwards;
            }
        `;
        
        document.head.appendChild(style);
    }
    
    /**
     * Set up event listeners for WebSocket events
     */
    setupEventListeners() {
        if (!this.eventBus) return;
        
        // Board events
        this.eventBus.on('board:update', (data) => {
            this.handleBoardUpdate(data);
        });
        
        // Item events
        this.eventBus.on('item:update', (data) => {
            this.handleItemUpdate(data);
        });
        
        // Workspace events
        this.eventBus.on('workspace:update', (data) => {
            this.handleWorkspaceUpdate(data);
        });
        
        // Connection events
        this.eventBus.on('websocket:connected', () => {
            this.showNotification('Connected', 'Real-time updates are now active', 'success');
        });
        
        this.eventBus.on('websocket:disconnected', () => {
            this.showNotification('Disconnected', 'Switching to fallback polling', 'warning');
        });
        
        this.eventBus.on('websocket:polling', () => {
            this.showNotification('Polling Active', 'Checking for updates...', 'info');
        });
        
        this.eventBus.on('connection:status-change', (status) => {
            this.handleConnectionStatusChange(status);
        });
        
        // Custom notification events
        this.eventBus.on('notification:show', (notification) => {
            this.showNotification(
                notification.title,
                notification.message,
                notification.type || 'info',
                notification.duration || 5000
            );
        });
    }
    
    /**
     * Handle board update notifications
     */
    handleBoardUpdate(data) {
        const { action, payload, source } = data;
        
        if (source === 'websocket') {
            const messages = {
                created: `New board "${payload.name}" created`,
                updated: `Board "${payload.name}" updated`,
                deleted: `Board "${payload.name}" deleted`
            };
            
            if (messages[action]) {
                this.showNotification('Board Update', messages[action], 'info');
            }
        }
    }
    
    /**
     * Handle item update notifications
     */
    handleItemUpdate(data) {
        const { action, payload, source } = data;
        
        if (source === 'websocket') {
            const messages = {
                created: `New item "${payload.name}" added`,
                updated: `Item "${payload.name}" updated`,
                deleted: `Item "${payload.name || 'unnamed'}" deleted`,
                moved: `Item "${payload.name}" moved`
            };
            
            if (messages[action]) {
                this.showNotification('Item Update', messages[action], 'info');
            }
        }
    }
    
    /**
     * Handle workspace update notifications
     */
    handleWorkspaceUpdate(data) {
        const { action, payload, source } = data;
        
        if (source === 'websocket') {
            const messages = {
                created: `New workspace "${payload.name}" created`,
                updated: `Workspace "${payload.name}" updated`,
                deleted: `Workspace "${payload.name}" deleted`,
                member_added: `New member added to "${payload.name}"`,
                member_removed: `Member removed from "${pulumi.name}"`
            };
            
            if (messages[action]) {
                this.showNotification('Workspace Update', messages[action], 'info');
            }
        }
    }
    
    /**
     * Handle connection status changes
     */
    handleConnectionStatusChange(status) {
        const messages = {
            connected: 'Real-time updates active',
            disconnected: 'Connection lost, using fallback',
            polling: 'Polling for updates',
            failed: 'Connection failed'
        };
        
        const types = {
            connected: 'success',
            disconnected: 'warning',
            polling: 'info',
            failed: 'error'
        };
        
        if (messages[status.status]) {
            this.showNotification(
                'Connection Status',
                messages[status.status],
                types[status.status] || 'info'
            );
        }
    }
    
    /**
     * Show notification
     */
    showNotification(title, message, type = 'info', duration = 5000) {
        const notification = {
            id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            title,
            message,
            type,
            timestamp: new Date().toISOString()
        };
        
        this.notifications.push(notification);
        this.renderNotification(notification);
        
        // Auto-dismiss after duration
        if (duration > 0) {
            setTimeout(() => {
                this.dismissNotification(notification.id);
            }, duration);
        }
        
        // Limit visible notifications
        if (this.notifications.length > this.maxVisibleNotifications) {
            const oldNotification = this.notifications[0];
            this.dismissNotification(oldNotification.id);
        }
    }
    
    /**
     * Render notification item
     */
    renderNotification(notification) {
        const element = document.createElement('div');
        element.className = `notification-item ${notification.type}`;
        element.dataset.id = notification.id;
        element.innerHTML = `
            <div class="notification-title">${this.escapeHtml(notification.title)}</div>
            <div class="notification-message">${this.escapeHtml(notification.message)}</div>
            <div class="notification-meta">
                <span>${this.formatTime(notification.timestamp)}</span>
                <button class="notification-close" data-action="close" data-id="${notification.id}">×</button>
            </div>
        `;
        
        // Add click handler
        element.addEventListener('click', (e) => {
            if (e.target.dataset.action === 'close') {
                this.dismissNotification(notification.id);
            } else {
                this.handleNotificationClick(notification);
            }
        });
        
        this.container.appendChild(element);
        
        // Trigger animation
        requestAnimationFrame(() => {
            element.style.animation = 'slideIn 0.3s ease-out';
        });
    }
    
    /**
     * Dismiss notification
     */
    dismissNotification(id) {
        const element = this.container.querySelector(`[data-id="${id}"]`);
        if (!element) return;
        
        element.style.animation = 'slideOut 0.3s ease-in';
        
        setTimeout(() => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
            this.notifications = this.notifications.filter(n => n.id !== id);
        }, 300);
    }
    
    /**
     * Handle notification click
     */
    handleNotificationClick(notification) {
        // Emit event for components to handle
        this.eventBus.emit('notification:clicked', notification);
        
        // Auto-dismiss on click
        this.dismissNotification(notification.id);
    }
    
    /**
     * Format timestamp for display
     */
    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) {
            return 'Just now';
        } else if (diff < 3600000) {
            return `${Math.floor(diff / 60000)}m ago`;
        } else if (diff < 86400000) {
            return `${Math.floor(diff / 3600000)}h ago`;
        } else {
            return date.toLocaleDateString();
        }
    }
    
    /**
     * Escape HTML for security
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Clear all notifications
     */
    clearAll() {
        this.notifications.forEach(notification => {
            this.dismissNotification(notification.id);
        });
    }
    
    /**
     * Get notification history
     */
    getHistory() {
        return [...this.notifications];
    }
    
    /**
     * Destroy notification system
     */
    destroy() {
        this.clearAll();
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}

// Global notification system
window.notificationSystem = new NotificationSystem(window.eventBus);

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NotificationSystem };
} else {
    window.NotificationSystem = NotificationSystem;
}