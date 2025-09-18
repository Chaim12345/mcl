# Project Management Platform - Frontend Documentation

## Overview

The frontend is built with **vanilla JavaScript** (no frameworks) following modern web development practices. It provides a responsive, mobile-first user interface with real-time collaboration features, comprehensive component architecture, and production-ready performance optimizations.

## Architecture Overview

### Technology Stack

- **Core**: Vanilla JavaScript ES6+
- **Styling**: CSS3 with CSS Custom Properties
- **Architecture**: Component-based with state management
- **Build**: No build process (served directly)
- **Testing**: Custom test runner with Playwright for E2E
- **Real-time**: WebSocket integration
- **Responsive**: Mobile-first design

### Project Structure

```
frontend/vanilla/
├── index.html              # Landing page
├── css/                    # Stylesheets
│   ├── base/              # Base styles (reset, typography, variables)
│   ├── components/        # Component-specific styles
│   └── utilities/         # Utility classes
├── js/                     # JavaScript modules
│   ├── components/        # UI components
│   ├── services/          # API and business logic services
│   ├── utils/             # Utility functions
│   ├── pages/             # Page-specific logic
│   └── tests/             # Test files
├── assets/                # Static assets
│   ├── images/           # Images and icons
│   └── fonts/            # Custom fonts
└── *.html                 # Application pages
```

## Core Architecture

### Component System

The frontend uses a custom component architecture based on a base `Component` class:

```javascript
// Base Component class
export class Component {
    constructor(element, options = {}) {
        this.element = element;
        this.options = { ...this.defaultOptions, ...options };
        this.state = { ...this.initialState };
        this.eventListeners = new Map();
        this.childComponents = new Map();
        this.isMounted = false;
        
        this.init();
    }
    
    // Lifecycle methods
    init() { /* Override in subclasses */ }
    mount() { /* DOM attachment */ }
    unmount() { /* Cleanup */ }
    render() { /* DOM updates */ }
    
    // State management
    setState(newState) {
        this.state = { ...this.state, ...newState };
        this.render();
    }
    
    // Event handling
    addEventListener(element, event, handler) {
        element.addEventListener(event, handler);
        this.eventListeners.set(`${event}-${Date.now()}`, {
            element, event, handler
        });
    }
}
```

### State Management

**Global State Management**:
```javascript
// Simple state management with event bus
class StateManager {
    constructor() {
        this.state = {};
        this.listeners = new Map();
    }
    
    setState(key, value) {
        const oldValue = this.state[key];
        this.state[key] = value;
        this.notifyListeners(key, value, oldValue);
    }
    
    getState(key) {
        return this.state[key];
    }
    
    subscribe(key, callback) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, []);
        }
        this.listeners.get(key).push(callback);
    }
    
    notifyListeners(key, newValue, oldValue) {
        const callbacks = this.listeners.get(key) || [];
        callbacks.forEach(callback => callback(newValue, oldValue));
    }
}
```

### Event System

**Global Event Bus**:
```javascript
class EventBus {
    constructor() {
        this.events = {};
    }
    
    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    }
    
    emit(event, data) {
        if (this.events[event]) {
            this.events[event].forEach(callback => callback(data));
        }
    }
    
    off(event, callback) {
        if (this.events[event]) {
            this.events[event] = this.events[event].filter(cb => cb !== callback);
        }
    }
}
```

## Key Components

### 1. Application Shell (`js/main.js`)

**Main Application Class**:
```javascript
class App {
    constructor() {
        this.currentUser = null;
        this.currentWorkspace = null;
        this.currentBoard = null;
        this.isAuthenticated = false;
        this.apiClient = new ApiClient('/api');
        this.router = new Router();
        
        this.init();
    }
    
    async init() {
        // Initialize authentication
        await this.checkAuthentication();
        
        // Initialize routing
        this.initializeRouting();
        
        // Initialize global components
        this.initializeGlobalComponents();
        
        // Initialize WebSocket connection
        this.initializeWebSocket();
    }
}
```

### 2. Board Component (`js/components/board/MondayStyleBoard.js`)

**Main Board Interface**:
```javascript
export class MondayStyleBoard {
    constructor(container, options = {}) {
        this.container = container;
        this.options = options;
        this.board = null;
        this.items = [];
        this.columns = [];
        this.selectedItems = new Set();
        
        this.init();
    }
    
    async init() {
        // Load board data
        await this.loadBoard();
        
        // Render board structure
        this.render();
        
        // Initialize interactions
        this.initializeInteractions();
        
        // Setup real-time updates
        this.setupRealTimeUpdates();
    }
    
    render() {
        const html = `
            <div class="board-header">
                <h1 class="board-title">${this.board.name}</h1>
                <div class="board-actions">
                    <button class="btn btn-primary" id="add-item">Add Item</button>
                </div>
            </div>
            <div class="board-table">
                ${this.renderTable()}
            </div>
        `;
        
        this.container.innerHTML = html;
    }
    
    renderTable() {
        return `
            <table class="board-table-element">
                <thead>
                    <tr>
                        <th class="item-column">Item</th>
                        ${this.columns.map(col => `
                            <th class="column-header" data-column-id="${col.id}">
                                ${col.name}
                            </th>
                        `).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${this.items.map(item => this.renderItem(item)).join('')}
                </tbody>
            </table>
        `;
    }
}
```

### 3. API Client (`js/services/ApiClient.js`)

**HTTP API Communication**:
```javascript
class ApiClient {
    constructor(baseURL = '/api') {
        this.baseURL = baseURL;
        this.defaultHeaders = {
            'Content-Type': 'application/json'
        };
    }
    
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: { ...this.defaultHeaders, ...options.headers },
            ...options
        };
        
        // Add authentication token
        const token = localStorage.getItem('auth_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        
        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }
    
    // HTTP methods
    async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }
    
    async post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }
    
    async put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }
    
    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
}
```

### 4. WebSocket Service (`js/services/websocket.js`)

**Real-time Communication**:
```javascript
class WebSocketService {
    constructor() {
        this.ws = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.eventBus = eventBus;
        
        this.connect();
    }
    
    connect() {
        const token = localStorage.getItem('auth_token');
        const wsUrl = `ws://${window.location.host}/ws?token=${token}`;
        
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
            console.log('WebSocket connected');
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.eventBus.emit('websocket:connected');
        };
        
        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
        };
        
        this.ws.onclose = () => {
            console.log('WebSocket disconnected');
            this.isConnected = false;
            this.eventBus.emit('websocket:disconnected');
            this.attemptReconnect();
        };
        
        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.eventBus.emit('websocket:error', error);
        };
    }
    
    handleMessage(data) {
        switch (data.type) {
            case 'item_updated':
                this.eventBus.emit('item:updated', data.data);
                break;
            case 'comment_created':
                this.eventBus.emit('comment:created', data.data);
                break;
            case 'board_updated':
                this.eventBus.emit('board:updated', data.data);
                break;
            default:
                console.warn('Unknown WebSocket message type:', data.type);
        }
    }
    
    send(message) {
        if (this.isConnected && this.ws) {
            this.ws.send(JSON.stringify(message));
        }
    }
}
```

## Service Layer

### 1. Authentication Service (`js/services/auth.js`)

```javascript
class AuthService {
    constructor(apiClient) {
        this.apiClient = apiClient;
        this.currentUser = null;
        this.isAuthenticated = false;
    }
    
    async login(email, password) {
        try {
            const response = await this.apiClient.post('/auth/login', {
                email,
                password
            });
            
            if (response.success) {
                this.setAuthData(response.data);
                return response.data.user;
            } else {
                throw new Error(response.error.message);
            }
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        }
    }
    
    async logout() {
        try {
            await this.apiClient.post('/auth/logout');
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            this.clearAuthData();
        }
    }
    
    setAuthData(data) {
        localStorage.setItem('auth_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        this.currentUser = data.user;
        this.isAuthenticated = true;
        
        eventBus.emit('auth:login', data.user);
    }
    
    clearAuthData() {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        
        this.currentUser = null;
        this.isAuthenticated = false;
        
        eventBus.emit('auth:logout');
    }
}
```

### 2. Board Service (`js/services/boardService.js`)

```javascript
class BoardService {
    constructor(apiClient) {
        this.apiClient = apiClient;
        this.cache = new Map();
    }
    
    async getBoard(boardId) {
        if (this.cache.has(boardId)) {
            return this.cache.get(boardId);
        }
        
        try {
            const response = await this.apiClient.get(`/boards/${boardId}`);
            if (response.success) {
                this.cache.set(boardId, response.data);
                return response.data;
            }
        } catch (error) {
            console.error('Failed to fetch board:', error);
            throw error;
        }
    }
    
    async createItem(boardId, itemData) {
        try {
            const response = await this.apiClient.post(
                `/boards/${boardId}/items`,
                itemData
            );
            
            if (response.success) {
                // Invalidate cache
                this.cache.delete(boardId);
                
                // Emit event for real-time updates
                eventBus.emit('item:created', response.data);
                
                return response.data;
            }
        } catch (error) {
            console.error('Failed to create item:', error);
            throw error;
        }
    }
    
    async updateItem(itemId, updates) {
        try {
            const response = await this.apiClient.put(
                `/items/${itemId}`,
                updates
            );
            
            if (response.success) {
                eventBus.emit('item:updated', response.data);
                return response.data;
            }
        } catch (error) {
            console.error('Failed to update item:', error);
            throw error;
        }
    }
}
```

## UI Components

### 1. Comment System (`js/components/comments/`)

**Comment Thread Component**:
```javascript
class CommentThread extends Component {
    constructor(container, options) {
        super(container, options);
        this.comments = [];
        this.itemId = options.itemId;
    }
    
    get initialState() {
        return {
            loading: false,
            error: null,
            comments: [],
            replyingTo: null
        };
    }
    
    async init() {
        await this.loadComments();
        this.render();
        this.setupEventListeners();
    }
    
    async loadComments() {
        this.setState({ loading: true });
        
        try {
            const response = await apiClient.get(
                `/items/${this.itemId}/comments/threaded`
            );
            
            if (response.success) {
                this.setState({ 
                    comments: response.data,
                    loading: false 
                });
            }
        } catch (error) {
            this.setState({ 
                error: error.message,
                loading: false 
            });
        }
    }
    
    render() {
        const { loading, error, comments } = this.state;
        
        if (loading) {
            this.element.innerHTML = '<div class="loading">Loading comments...</div>';
            return;
        }
        
        if (error) {
            this.element.innerHTML = `<div class="error">Error: ${error}</div>`;
            return;
        }
        
        this.element.innerHTML = `
            <div class="comment-thread">
                <div class="comment-form-container">
                    ${this.renderCommentForm()}
                </div>
                <div class="comments-list">
                    ${comments.map(comment => this.renderComment(comment)).join('')}
                </div>
            </div>
        `;
    }
    
    renderComment(comment) {
        return `
            <div class="comment" data-comment-id="${comment.id}">
                <div class="comment-header">
                    <img class="comment-avatar" src="${comment.author.avatar || '/assets/images/default-avatar.png'}" alt="${comment.author.firstName}">
                    <span class="comment-author">${comment.author.firstName} ${comment.author.lastName}</span>
                    <span class="comment-date">${this.formatDate(comment.createdAt)}</span>
                </div>
                <div class="comment-content">${this.sanitizeHTML(comment.content)}</div>
                <div class="comment-actions">
                    <button class="btn-link reply-btn" data-comment-id="${comment.id}">Reply</button>
                    ${comment.authorId === currentUser.id ? `
                        <button class="btn-link edit-btn" data-comment-id="${comment.id}">Edit</button>
                        <button class="btn-link delete-btn" data-comment-id="${comment.id}">Delete</button>
                    ` : ''}
                </div>
                ${comment.replies && comment.replies.length > 0 ? `
                    <div class="comment-replies">
                        ${comment.replies.map(reply => this.renderComment(reply)).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }
}
```

### 2. Item Management (`js/components/item/`)

**Item Editor Component**:
```javascript
class ItemEditor extends Component {
    constructor(element, options) {
        super(element, options);
        this.item = options.item;
        this.board = options.board;
        this.isEditing = false;
    }
    
    render() {
        const { item, board } = this;
        
        this.element.innerHTML = `
            <div class="item-editor">
                <div class="item-name">
                    <input type="text" 
                           class="item-name-input" 
                           value="${this.escapeHTML(item.name)}"
                           ${this.isEditing ? '' : 'readonly'}>
                </div>
                <div class="item-fields">
                    ${board.columns.map(column => this.renderField(column, item)).join('')}
                </div>
                <div class="item-actions">
                    ${this.isEditing ? `
                        <button class="btn btn-primary save-btn">Save</button>
                        <button class="btn btn-secondary cancel-btn">Cancel</button>
                    ` : `
                        <button class="btn btn-secondary edit-btn">Edit</button>
                    `}
                </div>
            </div>
        `;
    }
    
    renderField(column, item) {
        const fieldValue = item.fieldValues.find(fv => fv.columnId === column.id);
        const value = fieldValue ? fieldValue.value : '';
        
        switch (column.type) {
            case 'status':
                return this.renderStatusField(column, value);
            case 'date':
                return this.renderDateField(column, value);
            case 'person':
                return this.renderPersonField(column, value);
            case 'number':
                return this.renderNumberField(column, value);
            default:
                return this.renderTextField(column, value);
        }
    }
    
    renderStatusField(column, value) {
        const options = column.settings?.options || [];
        
        return `
            <div class="field-container" data-column-id="${column.id}">
                <label class="field-label">${column.name}</label>
                <select class="field-input status-select" ${this.isEditing ? '' : 'disabled'}>
                    <option value="">Select status</option>
                    ${options.map(option => `
                        <option value="${option}" ${value === option ? 'selected' : ''}>
                            ${option}
                        </option>
                    `).join('')}
                </select>
            </div>
        `;
    }
}
```

## Styling Architecture

### CSS Organization

**Base Styles** (`css/base/`):
```css
/* variables.css - CSS Custom Properties */
:root {
  /* Colors */
  --primary-color: #0073ea;
  --secondary-color: #676879;
  --success-color: #00c875;
  --warning-color: #ffcb00;
  --danger-color: #e2445c;
  
  /* Typography */
  --font-family: 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  
  /* Spacing */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  
  /* Layout */
  --header-height: 64px;
  --sidebar-width: 280px;
  --border-radius: 8px;
  --box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Dark theme */
[data-theme="dark"] {
  --primary-color: #4dabf7;
  --background-color: #1a1a1a;
  --surface-color: #2d2d2d;
  --text-color: #ffffff;
  --text-secondary: #b3b3b3;
}
```

**Component Styles** (`css/components/`):
```css
/* board.css - Board component styles */
.board-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.board-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-md);
  border-bottom: 1px solid var(--border-color);
  background: var(--surface-color);
}

.board-table {
  flex: 1;
  overflow: auto;
}

.board-table-element {
  width: 100%;
  border-collapse: collapse;
  min-width: 800px;
}

.board-table-element th,
.board-table-element td {
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--border-color);
  text-align: left;
}

.board-table-element th {
  background: var(--surface-color);
  font-weight: 600;
  position: sticky;
  top: 0;
  z-index: 10;
}

/* Responsive design */
@media (max-width: 768px) {
  .board-table {
    overflow-x: auto;
  }
  
  .board-table-element {
    min-width: 600px;
  }
  
  .board-table-element th,
  .board-table-element td {
    padding: var(--spacing-xs) var(--spacing-sm);
    font-size: var(--font-size-sm);
  }
}
```

## Performance Optimizations

### 1. Lazy Loading (`js/utils/lazyLoading.js`)

```javascript
class LazyLoadingManager {
    constructor() {
        this.observer = null;
        this.lazyElements = new Set();
        this.init();
    }
    
    init() {
        if ('IntersectionObserver' in window) {
            this.observer = new IntersectionObserver(
                this.handleIntersection.bind(this),
                {
                    rootMargin: '50px 0px',
                    threshold: 0.1
                }
            );
        }
    }
    
    observe(element, callback) {
        if (!this.observer) {
            // Fallback for browsers without IntersectionObserver
            callback();
            return;
        }
        
        this.lazyElements.set(element, callback);
        this.observer.observe(element);
    }
    
    handleIntersection(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const callback = this.lazyElements.get(entry.target);
                if (callback) {
                    callback();
                    this.observer.unobserve(entry.target);
                    this.lazyElements.delete(entry.target);
                }
            }
        });
    }
}
```

### 2. Virtual Scrolling

```javascript
class VirtualScrollList {
    constructor(container, options) {
        this.container = container;
        this.items = options.items || [];
        this.itemHeight = options.itemHeight || 50;
        this.renderItem = options.renderItem;
        this.bufferSize = options.bufferSize || 5;
        
        this.scrollTop = 0;
        this.containerHeight = 0;
        this.visibleStart = 0;
        this.visibleEnd = 0;
        
        this.init();
    }
    
    init() {
        this.container.style.position = 'relative';
        this.container.style.overflow = 'auto';
        
        this.scrollContainer = document.createElement('div');
        this.scrollContainer.style.height = `${this.items.length * this.itemHeight}px`;
        
        this.visibleContainer = document.createElement('div');
        this.visibleContainer.style.position = 'absolute';
        this.visibleContainer.style.top = '0';
        this.visibleContainer.style.width = '100%';
        
        this.scrollContainer.appendChild(this.visibleContainer);
        this.container.appendChild(this.scrollContainer);
        
        this.container.addEventListener('scroll', this.handleScroll.bind(this));
        this.updateVisibleItems();
    }
    
    handleScroll() {
        this.scrollTop = this.container.scrollTop;
        this.updateVisibleItems();
    }
    
    updateVisibleItems() {
        const containerHeight = this.container.clientHeight;
        const startIndex = Math.floor(this.scrollTop / this.itemHeight);
        const endIndex = Math.min(
            startIndex + Math.ceil(containerHeight / this.itemHeight) + this.bufferSize,
            this.items.length
        );
        
        this.visibleStart = Math.max(0, startIndex - this.bufferSize);
        this.visibleEnd = endIndex;
        
        this.render();
    }
    
    render() {
        const fragment = document.createDocumentFragment();
        
        for (let i = this.visibleStart; i < this.visibleEnd; i++) {
            const item = this.items[i];
            const element = this.renderItem(item, i);
            element.style.position = 'absolute';
            element.style.top = `${i * this.itemHeight}px`;
            element.style.height = `${this.itemHeight}px`;
            fragment.appendChild(element);
        }
        
        this.visibleContainer.innerHTML = '';
        this.visibleContainer.appendChild(fragment);
    }
}
```

## Testing

### Test Structure

```javascript
// tests/test-runner.js
class TestRunner {
    constructor() {
        this.tests = [];
        this.results = {
            passed: 0,
            failed: 0,
            errors: []
        };
    }
    
    test(name, testFn) {
        this.tests.push({ name, testFn });
    }
    
    async run() {
        console.log(`Running ${this.tests.length} tests...`);
        
        for (const test of this.tests) {
            try {
                await test.testFn();
                this.results.passed++;
                console.log(`✓ ${test.name}`);
            } catch (error) {
                this.results.failed++;
                this.results.errors.push({
                    test: test.name,
                    error: error.message
                });
                console.error(`✗ ${test.name}: ${error.message}`);
            }
        }
        
        this.printResults();
    }
    
    printResults() {
        console.log('\nTest Results:');
        console.log(`Passed: ${this.results.passed}`);
        console.log(`Failed: ${this.results.failed}`);
        
        if (this.results.errors.length > 0) {
            console.log('\nFailures:');
            this.results.errors.forEach(({ test, error }) => {
                console.log(`- ${test}: ${error}`);
            });
        }
    }
}

// Usage example
const runner = new TestRunner();

runner.test('API Client should make GET requests', async () => {
    const client = new ApiClient('/api');
    // Mock fetch for testing
    global.fetch = jest.fn(() =>
        Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: {} })
        })
    );
    
    const result = await client.get('/test');
    assert(result.success === true, 'Should return success response');
});

runner.run();
```

### E2E Testing with Playwright

```javascript
// tests/e2e/board.test.js
const { test, expect } = require('@playwright/test');

test.describe('Board Management', () => {
    test.beforeEach(async ({ page }) => {
        // Login before each test
        await page.goto('/login');
        await page.fill('[data-testid="email"]', 'test@example.com');
        await page.fill('[data-testid="password"]', 'password123');
        await page.click('[data-testid="login-button"]');
        await page.waitForURL('/dashboard');
    });
    
    test('should create a new board', async ({ page }) => {
        await page.goto('/boards');
        await page.click('[data-testid="create-board-button"]');
        
        await page.fill('[data-testid="board-name"]', 'Test Board');
        await page.fill('[data-testid="board-description"]', 'Test Description');
        await page.click('[data-testid="save-board-button"]');
        
        await expect(page.locator('[data-testid="board-title"]')).toHaveText('Test Board');
    });
    
    test('should add items to board', async ({ page }) => {
        await page.goto('/board/test-board-id');
        await page.click('[data-testid="add-item-button"]');
        
        await page.fill('[data-testid="item-name"]', 'Test Item');
        await page.press('[data-testid="item-name"]', 'Enter');
        
        await expect(page.locator('[data-testid="board-item"]').first()).toContainText('Test Item');
    });
});
```

## Mobile Responsiveness

### Touch Interactions (`js/utils/TouchManager.js`)

```javascript
class TouchManager {
    constructor() {
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchEndX = 0;
        this.touchEndY = 0;
        this.minSwipeDistance = 50;
    }
    
    handleTouchStart(event) {
        this.touchStartX = event.changedTouches[0].screenX;
        this.touchStartY = event.changedTouches[0].screenY;
    }
    
    handleTouchEnd(event) {
        this.touchEndX = event.changedTouches[0].screenX;
        this.touchEndY = event.changedTouches[0].screenY;
        this.handleGesture();
    }
    
    handleGesture() {
        const deltaX = this.touchEndX - this.touchStartX;
        const deltaY = this.touchEndY - this.touchStartY;
        
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            // Horizontal swipe
            if (Math.abs(deltaX) > this.minSwipeDistance) {
                if (deltaX > 0) {
                    this.onSwipeRight();
                } else {
                    this.onSwipeLeft();
                }
            }
        } else {
            // Vertical swipe
            if (Math.abs(deltaY) > this.minSwipeDistance) {
                if (deltaY > 0) {
                    this.onSwipeDown();
                } else {
                    this.onSwipeUp();
                }
            }
        }
    }
    
    onSwipeLeft() { /* Override in subclasses */ }
    onSwipeRight() { /* Override in subclasses */ }
    onSwipeUp() { /* Override in subclasses */ }
    onSwipeDown() { /* Override in subclasses */ }
}
```

### Responsive CSS

```css
/* Mobile-first responsive design */
.board-container {
    /* Mobile styles (default) */
    padding: var(--spacing-sm);
}

@media (min-width: 768px) {
    /* Tablet styles */
    .board-container {
        padding: var(--spacing-md);
    }
    
    .board-table-element th,
    .board-table-element td {
        padding: var(--spacing-md);
    }
}

@media (min-width: 1024px) {
    /* Desktop styles */
    .board-container {
        padding: var(--spacing-lg);
    }
    
    .sidebar {
        position: fixed;
        left: 0;
        top: var(--header-height);
        width: var(--sidebar-width);
        height: calc(100vh - var(--header-height));
    }
    
    .main-content {
        margin-left: var(--sidebar-width);
    }
}

/* Touch-friendly interactive elements */
@media (hover: none) and (pointer: coarse) {
    .btn {
        min-height: 44px;
        padding: var(--spacing-md);
    }
    
    .table-cell {
        min-height: 48px;
    }
}
```

## Security Features

### Input Sanitization (`js/utils/sanitize.js`)

```javascript
export function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

export function sanitizeHTML(html) {
    const allowedTags = ['b', 'i', 'em', 'strong', 'a', 'p', 'br'];
    const allowedAttributes = {
        'a': ['href', 'title']
    };
    
    // Simple HTML sanitizer (in production, use a library like DOMPurify)
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    function sanitizeNode(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            return node;
        }
        
        if (node.nodeType === Node.ELEMENT_NODE) {
            const tagName = node.tagName.toLowerCase();
            
            if (!allowedTags.includes(tagName)) {
                // Replace with text content
                return document.createTextNode(node.textContent);
            }
            
            // Remove disallowed attributes
            const allowedAttrs = allowedAttributes[tagName] || [];
            Array.from(node.attributes).forEach(attr => {
                if (!allowedAttrs.includes(attr.name)) {
                    node.removeAttribute(attr.name);
                }
            });
        }
        
        // Recursively sanitize children
        Array.from(node.childNodes).forEach(child => {
            const sanitized = sanitizeNode(child);
            if (sanitized !== child) {
                node.replaceChild(sanitized, child);
            }
        });
        
        return node;
    }
    
    sanitizeNode(doc.body);
    return doc.body.innerHTML;
}
```

## Deployment

The frontend is served as static files by the Go backend server. No build process is required, making deployment simple:

1. **Development**: Files served directly from `frontend/vanilla/`
2. **Production**: Files copied into Docker image and served by Go server
3. **CDN**: Static assets can be served from CDN for better performance

## Best Practices

1. **Component Isolation**: Each component is self-contained with its own styles and logic
2. **Event-Driven Architecture**: Components communicate through events, not direct coupling
3. **Progressive Enhancement**: Base functionality works without JavaScript
4. **Accessibility**: ARIA labels, keyboard navigation, screen reader support
5. **Performance**: Lazy loading, virtual scrolling, efficient DOM updates
6. **Security**: Input sanitization, XSS prevention, CSRF protection
7. **Testing**: Comprehensive unit and E2E test coverage

This vanilla JavaScript frontend provides a modern, performant, and maintainable foundation for the project management platform while avoiding framework complexity and bundle size issues.
