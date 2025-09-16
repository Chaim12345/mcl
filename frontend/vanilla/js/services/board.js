/**
 * Board Service for Vanilla JavaScript Frontend
 */

import { authService } from './auth.js';
import { workspaceService } from './workspace.js';
import { eventBus } from '../utils/events.js';
import { state } from '../utils/state.js';

// Configuration constants
const API_BASE_URL = '/api';
const FAVORITE_BOARDS_KEY = 'favorite_boards';
const RECENT_BOARDS_KEY = 'recent_boards';
const MAX_RECENT_BOARDS = 10;

/**
 * Board Service Class
 */
class BoardService {
    constructor() {
        this.boards = [];
        this.favoriteBoards = [];
        this.recentBoards = [];
        this.currentBoard = null;
        
        // Initialize from storage
        this.initializeFromStorage();
    }
    
    /**
     * Initialize board state from local storage
     */
    initializeFromStorage() {
        try {
            const favoriteBoards = localStorage.getItem(FAVORITE_BOARDS_KEY);
            const recentBoards = localStorage.getItem(RECENT_BOARDS_KEY);
            
            if (favoriteBoards) {
                this.favoriteBoards = JSON.parse(favoriteBoards);
            }
            
            if (recentBoards) {
                this.recentBoards = JSON.parse(recentBoards);
            }
            
            // Update global state
            state.set('board', {
                current: this.currentBoard,
                list: this.boards,
                favorites: this.favoriteBoards,
                recent: this.recentBoards
            });
        } catch (error) {
            console.error('Error initializing board from storage:', error);
            this.clearStorage();
        }
    }
    
    /**
     * Make authenticated API request
     */
    async makeRequest(endpoint, options = {}) {
        return await authService.makeRequest(endpoint, options);
    }
    
    /**
     * Get all boards for current workspace
     */
    async getBoards(workspaceId = null) {
        try {
            const currentWorkspace = workspaceId || workspaceService.getCurrentWorkspace()?.id;
            if (!currentWorkspace) {
                throw new Error('No workspace selected');
            }
            
            const response = await this.makeRequest(`/workspaces/${currentWorkspace}/boards`);
            
            if (response.success) {
                this.boards = response.data.boards || [];
                this.updateGlobalState();
                
                eventBus.emit('board:list_updated', { boards: this.boards });
                return this.boards;
            } else {
                throw new Error(response.message || 'Failed to fetch boards');
            }
        } catch (error) {
            eventBus.emit('notification:error', { message: error.message });
            throw error;
        }
    }
    
    /**
     * Get board by ID
     */
    async getBoardById(boardId) {
        try {
            const response = await this.makeRequest(`/boards/${boardId}`);
            
            if (response.success) {
                const board = response.data;
                
                // Add to recent boards
                this.addToRecentBoards(board);
                
                return board;
            } else {
                throw new Error(response.message || 'Failed to fetch board');
            }
        } catch (error) {
            eventBus.emit('notification:error', { message: error.message });
            throw error;
        }
    }
    
    /**
     * Create new board
     */
    async createBoard(boardData) {
        try {
            const currentWorkspace = workspaceService.getCurrentWorkspace();
            if (!currentWorkspace) {
                throw new Error('No workspace selected');
            }
            
            const response = await this.makeRequest(`/workspaces/${currentWorkspace.id}/boards`, {
                method: 'POST',
                body: JSON.stringify(boardData)
            });
            
            if (response.success) {
                const newBoard = response.data;
                this.boards.push(newBoard);
                this.updateGlobalState();
                
                // Add to recent boards
                this.addToRecentBoards(newBoard);
                
                eventBus.emit('board:created', { board: newBoard });
                eventBus.emit('notification:success', { 
                    message: `Board "${newBoard.name}" created successfully!` 
                });
                
                return newBoard;
            } else {
                throw new Error(response.message || 'Failed to create board');
            }
        } catch (error) {
            eventBus.emit('notification:error', { message: error.message });
            throw error;
        }
    }
    
    /**
     * Update board
     */
    async updateBoard(boardId, updateData) {
        try {
            const response = await this.makeRequest(`/boards/${boardId}`, {
                method: 'PUT',
                body: JSON.stringify(updateData)
            });
            
            if (response.success) {
                const updatedBoard = response.data;
                
                // Update in local list
                const index = this.boards.findIndex(b => b.id === boardId);
                if (index !== -1) {
                    this.boards[index] = updatedBoard;
                }
                
                // Update current board if it's the one being updated
                if (this.currentBoard && this.currentBoard.id === boardId) {
                    this.currentBoard = updatedBoard;
                }
                
                // Update in recent boards
                this.updateRecentBoard(updatedBoard);
                
                this.updateGlobalState();
                
                eventBus.emit('board:updated', { board: updatedBoard });
                eventBus.emit('notification:success', { 
                    message: 'Board updated successfully!' 
                });
                
                return updatedBoard;
            } else {
                throw new Error(response.message || 'Failed to update board');
            }
        } catch (error) {
            eventBus.emit('notification:error', { message: error.message });
            throw error;
        }
    }
    
    /**
     * Delete board
     */
    async deleteBoard(boardId) {
        try {
            const response = await this.makeRequest(`/boards/${boardId}`, {
                method: 'DELETE'
            });
            
            if (response.success) {
                // Remove from local list
                this.boards = this.boards.filter(b => b.id !== boardId);
                
                // Remove from favorites and recent
                this.favoriteBoards = this.favoriteBoards.filter(id => id !== boardId);
                this.recentBoards = this.recentBoards.filter(b => b.id !== boardId);
                
                // Clear current board if it's the one being deleted
                if (this.currentBoard && this.currentBoard.id === boardId) {
                    this.currentBoard = null;
                }
                
                this.updateStorage();
                this.updateGlobalState();
                
                eventBus.emit('board:deleted', { boardId });
                eventBus.emit('notification:success', { 
                    message: 'Board deleted successfully!' 
                });
                
                return true;
            } else {
                throw new Error(response.message || 'Failed to delete board');
            }
        } catch (error) {
            eventBus.emit('notification:error', { message: error.message });
            throw error;
        }
    }
    
    /**
     * Duplicate board
     */
    async duplicateBoard(boardId, newName) {
        try {
            const response = await this.makeRequest(`/boards/${boardId}/duplicate`, {
                method: 'POST',
                body: JSON.stringify({ name: newName })
            });
            
            if (response.success) {
                const duplicatedBoard = response.data;
                this.boards.push(duplicatedBoard);
                this.updateGlobalState();
                
                eventBus.emit('board:created', { board: duplicatedBoard });
                eventBus.emit('notification:success', { 
                    message: `Board duplicated as "${duplicatedBoard.name}"!` 
                });
                
                return duplicatedBoard;
            } else {
                throw new Error(response.message || 'Failed to duplicate board');
            }
        } catch (error) {
            eventBus.emit('notification:error', { message: error.message });
            throw error;
        }
    }
    
    /**
     * Switch to board
     */
    async switchBoard(boardId) {
        try {
            const board = await this.getBoardById(boardId);
            this.currentBoard = board;
            this.updateGlobalState();
            
            eventBus.emit('board:switched', { board: this.currentBoard });
            
            return this.currentBoard;
        } catch (error) {
            eventBus.emit('notification:error', { message: error.message });
            throw error;
        }
    }
    
    /**
     * Toggle board favorite status
     */
    toggleFavorite(boardId) {
        const isFavorite = this.favoriteBoards.includes(boardId);
        
        if (isFavorite) {
            this.favoriteBoards = this.favoriteBoards.filter(id => id !== boardId);
            eventBus.emit('notification:info', { message: 'Removed from favorites' });
        } else {
            this.favoriteBoards.push(boardId);
            eventBus.emit('notification:success', { message: 'Added to favorites' });
        }
        
        this.updateStorage();
        this.updateGlobalState();
        
        eventBus.emit('board:favorite_toggled', { boardId, isFavorite: !isFavorite });
        
        return !isFavorite;
    }
    
    /**
     * Check if board is favorite
     */
    isFavorite(boardId) {
        return this.favoriteBoards.includes(boardId);
    }
    
    /**
     * Add board to recent boards
     */
    addToRecentBoards(board) {
        // Remove if already exists
        this.recentBoards = this.recentBoards.filter(b => b.id !== board.id);
        
        // Add to beginning
        this.recentBoards.unshift({
            id: board.id,
            name: board.name,
            workspaceId: board.workspaceId,
            lastAccessed: new Date().toISOString()
        });
        
        // Keep only max recent boards
        this.recentBoards = this.recentBoards.slice(0, MAX_RECENT_BOARDS);
        
        this.updateStorage();
        this.updateGlobalState();
        
        eventBus.emit('board:recent_updated', { recentBoards: this.recentBoards });
    }
    
    /**
     * Update board in recent boards
     */
    updateRecentBoard(board) {
        const index = this.recentBoards.findIndex(b => b.id === board.id);
        if (index !== -1) {
            this.recentBoards[index] = {
                ...this.recentBoards[index],
                name: board.name,
                lastAccessed: new Date().toISOString()
            };
            
            this.updateStorage();
            this.updateGlobalState();
        }
    }
    
    /**
     * Get favorite boards
     */
    getFavoriteBoards() {
        return this.boards.filter(board => this.favoriteBoards.includes(board.id));
    }
    
    /**
     * Get recent boards
     */
    getRecentBoards() {
        return this.recentBoards;
    }
    
    /**
     * Get board templates
     */
    getBoardTemplates() {
        return [
            {
                id: 'blank',
                name: 'Blank Board',
                description: 'Start with an empty board and create your own structure',
                icon: 'layout',
                columns: [
                    { name: 'To Do', type: 'status' },
                    { name: 'In Progress', type: 'status' },
                    { name: 'Done', type: 'status' }
                ]
            },
            {
                id: 'kanban',
                name: 'Kanban Board',
                description: 'Classic kanban workflow for task management',
                icon: 'columns',
                columns: [
                    { name: 'Backlog', type: 'status' },
                    { name: 'To Do', type: 'status' },
                    { name: 'In Progress', type: 'status' },
                    { name: 'Review', type: 'status' },
                    { name: 'Done', type: 'status' }
                ]
            },
            {
                id: 'project_management',
                name: 'Project Management',
                description: 'Complete project tracking with phases and assignments',
                icon: 'clipboard',
                columns: [
                    { name: 'Task', type: 'text' },
                    { name: 'Status', type: 'status' },
                    { name: 'Priority', type: 'priority' },
                    { name: 'Assignee', type: 'person' },
                    { name: 'Due Date', type: 'date' },
                    { name: 'Progress', type: 'number' }
                ]
            },
            {
                id: 'sprint_planning',
                name: 'Sprint Planning',
                description: 'Agile sprint board with story points and estimates',
                icon: 'zap',
                columns: [
                    { name: 'User Story', type: 'text' },
                    { name: 'Status', type: 'status' },
                    { name: 'Story Points', type: 'number' },
                    { name: 'Assignee', type: 'person' },
                    { name: 'Sprint', type: 'text' }
                ]
            },
            {
                id: 'bug_tracking',
                name: 'Bug Tracking',
                description: 'Track and resolve bugs with severity and priority',
                icon: 'bug',
                columns: [
                    { name: 'Bug Title', type: 'text' },
                    { name: 'Status', type: 'status' },
                    { name: 'Severity', type: 'priority' },
                    { name: 'Assignee', type: 'person' },
                    { name: 'Reporter', type: 'person' },
                    { name: 'Created', type: 'date' }
                ]
            },
            {
                id: 'content_calendar',
                name: 'Content Calendar',
                description: 'Plan and track content creation and publishing',
                icon: 'calendar',
                columns: [
                    { name: 'Content Title', type: 'text' },
                    { name: 'Status', type: 'status' },
                    { name: 'Content Type', type: 'text' },
                    { name: 'Author', type: 'person' },
                    { name: 'Publish Date', type: 'date' },
                    { name: 'Platform', type: 'text' }
                ]
            }
        ];
    }
    
    /**
     * Create board from template
     */
    async createBoardFromTemplate(templateId, boardName, workspaceId = null) {
        const templates = this.getBoardTemplates();
        const template = templates.find(t => t.id === templateId);
        
        if (!template) {
            throw new Error('Template not found');
        }
        
        const boardData = {
            name: boardName,
            description: template.description,
            template: templateId,
            columns: template.columns
        };
        
        return await this.createBoard(boardData);
    }
    
    /**
     * Search boards
     */
    searchBoards(query, options = {}) {
        const { 
            includeArchived = false,
            favoritesOnly = false,
            workspaceId = null 
        } = options;
        
        let boards = this.boards;
        
        // Filter by workspace
        if (workspaceId) {
            boards = boards.filter(board => board.workspaceId === workspaceId);
        }
        
        // Filter archived
        if (!includeArchived) {
            boards = boards.filter(board => !board.archived);
        }
        
        // Filter favorites only
        if (favoritesOnly) {
            boards = boards.filter(board => this.favoriteBoards.includes(board.id));
        }
        
        // Search by query
        if (query && query.trim()) {
            const searchTerm = query.toLowerCase();
            boards = boards.filter(board => 
                board.name.toLowerCase().includes(searchTerm) ||
                (board.description && board.description.toLowerCase().includes(searchTerm))
            );
        }
        
        return boards;
    }
    
    /**
     * Get board statistics
     */
    async getBoardStats(boardId) {
        try {
            const response = await this.makeRequest(`/boards/${boardId}/stats`);
            
            if (response.success) {
                return response.data;
            } else {
                throw new Error(response.message || 'Failed to fetch board statistics');
            }
        } catch (error) {
            eventBus.emit('notification:error', { message: error.message });
            throw error;
        }
    }
    
    /**
     * Archive/Unarchive board
     */
    async toggleArchiveBoard(boardId, archived = true) {
        try {
            const response = await this.makeRequest(`/boards/${boardId}/archive`, {
                method: 'PATCH',
                body: JSON.stringify({ archived })
            });
            
            if (response.success) {
                const updatedBoard = response.data;
                
                // Update in local list
                const index = this.boards.findIndex(b => b.id === boardId);
                if (index !== -1) {
                    this.boards[index] = updatedBoard;
                }
                
                this.updateGlobalState();
                
                eventBus.emit('board:updated', { board: updatedBoard });
                eventBus.emit('notification:success', { 
                    message: `Board ${archived ? 'archived' : 'unarchived'} successfully!` 
                });
                
                return updatedBoard;
            } else {
                throw new Error(response.message || `Failed to ${archived ? 'archive' : 'unarchive'} board`);
            }
        } catch (error) {
            eventBus.emit('notification:error', { message: error.message });
            throw error;
        }
    }
    
    /**
     * Update storage with current board data
     */
    updateStorage() {
        try {
            localStorage.setItem(FAVORITE_BOARDS_KEY, JSON.stringify(this.favoriteBoards));
            localStorage.setItem(RECENT_BOARDS_KEY, JSON.stringify(this.recentBoards));
        } catch (error) {
            console.error('Error updating board storage:', error);
        }
    }
    
    /**
     * Update global state
     */
    updateGlobalState() {
        state.set('board', {
            current: this.currentBoard,
            list: this.boards,
            favorites: this.favoriteBoards,
            recent: this.recentBoards
        });
    }
    
    /**
     * Clear storage
     */
    clearStorage() {
        localStorage.removeItem(FAVORITE_BOARDS_KEY);
        localStorage.removeItem(RECENT_BOARDS_KEY);
    }
    
    /**
     * Get current board
     */
    getCurrentBoard() {
        return this.currentBoard;
    }
    
    /**
     * Get all boards
     */
    getAllBoards() {
        return this.boards;
    }
    
    /**
     * Check if user has permission for board action
     */
    hasPermission(permission, board = null) {
        const targetBoard = board || this.currentBoard;
        if (!targetBoard) return false;
        
        // Check workspace permissions first
        if (!workspaceService.hasPermission(permission)) {
            return false;
        }
        
        // Board-specific permissions can be added here
        return true;
    }
    
    /**
     * Cleanup resources
     */
    destroy() {
        this.boards = [];
        this.favoriteBoards = [];
        this.recentBoards = [];
        this.currentBoard = null;
        this.clearStorage();
    }
}

// Create and export singleton instance
export const boardService = new BoardService();

// Export the class for testing
export { BoardService }; 