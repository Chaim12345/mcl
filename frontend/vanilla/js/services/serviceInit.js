/**
 * Service Initialization and Integration
 */

class ServiceInitializer {
    constructor() {
        this.services = {};
        this.initialized = false;
    }
    
    async initialize() {
        if (this.initialized) return this.services;
        
        try {
            await this.initializeWebSocketService();
            await this.initializeServices();
            await this.setupServiceIntegration();
            
            this.initialized = true;
            console.log('All services initialized successfully');
            return this.services;
            
        } catch (error) {
            console.error('Failed to initialize services:', error);
            throw error;
        }
    }
    
    async initializeWebSocketService() {
        if (!window.WebSocketService) {
            console.error('WebSocketService not found');
            return;
        }
        
        if (!window.eventBus) {
            window.eventBus = new EventTarget();
            window.eventBus.emit = function(event, data) {
                this.dispatchEvent(new CustomEvent(event, { detail: data }));
            };
            window.eventBus.on = function(event, callback) {
                this.addEventListener(event, (e) => callback(e.detail));
            };
            window.eventBus.off = function(event, callback) {
                this.removeEventListener(event, callback);
            };
        }
        
        window.WebSocketService.initialize(window.eventBus);
    }
    
    async initializeServices() {
        const apiClient = {
            get: async (endpoint) => {
                const response = await fetch(`/api${endpoint}`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
                });
                return response.json();
            },
            post: async (endpoint, data) => {
                const response = await fetch(`/api${endpoint}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                    },
                    body: JSON.stringify(data)
                });
                return response.json();
            },
            put: async (endpoint, data) => {
                const response = await fetch(`/api${endpoint}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                    },
                    body: JSON.stringify(data)
                });
                return response.json();
            },
            delete: async (endpoint) => {
                const response = await fetch(`/api${endpoint}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
                });
                return response.json();
            }
        };
        
        this.services = {
            websocket: window.WebSocketService,
            apiClient,
            boardService: window.createBoardService(apiClient, window.WebSocketService, window.eventBus),
            itemService: window.createItemService(window.WebSocketService),
            workspaceService: window.createWorkspaceService(window.WebSocketService),
            commentService: window.createCommentService(window.WebSocketService),
            eventBus: window.eventBus
        };
        
        window.boardService = this.services.boardService;
        window.itemService = this.services.itemService;
        window.workspaceService = this.services.workspaceService;
        window.commentService = this.services.commentService;
    }
    
    async setupServiceIntegration() {
        const { eventBus, websocket, boardService, itemService, workspaceService } = this.services;
        
        eventBus.on('workspace:switched', async (data) => {
            if (data.workspace) {
                const currentBoard = boardService.getCurrentBoard();
                if (currentBoard) {
                    websocket.unsubscribe(`board:${currentBoard.id}`);
                }
                websocket.subscribeToWorkspace(data.workspace.id);
            }
        });
        
        eventBus.on('board:selected', async (data) => {
            if (data.boardId) {
                boardService.setCurrentBoard(data.board);
                itemService.clearCurrentItem();
                await boardService.getBoard(data.boardId);
                await itemService.getItemsByBoard(data.boardId);
            }
        });
        
        eventBus.on('api:error', async (error) => {
            if (error.retryable) {
                setTimeout(() => this.retryOperation(error), 1000);
            }
        });
        
        eventBus.on('websocket:status', (status) => {
            this.handleConnectionStatus(status);
        });
    }
    
    handleConnectionStatus(status) {
        const statusBar = document.querySelector('.sync-status-bar');
        if (!statusBar) return;
        
        statusBar.className = `sync-status-bar ${status}`;
        const messages = {
            connected: 'Connected - Real-time updates active',
            disconnected: 'Disconnected - Using fallback polling',
            polling: 'Polling for updates...',
            connecting: 'Connecting...'
        };
        statusBar.innerHTML = messages[status] || status;
    }
    
    async retryOperation(error) {
        try {
            const response = await this.services.apiClient[error.method](error.endpoint, error.data);
            if (response.success) {
                this.services.eventBus.emit('api:retry-success', { original: error, response });
            }
        } catch (retryError) {
            console.error('Retry failed:', retryError);
        }
    }
}

// Global service initializer
window.serviceInitializer = new ServiceInitializer();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.serviceInitializer.initialize().catch(console.error);
    });
} else {
    window.serviceInitializer.initialize().catch(console.error);
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ServiceInitializer };
} else {
    window.ServiceInitializer = ServiceInitializer;
}