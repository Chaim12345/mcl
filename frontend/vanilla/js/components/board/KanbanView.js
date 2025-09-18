/**
 * Monday.com-style Kanban Board Component with Complete Functionality
 */

import { ApiClient } from '../../services/ApiClient.js';
import { BoardService } from '../../services/boardService.js';
import { ValidationSystem, ErrorDisplay } from '../../utils/ValidationSystem.js';
import AccessibilityManager from '../../utils/AccessibilityManager.js';
import AvatarGenerator from '../../utils/AvatarGenerator.js';
import ErrorHandler from '../../utils/ErrorHandler.js';
import { RealTimeService } from '../../utils/realTimeService.js';
import { eventBus } from '../../utils/eventBus.js';

export class KanbanView {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            boardId: options.boardId,
            ...options
        };
        
        this.apiClient = new ApiClient();
        this.boardService = new BoardService(this.apiClient);
        this.currentBoard = null;
        this.items = [];
        this.columns = [];
        this.draggedItem = null;
        this.draggedColumn = null;
        this.editingCard = null;
        
        // Enhanced features
        this.validator = new ValidationSystem();
        this.errorDisplay = new ErrorDisplay(this.container);
        this.accessibilityManager = new AccessibilityManager();
        this.avatarGenerator = new AvatarGenerator();
        this.errorHandler = new ErrorHandler();
        this.loadingStates = new Map();
        this.bulkActions = new Set();
        this.selectedCards = new Set();
        this.filters = {
            status: null,
            priority: null,
            assignee: null,
            dateRange: null,
            search: ''
        };
        
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
        this.setupDragAndDrop();
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
     * Handle item movement (reordering or column change)
     * @param {Object} payload - Item movement payload
     */
    handleItemMoved(payload) {
        if (payload.boardId !== this.currentBoard.id) return;
        
        // Check if this is our own optimistic update
        if (payload.optimisticId && this.optimisticUpdates.has(payload.optimisticId)) {
            this.optimisticUpdates.delete(payload.optimisticId);
            return; // Already applied optimistically
        }
        
        // Find and move the item
        const itemIndex = this.items.findIndex(item => item.id === payload.itemId);
        if (itemIndex !== -1) {
            const [movedItem] = this.items.splice(itemIndex, 1);
            
            // Update the item's status/column
            movedItem.status = payload.newStatus;
            
            // Add back to the items array
            this.items.push(movedItem);
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
        }
    }
    
    /**
     * Handle user leaving the board
     * @param {Object} user - User who left
     */
    handleUserLeft(user) {
        this.userPresence.delete(user.id);
        
        // Announce for accessibility
        if (user.id !== this.currentUser?.id) {
            this.accessibilityManager.announce(`${user.name} left the board`);
        }
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
            { id: 'not-started', name: 'Not Started', status: 'Not Started' },
            { id: 'working', name: 'Working on it', status: 'Working on it' },
            { id: 'stuck', name: 'Stuck', status: 'Stuck' },
            { id: 'done', name: 'Done', status: 'Done' }
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
            <div class="kanban-board">
                <div class="board-header">
                    <div class="board-title">
                        <h2>${this.currentBoard.name}</h2>
                        <div class="board-actions">
                            <button class="btn-add-item" data-action="add-item">
                                + Add Item
                            </button>
                            <div class="view-switcher">
                                <button class="view-btn" data-view="table">
                                    📊 Table
                                </button>
                                <button class="view-btn active" data-view="kanban">
                                    📋 Kanban
                                </button>
                                <button class="view-btn" data-view="calendar">
                                    📅 Calendar
                                </button>
                                <button class="view-btn" data-view="timeline">
                                    📈 Timeline
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="board-content">
                    ${this.renderKanbanView()}
                </div>
            </div>

            <style>
                .kanban-board {
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
                
                .kanban-view {
                    display: flex;
                    gap: 20px;
                    padding: 20px;
                    overflow-x: auto;
                    min-height: calc(100vh - 200px);
                }
                
                .kanban-column {
                    min-width: 300px;
                    background: #f5f6f8;
                    border-radius: 8px;
                    display: flex;
                    flex-direction: column;
                }
                
                .column-header {
                    padding: 12px 16px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 1px solid #e1e4e9;
                }
                
                .column-title {
                    font-weight: 600;
                    color: #323338;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .item-count {
                    background: #e1e4e9;
                    color: #676879;
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-size: 12px;
                }
                
                .column-menu {
                    background: none;
                    border: none;
                    cursor: pointer;
                    color: #676879;
                    font-size: 16px;
                }
                
                .column-items {
                    padding: 12px 16px;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    flex-grow: 1;
                    min-height: 50px;
                }
                
                .kanban-card {
                    background: white;
                    border-radius: 6px;
                    padding: 12px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                    cursor: pointer;
                    transition: transform 0.2s, box-shadow 0.2s;
                    position: relative;
                }
                
                .kanban-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                }
                
                .kanban-card.dragging {
                    opacity: 0.7;
                    transform: scale(1.03);
                    z-index: 100;
                    box-shadow: 0 6px 12px rgba(0,0,0,0.15);
                }
                
                .card-title {
                    font-weight: 500;
                    margin-bottom: 8px;
                    color: #323338;
                    line-height: 1.3;
                }
                
                .card-meta {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 12px;
                    color: #676879;
                }
                
                .card-person {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                
                .person-avatar {
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    object-fit: cover;
                }
                
                .card-priority {
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-size: 11px;
                    font-weight: 500;
                }
                
                .priority-low { background: #579bfc; color: white; }
                .priority-medium { background: #fdab3d; color: white; }
                .priority-high { background: #e2445c; color: white; }
                .priority-critical { background: #401694; color: white; }
                
                .card-date {
                    margin-top: 8px;
                    font-size: 12px;
                    color: #676879;
                }
                
                .card-highlight {
                    animation: highlight 3s ease-out;
                }
                
                @keyframes highlight {
                    0% { background-color: #e3f2fd; }
                    100% { background-color: white; }
                }
                
                .kanban-column.drag-over {
                    background: #e3f2fd;
                }
            </style>
        `;
    }
    
    renderKanbanView() {
        // Group items by status
        const statusColumns = this.createStatusColumns();
        const hasItems = this.items.length > 0;
        
        return `
            <div class="kanban-view">
                ${statusColumns.map(status => `
                    <div class="kanban-column" data-status="${status}">
                        <div class="column-header">
                            <div class="column-title">
                                ${this.getStatusIcon(status)}
                                <span>${status}</span>
                            </div>
                            <span class="item-count">
                                ${this.items.filter(item => item.status === status).length}
                            </span>
                        </div>
                        <div class="column-items" data-status="${status}">
                            ${hasItems 
                                ? this.items
                                    .filter(item => item.status === status)
                                    .map(item => this.renderKanbanCard(item))
                                    .join('')
                                : '<div class="empty-column">Drag items here</div>'
                            }
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    createStatusColumns() {
        // Get unique status values from items
        const statuses = new Set();
        this.items.forEach(item => {
            statuses.add(item.status);
        });
        
        // Default order for common statuses
        const defaultOrder = ['Not Started', 'Working on it', 'Stuck', 'Done'];
        
        // Sort by default order if possible, otherwise alphabetically
        return Array.from(statuses).sort((a, b) => {
            const indexA = defaultOrder.indexOf(a);
            const indexB = defaultOrder.indexOf(b);
            
            if (indexA !== -1 && indexB !== -1) {
                return indexA - indexB;
            }
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
            
            return a.localeCompare(b);
        });
    }
    
    getStatusIcon(status) {
        switch (status) {
            case 'Not Started':
                return '⚪';
            case 'Working on it':
                return '🔵';
            case 'Stuck':
                return '🔴';
            case 'Done':
                return '🟢';
            default:
                return '⚫';
        }
    }

    renderKanbanCard(item) {
        const avatarUrl = item.person ? this.avatarGenerator.generateAvatar(item.person.name, 20) : '';
        const priorityClass = item.priority ? `priority-${item.priority.toLowerCase()}` : '';
        
        return `
            <div class="kanban-card" 
                 data-item-id="${item.id}"
                 draggable="true">
                <div class="card-title">${item.item}</div>
                <div class="card-meta">
                    <div class="card-person">
                        ${item.person ? `<img src="${avatarUrl}" alt="${item.person.name}" class="person-avatar">` : ''}
                        <span>${item.person?.name || 'Unassigned'}</span>
                    </div>
                    ${item.priority ? `<div class="card-priority ${priorityClass}">${item.priority}</div>` : ''}
                </div>
                ${item.date ? `<div class="card-date">${this.formatDate(item.date)}</div>` : ''}
            </div>
        `;
    }
    
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
        });
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
            
            // Card click handler
            const card = e.target.closest('.kanban-card');
            if (card) {
                const itemId = card.dataset.itemId;
                this.openCardDetail(itemId);
            }
        });
    }
    
    setupDragAndDrop() {
        // Column drag over/out handlers
        this.container.querySelectorAll('.column-items').forEach(column => {
            column.addEventListener('dragover', (e) => {
                e.preventDefault();
                column.classList.add('drag-over');
            });
            
            column.addEventListener('dragleave', () => {
                column.classList.remove('drag-over');
            });
            
            column.addEventListener('drop', (e) => {
                e.preventDefault();
                column.classList.remove('drag-over');
                
                if (this.draggedItem && this.draggedColumn !== column) {
                    const status = column.dataset.status;
                    this.moveItemToStatus(this.draggedItem, status);
                }
            });
        });
        
        // Card drag handlers
        this.container.querySelectorAll('.kanban-card').forEach(card => {
            card.addEventListener('dragstart', (e) => {
                this.draggedItem = card.dataset.itemId;
                this.draggedColumn = card.closest('.column-items');
                card.classList.add('dragging');
                
                // Set drag image
                const dragImage = document.createElement('div');
                dragImage.className = 'kanban-card';
                dragImage.style.width = `${card.offsetWidth}px`;
                dragImage.innerHTML = card.innerHTML;
                document.body.appendChild(dragImage);
                e.dataTransfer.setDragImage(dragImage, 0, 0);
                setTimeout(() => {
                    dragImage.remove();
                }, 0);
            });
            
            card.addEventListener('dragend', () => {
                card.classList.remove('dragging');
                this.draggedItem = null;
                this.draggedColumn = null;
            });
        });
    }
    
    moveItemToStatus(itemId, newStatus) {
        const itemIndex = this.items.findIndex(item => item.id === itemId);
        if (itemIndex === -1) return;
        
        // Generate optimistic ID for this update
        const optimisticId = `opt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Store the current status for potential rollback
        const oldStatus = this.items[itemIndex].status;
        
        // Optimistically update the UI
        this.items[itemIndex].status = newStatus;
        this.render();
        
        // Add to optimistic updates
        this.addOptimisticUpdate(optimisticId, () => {
            this.items[itemIndex].status = oldStatus;
            this.render();
        });
        
        // Send update to server
        this.updateItemOnServer(itemId, { status: newStatus }, optimisticId);
    }
    
    addOptimisticUpdate(optimisticId, rollback) {
        this.optimisticUpdates.set(optimisticId, rollback);
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
                    type: 'item',
                    action: 'moved',
                    boardId: this.options.boardId,
                    itemId,
                    newStatus: updates.status,
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
    
    switchView(view) {
        // In a real app, this would navigate to the appropriate view
        console.log(`Switching to ${view} view`);
    }
    
    openCardDetail(itemId) {
        const item = this.items.find(i => i.id === itemId);
        if (!item) return;
        
        // Create modal for card detail
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${item.item}</h2>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="card-detail">
                        <div class="detail-section">
                            <h3>Description</h3>
                            <p>${item.notes || 'No description provided'}</p>
                        </div>
                        
                        <div class="detail-section">
                            <h3>Assignee</h3>
                            ${item.person ? `
                                <div class="person-detail">
                                    <img src="${this.avatarGenerator.generateAvatar(item.person.name, 32)}" 
                                         alt="${item.person.name}" 
                                         class="person-avatar-large">
                                    <span>${item.person.name}</span>
                                </div>
                            ` : '<p>Unassigned</p>'}
                        </div>
                        
                        <div class="detail-section">
                            <h3>Status</h3>
                            <select class="status-select" data-item-id="${item.id}">
                                ${['Not Started', 'Working on it', 'Stuck', 'Done'].map(status => 
                                    `<option value="${status}" ${item.status === status ? 'selected' : ''}>${status}</option>`
                                ).join('')}
                            </select>
                        </div>
                        
                        <div class="detail-section">
                            <h3>Priority</h3>
                            <select class="priority-select" data-item-id="${item.id}">
                                ${['Low', 'Medium', 'High', 'Critical'].map(priority => 
                                    `<option value="${priority}" ${item.priority === priority ? 'selected' : ''}>${priority}</option>`
                                ).join('')}
                            </select>
                        </div>
                        
                        <div class="detail-section">
                            <h3>Due Date</h3>
                            <input type="date" class="date-input" value="${item.date || ''}" data-item-id="${item.id}">
                        </div>
                        
                        <div class="detail-section">
                            <h3>Comments</h3>
                            <div class="comments-list">
                                ${item.comments && item.comments.length > 0 
                                    ? item.comments.map(comment => `
                                        <div class="comment">
                                            <div class="comment-header">
                                                <img src="${this.avatarGenerator.generateAvatar(comment.user.name, 20)}" 
                                                     alt="${comment.user.name}"
                                                     class="person-avatar">
                                                <span class="comment-author">${comment.user.name}</span>
                                                <span class="comment-time">${this.formatRelativeTime(comment.timestamp)}</span>
                                            </div>
                                            <div class="comment-content">${comment.content}</div>
                                        </div>
                                    `).join('')
                                    : '<p>No comments yet</p>'
                                }
                            </div>
                            <div class="comment-input">
                                <textarea placeholder="Add a comment..."></textarea>
                                <button class="btn btn-primary comment-submit">Add Comment</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Set up close button
        const closeBtn = modal.querySelector('.modal-close');
        closeBtn.addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        // Set up status change
        const statusSelect = modal.querySelector('.status-select');
        statusSelect.addEventListener('change', (e) => {
            const newStatus = e.target.value;
            this.moveItemToStatus(item.id, newStatus);
        });
        
        // Set up priority change
        const prioritySelect = modal.querySelector('.priority-select');
        prioritySelect.addEventListener('change', (e) => {
            const newPriority = e.target.value;
            this.updateItemField(item.id, 'priority', newPriority);
        });
        
        // Set up date change
        const dateInput = modal.querySelector('.date-input');
        dateInput.addEventListener('change', (e) => {
            const newDate = e.target.value;
            this.updateItemField(item.id, 'date', newDate);
        });
    }
    
    updateItemField(itemId, field, value) {
        const itemIndex = this.items.findIndex(item => item.id === itemId);
        if (itemIndex === -1) return;
        
        // Generate optimistic ID for this update
        const optimisticId = `opt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Store the current value for potential rollback
        const oldValue = this.items[itemIndex][field];
        
        // Optimistically update the UI
        this.items[itemIndex][field] = value;
        this.render();
        
        // Add to optimistic updates
        this.addOptimisticUpdate(optimisticId, () => {
            this.items[itemIndex][field] = oldValue;
            this.render();
        });
        
        // Send update to server
        const updates = {};
        updates[field] = value;
        this.updateItemOnServer(itemId, updates, optimisticId);
    }
    
    formatRelativeTime(timestamp) {
        const now = new Date();
        const time = new Date(timestamp);
        const diff = now - time;
        
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (seconds < 60) return 'just now';
        if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
        
        return time.toLocaleDateString();
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
    
    highlightUpdatedItem(itemId) {
        const cardElement = this.container.querySelector(`[data-item-id="${itemId}"]`);
        if (cardElement) {
            cardElement.classList.add('card-highlight');
            setTimeout(() => {
                cardElement.classList.remove('card-highlight');
            }, 3000);
        }
    }
    
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
    
    destroy() {
        // Clean up real-time subscriptions
        this.cleanupRealTime();
        
        // Remove event listeners
        this.container.removeEventListener('click', this.handleDocumentClick);
        this.container.removeEventListener('dragstart', this.handleDragStart);
        
        // Clear container
        this.container.innerHTML = '';
    }
}