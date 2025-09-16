/**
 * Board Service - Handles API interactions and real-time updates for board operations
 */

class BoardService {
  constructor(apiClient, websocketService, eventBus) {
    this.apiClient = apiClient;
    this.websocketService = websocketService;
    this.eventBus = eventBus;
    this.currentBoard = null;
    this.boards = [];
    
    this.initializeWebSocketListeners();
  }

  /**
   * Initialize WebSocket event listeners for real-time updates
   */
  initializeWebSocketListeners() {
    if (!this.eventBus) return;

    this.eventBus.on('board:update', (data) => {
      const { action, payload } = data;
      
      switch (action) {
        case 'created':
          this.handleBoardCreated(payload);
          break;
        case 'updated':
          this.handleBoardUpdated(payload);
          break;
        case 'deleted':
          this.handleBoardDeleted(payload);
          break;
      }
    });

    this.eventBus.on('workspace:switched', (data) => {
      if (data.workspace) {
        this.websocketService?.subscribeToWorkspace(data.workspace.id);
      }
    });
  }

  async getBoards() {
    try {
      const response = await this.apiClient.get('/api/boards');
      this.boards = response.data;
      
      this.boards.forEach(board => {
        this.websocketService?.subscribeToBoard(board.id);
      });
      
      return response.data;
    } catch (error) {
      console.error('Error fetching boards:', error);
      throw error;
    }
  }

  async getBoard(boardId) {
    try {
      const response = await this.apiClient.get(`/api/boards/${boardId}`);
      this.currentBoard = response.data;
      this.websocketService?.subscribeToBoard(boardId);
      return response.data;
    } catch (error) {
      console.error(`Error fetching board ${boardId}:`, error);
      throw error;
    }
  }

  async createBoard(boardData) {
    try {
      const response = await this.apiClient.post('/api/boards', boardData);
      const newBoard = response.data;
      
      this.boards.push(newBoard);
      this.websocketService?.subscribeToBoard(newBoard.id);
      this.eventBus?.emit('board:created', { board: newBoard });
      
      return newBoard;
    } catch (error) {
      console.error('Error creating board:', error);
      throw error;
    }
  }

  async updateBoard(boardId, boardData) {
    try {
      const response = await this.apiClient.put(`/api/boards/${boardId}`, boardData);
      const updatedBoard = response.data;
      
      const index = this.boards.findIndex(b => b.id === boardId);
      if (index !== -1) {
        this.boards[index] = updatedBoard;
      }
      
      if (this.currentBoard && this.currentBoard.id === boardId) {
        this.currentBoard = updatedBoard;
      }
      
      this.eventBus?.emit('board:updated', { board: updatedBoard });
      return updatedBoard;
    } catch (error) {
      console.error(`Error updating board ${boardId}:`, error);
      throw error;
    }
  }

  async deleteBoard(boardId) {
    try {
      await this.apiClient.delete(`/api/boards/${boardId}`);
      
      this.boards = this.boards.filter(b => b.id !== boardId);
      
      if (this.currentBoard && this.currentBoard.id === boardId) {
        this.currentBoard = null;
      }
      
      this.websocketService?.unsubscribe(`board:${boardId}`);
      this.eventBus?.emit('board:deleted', { boardId });
      
      return true;
    } catch (error) {
      console.error(`Error deleting board ${boardId}:`, error);
      throw error;
    }
  }

  handleBoardCreated(board) {
    if (!this.boards.find(b => b.id === board.id)) {
      this.boards.push(board);
      this.websocketService?.subscribeToBoard(board.id);
      this.eventBus?.emit('board:created', { board, source: 'websocket' });
    }
  }

  handleBoardUpdated(board) {
    const index = this.boards.findIndex(b => b.id === board.id);
    if (index !== -1) {
      this.boards[index] = board;
      
      if (this.currentBoard && this.currentBoard.id === board.id) {
        this.currentBoard = board;
      }
      
      this.eventBus?.emit('board:updated', { board, source: 'websocket' });
    }
  }

  handleBoardDeleted(board) {
    this.boards = this.boards.filter(b => b.id !== board.id);
    
    if (this.currentBoard && this.currentBoard.id === board.id) {
      this.currentBoard = null;
    }
    
    this.websocketService?.unsubscribe(`board:${board.id}`);
    this.eventBus?.emit('board:deleted', { boardId: board.id, source: 'websocket' });
  }

  getCurrentBoard() {
    return this.currentBoard;
  }

  getAllBoards() {
    return this.boards;
  }

  setCurrentBoard(board) {
    this.currentBoard = board;
    if (board) {
      this.websocketService?.subscribeToBoard(board.id);
    }
  }

  clearCurrentBoard() {
    if (this.currentBoard) {
      this.websocketService?.unsubscribe(`board:${this.currentBoard.id}`);
    }
    this.currentBoard = null;
  }

  getBoardsByWorkspace(workspaceId) {
    return this.boards.filter(board => board.workspaceId === workspaceId);
  }
}

// Create singleton instance
let boardServiceInstance = null;

const createBoardService = (apiClient, websocketService, eventBus) => {
  if (!boardServiceInstance) {
    boardServiceInstance = new BoardService(apiClient, websocketService, eventBus);
  }
  return boardServiceInstance;
};

export { BoardService, createBoardService };