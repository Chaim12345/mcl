// Main Application Entry Point
console.log('Loading main application...');

// Import required modules
import ApiClient from './services/ApiClient.js';
import BoardService from './services/boardService.js';
import Board from './components/board/Board.js';

// Initialize API client
const apiClient = new ApiClient('/api');

// Initialize services
const boardService = new BoardService(apiClient);

// Global application state
const appState = {
  currentBoard: null,
  boards: []
};

// DOM Ready
document.addEventListener('DOMContentLoaded', async function() {
  console.log('DOM loaded, initializing application...');
  
  // Check if we're on a board page
  const boardContainer = document.getElementById('board-container');
  if (boardContainer) {
    // Initialize board functionality
    initializeBoard();
  }
  
  // Initialize other components
  initializeNavigation();
  initializeEventListeners();
});

// Initialize board component
async function initializeBoard() {
  const boardContainer = document.getElementById('board-container');
  if (!boardContainer) return;
  
  try {
    // Get board ID from URL or data attribute
    const boardId = getBoardId();
    if (!boardId) {
      console.error('No board ID found');
      return;
    }
    
    // Fetch board data
    const boardData = await boardService.getBoard(boardId);
    appState.currentBoard = boardData;
    
    // Initialize board component
    const board = new Board('board-container', boardData);
    
    // Store reference to board instance
    window.currentBoard = board;
    
    console.log('Board initialized successfully');
  } catch (error) {
    console.error('Error initializing board:', error);
    showErrorMessage('Failed to load board data');
  }
}

// Get board ID from URL
function getBoardId() {
  // Try to get from URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const boardId = urlParams.get('boardId');
  if (boardId) return boardId;
  
  // Try to get from data attribute
  const boardContainer = document.getElementById('board-container');
  if (boardContainer) {
    return boardContainer.getAttribute('data-board-id');
  }
  
  return null;
}

// Initialize navigation components
function initializeNavigation() {
  // Board switcher
  const boardSwitcher = document.getElementById('board-switcher');
  if (boardSwitcher) {
    boardSwitcher.addEventListener('change', handleBoardSwitch);
  }
  
  // Navigation menu
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    link.addEventListener('click', handleNavigation);
  });
}

// Handle board switching
async function handleBoardSwitch(event) {
  const boardId = event.target.value;
  if (!boardId) return;
  
  try {
    // Redirect to board page
    window.location.href = `/board?boardId=${boardId}`;
  } catch (error) {
    console.error('Error switching boards:', error);
    showErrorMessage('Failed to switch boards');
  }
}

// Handle navigation
function handleNavigation(event) {
  const target = event.target.closest('.nav-link');
  if (!target) return;
  
  const page = target.getAttribute('data-page');
  if (!page) return;
  
  // Update active state
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
  });
  target.classList.add('active');
  
  // Navigate to page
  switch (page) {
    case 'boards':
      window.location.href = '/boards';
      break;
    case 'dashboard':
      window.location.href = '/dashboard';
      break;
    case 'calendar':
      window.location.href = '/calendar';
      break;
    default:
      console.warn('Unknown page:', page);
  }
}

// Initialize global event listeners
function initializeEventListeners() {
  // Global error handling
  window.addEventListener('error', function(event) {
    console.error('Global error:', event.error);
  });
  
  // Handle logout
  const logoutButton = document.getElementById('logout-button');
  if (logoutButton) {
    logoutButton.addEventListener('click', handleLogout);
  }
}

// Handle logout
function handleLogout() {
  if (confirm('Are you sure you want to logout?')) {
    // Clear session and redirect to login
    localStorage.removeItem('authToken');
    window.location.href = '/login';
  }
}

// Utility functions
function showErrorMessage(message) {
  const errorContainer = document.getElementById('error-message');
  if (errorContainer) {
    errorContainer.textContent = message;
    errorContainer.style.display = 'block';
    
    // Hide after 5 seconds
    setTimeout(() => {
      errorContainer.style.display = 'none';
    }, 5000);
  }
}

function showSuccessMessage(message) {
  const successContainer = document.getElementById('success-message');
  if (successContainer) {
    successContainer.textContent = message;
    successContainer.style.display = 'block';
    
    // Hide after 3 seconds
    setTimeout(() => {
      successContainer.style.display = 'none';
    }, 3000);
  }
}

// Export for global access
window.appState = appState;
window.boardService = boardService;
window.showErrorMessage = showErrorMessage;
window.showSuccessMessage = showSuccessMessage;

console.log('Main application initialized');