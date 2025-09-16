/**
 * Board List Component
 * Displays a list of boards with create functionality
 */

import { ApiClient } from '../../services/ApiClient.js';
import { BoardService } from '../../services/boardService.js';

class BoardList {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.apiClient = new ApiClient('/api');
    this.boardService = new BoardService(this.apiClient);
    this.boards = [];
    this.init();
  }

  async init() {
    await this.loadBoards();
    this.render();
    this.attachEventListeners();
  }

  async loadBoards() {
    try {
      this.boards = await this.boardService.getBoards();
    } catch (error) {
      console.error('Error loading boards:', error);
      // Fallback to sample data for demonstration
      this.boards = [
        {
          id: '1',
          name: 'Project Alpha',
          description: 'Main product development project',
          createdAt: new Date().toISOString()
        },
        {
          id: '2',
          name: 'Marketing Campaign',
          description: 'Q3 marketing initiatives',
          createdAt: new Date().toISOString()
        },
        {
          id: '3',
          name: 'Product Roadmap',
          description: 'Long-term product planning',
          createdAt: new Date().toISOString()
        }
      ];
    }
  }

  render() {
    const boardListHtml = `
      <div class="board-list-container">
        <div class="board-list-header">
          <h2>My Boards</h2>
          <button id="create-board-btn" class="btn btn-primary">Create New Board</button>
        </div>
        <div class="board-grid">
          ${this.renderBoards()}
        </div>
      </div>
    `;
    
    this.container.innerHTML = boardListHtml;
  }

  renderBoards() {
    if (this.boards.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <h3 class="empty-state-title">No boards yet</h3>
          <p class="empty-state-description">Create your first board to get started</p>
          <button id="create-first-board-btn" class="btn btn-primary">Create Board</button>
        </div>
      `;
    }

    return this.boards.map(board => `
      <div class="board-card" data-board-id="${board.id}">
        <div class="board-card-content">
          <h3 class="board-title">${board.name}</h3>
          <p class="board-description">${board.description || 'No description'}</p>
          <div class="board-meta">
            <span class="board-date">Created: ${new Date(board.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
        <div class="board-card-actions">
          <button class="btn btn-secondary btn-sm view-board-btn" data-board-id="${board.id}">View</button>
          <button class="btn btn-danger btn-sm delete-board-btn" data-board-id="${board.id}">Delete</button>
        </div>
      </div>
    `).join('');
  }

  attachEventListeners() {
    // Create board button
    const createBoardBtn = this.container.querySelector('#create-board-btn');
    if (createBoardBtn) {
      createBoardBtn.addEventListener('click', () => this.createBoard());
    }

    // Create first board button (for empty state)
    const createFirstBoardBtn = this.container.querySelector('#create-first-board-btn');
    if (createFirstBoardBtn) {
      createFirstBoardBtn.addEventListener('click', () => this.createBoard());
    }

    // View board buttons
    const viewBoardButtons = this.container.querySelectorAll('.view-board-btn');
    viewBoardButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const boardId = e.target.getAttribute('data-board-id');
        this.viewBoard(boardId);
      });
    });

    // Delete board buttons
    const deleteBoardButtons = this.container.querySelectorAll('.delete-board-btn');
    deleteBoardButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const boardId = e.target.getAttribute('data-board-id');
        this.deleteBoard(boardId);
      });
    });
  }

  async createBoard() {
    const boardName = prompt('Enter board name:');
    if (!boardName) return;

    const boardDescription = prompt('Enter board description (optional):') || '';

    try {
      const newBoard = await this.boardService.createBoard({
        name: boardName,
        description: boardDescription
      });

      this.boards.push(newBoard);
      this.render();
      this.attachEventListeners();
      
      // Show success message
      if (window.showSuccessMessage) {
        window.showSuccessMessage(`Board "${boardName}" created successfully!`);
      }
    } catch (error) {
      console.error('Error creating board:', error);
      if (window.showErrorMessage) {
        window.showErrorMessage('Failed to create board');
      }
    }
  }

  viewBoard(boardId) {
    // Navigate to board page
    window.location.href = `/board?boardId=${boardId}`;
  }

  async deleteBoard(boardId) {
    if (!confirm('Are you sure you want to delete this board? This action cannot be undone.')) {
      return;
    }

    try {
      await this.boardService.deleteBoard(boardId);
      
      // Remove board from local list
      this.boards = this.boards.filter(board => board.id !== boardId);
      this.render();
      this.attachEventListeners();
      
      // Show success message
      if (window.showSuccessMessage) {
        window.showSuccessMessage('Board deleted successfully!');
      }
    } catch (error) {
      console.error('Error deleting board:', error);
      if (window.showErrorMessage) {
        window.showErrorMessage('Failed to delete board');
      }
    }
  }
}

export default BoardList;