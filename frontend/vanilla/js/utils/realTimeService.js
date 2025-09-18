/**
 * RealTimeService - Manages WebSocket connections and real-time updates
 * Provides reliable real-time communication with the backend
 */
class RealTimeService {
  constructor() {
    this.connection = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 1000;
    this.subscriptions = new Map();
    this.pendingOperations = [];
    this.eventHandlers = new Map();
    this.connectionStatus = 'disconnected';
    
    this.initialize();
  }
  
  /**
   * Initialize the real-time service
   */
  initialize() {
    this.connect();
    
    // Listen for online/offline events
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
  }/**
     * Connect to the WebSocket server
     */
    connect() {
        const token = localStorage.getItem('authToken');
        const wsUrl = process.env.WS_URL || 'ws://localhost:8080/ws';
        
        try {
            this.connection = new WebSocket(`${wsUrl}?token=${token}`);
            
            this.connection.onopen = () => {
                this.reconnectAttempts = 0;
                this.connectionStatus = 'connected';
                this.processPendingOperations();
                this.resubscribeAll();
                this.emitStatusChange('connected');
            };
            
            this.connection.onmessage = (event) => {
                this.handleMessage(JSON.parse(event.data));
            };
            
            this.connection.onclose = (event) => {
                if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.reconnectAttempts++;
                    this.connectionStatus = `reconnecting (${this.reconnectAttempts}/${this.maxReconnectAttempts})`;
                    this.emitStatusChange(this.connectionStatus);
                    
                    setTimeout(() => {
                        this.connect();
                    }, this.reconnectInterval * this.reconnectAttempts);
                } else {
                    this.connectionStatus = 'disconnected';
                    this.emitStatusChange('disconnected');
                }
            };
            
            this.connection.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.connectionStatus = 'error';
                this.emitStatusChange('error');
            };
        } catch (error) {
            console.error('Failed to create WebSocket connection:', error);
            this.connectionStatus = 'error';
            this.emitStatusChange('error');
            
            // Try to reconnect after a delay
            setTimeout(() => {
                this.connect();
            }, this.reconnectInterval * (this.reconnectAttempts + 1));
        }
    }
    
    /**
     * Disconnect from the WebSocket server
     */
    disconnect() {
        if (this.connection) {
            this.connection.close(1000, 'Normal closure');
            this.connection = null;
            this.connectionStatus = 'disconnected';
            this.emitStatusChange('disconnected');
        }
    }
    
    /**
     * Handle online event
     */
    handleOnline() {
        if (!this.isConnected() && this.connectionStatus !== 'reconnecting') {
            this.connect();
        }
    }
    
    /**
     * Handle offline event
     */
    handleOffline() {
        this.connectionStatus = 'offline';
        this.emitStatusChange('offline');
    }
    
    /**
     * Check if connected
     * @returns {boolean} True if connected
     */
    isConnected() {
        return this.connection && this.connection.readyState === WebSocket.OPEN;
    }
    
    /**
     * Subscribe to a room
     * @param {string} room - Room name
     * @param {function} callback - Callback function
     * @returns {string} Subscription ID
     */
    subscribe(room, callback) {
        const id = `${room}-${Date.now()}`;
        this.subscriptions.set(id, { room, callback });
        
        if (this.isConnected()) {
            this.send({ type: 'subscribe', room });
        }
        
        return id;
    }
    
    /**
     * Unsubscribe from a room
     * @param {string} id - Subscription ID
     */
    unsubscribe(id) {
        const subscription = this.subscriptions.get(id);
        if (subscription && this.isConnected()) {
            this.send({ type: 'unsubscribe', room: subscription.room });
        }
        this.subscriptions.delete(id);
    }
    
    /**
     * Send a message
     * @param {Object} message - Message to send
     */
    send(message) {
        if (this.isConnected()) {
            try {
                this.connection.send(JSON.stringify(message));
            } catch (error) {
                console.error('Failed to send message:', error);
                this.pendingOperations.push(message);
            }
        } else {
            this.pendingOperations.push(message);
        }
    }
    
    /**
     * Handle incoming message
     * @param {Object} message - Message from server
     */
    handleMessage(message) {
        if (message.type === 'error') {
            console.error('Real-time error:', message);
            return;
        }
        
        // Find subscriptions for this message type
        for (const [id, subscription] of this.subscriptions) {
            if (subscription.room === message.room) {
                try {
                    subscription.callback(message);
                } catch (error) {
                    console.error(`Error in subscription handler for ${subscription.room}:`, error);
                }
            }
        }
    }/**
     * Resubscribe to all rooms
     */
    resubscribeAll() {
        for (const [id, subscription] of this.subscriptions) {
            this.send({ type: 'subscribe', room: subscription.room });
        }
    }
    
    /**
     * Process pending operations
     */
    processPendingOperations() {
        while (this.pendingOperations.length > 0) {
            const message = this.pendingOperations.shift();
            this.send(message);
        }
    }
    
    /**
     * Emit connection status change
     * @param {string} status - New connection status
     */
    emitStatusChange(status) {
        eventBus.emit('realtime:status', status);
        
        // Show user notification for important status changes
        if (status === 'connected') {
            errorHandler.showUserMessage('Connected to real-time service', 'success', 3000);
        } else if (status === 'offline') {
            errorHandler.showUserMessage('You are offline. Changes will sync when connection is restored.', 'warning');
        } else if (status === 'error') {
            errorHandler.showUserMessage('Real-time connection error. Retrying...', 'warning');
        }
    }
    
    /**
     * Get connection status
     * @returns {string} Current connection status
     */
    getStatus() {
        return this.connectionStatus;
    }
    
    /**
     * Get connection status element
     * @returns {HTMLElement} Status indicator element
     */
    getStatusElement() {
        let element = document.getElementById('realtime-status');
        if (!element) {
            element = document.createElement('div');
            element.id = 'realtime-status';
            element.className = 'realtime-status';
            element.title = 'Real-time connection status';
            
            // Add to header
            const header = document.querySelector('.app-header') || 
                          document.querySelector('header') ||
                          document.body;
            header.appendChild(element);
        }
        return element;
    }
    
    /**
     * Update status indicator
     */
    updateStatusIndicator() {
        const element = this.getStatusElement();
        element.className = `realtime-status ${this.connectionStatus.replace(' ', '-')}`;
        element.title = `Real-time status: ${this.capitalizeFirstLetter(this.connectionStatus)}`;
    }