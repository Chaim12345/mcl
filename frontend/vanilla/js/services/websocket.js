/**
 * WebSocket Service for Real-time Updates
 * Provides WebSocket connection management and event handling
 */

class WebSocketService {
    constructor() {
        this.ws = null;
        this.url = null;
        this.reconnectInterval = 5000; // 5 seconds
        this.maxReconnectAttempts = 10;
        this.reconnectAttempts = 0;
        this.isManualClose = false;
        this.eventBus = null;
        this.messageQueue = [];
        this.isConnected = false;
        this.pollingFallback = null;
        this.usePolling = false;
        this.pollingInterval = 30000; // 30 seconds
        this.subscriptions = new Set();
        this.reconnectTimer = null;
        this.pollingTimer = null;
    }

    /**
     * Initialize WebSocket service with event bus
     * @param {EventBus} eventBus - The event bus instance
     * @param {string} baseUrl - Base URL for WebSocket connection
     */
    initialize(eventBus, baseUrl = null) {
        this.eventBus = eventBus;
        
        // Auto-detect WebSocket URL if not provided
        if (!baseUrl) {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = window.location.host;
            this.url = `${protocol}//${host}/ws`;
        } else {
            this.url = baseUrl;
        }

        this.setupEventListeners();
        this.connect();
    }

    /**
     * Set up event listeners for the event bus
     */
    setupEventListeners() {
        if (!this.eventBus) return;

        // Listen for workspace/board changes to update subscriptions
        this.eventBus.on('workspace:selected', (workspaceId) => {
            this.subscribeToWorkspace(workspaceId);
        });

        this.eventBus.on('board:selected', (boardId) => {
            this.subscribeToBoard(boardId);
        });

        this.eventBus.on('websocket:reconnect', () => {
            this.reconnect();
        });

        this.eventBus.on('websocket:disconnect', () => {
            this.disconnect();
        });
    }

    /**
     * Establish WebSocket connection with enhanced error handling
     */
    connect() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            return;
        }

        try {
            this.ws = new WebSocket(this.url);
            this.setupWebSocketHandlers();
        } catch (error) {
            console.error('WebSocket connection error:', error);
            this.handleConnectionError(error);
        }
    }

    /**
     * Set up WebSocket event handlers with enhanced error handling
     */
    setupWebSocketHandlers() {
        this.ws.onopen = () => {
            console.log('WebSocket connected');
            this.isConnected = true;
            this.isManualClose = false;
            this.reconnectAttempts = 0;
            this.usePolling = false;
            
            // Clear polling fallback
            this.clearPolling();
            
            // Send queued messages
            this.flushMessageQueue();
            
            // Resubscribe to all topics
            this.resubscribeAll();
            
            this.eventBus?.emit('websocket:connected');
            
            // Send connection status to any listeners
            this.broadcastConnectionStatus();
        };

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleMessage(data);
            } catch (error) {
                console.error('Failed to parse WebSocket message:', error);
                this.eventBus?.emit('websocket:parse_error', error);
            }
        };

        this.ws.onclose = (event) => {
            console.log('WebSocket disconnected:', event.code, event.reason);
            this.isConnected = false;
            
            // Handle different close codes appropriately
            if (event.code === 1008) { // Policy violation (e.g., authentication error)
                console.error('WebSocket closed due to authentication error');
                this.eventBus?.emit('websocket:auth_error', event);
            } else if (event.code === 1006) { // Abnormal closure
                console.error('WebSocket abnormally closed');
            }
            
            if (!this.isManualClose) {
                this.handleDisconnection(event);
            } else {
                this.eventBus?.emit('websocket:disconnected', { manual: true, code: event.code });
            }
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.eventBus?.emit('websocket:error', error);
            
            // Provide more detailed error information
            if (this.ws.readyState === WebSocket.CONNECTING) {
                this.eventBus?.emit('websocket:connection_error', error);
            } else if (this.ws.readyState === WebSocket.CLOSING || this.ws.readyState === WebSocket.CLOSED) {
                this.eventBus?.emit('websocket:close_error', error);
            }
        };
    }

    /**
     * Handle incoming WebSocket messages
     * @param {Object} data - The message data
     */
    handleMessage(data) {
        const { type, action, payload, timestamp } = data;

        // Emit events based on message type
        switch (type) {
            case 'board':
                this.eventBus?.emit('board:update', { action, payload, timestamp });
                break;
            case 'item':
                this.eventBus?.emit('item:update', { action, payload, timestamp });
                break;
            case 'workspace':
                this.eventBus?.emit('workspace:update', { action, payload, timestamp });
                break;
            case 'notification':
                this.eventBus?.emit('notification:new', payload);
                break;
            case 'user':
                this.eventBus?.emit('user:update', { action, payload, timestamp });
                break;
            default:
                this.eventBus?.emit(`websocket:${type}`, { action, payload, timestamp });
        }

        // Show notification for user-relevant updates
        if (this.shouldShowNotification(type, action)) {
            this.showNotification(type, action, payload);
        }
    }

    /**
     * Determine if a notification should be shown
     * @param {string} type - Event type
     * @param {string} action - Event action
     * @returns {boolean}
     */
    shouldShowNotification(type, action) {
        const notificationActions = {
            'item': ['created', 'updated', 'deleted', 'moved'],
            'board': ['updated', 'shared', 'deleted'],
            'workspace': ['updated', 'member_added', 'member_removed']
        };

        return notificationActions[type]?.includes(action) || false;
    }

    /**
     * Show notification for real-time updates
     * @param {string} type - Event type
     * @param {string} action - Event action
     * @param {Object} payload - Event payload
     */
    showNotification(type, action, payload) {
        if (!this.eventBus) return;

        const notification = {
            id: `ws-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'info',
            title: `${type.charAt(0).toUpperCase() + type.slice(1)} ${action}`,
            message: this.getNotificationMessage(type, action, payload),
            timestamp: new Date().toISOString(),
            read: false,
            source: 'websocket'
        };

        this.eventBus.emit('notification:show', notification);
    }

    /**
     * Get notification message based on event type and action
     * @param {string} type - Event type
     * @param {string} action - Event action
     * @param {Object} payload - Event payload
     * @returns {string}
     */
    getNotificationMessage(type, action, payload) {
        switch (type) {
            case 'item':
                if (action === 'created') {
                    return `New item "${payload.title || 'Untitled'}" was added`;
                } else if (action === 'updated') {
                    return `Item "${payload.title || 'Untitled'}" was updated`;
                } else if (action === 'deleted') {
                    return `Item "${payload.title || 'Untitled'}" was deleted`;
                }
                break;
            case 'board':
                return `Board "${payload.name || 'Untitled'}" was ${action}`;
            case 'workspace':
                return `Workspace "${payload.name || 'Untitled'}" was ${action}`;
            default:
                return `${type} updated: ${action}`;
        }
        return `${type} ${action}`;
    }

    /**
     * Handle connection errors and initiate reconnection
     */
    handleConnectionError(error) {
        this.isConnected = false;
        this.eventBus?.emit('websocket:connection_failed', error);
        this.attemptReconnection();
    }

    /**
     * Handle disconnection and attempt reconnection
     */
    handleDisconnection(event) {
        this.isConnected = false;
        this.eventBus?.emit('websocket:disconnected', {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean
        });
        this.attemptReconnection();
    }

    /**
     * Attempt to reconnect with exponential backoff and jitter
     */
    attemptReconnection() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('Max reconnection attempts reached, switching to polling');
            this.switchToPolling();
            return;
        }

        // Add jitter to prevent thundering herd
        const baseDelay = this.reconnectInterval * Math.pow(1.5, this.reconnectAttempts);
        const jitter = Math.random() * 1000; // Random delay up to 1 second
        const delay = Math.min(baseDelay + jitter, 30000); // Max 30 seconds
        
        console.log(`Reconnection attempt ${this.reconnectAttempts + 1} in ${Math.round(delay)}ms`);

        this.reconnectTimer = setTimeout(() => {
            this.reconnectAttempts++;
            this.connect();
        }, delay);
    }

    /**
     * Broadcast connection status to listeners
     */
    broadcastConnectionStatus() {
        this.eventBus?.emit('websocket:status', this.getStatus());
    }

    /**
     * Manual reconnection attempt
     */
    reconnect() {
        this.isManualClose = false;
        this.reconnectAttempts = 0;
        this.clearTimers();
        this.connect();
    }

    /**
     * Switch to polling fallback when WebSocket fails
     */
    switchToPolling() {
        this.usePolling = true;
        this.startPolling();
        this.eventBus?.emit('websocket:polling', { reason: 'max_reconnects' });
    }

    /**
     * Start polling fallback mechanism
     */
    startPolling() {
        this.clearPolling();
        this.pollingTimer = setInterval(() => {
            this.performPolling();
        }, this.pollingInterval);
    }

    /**
     * Perform polling requests to check for updates
     */
    async performPolling() {
        try {
            // Poll for updates based on current subscriptions
            const subscriptions = Array.from(this.subscriptions);
            for (const subscription of subscriptions) {
                const [type, id] = subscription.split(':');
                
                let endpoint;
                switch (type) {
                    case 'board':
                        endpoint = `/api/boards/${id}/updates`;
                        break;
                    case 'workspace':
                        endpoint = `/api/workspaces/${id}/updates`;
                        break;
                    default:
                        continue;
                }

                const response = await fetch(endpoint, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.getAuthToken()}`
                    }
                });

                if (response.ok) {
                    const updates = await response.json();
                    if (updates.length > 0) {
                        this.eventBus?.emit('polling:updates', { type, id, updates });
                    }
                }
            }
        } catch (error) {
            console.error('Polling error:', error);
        }
    }

    /**
     * Stop polling
     */
    clearPolling() {
        if (this.pollingTimer) {
            clearInterval(this.pollingTimer);
            this.pollingTimer = null;
        }
    }

    /**
     * Subscribe to workspace updates
     * @param {string} workspaceId - Workspace ID
     */
    subscribeToWorkspace(workspaceId) {
        if (!workspaceId) return;
        
        this.subscribe(`workspace:${workspaceId}`);
    }

    /**
     * Subscribe to board updates
     * @param {string} boardId - Board ID
     */
    subscribeToBoard(boardId) {
        if (!boardId) return;
        
        this.subscribe(`board:${boardId}`);
    }

    /**
     * Subscribe to a topic
     * @param {string} topic - Topic to subscribe to
     */
    subscribe(topic) {
        this.subscriptions.add(topic);
        
        if (this.isConnected) {
            this.send({
                action: 'subscribe',
                topic: topic
            });
        }
    }

    /**
     * Unsubscribe from a topic
     * @param {string} topic - Topic to unsubscribe from
     */
    unsubscribe(topic) {
        this.subscriptions.delete(topic);
        
        if (this.isConnected) {
            this.send({
                action: 'unsubscribe',
                topic: topic
            });
        }
    }

    /**
     * Resubscribe to all topics after reconnection
     */
    resubscribeAll() {
        for (const topic of this.subscriptions) {
            this.send({
                action: 'subscribe',
                topic: topic
            });
        }
    }

    /**
     * Send message via WebSocket
     * @param {Object} message - Message to send
     */
    send(message) {
        if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            // Queue message for later
            this.messageQueue.push(message);
        }
    }

    /**
     * Send queued messages after connection
     */
    flushMessageQueue() {
        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            this.send(message);
        }
    }

    /**
     * Get authentication token
     * @returns {string|null}
     */
    getAuthToken() {
        // Try to get token from localStorage or sessionStorage
        return localStorage.getItem('authToken') || 
               sessionStorage.getItem('authToken') || 
               null;
    }

    /**
     * Disconnect WebSocket
     */
    disconnect() {
        this.isManualClose = true;
        this.clearTimers();
        
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        
        this.isConnected = false;
    }

    /**
     * Clear all timers
     */
    clearTimers() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        this.clearPolling();
    }

    /**
     * Get connection status
     * @returns {Object}
     */
    getStatus() {
        return {
            isConnected: this.isConnected,
            usePolling: this.usePolling,
            reconnectAttempts: this.reconnectAttempts,
            subscriptions: Array.from(this.subscriptions),
            url: this.url
        };
    }

    /**
     * Cleanup resources
     */
    destroy() {
        this.disconnect();
        this.subscriptions.clear();
        this.messageQueue = [];
        this.eventBus = null;
    }
}

// Create singleton instance
const websocketService = new WebSocketService();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = websocketService;
} else {
    // Make it available globally for vanilla JS
    window.WebSocketService = websocketService;
}