/**
 * Calendar View Component for Project Management Board
 * Displays items on a calendar timeline with scheduling capabilities
 */

import { ApiClient } from '../../services/ApiClient.js';
import { BoardService } from '../../services/boardService.js';
import { ValidationSystem, ErrorDisplay } from '../../utils/ValidationSystem.js';
import AccessibilityManager from '../../utils/AccessibilityManager.js';
import AvatarGenerator from '../../utils/AvatarGenerator.js';
import ErrorHandler from '../../utils/ErrorHandler.js';
import { RealTimeService } from '../../utils/realTimeService.js';
import { eventBus } from '../../utils/eventBus.js';

export class CalendarView {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            boardId: options.boardId,
            viewMode: options.viewMode || 'month', // month, week, day
            ...options
        };
        
        this.apiClient = new ApiClient();
        this.boardService = new BoardService(this.apiClient);
        this.currentBoard = null;
        this.items = [];
        this.columns = [];
        this.draggedEvent = null;
        this.currentDate = new Date();
        this.calendarGrid = null;
        
        // Enhanced features
        this.validator = new ValidationSystem();
        this.errorDisplay = new ErrorDisplay(this.container);
        this.accessibilityManager = new AccessibilityManager();
        this.avatarGenerator = new AvatarGenerator();
        this.errorHandler = new ErrorHandler();
        this.loadingStates = new Map();
        this.selectedEvents = new Set();
        
        // Real-time collaboration
        this.realTimeService = new RealTimeService();
        this.realTimeSubscriptions = new Set();
        this.optimisticUpdates = new Map();
        this.userPresence = new Map();
        
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
                default:
                    console.log('Unhandled board event:', event);
            }
        } catch (error) {
            console.error('Error handling board event:', error);
            this.errorHandler.handleError(error, 'Real-time event handling');
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
        this.accessibilityManager.announce(`New item "${payload.item.item}" added to the calendar`);
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
            this.accessibilityManager.announce(
                `Item "${item.item}" updated on the calendar`
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
        this.accessibilityManager.announce(`Item deleted from the calendar`);
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
            description: 'Demo board with calendar functionality'
        };
    }

    createDemoColumns() {
        return [
            { id: 'item', name: 'Item', type: 'text', width: 200 },
            { id: 'date', name: 'Date', type: 'date', width: 120 },
            { id: 'timeline', name: 'Timeline', type: 'timeline', width: 150 }
        ];
    }

    createDemoItems() {
        const today = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(today.getDate() + 7);
        
        return [
            {
                id: '1',
                item: 'Design new landing page',
                date: this.formatDate(today),
                timeline: { start: this.formatDate(today), end: this.formatDate(nextWeek) }
            },
            {
                id: '2',
                item: 'Implement user authentication',
                date: this.formatDate(today),
                timeline: { start: this.formatDate(today), end: this.formatDate(nextWeek) }
            },
            {
                id: '3',
                item: 'Write API documentation',
                date: this.formatDate(nextWeek),
                timeline: { start: this.formatDate(nextWeek), end: this.formatDate(new Date(nextWeek.getTime() + 7 * 24 * 60 * 60 * 1000)) }
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
        this.setupCalendarGrid();
    }

    getHTML() {
        return `
            <div class="calendar-board">
                <div class="board-header">
                    <div class="board-title">
                        <h2>${this.currentBoard.name}</h2>
                        <div class="board-actions">
                            <div class="calendar-controls">
                                <button class="btn-prev" aria-label="Previous period">
                                    <
                                </button>
                                <h3 class="current-period">${this.getCurrentPeriodLabel()}</h3>
                                <button class="btn-next" aria-label="Next period">
                                    >
                                </button>
                            </div>
                            <div class="view-switcher">
                                <button class="view-btn" data-view="table">
                                    📊 Table
                                </button>
                                <button class="view-btn" data-view="kanban">
                                    📋 Kanban
                                </button>
                                <button class="view-btn active" data-view="calendar">
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
                    ${this.renderCalendarView()}
                </div>
            </div>

            <style>
                .calendar-board {
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
                
                .calendar-controls {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                
                .btn-prev, .btn-next {
                    background: none;
                    border: 1px solid #e1e4e9;
                    border-radius: 4px;
                    width: 32px;
                    height: 32px;
                    cursor: pointer;
                    font-weight: bold;
                    color: #323338;
                    transition: background 0.2s;
                }
                
                .btn-prev:hover, .btn-next:hover {
                    background: #f5f6f8;
                }
                
                .current-period {
                    margin: 0;
                    font-size: 18px;
                    color: #323338;
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
                
                .calendar-view {
                    padding: 20px;
                }
                
                .calendar-header {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 15px;
                }
                
                .view-mode-selector {
                    display: flex;
                    gap: 5px;
                }
                
                .view-mode-btn {
                    background: #f5f6f8;
                    border: none;
                    padding: 6px 12px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                }
                
                .view-mode-btn.active {
                    background: #0073ea;
                    color: white;
                }
                
                .calendar-grid {
                    display: grid;
                    grid-template-columns: repeat(7, 1fr);
                    gap: 1px;
                    background: #e1e4e9;
                    border-radius: 8px;
                    overflow: hidden;
                }
                
                .calendar-day-header {
                    background: #f5f6f8;
                    padding: 10px;
                    text-align: center;
                    font-weight: 600;
                    color: #323338;
                }
                
                .calendar-day {
                    background: white;
                    min-height: 150px;
                    padding: 10px;
                    position: relative;
                }
                
                .day-number {
                    font-weight: bold;
                    margin-bottom: 5px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                }
                
                .day-number.today {
                    background: #0073ea;
                    color: white;
                }
                
                .day-events {
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                    overflow-y: auto;
                    max-height: 120px;
                }
                
                .calendar-event {
                    background: #0073ea;
                    color: white;
                    padding: 5px 8px;
                    border-radius: 4px;
                    font-size: 12px;
                    cursor: pointer;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    position: relative;
                }
                
                .event-all-day {
                    background: #4CAF50;
                }
                
                .event-high-priority {
                    border-left: 3px solid #e2445c;
                }
                
                .calendar-day.empty {
                    background: #f8f9fb;
                }
                
                .calendar-day.today {
                    background: #e3f2fd;
                }
                
                .event-tooltip {
                    position: absolute;
                    background: #323338;
                    color: white;
                    padding: 8px;
                    border-radius: 4px;
                    font-size: 12px;
                    z-index: 100;
                    max-width: 200px;
                    display: none;
                }
                
                .calendar-navigation {
                    display: flex;
                    justify-content: center;
                    gap: 10px;
                    margin-top: 15px;
                }
                
                .calendar-navigation button {
                    background: #f5f6f8;
                    border: none;
                    padding: 6px 12px;
                    border-radius: 4px;
                    cursor: pointer;
                }
            </style>
        `;
    }
    
    renderCalendarView() {
        return `
            <div class="calendar-view">
                <div class="calendar-header">
                    <div class="view-mode-selector">
                        <button class="view-mode-btn ${this.options.viewMode === 'month' ? 'active' : ''}" data-view-mode="month">
                            Month
                        </button>
                        <button class="view-mode-btn ${this.options.viewMode === 'week' ? 'active' : ''}" data-view-mode="week">
                            Week
                        </button>
                        <button class="view-mode-btn ${this.options.viewMode === 'day' ? 'active' : ''}" data-view-mode="day">
                            Day
                        </button>
                    </div>
                </div>
                
                <div class="calendar-grid" id="calendar-grid">
                    <!-- Calendar grid will be populated dynamically -->
                </div>
                
                <div class="calendar-navigation">
                    <button class="btn-nav" data-nav="prev-month">< Previous Month</button>
                    <button class="btn-nav" data-nav="next-month">Next Month ></button>
                </div>
            </div>
        `;
    }
    
    setupCalendarGrid() {
        const calendarGrid = this.container.querySelector('#calendar-grid');
        if (!calendarGrid) return;
        
        // Clear existing grid
        calendarGrid.innerHTML = '';
        
        // Create day headers (Sunday to Saturday)
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        days.forEach(day => {
            const header = document.createElement('div');
            header.className = 'calendar-day-header';
            header.textContent = day;
            calendarGrid.appendChild(header);
        });
        
        // Get the first day of the month
        const firstDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
        const startingDay = firstDay.getDay(); // 0 (Sunday) to 6 (Saturday)
        
        // Get the last day of the month
        const lastDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);
        const totalDays = lastDay.getDate();
        
        // Create empty cells for days before the first day of the month
        for (let i = 0; i < startingDay; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'calendar-day empty';
            calendarGrid.appendChild(emptyDay);
        }
        
        // Create cells for each day of the month
        for (let day = 1; day <= totalDays; day++) {
            const dayCell = document.createElement('div');
            dayCell.className = 'calendar-day';
            
            // Check if this is today
            const today = new Date();
            const isToday = day === today.getDate() && 
                           this.currentDate.getMonth() === today.getMonth() && 
                           this.currentDate.getFullYear() === today.getFullYear();
            
            // Create day number element
            const dayNumber = document.createElement('div');
            dayNumber.className = `day-number ${isToday ? 'today' : ''}`;
            dayNumber.textContent = day;
            dayCell.appendChild(dayNumber);
            
            // Create events container
            const eventsContainer = document.createElement('div');
            eventsContainer.className = 'day-events';
            
            // Add events for this day
            const dayEvents = this.getEventsForDay(day);
            dayEvents.forEach(event => {
                const eventElement = document.createElement('div');
                eventElement.className = `calendar-event ${event.allDay ? 'event-all-day' : ''} ${event.priority === 'High' ? 'event-high-priority' : ''}`;
                eventElement.textContent = event.title;
                eventElement.dataset.eventId = event.id;
                
                // Add tooltip for more details
                const tooltip = document.createElement('div');
                tooltip.className = 'event-tooltip';
                tooltip.innerHTML = `
                    <strong>${event.title}</strong><br>
                    ${event.description || ''}
                `;
                eventElement.appendChild(tooltip);
                
                // Hover to show tooltip
                eventElement.addEventListener('mouseenter', () => {
                    tooltip.style.display = 'block';
                });
                
                eventElement.addEventListener('mouseleave', () => {
                    tooltip.style.display = 'none';
                });
                
                eventsContainer.appendChild(eventElement);
            });
            
            dayCell.appendChild(eventsContainer);
            calendarGrid.appendChild(dayCell);
        }
        
        // Fill remaining cells to complete the grid
        const cellsFilled = startingDay + totalDays;
        const cellsRemaining = 42 - cellsFilled; // 6 rows * 7 days
        
        for (let i = 0; i < cellsRemaining; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'calendar-day empty';
            calendarGrid.appendChild(emptyDay);
        }
        
        // Store reference for drag-and-drop
        this.calendarGrid = calendarGrid;
    }
    
    getEventsForDay(day) {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth() + 1;
        const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        
        return this.items.filter(item => {
            // Check if the item has a date that matches this day
            if (item.date === dateStr) {
                return true;
            }
            
            // Check if the item has a timeline that includes this day
            if (item.timeline && item.timeline.start && item.timeline.end) {
                const itemStart = new Date(item.timeline.start);
                const itemEnd = new Date(item.timeline.end);
                const checkDate = new Date(year, month - 1, day);
                
                return checkDate >= itemStart && checkDate <= itemEnd;
            }
            
            return false;
        }).map(item => ({
            id: item.id,
            title: item.item,
            description: item.notes || '',
            allDay: true,
            priority: item.priority
        }));
    }
    
    getCurrentPeriodLabel() {
        switch (this.options.viewMode) {
            case 'month':
                return `${this.currentDate.toLocaleString('default', { month: 'long' })} ${this.currentDate.getFullYear()}`;
            case 'week':
                // Calculate week range
                const startOfWeek = new Date(this.currentDate);
                startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
                
                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(endOfWeek.getDate() + 6);
                
                return `${startOfWeek.toLocaleString('default', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleString('default', { month: 'short', day: 'numeric', year: 'numeric' })}`;
            case 'day':
                return this.currentDate.toLocaleDateString('default', { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric',
                    year: 'numeric' 
                });
            default:
                return `${this.currentDate.toLocaleString('default', { month: 'long' })} ${this.currentDate.getFullYear()}`;
        }
    }
    
    formatDate(date) {
        if (!date) return '';
        const d = new Date(date);
        return d.toISOString().split('T')[0];
    }
    
    setupEventListeners() {
        // View switching
        this.container.addEventListener('click', (e) => {
            if (e.target.classList.contains('view-btn')) {
                const view = e.target.dataset.view;
                this.switchView(view);
            }
            
            if (e.target.classList.contains('view-mode-btn')) {
                const viewMode = e.target.dataset.viewMode;
                this.setViewMode(viewMode);
            }
            
            if (e.target.classList.contains('btn-prev')) {
                this.navigateDate(-1);
            }
            
            if (e.target.classList.contains('btn-next')) {
                this.navigateDate(1);
            }
        });
        
        // Calendar navigation
        this.container.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-nav')) {
                const navAction = e.target.dataset.nav;
                this.handleNavigation(navAction);
            }
        });
        
        // Event click handler
        this.container.addEventListener('click', (e) => {
            const eventElement = e.target.closest('.calendar-event');
            if (eventElement) {
                const eventId = eventElement.dataset.eventId;
                this.openEventDetail(eventId);
            }
        });
        
        // Day click handler for adding new events
        this.container.addEventListener('click', (e) => {
            const dayCell = e.target.closest('.calendar-day:not(.empty)');
            if (dayCell && !e.target.closest('.calendar-event')) {
                const dayNumber = dayCell.querySelector('.day-number');
                const day = parseInt(dayNumber.textContent);
                this.addNewEventForDay(day);
            }
        });
    }
    
    switchView(view) {
        // In a real app, this would navigate to the appropriate view
        console.log(`Switching to ${view} view`);
    }
    
    setViewMode(viewMode) {
        this.options.viewMode = viewMode;
        
        // Update active button
        this.container.querySelectorAll('.view-mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.viewMode === viewMode);
        });
        
        // Re-render calendar
        this.render();
    }
    
    navigateDate(direction) {
        if (this.options.viewMode === 'month') {
            this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + direction, 1);
        } else if (this.options.viewMode === 'week') {
            this.currentDate = new Date(this.currentDate.setDate(this.currentDate.getDate() + (direction * 7)));
        } else if (this.options.viewMode === 'day') {
            this.currentDate = new Date(this.currentDate.setDate(this.currentDate.getDate() + direction));
        }
        
        this.render();
    }
    
    handleNavigation(navAction) {
        switch (navAction) {
            case 'prev-month':
                this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() - 1, 1);
                break;
            case 'next-month':
                this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 1);
                break;
        }
        
        this.render();
    }
    
    openEventDetail(eventId) {
        const item = this.items.find(i => i.id === eventId);
        if (!item) return;
        
        // Create modal for event detail
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${item.item}</h2>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="event-detail">
                        <div class="detail-section">
                            <h3>Description</h3>
                            <p>${item.notes || 'No description provided'}</p>
                        </div>
                        
                        <div class="detail-section">
                            <h3>Date</h3>
                            <input type="date" class="date-input" value="${item.date || ''}" data-item-id="${item.id}">
                        </div>
                        
                        <div class="detail-section">
                            <h3>Timeline</h3>
                            <div class="timeline-inputs">
                                <div>
                                    <label>Start:</label>
                                    <input type="date" class="timeline-start" value="${item.timeline?.start || ''}" data-item-id="${item.id}">
                                </div>
                                <div>
                                    <label>End:</label>
                                    <input type="date" class="timeline-end" value="${item.timeline?.end || ''}" data-item-id="${item.id}">
                                </div>
                            </div>
                        </div>
                        
                        <div class="detail-section">
                            <h3>Priority</h3>
                            <select class="priority-select" data-item-id="${item.id}">
                                ${['Low', 'Medium', 'High', 'Critical'].map(priority => 
                                    `<option value="${priority}" ${item.priority === priority ? 'selected' : ''}>${priority}</option>`
                                ).join('')}
                            </select>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary modal-cancel">Cancel</button>
                    <button class="btn btn-danger modal-delete">Delete</button>
                    <button class="btn btn-primary modal-save">Save Changes</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Set up close button
        const closeBtn = modal.querySelector('.modal-close');
        closeBtn.addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        // Set up save button
        const saveBtn = modal.querySelector('.modal-save');
        saveBtn.addEventListener('click', () => {
            const dateInput = modal.querySelector('.date-input');
            const timelineStart = modal.querySelector('.timeline-start');
            const timelineEnd = modal.querySelector('.timeline-end');
            const prioritySelect = modal.querySelector('.priority-select');
            
            const updates = {
                date: dateInput.value,
                timeline: {
                    start: timelineStart.value,
                    end: timelineEnd.value
                },
                priority: prioritySelect.value
            };
            
            this.updateItemOnServer(item.id, updates);
            document.body.removeChild(modal);
        });
        
        // Set up delete button
        const deleteBtn = modal.querySelector('.modal-delete');
        deleteBtn.addEventListener('click', () => {
            this.deleteItem(item.id);
            document.body.removeChild(modal);
        });
    }
    
    addNewEventForDay(day) {
        const newItem = {
            id: `new-item-${Date.now()}`,
            optimisticId: `new-${Date.now()}`,
            item: 'New Task',
            date: this.formatDate(new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), day)),
            timeline: {
                start: this.formatDate(new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), day)),
                end: this.formatDate(new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), day))
            },
            priority: 'Medium'
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
                    action: 'updated',
                    boardId: this.options.boardId,
                    itemId,
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
    
    async deleteItem(itemId) {
        // Find the item to get its current data for potential rollback
        const itemIndex = this.items.findIndex(item => item.id === itemId);
        if (itemIndex === -1) return;
        
        const item = this.items[itemIndex];
        
        // Generate optimistic ID for this update
        const optimisticId = `opt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Store the item for potential rollback
        const itemCopy = { ...item };
        
        // Optimistically remove the item
        this.items = this.items.filter(item => item.id !== itemId);
        this.render();
        
        // Add to optimistic updates
        this.addOptimisticUpdate(optimisticId, () => {
            this.items.splice(itemIndex, 0, itemCopy);
            this.render();
        });
        
        // Send update to server
        setTimeout(() => {
            // In a real app, this would delete the item on the server
            // await this.apiClient.delete(`/api/items/${itemId}`);
            
            // Send real-time update
            this.realTimeService.send({
                type: 'item',
                action: 'deleted',
                boardId: this.options.boardId,
                itemId,
                optimisticId
            });
        }, 300);
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
        
        // Clear container
        this.container.innerHTML = '';
    }
}