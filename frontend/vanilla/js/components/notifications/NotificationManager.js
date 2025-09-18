/**
 * Notification Manager Component
 * Manages the display and interaction of notifications
 */

export class NotificationManager {
    constructor() {
        this.notifications = [];
        this.filters = {
            all: () => true,
            mentions: (n) => n.type === 'mention',
            updates: (n) => n.type === 'update',
            system: (n) => n.type === 'system'
        };
        this.currentFilter = 'all';
        this.container = null;
    }

    async init() {
        this.setupDOM();
        this.setupEventListeners();
        await this.loadNotifications();
        this.render();
    }

    setupDOM() {
        this.container = document.getElementById('notifications-list');
        this.notificationBadge = document.getElementById('notification-badge');
        this.filterButtons = document.querySelectorAll('.filter-btn');
        this.markAllReadBtn = document.getElementById('mark-all-read');
        this.clearAllBtn = document.getElementById('clear-all');
    }

    setupEventListeners() {
        // Filter buttons
        this.filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.setFilter(btn.dataset.filter);
            });
        });

        // Action buttons
        this.markAllReadBtn?.addEventListener('click', () => this.markAllAsRead());
        this.clearAllBtn?.addEventListener('click', () => this.clearAll());

        // Click on notification items
        this.container?.addEventListener('click', (e) => {
            const notificationItem = e.target.closest('.notification-item');
            if (notificationItem) {
                const notificationId = notificationItem.dataset.id;
                this.markAsRead(notificationId);
                this.handleNotificationClick(notificationItem.dataset);
            }
        });
    }

    setFilter(filterType) {
        this.currentFilter = filterType;

        // Update button states
        this.filterButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filterType);
        });

        this.render();
    }

    async loadNotifications() {
        // Mock notifications data - in real app, this would come from API
        this.notifications = [
            {
                id: '1',
                type: 'mention',
                title: 'Sarah Johnson mentioned you',
                message: 'Can you review the new design mockups?',
                timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
                read: false,
                user: 'Sarah Johnson',
                avatar: '/assets/images/avatar1.jpg'
            },
            {
                id: '2',
                type: 'update',
                title: 'Task status changed',
                message: 'Database optimization completed',
                timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
                read: false,
                user: 'System',
                avatar: '/assets/images/avatar2.jpg'
            },
            {
                id: '3',
                type: 'system',
                title: 'Welcome to Kirom!',
                message: 'Your Monday.com clone is ready to use',
                timestamp: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
                read: true,
                user: 'Kirom Team',
                avatar: '/assets/images/avatar3.jpg'
            },
            {
                id: '4',
                type: 'mention',
                title: 'Mike Chen mentioned you',
                message: 'Please check the updated requirements document',
                timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
                read: false,
                user: 'Mike Chen',
                avatar: '/assets/images/avatar4.jpg'
            },
            {
                id: '5',
                type: 'update',
                title: 'New comment on your task',
                message: 'Alex added a comment to "Review API endpoints"',
                timestamp: new Date(Date.now() - 1000 * 60 * 45), // 45 minutes ago
                read: true,
                user: 'Alex Rivera',
                avatar: '/assets/images/avatar5.jpg'
            }
        ];

        this.updateBadge();
    }

    updateBadge() {
        const unreadCount = this.notifications.filter(n => !n.read).length;
        if (this.notificationBadge) {
            this.notificationBadge.textContent = unreadCount;
            this.notificationBadge.style.display = unreadCount > 0 ? 'block' : 'none';
        }
    }

    render() {
        if (!this.container) return;

        const filteredNotifications = this.notifications.filter(this.filters[this.currentFilter]);

        this.container.innerHTML = filteredNotifications.map(notification => `
            <div class="notification-item ${notification.read ? 'read' : 'unread'}"
                 data-id="${notification.id}"
                 data-type="${notification.type}"
                 data-user="${notification.user}">
                <div class="notification-avatar">
                    <img src="${notification.avatar}" alt="${notification.user}" />
                </div>
                <div class="notification-content">
                    <div class="notification-header">
                        <h4 class="notification-title">${notification.title}</h4>
                        <span class="notification-time">${this.formatTime(notification.timestamp)}</span>
                    </div>
                    <p class="notification-message">${notification.message}</p>
                    <div class="notification-meta">
                        <span class="notification-type ${notification.type}">${this.getTypeLabel(notification.type)}</span>
                        ${!notification.read ? '<span class="unread-indicator"></span>' : ''}
                    </div>
                </div>
                <div class="notification-actions">
                    <button class="notification-action-btn" data-action="mark-read" title="Mark as read">
                        ${notification.read ? '✓' : '○'}
                    </button>
                </div>
            </div>
        `).join('');

        // Update empty state
        if (filteredNotifications.length === 0) {
            this.container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🔔</div>
                    <h3>No notifications</h3>
                    <p>You don't have any ${this.currentFilter === 'all' ? '' : this.currentFilter} notifications.</p>
                </div>
            `;
        }
    }

    getTypeLabel(type) {
        const labels = {
            mention: '@ Mention',
            update: 'Update',
            system: 'System'
        };
        return labels[type] || type;
    }

    formatTime(timestamp) {
        const now = new Date();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    }

    markAsRead(notificationId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification && !notification.read) {
            notification.read = true;
            this.updateBadge();
            this.render();
        }
    }

    markAllAsRead() {
        this.notifications.forEach(n => n.read = true);
        this.updateBadge();
        this.render();
    }

    clearAll() {
        if (confirm('Are you sure you want to clear all notifications?')) {
            this.notifications = [];
            this.updateBadge();
            this.render();
        }
    }

    handleNotificationClick(data) {
        // Navigate to relevant page based on notification type
        const type = data.type;
        switch (type) {
            case 'mention':
                // Navigate to the relevant board/item
                window.location.href = '/boards';
                break;
            case 'update':
                window.location.href = '/activity';
                break;
            case 'system':
                // Stay on notifications page
                break;
        }
    }

    // Method to add new notification (called by WebSocket events)
    addNotification(notification) {
        notification.id = Date.now().toString();
        notification.timestamp = new Date();
        notification.read = false;

        this.notifications.unshift(notification); // Add to beginning
        this.updateBadge();
        this.render();

        // Show browser notification if permitted
        this.showBrowserNotification(notification);
    }

    showBrowserNotification(notification) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(notification.title, {
                body: notification.message,
                icon: notification.avatar,
                tag: notification.id
            });
        }
    }

    // Request notification permission
    requestPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }
}

// Initialize notification system when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Request notification permission
    if ('Notification' in window) {
        Notification.requestPermission();
    }
});

