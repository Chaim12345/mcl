/**
 * Error Handling Utilities
 * Provides comprehensive error handling, logging, and recovery mechanisms
 */

import { createElement, animate } from './dom.js';

/**
 * Base Error Classes
 */
export class APIError extends Error {
    constructor(code, message, details = null, statusCode = null) {
        super(message);
        this.name = 'APIError';
        this.code = code;
        this.details = details;
        this.statusCode = statusCode;
        this.timestamp = new Date().toISOString();
    }

    toJSON() {
        return {
            name: this.name,
            code: this.code,
            message: this.message,
            details: this.details,
            statusCode: this.statusCode,
            timestamp: this.timestamp,
            stack: this.stack
        };
    }
}

export class ValidationError extends Error {
    constructor(field, message, value = null) {
        super(message);
        this.name = 'ValidationError';
        this.field = field;
        this.value = value;
        this.timestamp = new Date().toISOString();
    }

    toJSON() {
        return {
            name: this.name,
            field: this.field,
            message: this.message,
            value: this.value,
            timestamp: this.timestamp,
            stack: this.stack
        };
    }
}

export class NetworkError extends Error {
    constructor(message, url = null, method = null) {
        super(message);
        this.name = 'NetworkError';
        this.url = url;
        this.method = method;
        this.timestamp = new Date().toISOString();
    }

    toJSON() {
        return {
            name: this.name,
            message: this.message,
            url: this.url,
            method: this.method,
            timestamp: this.timestamp,
            stack: this.stack
        };
    }
}

export class AuthenticationError extends Error {
    constructor(message, action = null) {
        super(message);
        this.name = 'AuthenticationError';
        this.action = action;
        this.timestamp = new Date().toISOString();
    }

    toJSON() {
        return {
            name: this.name,
            message: this.message,
            action: this.action,
            timestamp: this.timestamp,
            stack: this.stack
        };
    }
}

/**
 * Error Logger
 */
class ErrorLogger {
    constructor() {
        this.logs = [];
        this.maxLogs = 1000;
        this.logLevel = 'error'; // 'debug', 'info', 'warn', 'error'
        this.isLogging = false;
        this.pendingLogs = [];
    }

    async log(error, context = {}) {
        const logEntry = {
            id: this.generateId(),
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.toJSON?.() || {
                name: error.name,
                message: error.message,
                stack: error.stack
            } : error,
            context,
            userAgent: navigator.userAgent,
            url: window.location.href,
            userId: this.getCurrentUserId()
        };

        // Handle concurrent logging
        if (this.isLogging) {
            this.pendingLogs.push(logEntry);
            return logEntry;
        }

        this.isLogging = true;
        
        try {
            // Add current log entry
            this.logs.unshift(logEntry);
            
            // Process any pending logs
            while (this.pendingLogs.length > 0) {
                const pendingEntry = this.pendingLogs.shift();
                this.logs.unshift(pendingEntry);
            }
            
            // Keep only the most recent logs
            if (this.logs.length > this.maxLogs) {
                this.logs = this.logs.slice(0, this.maxLogs);
            }
        } finally {
            this.isLogging = false;
        }

        // Console logging based on error type
        this.consoleLog(error, logEntry);

        // Send to server if configured
        this.sendToServer(logEntry);

        return logEntry;
    }

    consoleLog(error, logEntry) {
        const message = `[${logEntry.timestamp}] ${error.name || 'Error'}: ${error.message}`;
        
        if (error instanceof ValidationError) {
            console.warn(message, logEntry);
        } else if (error instanceof NetworkError || error instanceof APIError) {
            console.error(message, logEntry);
        } else {
            console.error(message, logEntry);
        }
    }

    async sendToServer(logEntry) {
        // Only send critical errors to server to avoid spam
        if (this.shouldSendToServer(logEntry.error)) {
            try {
                await fetch('/api/errors', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.getAuthToken()}`
                    },
                    body: JSON.stringify(logEntry)
                });
            } catch (err) {
                // Silently fail - don't create error loops
                console.warn('Failed to send error to server:', err.message);
            }
        }
    }

    shouldSendToServer(error) {
        // Send API errors, authentication errors, and unexpected errors
        return error.name === 'APIError' || 
               error.name === 'AuthenticationError' || 
               error.name === 'TypeError' ||
               error.name === 'ReferenceError';
    }

    getCurrentUserId() {
        try {
            const token = localStorage.getItem('auth_token');
            if (token && this.isValidJWT(token)) {
                const payload = JSON.parse(atob(token.split('.')[1]));
                return payload.user_id || payload.sub;
            }
        } catch (err) {
            // Log parsing errors without exposing token
            console.warn('Failed to parse auth token');
        }
        return null;
    }

    isValidJWT(token) {
        const parts = token.split('.');
        return parts.length === 3 && parts.every(part => part.length > 0);
    }

    getAuthToken() {
        return localStorage.getItem('auth_token');
    }

    // Remove sensitive data from error logs
    sanitizeLogEntry(logEntry) {
        const sanitized = { ...logEntry };
        if (sanitized.context?.token) delete sanitized.context.token;
        if (sanitized.context?.authorization) delete sanitized.context.authorization;
        if (sanitized.context?.password) delete sanitized.context.password;
        if (sanitized.context?.secret) delete sanitized.context.secret;
        return sanitized;
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    getLogs(limit = 50) {
        return this.logs.slice(0, limit);
    }

    clearLogs() {
        this.logs = [];
    }

    exportLogs() {
        return JSON.stringify(this.logs, null, 2);
    }
}

/**
 * Error Display System
 */
class ErrorDisplay {
    constructor() {
        this.container = null;
        this.notifications = new Map();
        this.init();
    }

    init() {
        this.createContainer();
        this.injectStyles();
    }

    createContainer() {
        this.container = createElement('div', {
            id: 'error-notifications',
            className: 'error-notifications-container'
        });
        document.body.appendChild(this.container);
    }

    injectStyles() {
        if (document.getElementById('error-display-styles')) return;

        const styles = createElement('style', { id: 'error-display-styles' }, `
            .error-notifications-container {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                pointer-events: none;
            }

            .error-notification {
                background: #fff;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                margin-bottom: 12px;
                max-width: 400px;
                opacity: 0;
                pointer-events: auto;
                transform: translateX(100%);
                transition: all 0.3s ease;
            }

            .error-notification.show {
                opacity: 1;
                transform: translateX(0);
            }

            .error-notification.error {
                border-left: 4px solid #ef4444;
            }

            .error-notification.warning {
                border-left: 4px solid #f59e0b;
            }

            .error-notification.info {
                border-left: 4px solid #3b82f6;
            }

            .error-notification.success {
                border-left: 4px solid #10b981;
            }

            .error-notification-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 16px 16px 8px;
            }

            .error-notification-title {
                font-weight: 600;
                font-size: 14px;
                color: #1f2937;
            }

            .error-notification-close {
                background: none;
                border: none;
                color: #6b7280;
                cursor: pointer;
                font-size: 18px;
                padding: 0;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .error-notification-close:hover {
                color: #374151;
            }

            .error-notification-body {
                padding: 0 16px 16px;
            }

            .error-notification-message {
                color: #4b5563;
                font-size: 13px;
                line-height: 1.4;
                margin-bottom: 8px;
            }

            .error-notification-actions {
                display: flex;
                gap: 8px;
                margin-top: 12px;
            }

            .error-notification-action {
                background: #f3f4f6;
                border: 1px solid #d1d5db;
                border-radius: 4px;
                color: #374151;
                cursor: pointer;
                font-size: 12px;
                padding: 4px 8px;
                text-decoration: none;
            }

            .error-notification-action:hover {
                background: #e5e7eb;
            }

            .error-notification-action.primary {
                background: #3b82f6;
                border-color: #3b82f6;
                color: white;
            }

            .error-notification-action.primary:hover {
                background: #2563eb;
            }

            .error-boundary {
                background: #fef2f2;
                border: 1px solid #fecaca;
                border-radius: 8px;
                padding: 16px;
                margin: 16px 0;
            }

            .error-boundary-title {
                color: #dc2626;
                font-weight: 600;
                margin-bottom: 8px;
            }

            .error-boundary-message {
                color: #7f1d1d;
                font-size: 14px;
                margin-bottom: 12px;
            }

            .error-boundary-actions {
                display: flex;
                gap: 8px;
            }

            .error-boundary-action {
                background: #dc2626;
                border: none;
                border-radius: 4px;
                color: white;
                cursor: pointer;
                font-size: 12px;
                padding: 6px 12px;
            }

            .error-boundary-action:hover {
                background: #b91c1c;
            }

            .error-boundary-action.secondary {
                background: #f3f4f6;
                color: #374151;
            }

            .error-boundary-action.secondary:hover {
                background: #e5e7eb;
            }
        `);

        document.head.appendChild(styles);
    }

    show(error, options = {}) {
        const {
            type = this.getErrorType(error),
            title = this.getErrorTitle(error),
            message = this.getErrorMessage(error),
            actions = this.getErrorActions(error),
            duration = this.getErrorDuration(type),
            persistent = false
        } = options;

        const id = this.generateId();
        const notification = this.createNotification(id, type, title, message, actions);
        
        this.container.appendChild(notification);
        this.notifications.set(id, notification);

        // Animate in
        requestAnimationFrame(() => {
            notification.classList.add('show');
        });

        // Auto-dismiss if not persistent
        if (!persistent && duration > 0) {
            setTimeout(() => {
                this.hide(id);
            }, duration);
        }

        return id;
    }

    createNotification(id, type, title, message, actions) {
        const closeButton = createElement('button', {
            className: 'error-notification-close',
            onclick: () => this.hide(id)
        }, '×');

        const header = createElement('div', {
            className: 'error-notification-header'
        }, [
            createElement('div', { className: 'error-notification-title' }, title),
            closeButton
        ]);

        const messageEl = createElement('div', {
            className: 'error-notification-message'
        }, message);

        const actionsEl = actions.length > 0 ? createElement('div', {
            className: 'error-notification-actions'
        }, actions.map(action => createElement('button', {
            className: `error-notification-action ${action.primary ? 'primary' : ''}`,
            onclick: () => {
                action.handler();
                if (action.dismiss !== false) {
                    this.hide(id);
                }
            }
        }, action.label))) : null;

        const body = createElement('div', {
            className: 'error-notification-body'
        }, [messageEl, actionsEl].filter(Boolean));

        return createElement('div', {
            className: `error-notification ${type}`,
            dataset: { id }
        }, [header, body]);
    }

    hide(id) {
        const notification = this.notifications.get(id);
        if (!notification) return;

        notification.classList.remove('show');
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
            this.notifications.delete(id);
        }, 300);
    }

    hideAll() {
        this.notifications.forEach((_, id) => this.hide(id));
    }

    getErrorType(error) {
        if (error instanceof ValidationError) return 'warning';
        if (error instanceof AuthenticationError) return 'error';
        if (error instanceof NetworkError) return 'error';
        if (error instanceof APIError) {
            if (error.statusCode >= 500) return 'error';
            if (error.statusCode >= 400) return 'warning';
        }
        return 'error';
    }

    getErrorTitle(error) {
        if (error instanceof ValidationError) return 'Validation Error';
        if (error instanceof AuthenticationError) return 'Authentication Required';
        if (error instanceof NetworkError) return 'Connection Error';
        if (error instanceof APIError) return 'Server Error';
        return 'Error';
    }

    getErrorMessage(error) {
        return error.message || 'An unexpected error occurred';
    }

    getErrorActions(error) {
        const actions = [];

        if (error instanceof AuthenticationError) {
            actions.push({
                label: 'Login',
                primary: true,
                handler: () => window.location.href = '/login'
            });
        }

        if (error instanceof NetworkError) {
            actions.push({
                label: 'Retry',
                primary: true,
                handler: () => window.location.reload()
            });
        }

        return actions;
    }

    getErrorDuration(type) {
        switch (type) {
            case 'success': return 3000;
            case 'info': return 5000;
            case 'warning': return 7000;
            case 'error': return 10000;
            default: return 5000;
        }
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    showErrorBoundary(error, container, options = {}) {
        const {
            title = 'Something went wrong',
            message = 'An error occurred while rendering this component.',
            showReload = true,
            showDetails = false
        } = options;

        const reloadAction = showReload ? createElement('button', {
            className: 'error-boundary-action',
            onclick: () => window.location.reload()
        }, 'Reload Page') : null;

        const detailsAction = showDetails ? createElement('button', {
            className: 'error-boundary-action secondary',
            onclick: () => console.error('Error details:', error)
        }, 'Show Details') : null;

        const actions = createElement('div', {
            className: 'error-boundary-actions'
        }, [reloadAction, detailsAction].filter(Boolean));

        const errorBoundary = createElement('div', {
            className: 'error-boundary'
        }, [
            createElement('div', { className: 'error-boundary-title' }, title),
            createElement('div', { className: 'error-boundary-message' }, message),
            actions
        ]);

        container.innerHTML = '';
        container.appendChild(errorBoundary);
    }
}

/**
 * Error Recovery Utilities
 */
class ErrorRecovery {
    constructor() {
        this.retryAttempts = new Map();
        this.maxRetries = 3;
        this.retryDelay = 1000;
    }

    async retry(operation, options = {}) {
        const {
            maxRetries = this.maxRetries,
            delay = this.retryDelay,
            backoff = true,
            key = null
        } = options;

        const operationKey = key || this.generateKey(operation);
        const attempts = this.retryAttempts.get(operationKey) || 0;

        try {
            const result = await operation();
            this.retryAttempts.delete(operationKey);
            return result;
        } catch (error) {
            if (attempts >= maxRetries) {
                this.retryAttempts.delete(operationKey);
                throw error;
            }

            this.retryAttempts.set(operationKey, attempts + 1);
            
            const currentDelay = backoff ? delay * Math.pow(2, attempts) : delay;
            await this.sleep(currentDelay);
            
            return this.retry(operation, { ...options, key: operationKey });
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    generateKey(operation) {
        return operation.toString().slice(0, 100);
    }

    clearRetryAttempts(key = null) {
        if (key) {
            this.retryAttempts.delete(key);
        } else {
            this.retryAttempts.clear();
        }
    }
}

/**
 * Main Error Handler
 */
class ErrorHandler {
    constructor() {
        this.logger = new ErrorLogger();
        this.display = new ErrorDisplay();
        this.recovery = new ErrorRecovery();
        this.isInitialized = false;
    }

    init() {
        if (this.isInitialized) return;

        this.setupGlobalHandlers();
        this.isInitialized = true;
    }

    setupGlobalHandlers() {
        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            event.preventDefault();
            this.handle(event.reason, {
                context: { type: 'unhandledrejection' }
            });
        });

        // Handle uncaught errors
        window.addEventListener('error', (event) => {
            this.handle(event.error || new Error(event.message), {
                context: {
                    type: 'uncaughterror',
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno
                }
            });
        });

        // Handle resource loading errors
        window.addEventListener('error', (event) => {
            if (event.target !== window) {
                this.handle(new Error(`Failed to load resource: ${event.target.src || event.target.href}`), {
                    context: {
                        type: 'resourceerror',
                        element: event.target.tagName,
                        source: event.target.src || event.target.href
                    },
                    display: false // Don't show UI for resource errors
                });
            }
        }, true);
    }

    handle(error, options = {}) {
        const {
            context = {},
            display = true,
            log = true,
            displayOptions = {}
        } = options;

        // Log the error
        if (log) {
            this.logger.log(error, context);
        }

        // Display the error to user
        if (display && this.shouldDisplayError(error)) {
            this.display.show(error, displayOptions);
        }

        // Handle specific error types
        this.handleSpecificError(error);

        return error;
    }

    shouldDisplayError(error) {
        // Don't display validation errors in notifications (they should be inline)
        if (error instanceof ValidationError) return false;
        
        // Don't display network errors for background requests
        if (error instanceof NetworkError && error.url?.includes('/api/')) {
            return !error.url.includes('background=true');
        }

        return true;
    }

    handleSpecificError(error) {
        if (error instanceof AuthenticationError) {
            // Clear auth token and redirect to login
            localStorage.removeItem('auth_token');
            localStorage.removeItem('refresh_token');
            setTimeout(() => {
                if (!window.location.pathname.includes('/login')) {
                    window.location.href = '/login';
                }
            }, 2000);
        }
    }

    // Convenience methods
    handleAPIError(response, url, method) {
        const error = new APIError(
            response.error?.code || 'API_ERROR',
            response.error?.message || 'An API error occurred',
            response.error?.details,
            response.status
        );
        error.url = url;
        error.method = method;
        return this.handle(error);
    }

    handleValidationError(field, message, value) {
        const error = new ValidationError(field, message, value);
        return this.handle(error, { display: false }); // Handle inline
    }

    handleNetworkError(message, url, method) {
        const error = new NetworkError(message, url, method);
        return this.handle(error);
    }

    handleAuthError(message, action) {
        const error = new AuthenticationError(message, action);
        return this.handle(error);
    }

    // Utility methods
    showSuccess(message, options = {}) {
        this.display.show(new Error(message), {
            type: 'success',
            title: 'Success',
            ...options
        });
    }

    showInfo(message, options = {}) {
        this.display.show(new Error(message), {
            type: 'info',
            title: 'Information',
            ...options
        });
    }

    showWarning(message, options = {}) {
        this.display.show(new Error(message), {
            type: 'warning',
            title: 'Warning',
            ...options
        });
    }

    // Component error boundary
    wrapComponent(component, container) {
        try {
            return component;
        } catch (error) {
            this.handle(error);
            this.display.showErrorBoundary(error, container);
            return null;
        }
    }

    // Async operation wrapper
    async wrapAsync(operation, options = {}) {
        try {
            return await operation();
        } catch (error) {
            this.handle(error, options);
            throw error;
        }
    }

    // Retry wrapper
    async retry(operation, options = {}) {
        return this.recovery.retry(operation, options);
    }
}

// Create singleton instance
const errorHandler = new ErrorHandler();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => errorHandler.init());
} else {
    errorHandler.init();
}

// Export everything
export {
    ErrorLogger,
    ErrorDisplay,
    ErrorRecovery,
    ErrorHandler,
    errorHandler as default
};

// Also export convenience functions
export const handleError = (error, options) => errorHandler.handle(error, options);
export const showSuccess = (message, options) => errorHandler.showSuccess(message, options);
export const showInfo = (message, options) => errorHandler.showInfo(message, options);
export const showWarning = (message, options) => errorHandler.showWarning(message, options);
export const wrapComponent = (component, container) => errorHandler.wrapComponent(component, container);
export const wrapAsync = (operation, options) => errorHandler.wrapAsync(operation, options);
export const retry = (operation, options) => errorHandler.retry(operation, options);