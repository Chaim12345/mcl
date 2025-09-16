/**
 * Connection Manager for WebSocket and Polling Fallback
 */

class ConnectionManager {
    constructor(websocketService, eventBus) {
        this.websocketService = websocketService;
        this.eventBus = eventBus;
        this.pollingInterval = 30000;
        this.maxPollingRetries = 5;
        this.pollingRetryCount = 0;
        this.pollingTimer = null;
        this.isPollingActive = false;
        this.lastPollTime = null;
        this.connectionHistory = [];
    }
    
    initialize() {
        this.setupConnectionMonitoring();
        this.startConnectionMonitoring();
    }
    
    setupConnectionMonitoring() {
        if (!this.eventBus) return;
        
        this.eventBus.on('websocket:connected', () => {
            this.handleConnectionRestored();
        });
        
        this.eventBus.on('websocket:disconnected', () => {
            this.handleConnectionLost();
        });
        
        this.eventBus.on('websocket:polling', () => {
            this.handlePollingActivated();
        });
    }
    
    startConnectionMonitoring() {
        this.statusTimer = setInterval(() => {
            const status = this.getConnectionStatus();
            this.eventBus.emit('connection:status', status);
        }, 5000);
        
        this.healthTimer = setInterval(() => {
            this.performHealthCheck();
        }, 30000);
    }
    
    async startPolling() {
        if (this.isPollingActive) return;
        
        this.isPollingActive = true;
        this.pollingRetryCount = 0;
        
        console.log('Starting polling fallback');
        this.eventBus.emit('connection:status-change', { status: 'polling', reason: 'websocket_disconnected' });
        
        this.performPolling();
    }
    
    async performPolling() {
        if (!this.isPollingActive) return;
        
        try {
            const activeSubscriptions = this.getActiveSubscriptions();
            
            for (const subscription of activeSubscriptions) {
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
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                    }
                });
                
                if (response.ok) {
                    const updates = await response.json();
                    if (updates.length > 0) {
                        this.handlePollingUpdates(type, id, updates);
                    }
                }
            }
            
            this.lastPollTime = new Date().toISOString();
            this.pollingRetryCount = 0;
            
            if (this.isPollingActive) {
                this.pollingTimer = setTimeout(() => {
                    this.performPolling();
                }, this.pollingInterval);
            }
            
        } catch (error) {
            console.error('Polling error:', error);
            this.handlePollingError(error);
        }
    }
    
    getActiveSubscriptions() {
        if (!this.websocketService) return [];
        
        const status = this.websocketService.getStatus();
        return status.subscriptions || [];
    }
    
    handlePollingUpdates(type, id, updates) {
        updates.forEach(update => {
            const eventData = {
                action: update.action,
                payload: update.payload,
                source: 'polling',
                timestamp: update.timestamp || new Date().toISOString()
            };
            
            this.eventBus.emit(`${type}:update`, eventData);
        });
    }
    
    handlePollingError(error) {
        this.pollingRetryCount++;
        
        if (this.pollingRetryCount >= this.maxPollingRetries) {
            console.error('Max polling retries reached');
            this.stopPolling();
            return;
        }
        
        const delay = Math.min(this.pollingInterval * Math.pow(1.5, this.pollingRetryCount), 300000);
        
        this.pollingTimer = setTimeout(() => {
            this.performPolling();
        }, delay);
    }
    
    stopPolling() {
        if (!this.isPollingActive) return;
        
        this.isPollingActive = false;
        
        if (this.pollingTimer) {
            clearTimeout(this.pollingTimer);
            this.pollingTimer = null;
        }
        
        console.log('Stopped polling');
    }
    
    handleConnectionRestored() {
        console.log('WebSocket connection restored');
        this.stopPolling();
        this.recordConnectionEvent('restored');
    }
    
    handleConnectionLost() {
        console.warn('WebSocket connection lost');
        this.recordConnectionEvent('lost');
        
        setTimeout(() => {
            this.startPolling();
        }, 5000);
    }
    
    handlePollingActivated() {
        console.log('Polling activated');
        this.recordConnectionEvent('polling_activated');
    }
    
    recordConnectionEvent(type) {
        const event = {
            type,
            timestamp: new Date().toISOString()
        };
        
        this.connectionHistory.push(event);
        
        if (this.connectionHistory.length > 50) {
            this.connectionHistory = this.connectionHistory.slice(-50);
        }
    }
    
    async performHealthCheck() {
        try {
            const response = await fetch('/api/health', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });
            
            const status = await response.json();
            this.eventBus.emit('api:health-check', status);
            
        } catch (error) {
            this.eventBus.emit('api:health-check', { healthy: false });
        }
    }
    
    getConnectionStatus() {
        if (!this.websocketService) return 'unknown';
        
        const status = this.websocketService.getStatus();
        
        return {
            websocket: status.isConnected ? 'connected' : 'disconnected',
            polling: this.isPollingActive ? 'active' : 'inactive',
            lastPoll: this.lastPollTime,
            subscriptions: status.subscriptions || []
        };
    }
    
    async retryConnection() {
        console.log('Attempting connection retry');
        
        if (this.websocketService) {
            this.websocketService.reconnect();
        }
        
        await this.performHealthCheck();
    }
    
    destroy() {
        if (this.healthTimer) {
            clearInterval(this.healthTimer);
        }
        
        if (this.statusTimer) {
            clearInterval(this.statusTimer);
        }
        
        this.stopPolling();
    }
}

// Global instance