/**
 * Main application entry point
 * Manages routing, state, and component rendering
 */
import { ComponentBase } from './utils/componentBase.js';
import { errorHandler } from './utils/errorHandler.js';
import { RealTimeService } from './utils/realTimeService.js';
import { eventBus } from './utils/eventBus.js';
import { api as apiService } from './services/api.js';

// Application State
class App extends ComponentBase {
  constructor() {
    super(null, {
      debug: process.env.NODE_ENV !== 'production'
    });
    
    // Initialize core services first
    this.realTimeService = new RealTimeService();
    
    // Application state
    this.currentUser = null;
    this.currentWorkspace = null;
    this.currentBoard = null;
    this.isAuthenticated = false;
    this.apiService = apiService;
    
    // Initialize after state is set up
    this.init();
  }
  
  getDefaultOptions() {
    return {
      ...super.getDefaultOptions(),
      debug: false,
      autoInit: true
    };
  }
  
  getInitialState() {
    return {
      ...super.getInitialState(),
      route: window.location.pathname,
      loading: {
        workspaces: false,
        boards: false,
        boardData: false
      }
    };
  }
  
  init() {
    try {
      // Initialize application
      super.init();
      
      // Initialize core features
      this.initializeAuth();
      this.initializeRouter();
      this.initializeKeyboardShortcuts();
      this.initializeMobileNavigation();
      
      // Set up global error handling
      window.addEventListener('error', (event) => {
        errorHandler.handle(event.error, 'global');
        event.preventDefault();
        return true;
      });
      
      window.addEventListener('unhandledrejection', (event) => {
        errorHandler.handle(event.reason, 'promise');
        event.preventDefault();
      });
      
      // Handle connection status changes
      eventBus.on('realtime:status', (status) => {
        this.updateConnectionStatusUI(status);
      });
      
      // Initial route handling
      this.handleRouteChange();
      
      // Set up periodic connection status check
      setInterval(() => {
        this.checkConnectionStatus();
      }, 30000);
      
    } catch (error) {
      errorHandler.showEnhancedError('Failed to initialize application. Please refresh the page.', error);
    }
  }
  
  /**
   * Initialize authentication state
   */
  async initializeAuth() {
    try {
      this.setState({ loading: { ...this.state.loading, auth: true } });
      
      // Check authentication status
      await this.checkAuthStatus();
      
      // Setup auth event listeners
      eventBus.on('auth:login', (user) => {
        this.currentUser = user;
        this.isAuthenticated = true;
        this.realTimeService.connect(); // Connect to real-time service after login
        this.navigate('/dashboard');
      });
      
      eventBus.on('auth:logout', () => {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.currentWorkspace = null;
        this.currentBoard = null;
        this.realTimeService.disconnect(); // Disconnect from real-time service
        this.navigate('/login');
      });
      
      eventBus.on('workspace:selected', (workspace) => {
        this.currentWorkspace = workspace;
      });
      
      eventBus.on('board:selected', (board) => {
        this.currentBoard = board;
      });
      
      // Handle browser back/forward buttons
      window.addEventListener('popstate', (event) => {
        this.handleRouteChange();
      });
      
    } catch (error) {
      errorHandler.handleError(error, 'Auth initialization failed');
      this.isAuthenticated = false;
    } finally {
      this.setState({ loading: { ...this.state.loading, auth: false } });
    }
  }
  
  /**
   * Check authentication status
   */
  async checkAuthStatus() {
    try {
      const token = this.apiService.tokenManager.getAccessToken();
      const user = localStorage.getItem('current_user');
      
      if (token && user) {
        // Set auth state from stored data
        this.currentUser = JSON.parse(user);
        this.isAuthenticated = true;
        
        // Verify token is still valid
        try {
          const response = await this.apiService.auth.verify();
          if (!response.success) {
            throw new Error('Token verification failed');
          }
        } catch (error) {
          this.apiService.tokenManager.clearTokens();
          throw error;
        }
        
        console.log('Authentication state restored from localStorage');
      } else {
        console.log('No valid tokens found');
        this.isAuthenticated = false;
        this.currentUser = null;
      }
    } catch (error) {
      console.log('No valid authentication found:', error);
      this.apiService.tokenManager.clearTokens();
      this.isAuthenticated = false;
      this.currentUser = null;
      throw error;
    }
  }
  
  /**
   * Initialize router
   */
  initializeRouter() {
    // Add navigation click handlers
    document.addEventListener('click', (e) => {
      const target = e.target.closest('a[href]');
      if (!target || !target.href) return;
      
      const href = target.getAttribute('href');
      const isInternal = href.startsWith('/') || href.startsWith(window.location.origin);
      
      // Handle internal links
      if (isInternal) {
        e.preventDefault();
        
        // Handle special cases
        if (href === '/logout') {
          this.logout();
          return;
        }
        
        this.navigate(href);
      }
    });
    
    // Handle browser back/forward buttons
    window.addEventListener('popstate', (event) => {
      this.handleRouteChange();
    });
  }
  
  /**
   * Navigate to a route
   * @param {string} path - Path to navigate to
   */
  navigate(path) {
    // Don't navigate if already on this path
    if (window.location.pathname === path) return;
    
    // Update history
    window.history.pushState({}, '', path);
    
    // Handle route change
    this.handleRouteChange();
  }
  
  /**
   * Handle route change
   */
  handleRouteChange() {
    const path = window.location.pathname;
    const container = document.getElementById('main-content');
    
    if (!container) {
      errorHandler.handleError(new Error('Main content container not found'), 'Route change');
      return;
    }
    
    // Update state
    this.setState({ route: path });
    
    try {
      // Clear any existing board view
      if (this._currentBoardView) {
        this._currentBoardView.destroy();
        this._currentBoardView = null;
      }
      
      // Route handling
      switch (path) {
        case '/':
        case '/dashboard':
          this.renderDashboard(container);
          break;
        case '/workspaces':
          this.renderWorkspaces(container);
          break;
        case '/login':
          this.renderLogin(container);
          break;
        case '/register':
          this.renderRegister(container);
          break;
        case '/forgot-password':
          this.renderForgotPassword(container);
          break;
        case '/password-reset':
          this.renderPasswordReset(container);
          break;
        default:
          if (path.startsWith('/workspace/')) {
            const workspaceId = path.split('/').pop();
            this.renderWorkspace(container, workspaceId);
          } else if (path.startsWith('/board/')) {
            const boardId = path.split('/').pop();
            this.renderBoard(container, boardId);
          } else {
            this.renderNotFound(container);
          }
      }
    } catch (error) {
      errorHandler.handleError(error, `Route handling for ${path}`);
      this.renderError(container, 'Failed to load page. Please try again.');
    }
  }
  
  /**
   * Initialize keyboard shortcuts
   */
  initializeKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Skip if typing in input/textarea
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        return;
      }
      
      // Global shortcuts
      switch (e.key) {
        case 'k':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            this.openGlobalSearch();
          }
          break;
        case 'm':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            this.toggleSidebar();
          }
          break;
        case '/':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            this.openGlobalSearch();
          }
          break;
        case 'Escape':
          this.closeModals();
          break;
      }
    });
  }
  
  /**
   * Initialize mobile navigation
   */
  initializeMobileNavigation() {
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    if (menuToggle) {
      menuToggle.addEventListener('click', () => {
        document.body.classList.toggle('menu-open');
      });
    }
    
    // Close menu when clicking a nav item
    const navItems = document.querySelectorAll('.mobile-nav a');
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        document.body.classList.remove('menu-open');
      });
    });
  }
  
  /**
   * Open global search modal
   */
  openGlobalSearch() {
    // Create and show global search modal
    const searchModal = document.createElement('div');
    searchModal.className = 'global-search-modal';
    searchModal.innerHTML = `
      <div class="search-modal-backdrop"></div>
      <div class="search-modal-content">
        <div class="search-input-container">
          <input type="text" class="global-search-input" placeholder="Search boards, items, and more..." autofocus>
          <button class="search-close-btn">×</button>
        </div>
        <div class="search-results-container">
          <div class="search-loading">Searching...</div>
        </div>
      </div>
    `;
    
    document.body.appendChild(searchModal);
    
    // Setup event listeners
    const input = searchModal.querySelector('.global-search-input');
    const closeBtn = searchModal.querySelector('.search-close-btn');
    const backdrop = searchModal.querySelector('.search-modal-backdrop');
    
    const closeSearch = () => {
      document.body.removeChild(searchModal);
    };
    
    closeBtn.addEventListener('click', closeSearch);
    backdrop.addEventListener('click', closeSearch);
    
    input.addEventListener('keydown', async (e) => {
      if (e.key === 'Escape') {
        closeSearch();
      } else if (e.key === 'Enter' && input.value.trim()) {
        // Perform search
        const resultsContainer = searchModal.querySelector('.search-results-container');
        resultsContainer.innerHTML = '<div class="search-loading">Searching...</div>';
        
        try {
          const results = await this.apiService.search.searchItems(input.value);
          this.renderSearchResults(resultsContainer, results);
        } catch (error) {
          resultsContainer.innerHTML = '<div class="search-error">Search failed. Please try again.</div>';
          errorHandler.handleError(error, 'Search');
        }
      }
    });
    
    input.focus();
  }
  
  /**
   * Render search results
   * @param {HTMLElement} container - Container to render into
   * @param {Array} results - Search results
   */
  renderSearchResults(container, results) {
    if (!results || results.length === 0) {
      container.innerHTML = '<div class="search-no-results">No results found</div>';
      return;
    }
    
    const resultsHtml = results.map(result => `
      <div class="search-result-item" data-id="${result.id}" data-type="${result.type}">
        <div class="result-icon">${result.type === 'board' ? '📋' : '▫️'}</div>
        <div class="result-content">
          <div class="result-title">${result.name}</div>
          ${result.boardName ? `<div class="result-context">in ${result.boardName}</div>` : ''}
        </div>
      </div>
    `).join('');
    
    container.innerHTML = `<div class="search-results">${resultsHtml}</div>`;
    
    // Add click handlers
    container.querySelectorAll('.search-result-item').forEach(item => {
      item.addEventListener('click', () => {
        const type = item.dataset.type;
        const id = item.dataset.id;
        
        if (type === 'board') {
          this.navigate(`/board/${id}`);
        } else {
          this.navigate(`/board/${result.boardId}?item=${id}`);
        }
        
        document.querySelector('.global-search-modal')?.remove();
      });
    });
  }
  
  /**
   * Toggle sidebar
   */
  toggleSidebar() {
    document.body.classList.toggle('sidebar-collapsed');
    localStorage.setItem('sidebarCollapsed', document.body.classList.contains('sidebar-collapsed'));
  }
  
  /**
   * Close all modals
   */
  closeModals() {
    document.querySelectorAll('.modal').forEach(modal => {
      modal.remove();
    });
  }
  
  /**
   * Render dashboard
   * @param {HTMLElement} container - Container to render into
   */
  renderDashboard(container) {
    container.innerHTML = `
      <div class="dashboard-page">
        <h1>Welcome to Project Management Platform</h1>
        <p>This is your dashboard. Board and workspace management coming soon!</p>
        
        <div class="dashboard-stats">
          <div class="stat-card">
            <h3>Workspaces</h3>
            <p id="workspaces-count">0</p>
          </div>
          <div class="stat-card">
            <h3>Boards</h3>
            <p id="boards-count">0</p>
          </div>
          <div class="stat-card">
            <h3>Tasks</h3>
            <p id="tasks-count">0</p>
          </div>
        </div>
        
        <div class="dashboard-actions">
          <button class="btn btn-primary" id="create-workspace-btn">
            <span>+</span> Create Workspace
          </button>
          <button class="btn btn-secondary" id="create-board-btn">
            <span>+</span> Create Board
          </button>
        </div>
      </div>
    `;
    
    // Add event listeners
    const createWorkspaceBtn = container.querySelector('#create-workspace-btn');
    const createBoardBtn = container.querySelector('#create-board-btn');
    
    createWorkspaceBtn.addEventListener('click', () => {
      this.showCreateWorkspaceModal();
    });
    
    createBoardBtn.addEventListener('click', async () => {
      // Fetch workspaces for the modal
      try {
        const workspaces = await this.apiService.workspaces.getAll();
        this.showCreateBoardModal(workspaces);
      } catch (error) {
        errorHandler.handleError(error, 'Fetch workspaces for board creation');
      }
    });
    
    // Fetch and display stats
    this.fetchDashboardStats(container);
  }
  
  /**
   * Fetch and render dashboard stats
   * @param {HTMLElement} container - Container to render into
   */
  async fetchDashboardStats(container) {
    try {
      this.setState({ loading: { ...this.state.loading, dashboard: true } });
      
      // Fetch workspaces
      const workspacesResponse = await this.apiService.workspaces.getAll();
      const workspaces = Array.isArray(workspacesResponse.data) ? 
        workspacesResponse.data : 
        (workspacesResponse.data.workspaces || []);
      
      // Update workspaces count
      const workspacesCount = container.querySelector('#workspaces-count');
      if (workspacesCount) {
        workspacesCount.textContent = workspaces.length;
      }
      
      // Fetch boards
      let totalBoards = 0;
      for (const workspace of workspaces) {
        const boardResponse = await this.apiService.boards.getWorkspaceBoards(workspace.id);
        if (boardResponse.ok) {
          const boardsData = await boardResponse.json();
          totalBoards += boardsData.length;
        }
      }
      
      // Update boards count
      const boardsCount = container.querySelector('#boards-count');
      if (boardsCount) {
        boardsCount.textContent = totalBoards;
      }
      
      // Fetch tasks (simplified for now)
      const tasksCount = container.querySelector('#tasks-count');
      if (tasksCount) {
        tasksCount.textContent = 'Coming soon';
      }
      
    } catch (error) {
      errorHandler.handleError(error, 'Fetch dashboard stats');
    } finally {
      this.setState({ loading: { ...this.state.loading, dashboard: false } });
    }
  }
  
  /**
   * Render workspaces
   * @param {HTMLElement} container - Container to render into
   */
  async renderWorkspaces(container) {
    try {
      this.setState({ loading: { ...this.state.loading, workspaces: true } });
      
      // Fetch user's workspaces
      const response = await this.apiService.workspaces.getAll();
      const workspaces = Array.isArray(response.data) ? 
        response.data : 
        (response.data.workspaces || []);
      
      container.innerHTML = `
        <div class="page-header">
          <h1>Workspaces</h1>
          <button id="create-workspace-btn" class="btn btn-primary">
            <span>+</span> Create Workspace
          </button>
        </div>
        <div class="workspaces-grid" id="workspaces-grid">
          ${workspaces.length === 0 ? `
            <div class="empty-state">
              <div class="empty-icon">🏢</div>
              <h2>No Workspaces Yet</h2>
              <p>Create your first workspace to get started</p>
              <button id="create-first-workspace-btn" class="btn btn-primary">
                Create Workspace
              </button>
            </div>
          ` : ''}
          ${workspaces.map(workspace => `
            <div class="workspace-card" data-id="${workspace.id}">
              <div class="workspace-header">
                <h3 class="workspace-name">${workspace.name}</h3>
                <div class="workspace-actions">
                  <button class="edit-workspace-btn" data-workspace-id="${workspace.id}">
                    <span>✏️</span>
                  </button>
                </div>
              </div>
              <div class="workspace-description">
                ${workspace.description || 'No description'}
              </div>
              <div class="workspace-meta">
                <span>${workspace.members ? workspace.members.length : 0} members</span>
                <span>${workspace.boards ? workspace.boards.length : 0} boards</span>
              </div>
              <button class="workspace-enter-btn" data-workspace-id="${workspace.id}">
                Enter Workspace
              </button>
            </div>
          `).join('')}
        </div>
      `;
      
      this.addWorkspaceEventListeners(container);
      
    } catch (error) {
      this.renderError(container, 'Failed to load workspaces. Please try again.');
      errorHandler.handleError(error, 'Render workspaces');
    } finally {
      this.setState({ loading: { ...this.state.loading, workspaces: false } });
    }
  }
  
  /**
   * Add workspace event listeners
   * @param {HTMLElement} container - Container with workspaces
   */
  addWorkspaceEventListeners(container) {
    // Create workspace buttons
    const createBtns = container.querySelectorAll('#create-workspace-btn, #create-first-workspace-btn');
    createBtns.forEach(btn => {
      btn.addEventListener('click', () => this.showCreateWorkspaceModal());
    });
    
    // Edit workspace buttons
    const editBtns = container.querySelectorAll('.edit-workspace-btn');
    editBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const workspaceId = e.target.closest('[data-workspace-id]').dataset.workspaceId;
        this.showEditWorkspaceModal(workspaceId);
      });
    });
    
    // Enter workspace buttons
    const enterBtns = container.querySelectorAll('.workspace-enter-btn');
    enterBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const workspaceId = e.target.closest('[data-workspace-id]').dataset.workspaceId;
        this.navigate(`/workspace/${workspaceId}`);
      });
    });
  }
  
  /**
   * Render a specific workspace
   * @param {HTMLElement} container - Container to render into
   * @param {string} workspaceId - Workspace ID
   */
  async renderWorkspace(container, workspaceId) {
    try {
      this.setState({ loading: { ...this.state.loading, workspace: true } });
      
      console.log('Loading workspace:', workspaceId);
      
      // Fetch workspace data
      const response = await this.apiService.workspaces.getById(workspaceId);
      const workspace = response.data;
      
      if (!workspace) {
        throw new Error('Workspace not found');
      }
      
      // Store current workspace
      this.currentWorkspace = workspace;
      
      container.innerHTML = `
        <div class="workspace-page">
          <div class="page-header">
            <div class="workspace-header">
              <h1>${workspace.name}</h1>
              <div class="workspace-actions">
                <button id="edit-workspace-btn" class="btn btn-secondary">
                  <span>✏️</span> Edit
                </button>
                <button id="create-board-btn" class="btn btn-primary">
                  <span>+</span> Create Board
                </button>
              </div>
            </div>
            ${workspace.description ? `<p class="workspace-description">${workspace.description}</p>` : ''}
          </div>
          
          <div class="workspace-content">
            <div class="boards-section">
              <h2>Boards</h2>
              <div class="boards-grid" id="boards-grid">
                <!-- Boards will be rendered here -->
              </div>
            </div>
          </div>
        </div>
      `;
      
      // Add event listeners
      const editBtn = container.querySelector('#edit-workspace-btn');
      const createBoardBtn = container.querySelector('#create-board-btn');
      
      editBtn.addEventListener('click', () => {
        this.showEditWorkspaceModal(workspaceId);
      });
      
      createBoardBtn.addEventListener('click', () => {
        this.showCreateBoardModal([workspace]);
      });
      
      // Fetch and render boards
      await this.fetchAndRenderBoards(container, workspaceId);
      
    } catch (error) {
      this.renderError(container, `Failed to load workspace. Please try again.`);
      errorHandler.handleError(error, `Render workspace ${workspaceId}`);
    } finally {
      this.setState({ loading: { ...this.state.loading, workspace: false } });
    }
  }
  
  /**
   * Fetch and render boards for a workspace
   * @param {HTMLElement} container - Container to render into
   * @param {string} workspaceId - Workspace ID
   */
  async fetchAndRenderBoards(container, workspaceId) {
    try {
      this.setState({ loading: { ...this.state.loading, boards: true } });
      
      const response = await this.apiService.boards.getWorkspaceBoards(workspaceId);
      if (response.ok) {
        const boardsData = await response.json();
        this.renderBoardsForWorkspace(workspaceId, boardsData);
      }
      
    } catch (error) {
      errorHandler.handleError(error, `Fetch boards for workspace ${workspaceId}`);
      const boardsGrid = container.querySelector('#boards-grid');
      if (boardsGrid) {
        boardsGrid.innerHTML = `
          <div class="error-state">
            <p>Failed to load boards. <button id="retry-boards-btn" class="btn btn-secondary">Retry</button></p>
          </div>
        `;
        
        const retryBtn = boardsGrid.querySelector('#retry-boards-btn');
        retryBtn.addEventListener('click', () => {
          this.fetchAndRenderBoards(container, workspaceId);
        });
      }
    } finally {
      this.setState({ loading: { ...this.state.loading, boards: false } });
    }
  }
  
  /**
   * Render boards for a workspace
   * @param {string} workspaceId - Workspace ID
   * @param {Array} boardsData - Boards data
   */
  renderBoardsForWorkspace(workspaceId, boardsData) {
    const boardsGrid = document.querySelector('#boards-grid');
    if (!boardsGrid) return;
    
    if (boardsData.length === 0) {
      boardsGrid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📋</div>
          <h2>No Boards Yet</h2>
          <p>Create your first board to get started</p>
          <button id="create-first-board-btn" class="btn btn-primary">
            Create Board
          </button>
        </div>
      `;
      
      const createBtn = boardsGrid.querySelector('#create-first-board-btn');
      createBtn.addEventListener('click', () => {
        this.showCreateBoardModal([{ id: workspaceId }]);
      });
      
    } else {
      boardsGrid.innerHTML = boardsData.map(board => `
        <div class="board-card" data-id="${board.id}">
          <div class="board-header">
            <h3 class="board-name">${board.name}</h3>
            <div class="board-actions">
              <button class="edit-board-btn" data-board-id="${board.id}">
                <span>✏️</span>
              </button>
            </div>
          </div>
          <div class="board-description">
            ${board.description || 'No description'}
          </div>
          <div class="board-meta">
            <span>${board.items ? board.items.length : 0} items</span>
            <span>${board.columns ? board.columns.length : 0} columns</span>
          </div>
          <button class="board-enter-btn" data-board-id="${board.id}">
            Open Board
          </button>
        </div>
      `).join('');
      
      // Add event listeners
      this.addBoardEventListeners(boardsGrid, [{ id: workspaceId }]);
    }
  }
  
  /**
   * Add board event listeners
   * @param {HTMLElement} container - Container with boards
   * @param {Array} workspaces - Workspaces data
   */
  addBoardEventListeners(container, workspaces) {
    // Create board buttons and first board button
    const createBtns = container.querySelectorAll('#create-board-btn, #create-first-board-btn');
    createBtns.forEach(btn => {
      btn.addEventListener('click', () => this.showCreateBoardModal(workspaces));
    });
    
    // Edit board buttons
    const editBtns = container.querySelectorAll('.edit-board-btn');
    editBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const boardId = e.target.closest('[data-board-id]').dataset.boardId;
        this.showEditBoardModal(boardId);
      });
    });
    
    // Enter board buttons
    const enterBtns = container.querySelectorAll('.board-enter-btn');
    enterBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const boardId = e.target.closest('[data-board-id]').dataset.boardId;
        this.navigate(`/board/${boardId}`);
      });
    });
  }
  
  /**
   * Render a specific board
   * @param {HTMLElement} container - Container to render into
   * @param {string} boardId - Board ID
   */
  async renderBoard(container, boardId) {
    try {
      this.setState({ loading: { ...this.state.loading, boardData: true } });
      
      // Import BoardView dynamically
      const { BoardView } = await import('./components/board/BoardView.js');
      
      // Fetch board data
      const board = await this.apiService.boards.getById(boardId);
      
      // Create container for BoardView
      container.innerHTML = `
        <div id="board-view-container" class="board-page"></div>
      `;
      
      // Initialize BoardView component
      const boardContainer = container.querySelector('#board-view-container');
      const boardView = new BoardView(boardContainer, {
        boardId: boardId,
        workspaceId: board.workspaceId,
        currentUser: this.currentUser
      });
      
      // Store reference for cleanup
      this._currentBoardView = boardView;
      
    } catch (error) {
      console.error('Error loading board:', error);
      this.renderError(container, `Unable to load board. Please try again.`);
      errorHandler.handleError(error, `Render board ${boardId}`);
    } finally {
      this.setState({ loading: { ...this.state.loading, boardData: false } });
    }
  }
  
  /**
   * Render login page
   * @param {HTMLElement} container - Container to render into
   */
  renderLogin(container) {
    container.innerHTML = `
      <div class="auth-page">
        <div class="auth-container">
          <h1>Login</h1>
          <form id="login-form" class="auth-form">
            <div class="form-group">
              <label for="email">Email:</label>
              <input type="email" id="email" name="email" required>
            </div>
            <div class="form-group">
              <label for="password">Password:</label>
              <input type="password" id="password" name="password" required>
            </div>
            <button type="submit" class="btn btn-primary">Login</button>
          </form>
          <p><a href="/register">Don't have an account? Register</a></p>
          <p><a href="/forgot-password">Forgot password?</a></p>
        </div>
      </div>
    `;
    
    // Add form submission handler
    const form = container.querySelector('#login-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = form.email.value;
      const password = form.password.value;
      const submitBtn = form.querySelector('button[type="submit"]');
      const errorDiv = form.querySelector('.text-error') || document.createElement('div');
      
      // Add error div if not present
      if (!errorDiv.classList.contains('text-error')) {
        errorDiv.className = 'text-error';
        errorDiv.style.display = 'none';
        errorDiv.style.marginTop = '0.5rem';
        form.insertBefore(errorDiv, form.querySelector('button'));
      }
      
      try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Logging in...';
        
        // Login
        await this.apiService.auth.login(email, password);
        
        // Get user data
        const user = await this.apiService.auth.getUser();
        
        // Store user data
        this.currentUser = user;
        this.isAuthenticated = true;
        localStorage.setItem('current_user', JSON.stringify(user));
        
        // Navigate to dashboard
        this.navigate('/dashboard');
        
      } catch (error) {
        errorDiv.textContent = error.message || 'Login failed. Please check your credentials.';
        errorDiv.style.display = 'block';
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Login';
      }
    });
  }
  
  /**
   * Render registration page
   * @param {HTMLElement} container - Container to render into
   */
  renderRegister(container) {
    container.innerHTML = `
      <div class="auth-page">
        <div class="auth-container">
          <h1>Create Account</h1>
          <form id="register-form" class="auth-form">
            <div class="form-group">
              <label for="name">Name:</label>
              <input type="text" id="name" name="name" required maxlength="100">
            </div>
            <div class="form-group">
              <label for="email">Email:</label>
              <input type="email" id="email" name="email" required>
            </div>
            <div class="form-group">
              <label for="password">Password:</label>
              <input type="password" id="password" name="password" required placeholder="Create a password" minlength="8">
            </div>
            <div class="form-group">
              <label for="confirmPassword">Confirm Password:</label>
              <input type="password" id="confirmPassword" name="confirmPassword" required placeholder="Confirm your password">
            </div>
            <div id="error-message" class="text-error" style="display: none; margin-bottom: 1rem;"></div>
            <button type="submit" class="btn btn-primary" id="register-btn">Create Account</button>
          </form>
          <p style="text-align: center; margin-top: 1rem;">
            Already have an account? <a href="/login">Log in</a>
          </p>
        </div>
      </div>
    `;
    
    // Add form submission handler
    const form = container.querySelector('#register-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const name = form.name.value;
      const email = form.email.value;
      const password = form.password.value;
      const confirmPassword = form.confirmPassword.value;
      const submitBtn = form.querySelector('#register-btn');
      const errorDiv = form.querySelector('#error-message');
      
      // Validate form
      if (password !== confirmPassword) {
        errorDiv.textContent = 'Passwords do not match';
        errorDiv.style.display = 'block';
        return;
      }
      
      if (password.length < 8) {
        errorDiv.textContent = 'Password must be at least 8 characters';
        errorDiv.style.display = 'block';
        return;
      }
      
      try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating Account...';
        
        // Register
        await this.apiService.auth.register(name, email, password);
        
        // Show success message
        container.innerHTML = `
          <div class="auth-page">
            <div class="auth-container">
              <h1>Registration Successful!</h1>
              <p>Please check your email to verify your account.</p>
              <p><a href="/login" class="btn btn-primary">Go to Login</a></p>
            </div>
          </div>
        `;
        
      } catch (err) {
        errorHandler.handleError(err, 'Registration');
        errorDiv.textContent = err.message || 'Registration failed. Please try again.';
        errorDiv.style.display = 'block';
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account';
      }
    });
  }
  
  /**
   * Render forgot password page
   * @param {HTMLElement} container - Container to render into
   */
  renderForgotPassword(container) {
    container.innerHTML = `
      <div class="auth-page">
        <div class="auth-container">
          <h1>Forgot Password</h1>
          <form id="forgot-password-form" class="auth-form">
            <div class="form-group">
              <label for="email">Email:</label>
              <input type="email" id="email" name="email" required>
            </div>
            <button type="submit" class="btn btn-primary">Send Reset Link</button>
          </form>
          <p><a href="/login">Back to Login</a></p>
        </div>
      </div>
    `;
    
    // Add form submission handler
    const form = container.querySelector('#forgot-password-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = form.email.value;
      const submitBtn = form.querySelector('button[type="submit"]');
      const errorDiv = form.querySelector('.text-error') || document.createElement('div');
      
      // Add error div if not present
      if (!errorDiv.classList.contains('text-error')) {
        errorDiv.className = 'text-error';
        errorDiv.style.display = 'none';
        errorDiv.style.marginTop = '0.5rem';
        form.insertBefore(errorDiv, submitBtn);
      }
      
      try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending...';
        
        // Request password reset
        await this.apiService.auth.forgotPassword(email);
        
        // Show success message
        container.innerHTML = `
          <div class="auth-page">
            <div class="auth-container">
              <h1>Check Your Email</h1>
              <p>We've sent a password reset link to ${email}</p>
              <p><a href="/login" class="btn btn-primary">Back to Login</a></p>
            </div>
          </div>
        `;
        
      } catch (error) {
        errorDiv.textContent = error.message || 'Failed to send reset link. Please try again.';
        errorDiv.style.display = 'block';
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Reset Link';
      }
    });
  }
  
  /**
   * Render password reset page
   * @param {HTMLElement} container - Container to render into
   */
  renderPasswordReset(container) {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (!token) {
      container.innerHTML = `
        <div class="auth-page">
          <div class="auth-container">
            <h1>Invalid Reset Link</h1>
            <p>The password reset link is invalid or has expired.</p>
            <p><a href="/forgot-password" class="btn btn-primary">Request New Link</a></p>
          </div>
        </div>
      `;
      return;
    }
    
    container.innerHTML = `
      <div class="auth-page">
        <div class="auth-container">
          <h1>Reset Password</h1>
          <form id="reset-password-form" class="auth-form">
            <input type="hidden" name="token" value="${token}">
            <div class="form-group">
              <label for="password">New Password:</label>
              <input type="password" id="password" name="password" required placeholder="Create a new password" minlength="8">
            </div>
            <div class="form-group">
              <label for="confirmPassword">Confirm Password:</label>
              <input type="password" id="confirmPassword" name="confirmPassword" required placeholder="Confirm your new password">
            </div>
            <div id="error-message" class="text-error" style="display: none; margin-bottom: 1rem;"></div>
            <button type="submit" class="btn btn-primary" id="reset-btn">Reset Password</button>
          </form>
        </div>
      </div>
    `;
    
    // Add form submission handler
    const form = container.querySelector('#reset-password-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const password = form.password.value;
      const confirmPassword = form.confirmPassword.value;
      const token = form.token.value;
      const submitBtn = form.querySelector('#reset-btn');
      const errorDiv = form.querySelector('#error-message');
      
      // Validate form
      if (password !== confirmPassword) {
        errorDiv.textContent = 'Passwords do not match';
        errorDiv.style.display = 'block';
        return;
      }
      
      if (password.length < 8) {
        errorDiv.textContent = 'Password must be at least 8 characters';
        errorDiv.style.display = 'block';
        return;
      }
      
      try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Resetting...';
        
        // Reset password
        await this.apiService.auth.resetPassword(token, password);
        
        // Show success message
        container.innerHTML = `
          <div class="auth-page">
            <div class="auth-container">
              <h1>Password Reset Successful</h1>
              <p>Your password has been successfully reset.</p>
              <p><a href="/login" class="btn btn-primary">Log in with new password</a></p>
            </div>
          </div>
        `;
        
      } catch (error) {
        errorDiv.textContent = error.message || 'Failed to reset password. Please try again.';
        errorDiv.style.display = 'block';
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Reset Password';
      }
    });
  }
  
  /**
   * Render not found page
   * @param {HTMLElement} container - Container to render into
   */
  renderNotFound(container) {
    container.innerHTML = `
      <div class="error-page">
        <div class="error-container">
          <h1>404</h1>
          <h2>Page Not Found</h2>
          <p>The page you're looking for doesn't exist or has been moved.</p>
          <div class="error-actions">
            <a href="/" class="btn btn-primary">Go to Dashboard</a>
          </div>
        </div>
      </div>
    `;
  }
  
  /**
   * Render error page
   * @param {HTMLElement} container - Container to render into
   * @param {string} message - Error message
   */
  renderError(container, message) {
    container.innerHTML = `
      <div class="error-page">
        <div class="error-container">
          <h1>Error</h1>
          <p>${message}</p>
          <div class="error-actions">
            <button id="retry-btn" class="btn btn-primary">Retry</button>
            <a href="/" class="btn btn-secondary">Go to Dashboard</a>
          </div>
        </div>
      </div>
    `;
    
    const retryBtn = container.querySelector('#retry-btn');
    retryBtn.addEventListener('click', () => {
      window.location.reload();
    });
  }
  
  /**
   * Show create workspace modal
   */
  showCreateWorkspaceModal() {
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>Create Workspace</h2>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <form id="create-workspace-form" class="workspace-form">
            <div class="form-group">
              <label for="workspace-name">Name *</label>
              <input type="text" id="workspace-name" name="name" required maxlength="100" placeholder="Enter workspace name">
            </div>
            <div class="form-group">
              <label for="workspace-description">Description</label>
              <textarea id="workspace-description" name="description" rows="3" maxlength="500" placeholder="Describe your workspace (optional)"></textarea>
            </div>
            <div id="create-workspace-error" class="error-message" style="display: none;"></div>
          </form>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary modal-cancel">Cancel</button>
          <button type="submit" form="create-workspace-form" class="btn btn-primary" id="create-workspace-submit">Create Workspace</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listeners
    const closeBtn = modal.querySelector('.modal-close');
    const cancelBtn = modal.querySelector('.modal-cancel');
    const form = modal.querySelector('#create-workspace-form');
    const submitBtn = modal.querySelector('#create-workspace-submit');
    const errorDiv = modal.querySelector('#create-workspace-error');
    
    const closeModal = () => {
      document.body.removeChild(modal);
    };
    
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(form);
      const workspaceData = {
        name: formData.get('name').trim(),
        description: formData.get('description').trim()
      };
      
      if (!workspaceData.name) {
        errorDiv.textContent = 'Workspace name is required';
        errorDiv.style.display = 'block';
        return;
      }
      
      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating...';
      
      try {
        await this.apiService.workspaces.create(workspaceData);
        closeModal();
        this.showSuccess('Workspace created successfully!');
        
        // Refresh the workspaces page
        if (window.location.pathname === '/workspaces') {
          const mainContent = document.getElementById('main-content');
          await this.renderWorkspaces(mainContent);
        }
        
      } catch (error) {
        errorHandler.handleError(error, 'Create workspace');
        errorDiv.textContent = error.message || 'Failed to create workspace. Please try again.';
        errorDiv.style.display = 'block';
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Workspace';
      }
    });
    
    // Focus on the name input
    setTimeout(() => {
      modal.querySelector('#workspace-name').focus();
    }, 100);
  }
  
  /**
   * Show edit workspace modal
   * @param {string} workspaceId - Workspace ID
   */
  async showEditWorkspaceModal(workspaceId) {
    try {
      // Fetch workspace data
      const response = await this.apiService.workspaces.getById(workspaceId);
      const workspace = response.data;
      
      if (!workspace) {
        throw new Error('Workspace not found');
      }
      
      // Create modal
      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.innerHTML = `
        <div class="modal-content">
          <div class="modal-header">
            <h2>Edit Workspace</h2>
            <button class="modal-close">&times;</button>
          </div>
          <div class="modal-body">
            <form id="edit-workspace-form" class="workspace-form">
              <input type="hidden" name="id" value="${workspace.id}">
              <div class="form-group">
                <label for="workspace-name">Name *</label>
                <input type="text" id="workspace-name" name="name" required maxlength="100" value="${workspace.name}" placeholder="Enter workspace name">
              </div>
              <div class="form-group">
                <label for="workspace-description">Description</label>
                <textarea id="workspace-description" name="description" rows="3" maxlength="500" placeholder="Describe your workspace (optional)">${workspace.description || ''}</textarea>
              </div>
              <div id="edit-workspace-error" class="error-message" style="display: none;"></div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary modal-cancel">Cancel</button>
            <button type="submit" form="edit-workspace-form" class="btn btn-primary" id="update-workspace-submit">Update Workspace</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(modal);
      
      // Add event listeners
      const closeBtn = modal.querySelector('.modal-close');
      const cancelBtn = modal.querySelector('.modal-cancel');
      const form = modal.querySelector('#edit-workspace-form');
      const submitBtn = modal.querySelector('#update-workspace-submit');
      const errorDiv = modal.querySelector('#edit-workspace-error');
      
      const closeModal = () => {
        document.body.removeChild(modal);
      };
      
      closeBtn.addEventListener('click', closeModal);
      cancelBtn.addEventListener('click', closeModal);
      
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
      });
      
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        const workspaceData = {
          id: formData.get('id'),
          name: formData.get('name').trim(),
          description: formData.get('description').trim()
        };
        
        if (!workspaceData.name) {
          errorDiv.textContent = 'Workspace name is required';
          errorDiv.style.display = 'block';
          return;
        }
        
        submitBtn.disabled = true;
        submitBtn.textContent = 'Updating...';
        
        try {
          await this.apiService.workspaces.update(workspaceData);
          closeModal();
          this.showSuccess('Workspace updated successfully!');
          
          // Refresh the current page if on workspaces or workspace page
          if (window.location.pathname === '/workspaces' || 
              window.location.pathname === `/workspace/${workspaceId}`) {
            const mainContent = document.getElementById('main-content');
            if (window.location.pathname === '/workspaces') {
              await this.renderWorkspaces(mainContent);
            } else {
              await this.renderWorkspace(mainContent, workspaceId);
            }
          }
          
        } catch (error) {
          errorHandler.handleError(error, 'Update workspace');
          errorDiv.textContent = error.message || 'Failed to update workspace. Please try again.';
          errorDiv.style.display = 'block';
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Update Workspace';
        }
      });
      
      // Focus on the name input
      setTimeout(() => {
        modal.querySelector('#workspace-name').focus();
      }, 100);
      
    } catch (error) {
      errorHandler.handleError(error, `Edit workspace ${workspaceId}`);
    }
  }
  
  /**
   * Show create board modal
   * @param {Array} workspaces - Workspaces data
   */
  showCreateBoardModal(workspaces) {
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>Create Board</h2>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <form id="create-board-form" class="board-form">
            <div class="form-group">
              <label for="board-name">Name *</label>
              <input type="text" id="board-name" name="name" required maxlength="100" placeholder="Enter board name">
            </div>
            <div class="form-group">
              <label for="board-description">Description</label>
              <textarea id="board-description" name="description" maxlength="500" placeholder="Describe your board (optional)"></textarea>
            </div>
            <div class="form-group">
              <label for="board-workspace">Workspace *</label>
              <select id="board-workspace" name="workspaceId" required>
                ${workspaces.map(ws => `<option value="${ws.id}">${ws.name}</option>`).join('')}
              </select>
            </div>
            <div id="create-board-error" class="error-message" style="display: none;"></div>
          </form>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary modal-cancel">Cancel</button>
          <button type="submit" form="create-board-form" class="btn btn-primary" id="create-board-submit">Create Board</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listeners
    const closeBtn = modal.querySelector('.modal-close');
    const cancelBtn = modal.querySelector('.modal-cancel');
    const form = modal.querySelector('#create-board-form');
    const submitBtn = modal.querySelector('#create-board-submit');
    const errorDiv = modal.querySelector('#create-board-error');
    
    const closeModal = () => {
      document.body.removeChild(modal);
    };
    
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(form);
      const boardData = {
        name: formData.get('name').trim(),
        description: formData.get('description').trim(),
        workspaceId: formData.get('workspaceId')
      };
      
      if (!boardData.name || !boardData.workspaceId) {
        errorDiv.textContent = 'Board name or workspace is required';
        errorDiv.style.display = 'block';
        return;
      }
      
      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating...';
      
      try {
        await this.apiService.boards.create(boardData);
        closeModal();
        this.showSuccess('Board created successfully!');
        
        // Refresh the current page if on workspaces or workspace page
        if (window.location.pathname.startsWith('/workspace/')) {
          const mainContent = document.getElementById('main-content');
          await this.renderWorkspace(mainContent, boardData.workspaceId);
        } else if (window.location.pathname === '/boards') {
          const mainContent = document.getElementById('main-content');
          await this.renderWorkspaces(mainContent);
        }
        
      } catch (error) {
        errorHandler.handleError(error, 'Create board');
        errorDiv.textContent = error.message || 'Failed to create board. Please try again.';
        errorDiv.style.display = 'block';
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Board';
      }
    });
    
    // Focus on the name input
    setTimeout(() => {
      modal.querySelector('#board-name').focus();
    }, 100);
  }
  
  /**
   * Show edit board modal
   * @param {string} boardId - Board ID
   */
  async showEditBoardModal(boardId) {
    try {
      // Fetch board data
      const board = await this.apiService.boards.getById(boardId);
      
      if (!board) {
        throw new Error('Board not found');
      }
      
      // Fetch workspaces for dropdown
      const workspacesResponse = await this.apiService.workspaces.getAll();
      const workspaces = Array.isArray(workspacesResponse.data) ? 
        workspacesResponse.data : 
        (workspacesResponse.data.workspaces || []);
      
      // Create modal
      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.innerHTML = `
        <div class="modal-content">
          <div class="modal-header">
            <h2>Edit Board</h2>
            <button class="modal-close">&times;</button>
          </div>
          <div class="modal-body">
            <form id="edit-board-form" class="board-form">
              <input type="hidden" name="id" value="${board.id}">
              <div class="form-group">
                <label for="board-name">Name *</label>
                <input type="text" id="board-name" name="name" required maxlength="100" value="${board.name}" placeholder="Enter board name">
              </div>
              <div class="form-group">
                <label for="board-description">Description</label>
                <textarea id="board-description" name="description" rows="3" maxlength="500" placeholder="Describe your board (optional)">${board.description || ''}</textarea>
              </div>
              <div class="form-group">
                <label for="board-workspace">Workspace *</label>
                <select id="board-workspace" name="workspaceId" required>
                  ${workspaces.map(ws => `
                    <option value="${ws.id}" ${ws.id === board.workspaceId ? 'selected' : ''}>${ws.name}</option>
                  `).join('')}
                </select>
              </div>
              <div id="edit-board-error" class="error-message" style="display: none;"></div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary modal-cancel">Cancel</button>
            <button type="submit" form="edit-board-form" class="btn btn-primary" id="update-board-submit">Update Board</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(modal);
      
      // Add event listeners
      const closeBtn = modal.querySelector('.modal-close');
      const cancelBtn = modal.querySelector('.modal-cancel');
      const form = modal.querySelector('#edit-board-form');
      const submitBtn = modal.querySelector('#update-board-submit');
      const errorDiv = modal.querySelector('#edit-board-error');
      
      const closeModal = () => {
        document.body.removeChild(modal);
      };
      
      closeBtn.addEventListener('click', closeModal);
      cancelBtn.addEventListener('click', closeModal);
      
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
      });
      
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        const boardData = {
          id: formData.get('id'),
          name: formData.get('name').trim(),
          description: formData.get('description').trim(),
          workspaceId: formData.get('workspaceId')
        };
        
        if (!boardData.name || !boardData.workspaceId) {
          errorDiv.textContent = 'Board name or workspace is required';
          errorDiv.style.display = 'block';
          return;
        }
        
        submitBtn.disabled = true;
        submitBtn.textContent = 'Updating...';
        
        try {
          await this.apiService.boards.update(boardData);
          closeModal();
          this.showSuccess('Board updated successfully!');
          
          // Refresh the current page if on board or workspace page
          if (window.location.pathname === `/board/${boardId}`) {
            const mainContent = document.getElementById('main-content');
            await this.renderBoard(mainContent, boardId);
          } else if (window.location.pathname.startsWith('/workspace/')) {
            const mainContent = document.getElementById('main-content');
            await this.renderWorkspace(mainContent, boardData.workspaceId);
          }
          
        } catch (error) {
          errorHandler.handleError(error, 'Update board');
          errorDiv.textContent = error.message || 'Failed to update board. Please try again.';
          errorDiv.style.display = 'block';
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Update Board';
        }
      });
      
      // Focus on the name input
      setTimeout(() => {
        modal.querySelector('#board-name').focus();
      }, 100);
      
    } catch (error) {
      errorHandler.handleError(error, `Edit board ${boardId}`);
    }
  }
  
  /**
   * Show success message
   * @param {string} message - Success message
   */
  showSuccess(message) {
    errorHandler.showUserMessage(message, 'success');
  }
  
  /**
   * Logout the user
   */
  async logout() {
    try {
      // Clear authentication data
      this.apiService.tokenManager.clearTokens();
      localStorage.removeItem('current_user');
      
      // Reset application state
      this.currentUser = null;
      this.isAuthenticated = false;
      this.currentWorkspace = null;
      this.currentBoard = null;
      
      // Notify listeners
      eventBus.emit('auth:logout');
      
      // Navigate to login page
      this.navigate('/login');
      
    } catch (error) {
      errorHandler.handleError(error, 'Logout');
    }
  }
  
  /**
   * Update connection status UI
   * @param {string} status - Connection status
   */
  updateConnectionStatusUI(status) {
    let statusText, statusClass;
    
    switch (status) {
      case 'connected':
        statusText = 'Online';
        statusClass = 'online';
        break;
      case 'offline':
        statusText = 'Offline';
        statusClass = 'offline';
        break;
      case 'reconnecting':
        statusText = 'Reconnecting...';
        statusClass = 'reconnecting';
        break;
      case 'error':
        statusText = 'Connection Error';
        statusClass = 'error';
        break;
      default:
        statusText = 'Connecting...';
        statusClass = 'connecting';
    }
    
    // Update status indicator
    let indicator = document.getElementById('connection-status');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'connection-status';
      indicator.className = 'connection-status';
      
      // Add to header
      const header = document.querySelector('.app-header') || 
                    document.querySelector('header') ||
                    document.body;
      header.appendChild(indicator);
    }
    
    indicator.className = `connection-status ${statusClass}`;
    indicator.title = `Connection status: ${statusText}`;
  }
  
  /**
   * Check connection status
   */
  checkConnectionStatus() {
    if (navigator.onLine) {
      if (this.realTimeService.getStatus() === 'offline') {
        this.realTimeService.connect();
      }
    } else {
      this.realTimeService.handleOffline();
    }
  }
  
  /**
   * Cleanup resources
   */
  destroy() {
    // Remove event listeners
    this.teardownEventListeners();
    
    // Clear subscriptions
    this.teardownSubscriptions();
    
    // Disconnect from real-time service
    this.realTimeService.disconnect();
    
    // Remove status indicator
    const indicator = document.getElementById('connection-status');
    if (indicator) {
      indicator.remove();
    }
    
    // Call parent destroy
    super.destroy();
  }
  
  /**
   * Teardown event listeners
   */
  teardownEventListeners() {
    // Remove global event listeners
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    window.removeEventListener('error', this.globalErrorHandler);
    window.removeEventListener('unhandledrejection', this.promiseErrorHandler);
    
    // Remove keyboard shortcut listeners
    document.removeEventListener('keydown', this.keyboardHandler);
  }
  
  /**
   * Teardown event subscriptions
   */
  teardownSubscriptions() {
    // Remove event bus subscriptions
    eventBus.off('realtime:status', this.updateConnectionStatusUI);
    eventBus.off('auth:login', this.authLoginHandler);
    eventBus.off('auth:logout', this.authLogoutHandler);
  }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  try {
    window.app = new App();
  } catch (error) {
    errorHandler.showEnhancedError('Failed to initialize application. Please refresh the page.', error);
  }
});