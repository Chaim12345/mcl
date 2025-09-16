/**
 * Real-Time Collaboration System with WebSocket
 * Implements live updates, cursor tracking, and collaborative editing
 */

export class RealTimeCollaboration {
    constructor(board) {
        this.board = board;
        this.ws = null;
        this.roomId = null;
        this.userId = null;
        this.userName = null;
        this.userColor = null;
        this.cursors = new Map();
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        
        this.init();
    }

    init() {
        this.setupUserInfo();
        this.connect();
        this.setupEventListeners();
        this.setupCursorTracking();
    }

    setupUserInfo() {
        // Get user info from localStorage or generate demo data
        this.userId = localStorage.getItem('userId') || this.generateUserId();
        this.userName = localStorage.getItem('userName') || 'Anonymous User';
        this.userColor = localStorage.getItem('userColor') || this.generateUserColor();
        
        // Store for persistence
        localStorage.setItem('userId', this.userId);
        localStorage.setItem('userName', this.userName);
        localStorage.setItem('userColor', this.userColor);
    }

    generateUserId() {
        return 'user_' + Math.random().toString(36).substr(2, 9);
    }

    generateUserColor() {
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    connect() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        
        try {
            this.ws = new WebSocket(wsUrl);
            this.setupWebSocketHandlers();
        } catch (error) {
            console.error('WebSocket connection failed:', error);
            this.handleConnectionError();
        }
    }

    setupWebSocketHandlers() {
        this.ws.onopen = () => {
            console.log('WebSocket connected');
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.joinRoom();
            this.showConnectionStatus('connected');
        };

        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this.handleMessage(message);
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };

        this.ws.onclose = () => {
            console.log('WebSocket disconnected');
            this.isConnected = false;
            this.showConnectionStatus('disconnected');
            this.attemptReconnect();
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.handleConnectionError();
        };
    }

    joinRoom() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.roomId = `board_${this.board.options.boardId || 'demo'}`;
            
            this.send({
                type: 'join',
                room: this.roomId,
                userId: this.userId,
                userName: this.userName,
                userColor: this.userColor
            });
        }
    }

    send(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                ...message,
                timestamp: new Date().toISOString(),
                userId: this.userId
            }));
        }
    }

    handleMessage(message) {
        switch (message.type) {
            case 'user_joined':
                this.handleUserJoined(message);
                break;
            case 'user_left':
                this.handleUserLeft(message);
                break;
            case 'cursor_update':
                this.handleCursorUpdate(message);
                break;
            case 'item_updated':
                this.handleItemUpdate(message);
                break;
            case 'item_created':
                this.handleItemCreated(message);
                break;
            case 'item_deleted':
                this.handleItemDeleted(message);
                break;
            case 'column_updated':
                this.handleColumnUpdate(message);
                break;
            case 'comment_added':
                this.handleCommentAdded(message);
                break;
            case 'typing_start':
                this.handleTypingStart(message);
                break;
            case 'typing_stop':
                this.handleTypingStop(message);
                break;
        }
    }

    handleUserJoined(message) {
        if (message.userId !== this.userId) {
            this.showNotification(`${message.userName} joined the board`, 'info');
            this.updateActiveUsersList();
        }
    }

    handleUserLeft(message) {
        if (message.userId !== this.userId) {
            this.showNotification(`${message.userName} left the board`, 'info');
            this.removeUserCursor(message.userId);
            this.updateActiveUsersList();
        }
    }

    handleCursorUpdate(message) {
        if (message.userId !== this.userId) {
            this.updateUserCursor(message);
        }
    }

    handleItemUpdate(message) {
        if (message.userId !== this.userId) {
            this.board.updateItemFromRemote(message.data);
            this.showLiveUpdateIndicator(message.data.itemId);
        }
    }

    handleItemCreated(message) {
        if (message.userId !== this.userId) {
            this.board.addItemFromRemote(message.data);
            this.showNotification(`${message.userName} created a new item`, 'info');
        }
    }

    handleItemDeleted(message) {
        if (message.userId !== this.userId) {
            this.board.removeItemFromRemote(message.data.itemId);
            this.showNotification(`${message.userName} deleted an item`, 'info');
        }
    }

    handleColumnUpdate(message) {
        if (message.userId !== this.userId) {
            this.board.updateColumnFromRemote(message.data);
        }
    }

    handleCommentAdded(message) {
        if (message.userId !== this.userId) {
            this.board.addCommentFromRemote(message.data);
            this.showNotification(`${message.userName} added a comment`, 'info');
        }
    }

    handleTypingStart(message) {
        if (message.userId !== this.userId) {
            this.showTypingIndicator(message.userName);
        }
    }

    handleTypingStop(message) {
        if (message.userId !== this.userId) {
            this.hideTypingIndicator(message.userName);
        }
    }

    // Cursor tracking
    setupCursorTracking() {
        document.addEventListener('mousemove', (e) => {
            this.sendCursorPosition(e.clientX, e.clientY);
        });

        document.addEventListener('mouseleave', () => {
            this.sendCursorPosition(null, null);
        });
    }

    sendCursorPosition(x, y) {
        this.send({
            type: 'cursor_update',
            x: x,
            y: y,
            element: document.elementFromPoint(x, y)?.tagName || null
        });
    }

    updateUserCursor(message) {
        if (!message.x || !message.y) {
            this.removeUserCursor(message.userId);
            return;
        }

        let cursor = this.cursors.get(message.userId);
        if (!cursor) {
            cursor = this.createUserCursor(message);
            this.cursors.set(message.userId, cursor);
        }

        cursor.style.left = message.x + 'px';
        cursor.style.top = message.y + 'px';
        cursor.style.display = 'block';
    }

    createUserCursor(message) {
        const cursor = document.createElement('div');
        cursor.className = 'user-cursor';
        cursor.style.cssText = `
            position: fixed;
            width: 20px;
            height: 20px;
            background: ${message.userColor};
            border-radius: 50%;
            pointer-events: none;
            z-index: 10000;
            display: none;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        `;

        const label = document.createElement('div');
        label.textContent = message.userName;
        label.style.cssText = `
            position: absolute;
            top: -25px;
            left: 0;
            background: ${message.userColor};
            color: white;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 12px;
            white-space: nowrap;
            pointer-events: none;
        `;

        cursor.appendChild(label);
        document.body.appendChild(cursor);
        return cursor;
    }

    removeUserCursor(userId) {
        const cursor = this.cursors.get(userId);
        if (cursor) {
            cursor.remove();
            this.cursors.delete(userId);
        }
    }

    // Live updates for board operations
    notifyItemUpdate(itemId, changes) {
        this.send({
            type: 'item_updated',
            data: {
                itemId: itemId,
                changes: changes
            }
        });
    }

    notifyItemCreated(item) {
        this.send({
            type: 'item_created',
            data: item
        });
    }

    notifyItemDeleted(itemId) {
        this.send({
            type: 'item_deleted',
            data: {
                itemId: itemId
            }
        });
    }

    notifyColumnUpdate(columnId, changes) {
        this.send({
            type: 'column_updated',
            data: {
                columnId: columnId,
                changes: changes
            }
        });
    }

    notifyCommentAdded(comment) {
        this.send({
            type: 'comment_added',
            data: comment
        });
    }

    // Typing indicators
    notifyTypingStart(elementId) {
        this.send({
            type: 'typing_start',
            elementId: elementId
        });
    }

    notifyTypingStop(elementId) {
        this.send({
            type: 'typing_stop',
            elementId: elementId
        });
    }

    // UI Updates
    showLiveUpdateIndicator(itemId) {
        const element = document.querySelector(`[data-item-id="${itemId}"]`);
        if (element) {
            element.classList.add('live-update');
            setTimeout(() => {
                element.classList.remove('live-update');
            }, 2000);
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `collaboration-notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'info' ? '#0073ea' : '#e2445c'};
            color: white;
            padding: 12px 16px;
            border-radius: 6px;
            z-index: 10001;
            animation: slideInRight 0.3s ease;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }

    showConnectionStatus(status) {
        const statusEl = document.getElementById('connection-status') || this.createConnectionStatus();
        
        statusEl.className = `connection-status ${status}`;
        statusEl.textContent = status === 'connected' ? '🟢 Live' : '🔴 Offline';
        
        if (status === 'connected') {
            statusEl.style.background = '#00c875';
        } else {
            statusEl.style.background = '#e2445c';
        }
    }

    createConnectionStatus() {
        const statusEl = document.createElement('div');
        statusEl.id = 'connection-status';
        statusEl.style.cssText = `
            position: fixed;
            top: 10px;
            left: 10px;
            padding: 6px 12px;
            border-radius: 20px;
            color: white;
            font-size: 12px;
            font-weight: bold;
            z-index: 10000;
            transition: all 0.3s ease;
        `;
        document.body.appendChild(statusEl);
        return statusEl;
    }

    updateActiveUsersList() {
        const usersList = document.getElementById('active-users') || this.createActiveUsersList();
        
        // This would be populated with actual user data from the server
        usersList.innerHTML = `
            <div class="active-users-header">
                <span>👥 Active Users</span>
            </div>
            <div class="active-users-content">
                <div class="user-item" style="color: ${this.userColor}">
                    <div class="user-avatar" style="background: ${this.userColor}"></div>
                    <span>${this.userName} (You)</span>
                </div>
            </div>
        `;
    }

    createActiveUsersList() {
        const usersList = document.createElement('div');
        usersList.id = 'active-users';
        usersList.style.cssText = `
            position: fixed;
            top: 60px;
            left: 10px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            z-index: 10000;
            min-width: 200px;
            max-width: 250px;
        `;
        document.body.appendChild(usersList);
        return usersList;
    }

    showTypingIndicator(userName) {
        const indicator = document.getElementById('typing-indicator') || this.createTypingIndicator();
        indicator.textContent = `${userName} is typing...`;
        indicator.style.display = 'block';
    }

    hideTypingIndicator(userName) {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    }

    createTypingIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'typing-indicator';
        indicator.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 12px;
            z-index: 10000;
            display: none;
        `;
        document.body.appendChild(indicator);
        return indicator;
    }

    // Reconnection logic
    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            this.reconnectDelay *= 2; // Exponential backoff
            
            setTimeout(() => {
                console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
                this.connect();
            }, this.reconnectDelay);
        } else {
            console.error('Max reconnection attempts reached');
            this.showNotification('Connection lost. Please refresh the page.', 'error');
        }
    }

    handleConnectionError() {
        this.isConnected = false;
        this.showConnectionStatus('error');
    }

    // Cleanup
    disconnect() {
        if (this.ws) {
            this.ws.close();
        }
        
        // Remove all cursors
        this.cursors.forEach(cursor => cursor.remove());
        this.cursors.clear();
        
        // Remove UI elements
        const statusEl = document.getElementById('connection-status');
        const usersList = document.getElementById('active-users');
        const indicator = document.getElementById('typing-indicator');
        
        if (statusEl) statusEl.remove();
        if (usersList) usersList.remove();
        if (indicator) indicator.remove();
    }
}

// Add collaboration styles
const collaborationStyles = document.createElement('style');
collaborationStyles.textContent = `
    .live-update {
        animation: liveUpdatePulse 2s ease;
    }
    
    @keyframes liveUpdatePulse {
        0% { background-color: rgba(0, 115, 234, 0.3); }
        50% { background-color: rgba(0, 115, 234, 0.1); }
        100% { background-color: transparent; }
    }
    
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .user-cursor {
        transition: all 0.1s ease;
    }
    
    .active-users-header {
        padding: 12px 16px;
        border-bottom: 1px solid #e1e5e9;
        font-weight: bold;
        font-size: 14px;
    }
    
    .active-users-content {
        padding: 8px 0;
    }
    
    .user-item {
        display: flex;
        align-items: center;
        padding: 8px 16px;
        gap: 8px;
    }
    
    .user-avatar {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        flex-shrink: 0;
    }
`;
document.head.appendChild(collaborationStyles);
