/**
 * Enhanced Error Handling System
 * Production-ready error handling with user-friendly notifications
 */

export class ErrorHandler {
    constructor() {
        this.init();
    }

    init() {
        // Global error handlers
        window.addEventListener('error', (event) => {
            this.handleError(event.error, 'JavaScript Error');
        });

        window.addEventListener('unhandledrejection', (event) => {
            this.handleError(event.reason, 'Promise Rejection');
        });

        this.createNotificationContainer();
    }

    handleError(error, type) {
        console.error(`[${type}]:`, error);
        
        // Show user-friendly message
        let message = 'An unexpected error occurred.';
        if (error.message?.includes('fetch')) {
            message = 'Connection error. Please check your internet connection.';
        } else if (error.message?.includes('404')) {
            message = 'Resource not found. Please try refreshing the page.';
        }

        this.showNotification('error', type, message);
    }

    showNotification(type, title, message) {
        const container = document.getElementById('notification-container');
        if (!container) return;

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <strong>${title}</strong>
                <p>${message}</p>
                <button class="notification-close">×</button>
            </div>
        `;

        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.onclick = () => notification.remove();

        container.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => notification.remove(), 5000);
    }

    createNotificationContainer() {
        if (document.getElementById('notification-container')) return;

        const container = document.createElement('div');
        container.id = 'notification-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            max-width: 400px;
        `;
        document.body.appendChild(container);

        // Add styles
        const styles = document.createElement('style');
        styles.textContent = `
            .notification {
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                margin-bottom: 12px;
                padding: 16px;
                border-left: 4px solid #ccc;
                animation: slideIn 0.3s ease;
            }
            .notification-error { border-left-color: #ef4444; }
            .notification-success { border-left-color: #10b981; }
            .notification-warning { border-left-color: #f59e0b; }
            .notification-close {
                float: right;
                background: none;
                border: none;
                font-size: 18px;
                cursor: pointer;
            }
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(styles);
    }

    // Public API
    showSuccess(message, title = 'Success') {
        this.showNotification('success', title, message);
    }

    showError(message, title = 'Error') {
        this.showNotification('error', title, message);
    }

    showWarning(message, title = 'Warning') {
        this.showNotification('warning', title, message);
    }
}

export default ErrorHandler;