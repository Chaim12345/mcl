/**
 * Monday.com-style Board Component with Table View and Full Functionality
 */

import { ApiClient } from '../../services/ApiClient.js';
import { BoardService } from '../../services/boardService.js';
import { EnhancedDragDrop } from './EnhancedDragDrop.js';
import { ValidationSystem, ErrorDisplay } from '../../utils/ValidationSystem.js';
import AccessibilityManager from '../../utils/AccessibilityManager.js';
import MobileFirstComponents from '../MobileFirstComponents.js';
import AvatarGenerator from '../../utils/AvatarGenerator.js';
import ErrorHandler from '../../utils/ErrorHandler.js';
import { RealTimeService } from '../../utils/realTimeService.js';
import { eventBus } from '../../utils/eventBus.js';

export class MondayStyleBoard {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            boardId: options.boardId,
            view: options.view || 'table', // table, kanban, calendar, timeline
            ...options
        };
        
        this.apiClient = new ApiClient();
        this.boardService = new BoardService(this.apiClient);
        this.currentBoard = null;
        this.items = [];
        this.columns = [];
        this.editingCell = null;
        
        // Enhanced features
        this.dragDrop = new EnhancedDragDrop(this);
        this.validator = new ValidationSystem();
        this.errorDisplay = new ErrorDisplay(this.container);
        this.accessibilityManager = new AccessibilityManager();
        this.components = new MobileFirstComponents();
        this.avatarGenerator = new AvatarGenerator();
        this.errorHandler = new ErrorHandler();
        this.loadingStates = new Map();
        this.bulkActions = new Set();
        this.selectedItems = new Set();
        this.filters = {
            status: null,
            priority: null,
            assignee: null,
            dateRange: null,
            search: ''
        };
        this.sortBy = { column: null, direction: 'asc' };
        this.pagination = { page: 1, pageSize: 50, total: 0 };
        
        // Real-time collaboration
        this.realTimeService = new RealTimeService();
        this.realTimeSubscriptions = new Set();
        this.optimisticUpdates = new Map();
        this.userPresence = new Map();
        this.typingIndicators = new Map();
        
        this.init();
    }

    async init() {
        await this.loadBoard();
        this.setupRealTime();
        this.render();
        this.setupEventListeners();
    }
    
    /**
     * Set up real-time collaboration features
     */
    setupRealTime() {
        if (!this.options.boardId) return;
        
        // Subscribe to board updates
        const boardSubscription = this.realTimeService.subscribe(
            `board:${this.options.boardId}`,
            this.handleBoardEvent.bind(this)
        );
        this.realTimeSubscriptions.add(boardSubscription);
        
        // Subscribe to user presence
        const presenceSubscription = this.realTimeService.subscribe(
            `presence:board:${this.options.boardId}`,
            this.handlePresenceEvent.bind(this)
        );
        this.realTimeSubscriptions.add(presenceSubscription);
        
        // Notify server we're viewing this board
        this.realTimeService.send({
            type: 'presence',
            action: 'join',
            room: `board:${this.options.boardId}`
        });
        
        // Set up typing indicators
        this.setupTypingIndicators();
    }
    
    /**
     * Handle real-time board events
     * @param {Object} event - The event data
     */
    handleBoardEvent(event) {
        try {
            switch (event.action) {
                case 'board:update':
                    this.handleBoardUpdate(event.payload);
                    break;
                case 'item:created':
                    this.handleItemCreated(event.payload);
                    break;
                case 'item:updated':
                    this.handleItemUpdated(event.payload);
                    break;
                case 'item:deleted':
                    this.handleItemDeleted(event.payload);
                    break;
                case 'item:moved':
                    this.handleItemMoved(event.payload);
                    break;
                case 'comment:created':
                    this.handleCommentCreated(event.payload);
                    break;
                case 'typing:start':
                    this.handleTypingStart(event.payload);
                    break;
                case 'typing:stop':
                    this.handleTypingStop(event.payload);
                    break;
                default:
                    console.log('Unhandled board event:', event);
            }
        } catch (error) {
            console.error('Error handling board event:', error);
            this.errorHandler.handleError(error, 'Real-time event handling');
        }
    }
    
    /**
     * Handle presence events (users joining/leaving)
     * @param {Object} event - The presence event
     */
    handlePresenceEvent(event) {
        try {
            switch (event.action) {
                case 'user:joined':
                    this.handleUserJoined(event.user);
                    break;
                case 'user:left':
                    this.handleUserLeft(event.user);
                    break;
                case 'user:typing':
                    this.handleUserTyping(event.user, event.columnId, event.itemId);
                    break;
                case 'presence:update':
                    this.updatePresenceDisplay();
                    break;
                default:
                    console.log('Unhandled presence event:', event);
            }
        } catch (error) {
            console.error('Error handling presence event:', error);
        }
    }
    
    /**
     * Handle board metadata update
     * @param {Object} payload - Board update payload
     */
    handleBoardUpdate(payload) {
        if (payload.boardId !== this.currentBoard.id) return;
        
        // Check if this is an optimistic update confirmation
        if (payload.optimisticId && this.optimisticUpdates.has(payload.optimisticId)) {
            this.optimisticUpdates.delete(payload.optimisticId);
            return; // Already applied optimistically
        }
        
        // Update board metadata
        this.currentBoard = {
            ...this.currentBoard,
            ...payload.board
        };
        
        // Rerender if necessary
        if (payload.changeType === 'columns') {
            this.columns = payload.board.columns;
            this.render();
        }
    }
    
    /**
     * Handle new item creation
     * @param {Object} payload - Item creation payload
     */
    handleItemCreated(payload) {
        if (payload.boardId !== this.currentBoard.id) return;
        
        // Check if this is our own optimistic update
        if (payload.optimisticId && this.optimisticUpdates.has(payload.optimisticId)) {
            this.optimisticUpdates.delete(payload.optimisticId);
            // Update the item with the server-assigned ID
            const optimisticItem = this.items.find(item => item.optimisticId === payload.optimisticId);
            if (optimisticItem) {
                optimisticItem.id = payload.item.id;
                optimisticItem.optimisticId = undefined;
            }
            this.render();
            return;
        }
        
        // Add new item
        this.items.push(payload.item);
        this.render();
        
        // Announce update for accessibility
        this.accessibilityManager.announce(`New item "${payload.item.item}" added to the board`);
    }
    
    /**
     * Handle item update
     * @param {Object} payload - Item update payload
     */
    handleItemUpdated(payload) {
        if (payload.boardId !== this.currentBoard.id) return;
        
        // Check if this is our own optimistic update
        if (payload.optimisticId && this.optimisticUpdates.has(payload.optimisticId)) {
            this.optimisticUpdates.delete(payload.optimisticId);
            return; // Already applied optimistically
        }
        
        // Find and update the item
        const index = this.items.findIndex(item => item.id === payload.itemId);
        if (index !== -1) {
            this.items[index] = {
                ...this.items[index],
                ...payload.updates
            };
            this.render();
            
            // Announce update for accessibility
            const item = this.items[index];
            const column = this.columns.find(c => c.id === payload.columnId);
            this.accessibilityManager.announce(
                `Item "${item.item}" updated in ${column?.name || 'column'}`
            );
        }
    }
    
    /**
     * Handle item deletion
     * @param {Object} payload - Item deletion payload
     */
    handleItemDeleted(payload) {
        if (payload.boardId !== this.currentBoard.id) return;
        
        // Check if this is our own optimistic update
        if (payload.optimisticId && this.optimisticUpdates.has(payload.optimisticId)) {
            this.optimisticUpdates.delete(payload.optimisticId);
            return; // Already applied optimistically
        }
        
        // Remove the item
        this.items = this.items.filter(item => item.id !== payload.itemId);
        this.render();
        
        // Announce update for accessibility
        this.accessibilityManager.announce(`Item deleted from the board`);
    }
    
    /**
     * Handle item movement (reordering)
     * @param {Object} payload - Item movement payload
     */
    handleItemMoved(payload) {
        if (payload.boardId !== this.currentBoard.id) return;
        
        // Check if this is our own optimistic update
        if (payload.optimisticId && this.optimisticUpdates.has(payload.optimisticId)) {
            this.optimisticUpdates.delete(payload.optimisticId);
            return; // Already applied optimistically
        }
        
        // Reorder items
        const itemIndex = this.items.findIndex(item => item.id === payload.itemId);
        if (itemIndex !== -1) {
            const [movedItem] = this.items.splice(itemIndex, 1);
            this.items.splice(payload.newPosition, 0, movedItem);
            this.render();
        }
    }
    
    /**
     * Handle new comment
     * @param {Object} payload - Comment creation payload
     */
    handleCommentCreated(payload) {
        if (payload.boardId !== this.currentBoard.id) return;
        
        // Update the relevant item with the new comment
        const itemIndex = this.items.findIndex(item => item.id === payload.itemId);
        if (itemIndex !== -1) {
            const item = this.items[itemIndex];
            if (!item.comments) item.comments = [];
            item.comments.push(payload.comment);
            
            // Highlight the updated item temporarily
            this.highlightUpdatedItem(payload.itemId);
            
            this.render();
        }
    }
    
    /**
     * Handle user joining the board
     * @param {Object} user - User who joined
     */
    handleUserJoined(user) {
        if (user.id !== this.currentUser?.id) {
            this.userPresence.set(user.id, {
                ...user,
                status: 'online',
                lastSeen: Date.now()
            });
            
            // Announce for accessibility
            if (user.id !== this.currentUser?.id) {
                this.accessibilityManager.announce(`${user.name} joined the board`);
            }
            
            this.updatePresenceDisplay();
        }
    }
    
    /**
     * Handle user leaving the board
     * @param {Object} user - User who left
     */
    handleUserLeft(user) {
        this.userPresence.delete(user.id);
        this.updatePresenceDisplay();
        
        // Announce for accessibility
        if (user.id !== this.currentUser?.id) {
            this.accessibilityManager.announce(`${user.name} left the board`);
        }
    }
    
    /**
     * Handle user typing indicator
     * @param {Object} user - User who is typing
     * @param {string} columnId - Column being edited
     * @param {string} itemId - Item being edited
     */
    handleUserTyping(user, columnId, itemId) {
        if (user.id === this.currentUser?.id) return;
        
        const key = `${itemId}:${columnId}`;
        this.typingIndicators.set(key, {
            user,
            timestamp: Date.now()
        });
        
        // Clear after timeout
        setTimeout(() => {
            if (this.typingIndicators.get(key)?.timestamp <= Date.now() - 3000) {
                this.typingIndicators.delete(key);
                this.render();
            }
        }, 3000);
        
        this.render();
    }
    
    /**
     * Set up typing indicators for cell editing
     */
    setupTypingIndicators() {
        // We'll use this to track when we start typing in cells
        this.container.addEventListener('input', (e) => {
            const cell = e.target.closest('.editable-cell');
            if (cell && this.editingCell) {
                const columnId = cell.dataset.column;
                const itemId = cell.closest('tr').dataset.itemId;
                
                // Send typing event
                this.realTimeService.send({
                    type: 'typing',
                    action: 'start',
                    boardId: this.options.boardId,
                    itemId,
                    columnId
                });
                
                // Clear previous timeout
                if (this.typingTimeout) {
                    clearTimeout(this.typingTimeout);
                }
                
                // Set new timeout to send stop event
                this.typingTimeout = setTimeout(() => {
                    this.realTimeService.send({
                        type: 'typing',
                        action: 'stop',
                        boardId: this.options.boardId,
                        itemId,
                        columnId
                    });
                }, 1500);
            }
        });
    }
    
    /**
     * Update presence display in the UI
     */
    updatePresenceDisplay() {
        // This would update the UI with user presence indicators
        // For example, showing avatars of users currently viewing the board
    }
    
    /**
     * Highlight an item that was updated by another user
     * @param {string} itemId - ID of the item to highlight
     */
    highlightUpdatedItem(itemId) {
        const itemElement = this.container.querySelector(`[data-item-id="${itemId}"]`);
        if (itemElement) {
            itemElement.classList.add('item-updated');
            setTimeout(() => {
                itemElement.classList.remove('item-updated');
            }, 3000);
        }
    }
    
    /**
     * Clean up real-time subscriptions
     */
    cleanupRealTime() {
        // Unsubscribe from all real-time events
        for (const subscriptionId of this.realTimeSubscriptions) {
            this.realTimeService.unsubscribe(subscriptionId);
        }
        this.realTimeSubscriptions.clear();
        
        // Notify server we're leaving
        if (this.options.boardId) {
            this.realTimeService.send({
                type: 'presence',
                action: 'leave',
                room: `board:${this.options.boardId}`
            });
        }
    }
    
    /**
     * Add optimistic update for real-time operations
     * @param {string} optimisticId - Unique ID for this update
     * @param {Function} rollback - Function to rollback the update
     */
    addOptimisticUpdate(optimisticId, rollback) {
        this.optimisticUpdates.set(optimisticId, rollback);
    }
    
    async loadBoard() {
        this.showLoadingState('board');
        
        try {
            if (this.options.boardId) {
                this.currentBoard = await this.boardService.getBoard(this.options.boardId);
            } else {
                // Load first available board or create demo data
                const boards = await this.boardService.getBoards();
                this.currentBoard = boards[0] || this.createDemoBoard();
            }
            
            await this.loadItems();
            this.loadColumns();
            
            this.hideLoadingState('board');
            this.accessibilityManager.announce('Board loaded successfully');
        } catch (error) {
            console.error('Error loading board:', error);
            this.hideLoadingState('board');
            this.errorHandler.showWarning('Failed to load board. Using demo data instead.');
            
            this.currentBoard = this.createDemoBoard();
            this.items = this.createDemoItems();
            this.columns = this.createDemoColumns();
            
            this.accessibilityManager.announce('Board failed to load, demo data displayed');
        }
    }

    showLoadingState(key) {
        this.loadingStates.set(key, true);
        this.updateLoadingUI();
    }

    hideLoadingState(key) {
        this.loadingStates.delete(key);
        this.updateLoadingUI();
    }

    updateLoadingUI() {
        const isLoading = this.loadingStates.size > 0;
        const loadingOverlay = this.container.querySelector('.loading-overlay');
        
        if (isLoading && !loadingOverlay) {
            const overlay = document.createElement('div');
            overlay.className = 'loading-overlay';
            overlay.innerHTML = `
                <div class="loading-spinner">
                    <div class="spinner"></div>
                    <p>Loading...</p>
                </div>
            `;
            overlay.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(246, 247, 251, 0.9);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 100;
            `;
            this.container.appendChild(overlay);
        } else if (!isLoading && loadingOverlay) {
            loadingOverlay.remove();
        }
    }

    createDemoBoard() {
        return {
            id: 'demo-board',
            name: 'Project Management Board',
            description: 'Demo board with Monday.com-style functionality'
        };
    }

    createDemoColumns() {
        return [
            { id: 'item', name: 'Item', type: 'text', width: 200 },
            { id: 'person', name: 'Person', type: 'person', width: 120 },
            { id: 'status', name: 'Status', type: 'status', width: 120, 
              options: ['Not Started', 'Working on it', 'Stuck', 'Done'] },
            { id: 'priority', name: 'Priority', type: 'priority', width: 100,
              options: ['Low', 'Medium', 'High', 'Critical'] },
            { id: 'date', name: 'Date', type: 'date', width: 120 },
            { id: 'timeline', name: 'Timeline', type: 'timeline', width: 150 },
            { id: 'budget', name: 'Budget', type: 'number', width: 100 },
            { id: 'files', name: 'Files', type: 'files', width: 80 },
            { id: 'notes', name: 'Notes', type: 'long-text', width: 200 }
        ];
    }

    createDemoItems() {
        return [
            {
                id: '1',
                item: 'Design new landing page',
                person: { id: 'user1', name: 'John Doe', avatar: '/assets/images/avatar1.jpg' },
                status: 'Working on it',
                priority: 'High',
                date: '2025-09-20',
                timeline: { start: '2025-09-15', end: '2025-09-25' },
                budget: 5000,
                files: ['design.sketch', 'wireframes.pdf'],
                notes: 'Focus on mobile-first approach'
            },
            {
                id: '2',
                item: 'Implement user authentication',
                person: { id: 'user2', name: 'Jane Smith', avatar: '/assets/images/avatar2.jpg' },
                status: 'Done',
                priority: 'Critical',
                date: '2025-09-18',
                timeline: { start: '2025-09-10', end: '2025-09-18' },
                budget: 3000,
                files: [],
                notes: 'JWT implementation completed'
            },
            {
                id: '3',
                item: 'Write API documentation',
                person: { id: 'user3', name: 'Mike Johnson', avatar: '/assets/images/avatar3.jpg' },
                status: 'Not Started',
                priority: 'Medium',
                date: '2025-09-30',
                timeline: { start: '2025-09-25', end: '2025-09-30' },
                budget: 1500,
                files: [],
                notes: 'Use OpenAPI 3.0 specification'
            },
            {
                id: '4',
                item: 'Set up CI/CD pipeline',
                person: { id: 'user4', name: 'Sarah Wilson', avatar: '/assets/images/avatar4.jpg' },
                status: 'Stuck',
                priority: 'High',
                date: '2025-09-22',
                timeline: { start: '2025-09-20', end: '2025-09-25' },
                budget: 2000,
                files: ['pipeline.yml'],
                notes: 'Docker configuration issues'
            }
        ];
    }

    async loadItems() {
        try {
            // In a real app, this would load items from the API
            // const items = await this.apiClient.get(`/api/boards/${this.currentBoard.id}/items`);
            // this.items = items.data;
        } catch (error) {
            console.error('Error loading items:', error);
        }
    }

    loadColumns() {
        // In a real app, this would load columns from board configuration
        // For now, use demo columns
    }

    render() {
        this.container.innerHTML = this.getHTML();
    }

    getHTML() {
        return `
            <div class="monday-board">
                <div class="board-header">
                    <div class="board-title">
                        <h2>${this.currentBoard.name}</h2>
                        <div class="board-actions">
                            <button class="btn-add-item" data-action="add-item">
                                + Add Item
                            </button>
                            <div class="view-switcher">
                                <button class="view-btn ${this.options.view === 'table' ? 'active' : ''}" data-view="table">
                                    📊 Table
                                </button>
                                <button class="view-btn ${this.options.view === 'kanban' ? 'active' : ''}" data-view="kanban">
                                    📋 Kanban
                                </button>
                                <button class="view-btn ${this.options.view === 'calendar' ? 'active' : ''}" data-view="calendar">
                                    📅 Calendar
                                </button>
                                <button class="view-btn ${this.options.view === 'timeline' ? 'active' : ''}" data-view="timeline">
                                    📈 Timeline
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="board-content">
                    ${this.renderCurrentView()}
                </div>
            </div>

            <style>
                .monday-board {
                    background: #f6f7fb;
                    min-height: 100vh;
                    padding: 20px;
                }
                
                .board-header {
                    background: white;
                    padding: 20px;
                    border-radius: 8px;
                    margin-bottom: 20px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                
                .board-title {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .board-title h2 {
                    margin: 0;
                    color: #323338;
                    font-size: 24px;
                }
                
                .board-actions {
                    display: flex;
                    gap: 15px;
                    align-items: center;
                }
                
                .btn-add-item {
                    background: #0073ea;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 500;
                    transition: background 0.2s;
                }
                
                .btn-add-item:hover {
                    background: #005bb5;
                }
                
                .view-switcher {
                    display: flex;
                    gap: 5px;
                    background: #f5f6f8;
                    padding: 4px;
                    border-radius: 6px;
                }
                
                .view-btn {
                    background: none;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: all 0.2s;
                }
                
                .view-btn.active {
                    background: white;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                }
                
                .board-content {
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    overflow: hidden;
                }
                
                .table-view {
                    overflow-x: auto;
                }
                
                .monday-table {
                    width: 100%;
                    border-collapse: collapse;
                    min-width: 1000px;
                }
                
                .monday-table th {
                    background: #f5f6f8;
                    padding: 12px 16px;
                    text-align: left;
                    font-weight: 600;
                    color: #323338;
                    border-bottom: 1px solid #e1e4e9;
                    position: sticky;
                    top: 0;
                    z-index: 10;
                }
                
                .monday-table td {
                    padding: 12px 16px;
                    border-bottom: 1px solid #e1e4e9;
                    vertical-align: middle;
                    position: relative;
                }
                
                .monday-table tr:hover {
                    background: #f8f9fb;
                }
                
                .cell-content {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    min-height: 20px;
                    cursor: pointer;
                }
                
                .status-cell {
                    padding: 4px 12px;
                    border-radius: 16px;
                    font-size: 12px;
                    font-weight: 500;
                    text-align: center;
                    min-width: 80px;
                    cursor: pointer;
                }
                
                .status-not-started { background: #c4c4c4; color: white; }
                .status-working { background: #fdab3d; color: white; }
                .status-stuck { background: #e2445c; color: white; }
                .status-done { background: #00c875; color: white; }
                
                .priority-cell {
                    padding: 4px 12px;
                    border-radius: 16px;
                    font-size: 12px;
                    font-weight: 500;
                    text-align: center;
                    min-width: 60px;
                    cursor: pointer;
                }
                
                .priority-low { background: #579bfc; color: white; }
                .priority-medium { background: #fdab3d; color: white; }
                .priority-high { background: #e2445c; color: white; }
                .priority-critical { background: #401694; color: white; }
                
                .person-cell {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                }
                
                .person-avatar {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    object-fit: cover;
                }
                
                .date-cell {
                    color: #676879;
                    cursor: pointer;
                }
                
                .files-cell {
                    display: flex;
                    gap: 4px;
                }
                
                .file-count {
                    background: #e1e4e9;
                    color: #676879;
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-size: 12px;
                    cursor: pointer;
                }
                
                .timeline-cell {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                }
                
                .timeline-bar {
                    height: 8px;
                    background: #0073ea;
                    border-radius: 4px;
                    min-width: 60px;
                    position: relative;
                }
                
                .cell-editor {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: white;
                    border: 2px solid #0073ea;
                    border-radius: 4px;
                    z-index: 20;
                }
                
                .cell-editor input,
                .cell-editor select,
                .cell-editor textarea {
                    width: 100%;
                    height: 100%;
                    border: none;
                    outline: none;
                    padding: 8px;
                    font-size: 14px;
                    background: transparent;
                }
                
                .dropdown-menu {
                    position: absolute;
                    top: 100%;
                    left: 0;
                    right: 0;
                    background: white;
                    border: 1px solid #e1e4e9;
                    border-radius: 6px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    z-index: 30;
                    max-height: 200px;
                    overflow-y: auto;
                }
                
                .dropdown-item {
                    padding: 8px 12px;
                    cursor: pointer;
                    transition: background 0.2s;
                }
                
                .dropdown-item:hover {
                    background: #f5f6f8;
                }
                
                /* Real-time collaboration styles */
                .item-updated {
                    animation: highlight 3s ease-out;
                }
                
                @keyframes highlight {
                    0% { background-color: #e3f2fd; }
                    100% { background-color: white; }
                }
                
                .typing-indicator {
                    position: absolute;
                    bottom: -20px;
                    left: 0;
                    font-size: 12px;
                    color: #676879;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }
                
                .typing-indicator::before {
                    content: "•";
                    color: #4CAF50;
                    font-size: 16px;
                }
            </style>
        `;
    }

    renderCurrentView() {
        switch (this.options.view) {
            case 'table':
                return this.renderTableView();
            case 'kanban':
                return this.renderKanbanView();
            case 'calendar':
                return this.renderCalendarView();
            case 'timeline':
                return this.renderTimelineView();
            default:
                return this.renderTableView();
        }
    }

    renderTableView() {
        const filteredItems = this.getFilteredItems();
        const sortedItems = this.getSortedItems(filteredItems);
        const paginatedItems = this.getPaginatedItems(sortedItems);
        
        const headers = this.columns.map((col, index) => {
            const isSorted = this.sortBy.column === col.id;
            const sortDirection = isSorted ? this.sortBy.direction : 'none';
            
            return `<th style="width: ${col.width}px" 
                         role="columnheader" 
                         tabindex="0"
                         data-column-id="${col.id}"
                         aria-sort="${sortDirection}"
                         aria-label="${col.name} column"
                         class="sortable-header ${isSorted ? 'sorted' : ''}">
                    <div class="column-header-content">
                        <button class="column-sort-btn" 
                                data-column="${col.id}"
                                aria-label="Sort by ${col.name}">
                            <span class="column-name">${col.name}</span>
                            <span class="sort-indicator">
                                ${isSorted ? (sortDirection === 'asc' ? '↑' : '↓') : '↕️'}
                            </span>
                        </button>
                        <button class="column-menu-btn" 
                                aria-label="Column options for ${col.name}"
                                data-column="${col.id}">⋮</button>
                    </div>
                </th>`;
        }).join('');

        const rows = paginatedItems.map((item, rowIndex) => 
            `<tr data-item-id="${item.id}" 
                 role="row"
                 tabindex="-1"
                 aria-rowindex="${rowIndex + 2}"
                 class="table-row ${this.selectedItems.has(item.id) ? 'selected' : ''}">
                <td class="row-selector">
                    <input type="checkbox" 
                           aria-label="Select row ${rowIndex + 1}"
                           data-item-id="${item.id}"
                           class="row-checkbox"
                           ${this.selectedItems.has(item.id) ? 'checked' : ''}>
                    <button class="row-drag-handle" 
                            aria-label="Drag to reorder row ${rowIndex + 1}"
                            tabindex="-1">⋮⋮</button>
                </td>
                ${this.columns.map((col, colIndex) => 
                    `<td data-column="${col.id}" 
                         data-type="${col.type}"
                         role="gridcell"
                         tabindex="-1"
                         aria-describedby="${col.id}-${item.id}-desc"
                         class="editable-cell">
                        ${this.renderCell(item, col)}
                        ${this.renderTypingIndicator(item.id, col.id)}
                    </td>`
                ).join('')}
            </tr>`
        ).join('');

        const bulkActionsVisible = this.selectedItems.size > 0;
        const hasFilters = Object.values(this.filters).some(filter => filter !== null && filter !== '');

        return `
            <div class="table-view">
                <div class="table-toolbar">
                    <div class="toolbar-left">
                        <div class="bulk-actions ${bulkActionsVisible ? 'visible' : ''}">
                            <span class="bulk-count">${this.selectedItems.size} selected</span>
                            <button class="btn btn-sm btn-outline" data-action="bulk-delete">
                                <span class="btn-icon">🗑️</span>
                                Delete
                            </button>
                            <button class="btn btn-sm btn-outline" data-action="bulk-duplicate">
                                <span class="btn-icon">📋</span>
                                Duplicate
                            </button>
                            <button class="btn btn-sm btn-outline" data-action="bulk-export">
                                <span class="btn-icon">📤</span>
                                Export
                            </button>
                        </div>
                    </div>
                    
                    <div class="toolbar-center">
                        <div class="search-container">
                            <input type="text" 
                                   class="search-input" 
                                   placeholder="Search items..."
                                   value="${this.filters.search}"
                                   aria-label="Search items">
                            <button class="search-clear" aria-label="Clear search">×</button>
                        </div>
                    </div>
                    
                    <div class="toolbar-right">
                        <div class="table-controls">
                            <button class="btn btn-sm btn-ghost filter-btn ${hasFilters ? 'active' : ''}" 
                                    aria-label="Filter items">
                                <span class="btn-icon">🔍</span>
                                Filter
                                ${hasFilters ? `<span class="filter-count">${this.getActiveFilterCount()}</span>` : ''}
                            </button>
                            <button class="btn btn-sm btn-ghost view-btn" 
                                    aria-label="Change view">
                                <span class="btn-icon">📊</span>
                                View
                            </button>
                            <button class="btn btn-sm btn-primary add-item-btn">
                                <span class="btn-icon">+</span>
                                Add Item
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="table-container" role="grid" aria-label="Project items table">
                    <div class="table-scroll">
                        <table class="monday-table" role="presentation">
                            <thead role="rowgroup">
                                <tr role="row" aria-rowindex="1">
                                    <th class="row-selector-header">
                                        <input type="checkbox" 
                                               aria-label="Select all rows"
                                               id="select-all-rows"
                                               class="select-all-checkbox"
                                               ${this.selectedItems.size === paginatedItems.length && paginatedItems.length > 0 ? 'checked' : ''}>
                                    </th>
                                    ${headers}
                                </tr>
                            </thead>
                            <tbody role="rowgroup">
                                ${rows}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <div class="table-footer">
                    <div class="footer-left">
                        <span class="item-count">
                            Showing ${paginatedItems.length} of ${filteredItems.length} items
                        </span>
                    </div>
                    
                    <div class="footer-center">
                        <div class="pagination" role="navigation" aria-label="Table pagination">
                            <button class="btn btn-sm btn-ghost pagination-btn" 
                                    data-action="prev" 
                                    ${this.pagination.page === 1 ? 'disabled' : ''}>
                                ← Previous
                            </button>
                            <span class="pagination-info">
                                Page ${this.pagination.page} of ${Math.ceil(filteredItems.length / this.pagination.pageSize)}
                            </span>
                            <button class="btn btn-sm btn-ghost pagination-btn" 
                                    data-action="next" 
                                    ${this.pagination.page >= Math.ceil(filteredItems.length / this.pagination.pageSize) ? 'disabled' : ''}>
                                Next →
                            </button>
                        </div>
                    </div>
                    
                    <div class="footer-right">
                        <div class="page-size-selector">
                            <label for="page-size">Items per page:</label>
                            <select id="page-size" class="page-size-select">
                                <option value="25" ${this.pagination.pageSize === 25 ? 'selected' : ''}>25</option>
                                <option value="50" ${this.pagination.pageSize === 50 ? 'selected' : ''}>50</option>
                                <option value="100" ${this.pagination.pageSize === 100 ? 'selected' : ''}>100</option>
                                <option value="200" ${this.pagination.pageSize === 200 ? 'selected' : ''}>200</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Render typing indicator for a cell if someone is typing
     * @param {string} itemId - Item ID
     * @param {string} columnId - Column ID
     */
    renderTypingIndicator(itemId, columnId) {
        const key = `${itemId}:${columnId}`;
        if (this.typingIndicators.has(key)) {
            const indicator = this.typingIndicators.get(key);
            return `<div class="typing-indicator">${indicator.user.name} is typing...</div>`;
        }
        return '';
    }

    renderCell(item, column) {
        const value = item[column.id];
        
        switch (column.type) {
            case 'text':
            case 'long-text':
                return `<div class="cell-content">${value || ''}</div>`;
                
            case 'person':
                if (!value) return '<div class="cell-content">Unassigned</div>';
                const avatarUrl = this.avatarGenerator.generateAvatar(value.name, 32);
                return `
                    <div class="cell-content person-cell">
                        <img src="${avatarUrl}" alt="${value.name}" class="person-avatar">
                        <span>${value.name}</span>
                    </div>
                `;
                
            case 'status':
                const statusClass = `status-${(value || 'not-started').toLowerCase().replace(/\s+/g, '-')}`;
                return `<div class="cell-content"><div class="status-cell ${statusClass}">${value || 'Not Started'}</div></div>`;
                
            case 'priority':
                const priorityClass = `priority-${(value || 'low').toLowerCase()}`;
                return `<div class="cell-content"><div class="priority-cell ${priorityClass}">${value || 'Low'}</div></div>`;
                
            case 'date':
                return `<div class="cell-content date-cell">${value || ''}</div>`;
                
            case 'timeline':
                if (!value) return '<div class="cell-content">No timeline</div>';
                return `
                    <div class="cell-content timeline-cell">
                        <div class="timeline-bar"></div>
                        <span>${value.start} - ${value.end}</span>
                    </div>
                `;
                
            case 'number':
                return `<div class="cell-content">$${value || 0}</div>`;
                
            case 'files':
                const fileCount = Array.isArray(value) ? value.length : 0;
                return `
                    <div class="cell-content files-cell">
                        ${fileCount > 0 ? `<div class="file-count">${fileCount}</div>` : ''}
                    </div>
                `;
                
            default:
                return `<div class="cell-content">${value || ''}</div>`;
        }
    }

    renderKanbanView() {
        const statusColumns = ['Not Started', 'Working on it', 'Stuck', 'Done'];
        
        return `
            <div class="kanban-view">
                <div class="kanban-columns">
                    ${statusColumns.map(status => `
                        <div class="kanban-column" data-status="${status}">
                            <div class="column-header">
                                <h3>${status}</h3>
                                <span class="item-count">${this.items.filter(item => item.status === status).length}</span>
                            </div>
                            <div class="column-items">
                                ${this.items
                                    .filter(item => item.status === status)
                                    .map(item => this.renderKanbanCard(item))
                                    .join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderKanbanCard(item) {
        return `
            <div class="kanban-card" data-item-id="${item.id}" draggable="true">
                <div class="card-title">${item.item}</div>
                <div class="card-meta">
                    <div class="card-person">
                        <img src="${item.person?.avatar}" alt="${item.person?.name}" class="person-avatar">
                        <span>${item.person?.name || 'Unassigned'}</span>
                    </div>
                    <div class="card-priority priority-${(item.priority || 'low').toLowerCase()}">
                        ${item.priority || 'Low'}
                    </div>
                </div>
                <div class="card-date">${item.date}</div>
            </div>
        `;
    }

    renderCalendarView() {
        return `
            <div class="calendar-view">
                <div class="calendar-header">
                    <h3>Calendar View</h3>
                    <p>Items by due date</p>
                </div>
                <div class="calendar-grid">
                    <!-- Calendar implementation would go here -->
                    <p>Calendar view coming soon...</p>
                </div>
            </div>
        `;
    }

    renderTimelineView() {
        return `
            <div class="timeline-view">
                <div class="timeline-header">
                    <h3>Timeline View</h3>
                    <p>Project timeline and dependencies</p>
                </div>
                <div class="timeline-content">
                    <!-- Timeline implementation would go here -->
                    <p>Timeline view coming soon...</p>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // View switching
        this.container.addEventListener('click', (e) => {
            if (e.target.classList.contains('view-btn')) {
                const view = e.target.dataset.view;
                this.switchView(view);
            }
            
            if (e.target.classList.contains('btn-add-item')) {
                this.addNewItem();
            }
        });

        // Cell editing
        this.container.addEventListener('click', (e) => {
            const cell = e.target.closest('td');
            if (cell && !this.editingCell) {
                this.startCellEdit(cell);
            }
        });

        // Handle clicks outside of editing cell
        document.addEventListener('click', (e) => {
            if (this.editingCell && !this.editingCell.contains(e.target)) {
                this.endCellEdit();
            }
        });

        // Handle keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.editingCell) {
                this.cancelCellEdit();
            }
            if (e.key === 'Enter' && this.editingCell) {
                this.saveCellEdit();
            }
        });
    }

    switchView(view) {
        this.options.view = view;
        
        // Update active button
        this.container.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        
        // Re-render content
        const content = this.container.querySelector('.board-content');
        content.innerHTML = this.renderCurrentView();
    }

    startCellEdit(cell) {
        const columnId = cell.dataset.column;
        const columnType = cell.dataset.type;
        const itemId = cell.closest('tr').dataset.itemId;
        const item = this.items.find(i => i.id === itemId);
        const currentValue = item[columnId];

        this.editingCell = cell;
        cell.style.position = 'relative';

        const editor = this.createCellEditor(columnType, currentValue, cell);
        cell.appendChild(editor);

        // Focus the editor
        const input = editor.querySelector('input, select, textarea');
        if (input) {
            input.focus();
            if (input.type === 'text') {
                input.select();
            }
        }
    }

    createCellEditor(type, currentValue, cell) {
        const editor = document.createElement('div');
        editor.className = 'cell-editor';

        switch (type) {
            case 'text':
            case 'long-text':
                const textInput = type === 'long-text' ? 'textarea' : 'input';
                editor.innerHTML = `<${textInput} type="text" value="${currentValue || ''}" />`;
                break;

            case 'status':
                const statusOptions = ['Not Started', 'Working on it', 'Stuck', 'Done'];
                editor.innerHTML = `
                    <select>
                        ${statusOptions.map(option => 
                            `<option value="${option}" ${option === currentValue ? 'selected' : ''}>${option}</option>`
                        ).join('')}
                    </select>
                `;
                break;

            case 'priority':
                const priorityOptions = ['Low', 'Medium', 'High', 'Critical'];
                editor.innerHTML = `
                    <select>
                        ${priorityOptions.map(option => 
                            `<option value="${option}" ${option === currentValue ? 'selected' : ''}>${option}</option>`
                        ).join('')}
                    </select>
                `;
                break;

            case 'date':
                editor.innerHTML = `<input type="date" value="${currentValue || ''}" />`;
                break;

            case 'number':
                editor.innerHTML = `<input type="number" value="${currentValue || 0}" />`;
                break;

            default:
                editor.innerHTML = `<input type="text" value="${currentValue || ''}" />`;
        }

        return editor;
    }

    endCellEdit() {
        if (!this.editingCell) return;

        this.saveCellEdit();
    }

    saveCellEdit() {
        if (!this.editingCell) return;

        const cell = this.editingCell;
        const editor = cell.querySelector('.cell-editor');
        const input = editor.querySelector('input, select, textarea');
        const newValue = input.value;

        const columnId = cell.dataset.column;
        const itemId = cell.closest('tr').dataset.itemId;
        const item = this.items.find(i => i.id === itemId);

        // Generate optimistic ID for this update
        const optimisticId = `opt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Store the current value for potential rollback
        const oldValue = item[columnId];
        
        // Optimistically update the UI
        item[columnId] = newValue;
        this.render();
        
        // Add to optimistic updates
        this.addOptimisticUpdate(optimisticId, () => {
            item[columnId] = oldValue;
            this.render();
        });

        // Send update to server
        this.updateItemOnServer(itemId, { [columnId]: newValue }, optimisticId);
    }

    cancelCellEdit() {
        if (!this.editingCell) return;

        const cell = this.editingCell;
        const editor = cell.querySelector('.cell-editor');
        editor.remove();

        this.editingCell = null;
    }

    async updateItemOnServer(itemId, updates, optimisticId) {
        try {
            // In a real app, this would update the item on the server
            // const response = await this.apiClient.put(`/api/items/${itemId}`, updates);
            // console.log('Updated item:', itemId, updates);
            
            // For demo purposes, simulate a server call
            setTimeout(() => {
                // Send real-time update to other users
                this.realTimeService.send({
                    type: 'item:update',
                    action: 'updated',
                    boardId: this.options.boardId,
                    itemId,
                    columnId: Object.keys(updates)[0],
                    updates,
                    optimisticId
                });
            }, 300);
        } catch (error) {
            console.error('Error updating item:', error);
            
            // Rollback the optimistic update
            if (optimisticId && this.optimisticUpdates.has(optimisticId)) {
                const rollback = this.optimisticUpdates.get(optimisticId);
                rollback();
                this.optimisticUpdates.delete(optimisticId);
            }
            
            this.errorHandler.handleError(error, 'Update item');
        }
    }

    addNewItem() {
        const newItem = {
            id: `new-item-${Date.now()}`,
            optimisticId: `new-${Date.now()}`,
            item: 'New Item',
            status: 'Not Started',
            priority: 'Medium',
            date: new Date().toISOString().split('T')[0]
        };
        
        // Optimistically add the item
        this.items.push(newItem);
        this.render();
        
        // Add to optimistic updates
        this.addOptimisticUpdate(newItem.optimisticId, () => {
            this.items = this.items.filter(item => item.optimisticId !== newItem.optimisticId);
            this.render();
        });
        
        // Send to server
        setTimeout(() => {
            // In a real app, this would create the item on the server
            // const response = await this.apiClient.post(`/api/boards/${this.options.boardId}/items`, newItem);
            
            // Send real-time update
            this.realTimeService.send({
                type: 'item',
                action: 'created',
                boardId: this.options.boardId,
                item: {
                    ...newItem,
                    id: `server-${Date.now()}` // Server would assign a real ID
                },
                optimisticId: newItem.optimisticId
            });
        }, 300);
    }

    getFilteredItems() {
        return this.items.filter(item => {
            let matches = true;
            
            if (this.filters.status && item.status !== this.filters.status) {
                matches = false;
            }
            
            if (this.filters.priority && item.priority !== this.filters.priority) {
                matches = false;
            }
            
            if (this.filters.assignee && item.person?.id !== this.filters.assignee) {
                matches = false;
            }
            
            if (this.filters.dateRange) {
                const itemDate = new Date(item.date);
                if (itemDate < this.filters.dateRange.start || itemDate > this.filters.dateRange.end) {
                    matches = false;
                }
            }
            
            if (this.filters.search && 
                !item.item.toLowerCase().includes(this.filters.search.toLowerCase())) {
                matches = false;
            }
            
            return matches;
        });
    }

    getSortedItems(items) {
        if (!this.sortBy.column) return items;
        
        return [...items].sort((a, b) => {
            const aValue = a[this.sortBy.column];
            const bValue = b[this.sortBy.column];
            
            if (aValue === bValue) return 0;
            
            if (this.sortBy.direction === 'asc') {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });
    }

    getPaginatedItems(items) {
        const start = (this.pagination.page - 1) * this.pagination.pageSize;
        const end = start + this.pagination.pageSize;
        return items.slice(start, end);
    }

    getActiveFilterCount() {
        return Object.values(this.filters).filter(f => f !== null && f !== '').length;
    }

    destroy() {
        // Clean up real-time subscriptions
        this.cleanupRealTime();
        
        // Remove event listeners
        document.removeEventListener('click', this.handleDocumentClick);
        document.removeEventListener('keydown', this.handleDocumentKeydown);
        
        // Clear container
        this.container.innerHTML = '';
    }
}