/**
 * Frontend WebSocket Integration - Complete Setup
 */

class WebSocketIntegration {
    constructor() {
        this.services = null;
        this.connectionManager = null;
        this.notificationSystem = null;
        this.initialized = false;
    }
    
    async initialize() {
        if (this.initialized) return;
        
        try {
            console.log('🚀 Initializing WebSocket integration...');
            
            await this.initializeServices();
            await this.setupConnectionManagement();
            await this.setupNotifications();
            await this.setupRealTimeListeners();
            await this.autoSubscribeToContext();
            
            this.initialized = true;
            console.log('✅ WebSocket integration fully initialized');
            
        } catch (error) {
            console.error('❌ Failed to initialize:', error);
        }
    }
    
    async initializeServices() {
        if (window.serviceInitializer) {
            this.services = await window.serviceInitializer.initialize();
        } else {
            // Fallback
            if (!window.eventBus) {
                window.eventBus = new EventTarget();
                window.eventBus.emit = (event, data) => window.eventBus.dispatchEvent(new CustomEvent(event, { detail: data }));
                window.eventBus.on = (event, callback) => window.eventBus.addEventListener(event, (e) => callback(e.detail));
            }
            
            if (window.WebSocketService) {
                window.WebSocketService.initialize(window.eventBus);
            }
        }
    }
    
    async setupConnectionManagement() {
        if (window.WebSocketService && window.eventBus) {
            this.connectionManager = new ConnectionManager(window.WebSocketService, window.eventBus);
            this.connectionManager.initialize();
            this.createConnectionStatusIndicator();
        }
    }
    
    async setupNotifications() {
        if (window.eventBus) {
            this.notificationSystem = new NotificationSystem(window.eventBus);
            this.notificationSystem.initialize();
        }
    }
    
    async setupRealTimeListeners() {
        if (!window.eventBus) return;
        
        window.eventBus.on('board:update', (data) => {
            console.log('📋 Board update:', data);
            this.handleBoardUpdate(data);
        });
        
        window.eventBus.on('item:update', (data) => {
            console.log('📄 Item update:', data);
            this.handleItemUpdate(data);
        });
        
        window.eventBus.on('workspace:update', (data) => {
            console.log('🏢 Workspace update:', data);
            this.handleWorkspaceUpdate(data);
        });
        
        window.eventBus.on('connection:status', (status) => {
            this.updateConnectionStatus(status);
        });
    }
    
    async autoSubscribeToContext() {
        const currentWorkspace = localStorage.getItem('current_workspace');
        if (currentWorkspace && window.WebSocketService) {
            const workspace = JSON.parse(currentWorkspace);
            window.WebSocketService.subscribeToWorkspace(workspace.id);
        }
        
        const currentBoard = localStorage.getItem('current_board');
        if (currentBoard && window.WebSocketService) {
            const board = JSON.parse(currentBoard);
            window.WebSocketService.subscribeToBoard(board.id);
        }
    }
    
    createConnectionStatusIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'connection-status-indicator';
        indicator.innerHTML = '<span>Connecting...</span>';
        indicator.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 4px;
            padding: 8px 12px;
            font-size: 12px;
            z-index: 9999;
        `;
        document.body.appendChild(indicator);
    }
    
    updateConnectionStatus(status) {
        const indicator = document.getElementById('connection-status-indicator');
        if (!indicator) return;
        
        const states = {
            connected: { text: 'Connected', color: '#28a745' },
            disconnected: { text: 'Reconnecting...', color: '#dc3545' },
            polling: { text: 'Polling', color: '#ffc107' }
        };
        
        const state = states[status.websocket === 'connected' ? 'connected' : 
                           status.polling === 'active' ? 'polling' : 'disconnected'];
        
        if (state) {
            indicator.style.color = state.color;
            indicator.querySelector('span').textContent = state.text;
        }
    }
    
    handleBoardUpdate(data) {
        console.log('Board updated:', data.action, data.payload.name);
    }
    
    handleItemUpdate(data) {
        console.log('Item updated:', data.action, data.payload.name);
    }
    
    handleWorkspaceUpdate(data) {
        console.log('Workspace updated:', data.action, data.payload.name);
    }
}

// Global instance
window.wsIntegration = new WebSocketIntegration();

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.wsIntegration.initialize();
    });
} else {
    window.wsIntegration.initialize();
}

// Expose initialization function
window.initWebSocketIntegration = () => window.wsIntegration.initialize();