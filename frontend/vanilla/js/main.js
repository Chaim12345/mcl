// Main Application Entry Point
console.log('Loading main.js...');

import { eventBus } from './utils/events.js';
console.log('EventBus imported:', eventBus);

import { api as apiService } from './services/api.js';
console.log('API service imported:', apiService);

// Application State
class App {
    constructor() {
        this.currentUser = null;
        this.currentWorkspace = null;
        this.currentBoard = null;
        this.isAuthenticated = false;
        this.apiService = apiService;
        
        // Initialize keyboard shortcuts
        this.initializeKeyboardShortcuts();
        
        // Initialize mobile navigation
        this.initializeMobileNavigation();
    }

    async fetchAndRenderBoards() {
        try {
            const response = await this.apiService.http.get('/workspaces');
            if (response.ok) {
                const workspaces = await response.json();
                workspaces.forEach(async (workspace) => {
                    const boardResponse = await this.apiService.http.get(`/workspaces/${workspace.id}/boards`);
                    if (boardResponse.ok) {
                        const boardsData = await boardResponse.json();
                        this.renderBoardsForWorkspace(workspace.id, boardsData);
                    }
                });
            }
        } catch (error) {
            console.error('Failed to fetch boards:', error);
        }
    }

    renderBoardsForWorkspace(workspaceId, boards) {
        const mainContent = document.getElementById('main-content');
        const workspaceSection = document.createElement('section');
        workspaceSection.innerHTML = `<h2>Workspace: ${workspaceId}</h2>`;

        boards.forEach((board) => {
            const boardElement = document.createElement('div');
            boardElement.className = 'board';
            boardElement.innerHTML = `
                <h3>${board.name}</h3>
                <p>${board.description || 'No description'}</p>
            `;

            workspaceSection.appendChild(boardElement);
        });

        mainContent.appendChild(workspaceSection);
    }

    async init() {
        console.log('Initializing Project Management Platform...');
        
        try {
            // Initialize global event listeners
            this.initializeGlobalEvents();
            
            // Check authentication status first
            await this.checkAuthStatus();
            
            // Hide loading screen and show app
            this.showApp();
            
            // Initialize router after auth state is set
            this.initializeRouter();
            
            console.log('Application initialized successfully');
        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.showError('Failed to load application. Please refresh the page.');
        }
    }

    initializeGlobalEvents() {
        // Listen for authentication events
        eventBus.on('auth:login', (user) => {
            this.currentUser = user;
            this.isAuthenticated = true;
            this.navigate('/dashboard');
        });

        eventBus.on('auth:logout', () => {
            this.currentUser = null;
            this.isAuthenticated = false;
            this.currentWorkspace = null;
            this.currentBoard = null;
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
    }

    async checkAuthStatus() {
        try {
            const token = this.apiService.tokenManager.getAccessToken();
            const user = localStorage.getItem('current_user');
            
            if (token && user) {
                // Set auth state from stored data
                this.currentUser = JSON.parse(user);
                this.isAuthenticated = true;
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
        }
    }

    initializeRouter() {
        this.handleRouteChange();
    }

    handleRouteChange() {
        const path = window.location.pathname;
        const hash = window.location.hash;
        
        console.log('Route change:', path, 'Authenticated:', this.isAuthenticated);
        
        // Simple routing logic
        if (!this.isAuthenticated && path !== '/login' && path !== '/register' && path !== '/forgot-password') {
            console.log('Not authenticated, redirecting to login');
            this.navigate('/login');
            return;
        }

        if (this.isAuthenticated && (path === '/login' || path === '/register')) {
            console.log('Authenticated user accessing login/register, redirecting to dashboard');
            this.navigate('/dashboard');
            return;
        }

        console.log('Rendering page for path:', path);
        this.renderCurrentPage(path, hash);
    }

    async renderCurrentPage(path, hash) {
        const mainContent = document.getElementById('main-content');
        const mainNav = document.getElementById('main-nav');

        try {
            if (this.isAuthenticated) {
                // Render navigation for authenticated users
                await this.renderNavigation(mainNav);
            }

            // Route to appropriate page component
            switch (path) {
                case '/':
                case '/dashboard':
                    await this.renderDashboard(mainContent);
                    break;
                case '/workspaces':
                    await this.renderWorkspaces(mainContent);
                    break;
                case '/boards':
                    await this.renderBoards(mainContent);
                    break;
                case '/tasks':
                    await this.renderTasks(mainContent);
                    break;
                case '/calendar':
                    await this.renderCalendar(mainContent);
                    break;
                case '/reports':
                    await this.renderReports(mainContent);
                    break;
                case '/settings':
                    await this.renderSettings(mainContent);
                    break;
                case '/help':
                    await this.renderHelp(mainContent);
                    break;
                case '/login':
                    await this.renderLogin(mainContent);
                    break;
                case '/register':
                    await this.renderRegister(mainContent);
                    break;
                case '/forgot-password':
                    await this.renderForgotPassword(mainContent);
                    break;
                default:
                    if (path.startsWith('/board/')) {
                        const boardId = path.split('/')[2];
                        await this.renderBoardView(mainContent, boardId);
                    } else if (path.startsWith('/workspace/')) {
                        const workspaceId = path.split('/')[2];
                        await this.renderWorkspace(mainContent, workspaceId);
                    } else {
                        await this.render404(mainContent);
                    }
                    break;
            }
        } catch (error) {
            console.error('Error rendering page:', error);
            this.showError('Failed to load page content.');
        }
    }

    async renderNavigation(container) {
        // Enhanced responsive navigation with sidebar
        container.innerHTML = `
            <div class="nav-header">
                <div class="nav-brand">
                    <h1 class="nav-logo">PM Platform</h1>
                </div>
                <div class="nav-user">
                    <span class="user-name">${this.currentUser?.firstName || 'User'}</span>
                    <button id="logout-btn" class="btn btn-sm btn-secondary">Logout</button>
                </div>
            </div>
            
            <nav class="nav-menu">
                <a href="/dashboard" class="nav-item ${window.location.pathname === '/dashboard' || window.location.pathname === '/' ? 'active' : ''}">
                    <span class="nav-icon">📊</span>
                    <span class="nav-text">Dashboard</span>
                </a>
                <a href="/workspaces" class="nav-item ${window.location.pathname.startsWith('/workspace') ? 'active' : ''}">
                    <span class="nav-icon">🏢</span>
                    <span class="nav-text">Workspaces</span>
                </a>
                <a href="/boards" class="nav-item ${window.location.pathname.startsWith('/board') ? 'active' : ''}">
                    <span class="nav-icon">📋</span>
                    <span class="nav-text">Boards</span>
                </a>
                <a href="/tasks" class="nav-item ${window.location.pathname.startsWith('/task') ? 'active' : ''}">
                    <span class="nav-icon">✅</span>
                    <span class="nav-text">My Tasks</span>
                </a>
                <a href="/calendar" class="nav-item ${window.location.pathname === '/calendar' ? 'active' : ''}">
                    <span class="nav-icon">📅</span>
                    <span class="nav-text">Calendar</span>
                </a>
                <a href="/reports" class="nav-item ${window.location.pathname === '/reports' ? 'active' : ''}">
                    <span class="nav-icon">📈</span>
                    <span class="nav-text">Reports</span>
                </a>
                
                <div class="nav-divider"></div>
                
                <a href="/settings" class="nav-item ${window.location.pathname === '/settings' ? 'active' : ''}">
                    <span class="nav-icon">⚙️</span>
                    <span class="nav-text">Settings</span>
                </a>
                <a href="/help" class="nav-item ${window.location.pathname === '/help' ? 'active' : ''}">
                    <span class="nav-icon">❓</span>
                    <span class="nav-text">Help</span>
                </a>
            </nav>
        `;

        // Add logout functionality
        const logoutBtn = container.querySelector('#logout-btn');
        logoutBtn.addEventListener('click', () => {
            this.logout();
        });

        // Add navigation click handlers
        const navItems = container.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const href = item.getAttribute('href');
                this.navigate(href);
            });
        });
    }

    async renderDashboard(container) {
        container.innerHTML = `
            <div class="dashboard-page">
                <h1>Welcome to Project Management Platform</h1>
                <p>This is your dashboard. Board and workspace management coming soon!</p>
                <div class="dashboard-stats">
                    <div class="stat-card">
                        <h3>Workspaces</h3>
                        <p class="stat-number">0</p>
                    </div>
                    <div class="stat-card">
                        <h3>Boards</h3>
                        <p class="stat-number">0</p>
                    </div>
                    <div class="stat-card">
                        <h3>Tasks</h3>
                        <p class="stat-number">0</p>
                    </div>
                </div>
            </div>
        `;
    }

    async renderLogin(container, errorMessage = '') {
        container.innerHTML = `
            <div class="auth-page">
                <div class="auth-container">
                    <h1>Login</h1>
                    ${errorMessage ? `<div class="error-message" style="margin-bottom: 1em; color: #b00020;">${errorMessage}</div>` : ''}
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
            await this.handleLogin(new FormData(form));
        });
    }

    async renderRegister(container) {
        // Clear container
        container.innerHTML = `
            <div class="auth-page">
                <div id="register-form-container"></div>
            </div>
        `;

        // Import and initialize the RegisterForm component
        try {
            const { RegisterForm } = await import('./components/auth/RegisterForm.js');
            const formContainer = container.querySelector('#register-form-container');
            new RegisterForm(formContainer);
        } catch (error) {
            console.error('Failed to load RegisterForm:', error);
            console.error('Error details:', error.message, error.stack);
            
            // Fallback to functional simple form
            container.innerHTML = `
                <div class="auth-page">
                    <div class="auth-container">
                        <h1>Create Account</h1>
                        <p>Enter your information to create a new account</p>
                        
                        <form id="register-form" class="auth-form">
                            <div class="form-group">
                                <label for="firstName">First Name</label>
                                <input type="text" id="firstName" name="firstName" required placeholder="John">
                            </div>
                            
                            <div class="form-group">
                                <label for="lastName">Last Name</label>
                                <input type="text" id="lastName" name="lastName" required placeholder="Doe">
                            </div>
                            
                            <div class="form-group">
                                <label for="email">Email Address</label>
                                <input type="email" id="email" name="email" required placeholder="john.doe@example.com">
                            </div>
                            
                            <div class="form-group">
                                <label for="password">Password</label>
                                <input type="password" id="password" name="password" required placeholder="Create a password" minlength="8">
                            </div>
                            
                            <div class="form-group">
                                <label for="confirmPassword">Confirm Password</label>
                                <input type="password" id="confirmPassword" name="confirmPassword" required placeholder="Confirm your password">
                            </div>
                            
                            <div id="error-message" class="text-error" style="display: none; margin-bottom: 1rem;"></div>
                            
                            <button type="submit" class="btn btn-primary" id="register-btn">
                                Create Account
                            </button>
                        </form>
                        
                        <p style="text-align: center; margin-top: 1rem;">
                            Already have an account? <a href="/login">Sign in</a>
                        </p>
                    </div>
                </div>
            `;
            
            // Add form submission handler
            const form = container.querySelector('#register-form');
            const errorDiv = container.querySelector('#error-message');
            const submitBtn = container.querySelector('#register-btn');
            
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const formData = new FormData(form);
                const data = {
                    firstName: formData.get('firstName'),
                    lastName: formData.get('lastName'),
                    email: formData.get('email'),
                    password: formData.get('password'),
                    confirmPassword: formData.get('confirmPassword')
                };
                
                // Basic validation
                if (data.password !== data.confirmPassword) {
                    errorDiv.textContent = 'Passwords do not match';
                    errorDiv.style.display = 'block';
                    return;
                }
                
                if (data.password.length < 8) {
                    errorDiv.textContent = 'Password must be at least 8 characters long';
                    errorDiv.style.display = 'block';
                    return;
                }
                
                // Hide error and disable button
                errorDiv.style.display = 'none';
                submitBtn.disabled = true;
                submitBtn.textContent = 'Creating Account...';
                
                try {
                    const result = await this.apiService.auth.register({
                        firstName: data.firstName,
                        lastName: data.lastName,
                        email: data.email,
                        password: data.password
                    });
                    
                    // Success
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
                    console.error('Registration error:', err);
                    errorDiv.textContent = err.message || 'Registration failed. Please try again.';
                    errorDiv.style.display = 'block';
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Create Account';
                }
            });
        }
    }

    async renderForgotPassword(container) {
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

        const form = container.querySelector('#forgot-password-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleForgotPassword(new FormData(form));
        });
    }

    async renderBoard(container, boardId) {
        try {
            // Import BoardView component
            const { BoardView } = await import('./components/board/BoardView.js');
            
            // Fetch board data
            const board = await this.apiService.boards.getById(boardId);
            
            // Create container for BoardView
            container.innerHTML = `<div id="board-view-container" class="board-page"></div>`;
            
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
            container.innerHTML = `
                <div class="board-page error-state">
                    <h1>Error Loading Board</h1>
                    <p>Board ID: ${boardId}</p>
                    <p>Unable to load board. Please try again.</p>
                    <button class="btn btn-primary" onclick="window.location.reload()">Retry</button>
                </div>
            `;
        }
    }

    async renderWorkspace(container, workspaceId) {
        try {
            console.log('Loading workspace:', workspaceId);
            
            // Fetch workspace data from list (workaround for backend issue)
            const workspacesResponse = await this.apiService.workspaces.getAll();
            console.log('Workspaces response:', workspacesResponse);
            const workspaces = Array.isArray(workspacesResponse.data) ? workspacesResponse.data : (workspacesResponse.data.workspaces || []);
            const workspace = workspaces.find(ws => ws.id === workspaceId);
            
            if (!workspace) {
                throw new Error(`Workspace with ID ${workspaceId} not found or not accessible`);
            }
            
            console.log('Found workspace:', workspace);
            
            container.innerHTML = `
                <div class="workspace-page">
                    <div class="workspace-header">
                        <div class="workspace-info">
                            <h1>${workspace.name}</h1>
                            <p class="workspace-description">${workspace.description || 'No description'}</p>
                        </div>
                        <div class="workspace-actions">
                            <button id="workspace-settings-btn" class="btn btn-secondary">Settings</button>
                            <button id="invite-members-btn" class="btn btn-primary">Invite Members</button>
                        </div>
                    </div>
                    
                    <div class="workspace-content">
                        <div class="workspace-section">
                            <div class="section-header">
                                <h2>Boards</h2>
                                <button id="create-board-btn" class="btn btn-primary">Create Board</button>
                            </div>
                            <div id="boards-container" class="boards-grid">
                                <div class="empty-state">
                                    <p>No boards yet. Create your first board to get started!</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="workspace-section">
                            <div class="section-header">
                                <h2>Members</h2>
                            </div>
                            <div id="members-container" class="members-list">
                                <div class="member-item">
                                    <span class="member-name">${this.currentUser?.firstName || 'User'} ${this.currentUser?.lastName || ''} (Owner)</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            console.log('Workspace rendered successfully');
            
            // Add event listeners for board creation
            container.querySelector('#create-board-btn')?.addEventListener('click', () => {
                this.showCreateBoardDialog(workspace.id);
            });
            
            container.querySelector('#invite-members-btn')?.addEventListener('click', () => {
                alert('Member invitation functionality will be implemented next!');
            });
            
            // Load existing boards
            this.loadWorkspaceBoards(workspace.id, container.querySelector('#boards-container'));
            
        } catch (error) {
            console.error('Error loading workspace:', error);
            console.error('Error details:', error.message, error.stack);
            container.innerHTML = `
                <div class="workspace-page error-state">
                    <h1>Error Loading Workspace</h1>
                    <p>Workspace ID: ${workspaceId}</p>
                    <p>Error: ${error.message}</p>
                    <p>Unable to load workspace. Please try again.</p>
                    <button class="btn btn-primary" onclick="window.location.reload()">Retry</button>
                </div>
            `;
        }
    }

    async renderWorkspaces(container) {
        try {
            // Fetch user's workspaces
            const response = await this.apiService.workspaces.getAll();
            const workspaces = Array.isArray(response.data) ? response.data : (response.data.workspaces || []);
            
            container.innerHTML = `
                <div class="page-header">
                    <h1>Workspaces</h1>
                    <button id="create-workspace-btn" class="btn btn-primary">Create Workspace</button>
                </div>
                <div class="workspaces-grid" id="workspaces-grid">
                    ${workspaces.length === 0 ? `
                        <div class="empty-state">
                            <h3>No workspaces yet</h3>
                            <p>Create your first workspace to get started with organizing your projects.</p>
                            <button id="create-first-workspace-btn" class="btn btn-primary">Create Your First Workspace</button>
                        </div>
                    ` : workspaces.map(workspace => `
                        <div class="workspace-card" data-workspace-id="${workspace.id}">
                            <div class="workspace-header">
                                <h3>${workspace.name}</h3>
                                <div class="workspace-actions">
                                    <button class="btn btn-secondary btn-sm edit-workspace-btn" data-workspace-id="${workspace.id}">Edit</button>
                                    <button class="btn btn-danger btn-sm delete-workspace-btn" data-workspace-id="${workspace.id}">Delete</button>
                                </div>
                            </div>
                            <p class="workspace-description">${workspace.description || 'No description'}</p>
                            <div class="workspace-stats">
                                <span class="stat">
                                    <strong>${workspace.boardCount || 0}</strong> boards
                                </span>
                                <span class="stat">
                                    <strong>${workspace.memberCount || 0}</strong> members
                                </span>
                            </div>
                            <div class="workspace-footer">
                                <small>Created ${new Date(workspace.createdAt).toLocaleDateString()}</small>
                                <button class="btn btn-primary btn-sm open-workspace-btn" data-workspace-id="${workspace.id}">Open</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            
            // Add event listeners
            this.addWorkspaceEventListeners(container);
            
        } catch (error) {
            console.error('Error loading workspaces:', error);
            container.innerHTML = `
                <div class="page-header">
                    <h1>Workspaces</h1>
                    <button id="create-workspace-btn" class="btn btn-primary">Create Workspace</button>
                </div>
                <div class="error-state">
                    <h3>Error loading workspaces</h3>
                    <p>There was an error loading your workspaces. Please try again.</p>
                    <button id="retry-workspaces-btn" class="btn btn-secondary">Retry</button>
                </div>
            `;
            this.addWorkspaceEventListeners(container);
        }
    }

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
                const workspaceId = e.target.dataset.workspaceId;
                this.showEditWorkspaceModal(workspaceId);
            });
        });

        // Delete workspace buttons
        const deleteBtns = container.querySelectorAll('.delete-workspace-btn');
        deleteBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const workspaceId = e.target.dataset.workspaceId;
                this.confirmDeleteWorkspace(workspaceId);
            });
        });

        // Open workspace buttons
        const openBtns = container.querySelectorAll('.open-workspace-btn');
        openBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const workspaceId = e.target.dataset.workspaceId;
                this.navigate(`/workspace/${workspaceId}`);
            });
        });

        // Retry button
        const retryBtn = container.querySelector('#retry-workspaces-btn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                this.renderWorkspaces(container);
            });
        }
    }

    async showCreateWorkspaceModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h2>Create New Workspace</h2>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="create-workspace-form">
                        <div class="form-group">
                            <label for="workspace-name">Workspace Name *</label>
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
            errorDiv.style.display = 'none';

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
                console.error('Error creating workspace:', error);
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
                const boardId = e.target.dataset.boardId;
                this.showEditBoardModal(boardId);
            });
        });

        // Delete board buttons
        const deleteBtns = container.querySelectorAll('.delete-board-btn');
        deleteBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const boardId = e.target.dataset.boardId;
                this.confirmDeleteBoard(boardId);
            });
        });

        // Open board buttons
        const openBtns = container.querySelectorAll('.open-board-btn');
        openBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const boardId = e.target.dataset.boardId;
                this.navigate(`/board/${boardId}`);
            });
        });

        // Retry button
        const retryBtn = container.querySelector('#retry-boards-btn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                this.renderBoards(container);
            });
        }

        // Workspace filter change
        const workspaceFilter = container.querySelector('#workspace-filter');
        if (workspaceFilter) {
            workspaceFilter.addEventListener('change', async (e) => {
                const selectedWorkspaceId = e.target.value;
                const filteredBoards = selectedWorkspaceId ? allBoards.filter(board => board.workspaceId === selectedWorkspaceId) : allBoards;
                // Re-render boards based on selected workspace
                await this.renderFilteredBoards(container, filteredBoards);
            });
        }
    }

    async showCreateBoardModal(workspaces) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h2>Create New Board</h2>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="create-board-form">
                        <div class="form-group">
                            <label for="board-name">Board Name *</label>
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
            errorDiv.style.display = 'none';

            try {
                await this.apiService.boards.create(boardData.workspaceId, boardData);
                closeModal();
                this.showSuccess('Board created successfully!');
                // Refresh the boards page
                if (window.location.pathname === '/boards') {
                    const mainContent = document.getElementById('main-content');
                    await this.renderBoards(mainContent);
                }
            } catch (error) {
                console.error('Error creating board:', error);
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

    async showEditBoardModal(boardId) {
        try {
            const board = await this.apiService.boards.getById(boardId);
            const workspaces = await this.apiService.workspaces.getAll();
            
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal">
                    <div class="modal-header">
                        <h2>Edit Board</h2>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="edit-board-form">
                            <div class="form-group">
                                <label for="edit-board-name">Board Name *</label>
                                <input type="text" id="edit-board-name" name="name" required maxlength="100" value="${board.name}">
                            </div>
                            <div class="form-group">
                                <label for="edit-board-description">Description</label>
                                <textarea id="edit-board-description" name="description" maxlength="500">${board.description || ''}</textarea>
                            </div>
                            <div id="edit-board-error" class="error-message" style="display: none;"></div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary modal-cancel">Cancel</button>
                        <button type="submit" form="edit-board-form" class="btn btn-primary" id="edit-board-submit">Save Changes</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // Add event listeners
            const closeBtn = modal.querySelector('.modal-close');
            const cancelBtn = modal.querySelector('.modal-cancel');
            const form = modal.querySelector('#edit-board-form');
            const submitBtn = modal.querySelector('#edit-board-submit');
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
                    name: formData.get('name').trim(),
                    description: formData.get('description').trim()
                };

                if (!boardData.name) {
                    errorDiv.textContent = 'Board name is required';
                    errorDiv.style.display = 'block';
                    return;
                }

                submitBtn.disabled = true;
                submitBtn.textContent = 'Saving...';
                errorDiv.style.display = 'none';

                try {
                    await this.apiService.boards.update(boardId, boardData);
                    closeModal();
                    this.showSuccess('Board updated successfully!');
                    // Refresh the boards page
                    if (window.location.pathname === '/boards') {
                        const mainContent = document.getElementById('main-content');
                        await this.renderBoards(mainContent);
                    }
                } catch (error) {
                    console.error('Error updating board:', error);
                    errorDiv.textContent = error.message || 'Failed to update board. Please try again.';
                    errorDiv.style.display = 'block';
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Save Changes';
                }
            });

        } catch (error) {
            console.error('Error loading board:', error);
            this.showError('Failed to load board details.');
        }
    }

    async confirmDeleteBoard(boardId) {
        if (confirm('Are you sure you want to delete this board? This action cannot be undone and will delete all items within it.')) {
            try {
                await this.apiService.boards.delete(boardId);
                this.showSuccess('Board deleted successfully!');
                // Refresh the boards page
                if (window.location.pathname === '/boards') {
                    const mainContent = document.getElementById('main-content');
                    await this.renderBoards(mainContent);
                }
            } catch (error) {
                console.error('Error deleting board:', error);
                this.showError(error.message || 'Failed to delete board. Please try again.');
            }
        }
    }

    async showWorkspaceDetails(container, workspaceId) {
        try {
            const workspace = await this.apiService.workspaces.getById(workspaceId);
            const boards = await this.apiService.boards.getAll(workspaceId);
            
            container.innerHTML = `
                <div class="workspace-details-page">
                    <div class="page-header">
                        <h1>${workspace.name}</h1>
                        <div class="workspace-actions">
                            <button id="edit-workspace-btn" class="btn btn-secondary" data-workspace-id="${workspace.id}">Edit Workspace</button>
                            <button id="create-board-in-workspace-btn" class="btn btn-primary" data-workspace-id="${workspace.id}">Create Board</button>
                        </div>
                    </div>
                    <p class="workspace-description">${workspace.description || 'No description'}</p>
                    <div class="boards-section">
                        <h2>Boards in this workspace</h2>
                        <div class="boards-grid">
                            ${boards.length === 0 ? `
                                <div class="empty-state">
                                    <h3>No boards in this workspace</h3>
                                    <p>Create your first board to start organizing tasks.</p>
                                    <button class="btn btn-primary" data-workspace-id="${workspace.id}">Create Board</button>
                                </div>
                            ` : boards.map(board => `
                                <div class="board-card" data-board-id="${board.id}">
                                    <div class="board-header">
                                        <h3>${board.name}</h3>
                                    </div>
                                    <p class="board-description">${board.description || 'No description'}</p>
                                    <div class="board-footer">
                                        <button class="btn btn-primary btn-sm open-board-btn" data-board-id="${board.id}">Open</button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
            
            // Add event listeners for workspace details page
            const editBtn = container.querySelector('#edit-workspace-btn');
            if (editBtn) {
                editBtn.addEventListener('click', () => this.showEditWorkspaceModal(workspaceId));
            }
            
            const createBoardBtns = container.querySelectorAll('#create-board-in-workspace-btn, button[data-workspace-id]');
            createBoardBtns.forEach(btn => {
                btn.addEventListener('click', () => this.showCreateBoardModal([workspace]));
            });
            
            const openBoardBtns = container.querySelectorAll('.open-board-btn');
            openBoardBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const boardId = e.target.dataset.boardId;
                    this.navigate(`/board/${boardId}`);
                });
            });
            
        } catch (error) {
            console.error('Error loading workspace details:', error);
            this.showError('Failed to load workspace details.');
        }
    }

    async renderFilteredBoards(container, boards) {
        const boardsGrid = container.querySelector('#boards-grid');
        if (boardsGrid) {
            boardsGrid.innerHTML = boards.length === 0 ? `
                <div class="empty-state">
                    <h3>No boards found</h3>
                    <p>No boards match the selected filter.</p>
                </div>
            ` : boards.map(board => `
                <div class="board-card" data-board-id="${board.id}" data-workspace-id="${board.workspaceId}">
                    <div class="board-header">
                        <h3>${board.name}</h3>
                        <div class="board-actions-menu">
                            <button class="btn btn-icon board-menu-btn" data-board-id="${board.id}">
                                <span>⋯</span>
                            </button>
                            <div class="board-menu" id="board-menu-${board.id}" style="display: none;">
                                <button class="menu-item edit-board-btn" data-board-id="${board.id}">Edit</button>
                                <button class="menu-item delete-board-btn" data-board-id="${board.id}">Delete</button>
                            </div>
                        </div>
                    </div>
                    <p class="board-description">${board.description || 'No description'}</p>
                    <div class="board-stats">
                        <span class="stat">
                            <strong>${board.columnCount || 0}</strong> columns
                        </span>
                        <span class="stat">
                            <strong>${board.itemCount || 0}</strong> items
                        </span>
                    </div>
                    <div class="board-workspace">
                        <small>in ${board.workspaceName}</small>
                    </div>
                    <div class="board-footer">
                        <small>Created ${new Date(board.createdAt).toLocaleDateString()}</small>
                        <button class="btn btn-primary btn-sm open-board-btn" data-board-id="${board.id}">Open</button>
                    </div>
                </div>
            `).join('');
        }
    }

    async showEditWorkspaceModal(workspaceId) {
        try {
            const workspace = await this.apiService.workspaces.getById(workspaceId);
            
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal">
                    <div class="modal-header">
                        <h2>Edit Workspace</h2>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="edit-workspace-form">
                            <div class="form-group">
                                <label for="edit-workspace-name">Workspace Name *</label>
                                <input type="text" id="edit-workspace-name" name="name" required maxlength="100" value="${workspace.name}">
                            </div>
                            <div class="form-group">
                                <label for="edit-workspace-description">Description</label>
                                <textarea id="edit-workspace-description" name="description" rows="3" maxlength="500">${workspace.description || ''}</textarea>
                            </div>
                            <div id="edit-workspace-error" class="error-message" style="display: none;"></div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary modal-cancel">Cancel</button>
                        <button type="submit" form="edit-workspace-form" class="btn btn-primary" id="edit-workspace-submit">Save Changes</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // Add event listeners (similar to create modal)
            const closeBtn = modal.querySelector('.modal-close');
            const cancelBtn = modal.querySelector('.modal-cancel');
            const form = modal.querySelector('#edit-workspace-form');
            const submitBtn = modal.querySelector('#edit-workspace-submit');
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
                    name: formData.get('name').trim(),
                    description: formData.get('description').trim()
                };

                if (!workspaceData.name) {
                    errorDiv.textContent = 'Workspace name is required';
                    errorDiv.style.display = 'block';
                    return;
                }

                submitBtn.disabled = true;
                submitBtn.textContent = 'Saving...';
                errorDiv.style.display = 'none';

                try {
                    await this.apiService.workspaces.update(workspaceId, workspaceData);
                    closeModal();
                    this.showSuccess('Workspace updated successfully!');
                    // Refresh the workspaces page
                    if (window.location.pathname === '/workspaces') {
                        const mainContent = document.getElementById('main-content');
                        await this.renderWorkspaces(mainContent);
                    }
                } catch (error) {
                    console.error('Error updating workspace:', error);
                    errorDiv.textContent = error.message || 'Failed to update workspace. Please try again.';
                    errorDiv.style.display = 'block';
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Save Changes';
                }
            });

        } catch (error) {
            console.error('Error loading workspace:', error);
            this.showError('Failed to load workspace details.');
        }
    }

    async confirmDeleteWorkspace(workspaceId) {
        if (confirm('Are you sure you want to delete this workspace? This action cannot be undone and will delete all boards and items within it.')) {
            try {
                await this.apiService.workspaces.delete(workspaceId);
                this.showSuccess('Workspace deleted successfully!');
                // Refresh the workspaces page
                if (window.location.pathname === '/workspaces') {
                    const mainContent = document.getElementById('main-content');
                    await this.renderWorkspaces(mainContent);
                }
            } catch (error) {
                console.error('Error deleting workspace:', error);
                this.showError(error.message || 'Failed to delete workspace. Please try again.');
            }
        }
    }

    async renderBoards(container) {
        try {
            // Get user's workspaces to show boards from all workspaces
            const workspaces = await this.apiService.workspaces.getAll();
            let allBoards = [];
            
            // Fetch boards from all workspaces
            for (const workspace of workspaces) {
                try {
                    const workspaceBoards = await this.apiService.boards.getAll(workspace.id);
                    allBoards = allBoards.concat(workspaceBoards.map(board => ({ ...board, workspaceName: workspace.name, workspaceId: workspace.id })));
                } catch (error) {
                    console.warn(`Failed to load boards from workspace ${workspace.name}:`, error);
                }
            }
            
            container.innerHTML = `
                <div class="page-header">
                    <h1>All Boards</h1>
                    <div class="board-actions">
                        <select id="workspace-filter" class="form-select">
                            <option value="">All Workspaces</option>
                            ${workspaces.map(ws => `<option value="${ws.id}">${ws.name}</option>`).join('')}
                        </select>
                        <button id="create-board-btn" class="btn btn-primary">Create Board</button>
                    </div>
                </div>
                <div class="boards-grid" id="boards-grid">
                    ${allBoards.length === 0 ? `
                        <div class="empty-state">
                            <h3>No boards yet</h3>
                            <p>Create your first board to start managing tasks and projects.</p>
                            <button id="create-first-board-btn" class="btn btn-primary">Create Your First Board</button>
                        </div>
                    ` : allBoards.map(board => `
                        <div class="board-card" data-board-id="${board.id}" data-workspace-id="${board.workspaceId}">
                            <div class="board-header">
                                <h3>${board.name}</h3>
                                <div class="board-actions-menu">
                                    <button class="btn btn-icon board-menu-btn" data-board-id="${board.id}">
                                        <span>⋯</span>
                                    </button>
                                    <div class="board-menu" id="board-menu-${board.id}" style="display: none;">
                                        <button class="menu-item edit-board-btn" data-board-id="${board.id}">Edit</button>
                                        <button class="menu-item delete-board-btn" data-board-id="${board.id}">Delete</button>
                                    </div>
                                </div>
                            </div>
                            <p class="board-description">${board.description || 'No description'}</p>
                            <div class="board-stats">
                                <span class="stat">
                                    <strong>${board.columnCount || 0}</strong> columns
                                </span>
                                <span class="stat">
                                    <strong>${board.itemCount || 0}</strong> items
                                </span>
                            </div>
                            <div class="board-workspace">
                                <small>in ${board.workspaceName}</small>
                            </div>
                            <div class="board-footer">
                                <small>Created ${new Date(board.createdAt).toLocaleDateString()}</small>
                                <button class="btn btn-primary btn-sm open-board-btn" data-board-id="${board.id}">Open</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            
            // Add event listeners
            this.addBoardEventListeners(container, workspaces);
            
        } catch (error) {
            console.error('Error loading boards:', error);
            container.innerHTML = `
                <div class="page-header">
                    <h1>Boards</h1>
                    <button id="create-board-btn" class="btn btn-primary">Create Board</button>
                </div>
                <div class="error-state">
                    <h3>Error loading boards</h3>
                    <p>There was an error loading your boards. Please try again.</p>
                    <button id="retry-boards-btn" class="btn btn-secondary">Retry</button>
                </div>
            `;
            this.addBoardEventListeners(container, []);
        }
    }

    async renderTasks(container) {
        try {
            // Import required components
            const { SearchBar } = await import('./components/search/SearchBar.js');
            const { FilterModal } = await import('./components/filter/FilterModal.js');
            
            container.innerHTML = `
                <div class="page-header">
                    <h1>My Tasks</h1>
                    <div class="task-controls">
                        <div id="task-search-container" class="search-container"></div>
                        <div class="task-filters">
                            <button class="btn btn-secondary active" data-filter="all">All</button>
                            <button class="btn btn-secondary" data-filter="assigned">Assigned to me</button>
                            <button class="btn btn-secondary" data-filter="due-today">Due today</button>
                            <button class="btn btn-secondary" data-filter="overdue">Overdue</button>
                        </div>
                        <button id="advanced-filter-btn" class="btn btn-outline">Advanced Filters</button>
                    </div>
                </div>
                <div id="tasks-content" class="tasks-content">
                    <div id="tasks-list" class="tasks-list"></div>
                </div>
            `;
            
            // Initialize search
            const searchContainer = container.querySelector('#task-search-container');
            const searchBar = new SearchBar(searchContainer, {
                placeholder: 'Search tasks...',
                searchContext: 'items',
                showFilters: false
            });
            
            // Initialize filter state
            this.taskFilters = {
                assignedToMe: false,
                dueToday: false,
                overdue: false,
                searchQuery: '',
                status: null
            };
            
            // Load and render tasks
            await this.loadTasks(container);
            
            // Add event listeners
            this.addTaskEventListeners(container, searchBar);
            
        } catch (error) {
            console.error('Error loading tasks:', error);
            container.innerHTML = `
                <div class="page-header">
                    <h1>My Tasks</h1>
                </div>
                <div class="error-state">
                    <h3>Error loading tasks</h3>
                    <p>There was an error loading your tasks. Please try again.</p>
                    <button class="btn btn-primary" onclick="window.location.reload()">Retry</button>
                </div>
            `;
        }
    }
    
    async loadTasks(container) {
        const tasksContainer = container.querySelector('#tasks-list');
        
        try {
            // Get all workspaces and their boards to find user's tasks
            const workspaces = await this.apiService.workspaces.getAll();
            let allTasks = [];
            
            for (const workspace of workspaces) {
                const boards = await this.apiService.boards.getAll(workspace.id);
                for (const board of boards) {
                    const items = await this.apiService.items.getAll(board.id);
                    // Filter items assigned to current user
                    const userTasks = items.filter(item => 
                        item.assignees && item.assignees.includes(this.currentUser.id)
                    );
                    
                    // Add workspace and board context
                    userTasks.forEach(task => {
                        task.workspaceName = workspace.name;
                        task.boardName = board.name;
                        task.workspaceId = workspace.id;
                        task.boardId = board.id;
                    });
                    
                    allTasks = allTasks.concat(userTasks);
                }
            }
            
            // Apply current filters
            const filteredTasks = this.filterTasks(allTasks);
            
            if (filteredTasks.length === 0) {
                tasksContainer.innerHTML = `
                    <div class="empty-state">
                        <h3>No tasks found</h3>
                        <p>You don't have any tasks matching the current filters.</p>
                    </div>
                `;
                return;
            }
            
            // Render tasks
            tasksContainer.innerHTML = `
                <div class="tasks-grid">
                    ${filteredTasks.map(task => this.renderTaskCard(task)).join('')}
                </div>
            `;
            
            // Add task card event listeners
            this.addTaskCardListeners(tasksContainer);
            
        } catch (error) {
            console.error('Error loading tasks:', error);
            tasksContainer.innerHTML = `
                <div class="error-state">
                    <p>Error loading tasks. Please try again.</p>
                </div>
            `;
        }
    }
    
    filterTasks(tasks) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        return tasks.filter(task => {
            // Search query filter
            if (this.taskFilters.searchQuery) {
                const query = this.taskFilters.searchQuery.toLowerCase();
                if (!task.title.toLowerCase().includes(query) && 
                    !task.description?.toLowerCase().includes(query)) {
                    return false;
                }
            }
            
            // Due today filter
            if (this.taskFilters.dueToday && task.dueDate) {
                const dueDate = new Date(task.dueDate);
                const taskDate = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
                if (taskDate.getTime() !== today.getTime()) {
                    return false;
                }
            }
            
            // Overdue filter
            if (this.taskFilters.overdue && task.dueDate) {
                const dueDate = new Date(task.dueDate);
                if (dueDate >= now) {
                    return false;
                }
            }
            
            return true;
        });
    }
    
    renderTaskCard(task) {
        const dueDate = task.dueDate ? new Date(task.dueDate) : null;
        const isOverdue = dueDate && dueDate < new Date();
        const isDueToday = dueDate && dueDate.toDateString() === new Date().toDateString();
        
        return `
            <div class="task-card" data-task-id="${task.id}" data-board-id="${task.boardId}">
                <div class="task-header">
                    <h3 class="task-title">${this.escapeHtml(task.title)}</h3>
                    <span class="task-status status-badge status-badge--${this.getStatusClass(task.status)}">${task.status}</span>
                </div>
                
                ${task.description ? `
                    <p class="task-description">${this.escapeHtml(task.description)}</p>
                ` : ''}
                
                <div class="task-meta">
                    <div class="task-context">
                        <span class="task-workspace">${this.escapeHtml(task.workspaceName)}</span>
                        <span class="task-separator">•</span>
                        <span class="task-board">${this.escapeHtml(task.boardName)}</span>
                    </div>
                    
                    ${dueDate ? `
                        <div class="task-due-date ${isOverdue ? 'overdue' : ''} ${isDueToday ? 'due-today' : ''}">
                            <span class="due-label">Due:</span>
                            <span class="due-date">${dueDate.toLocaleDateString()}</span>
                        </div>
                    ` : ''}
                </div>
                
                <div class="task-actions">
                    <button class="btn btn-sm btn-outline open-task-btn" data-task-id="${task.id}" data-board-id="${task.boardId}">
                        Open
                    </button>
                    <button class="btn btn-sm btn-secondary mark-complete-btn" data-task-id="${task.id}">
                        Mark Complete
                    </button>
                </div>
            </div>
        `;
    }
    
    addTaskEventListeners(container, searchBar) {
        // Filter buttons
        const filterButtons = container.querySelectorAll('.task-filters button');
        filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Update active state
                filterButtons.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                // Update filters
                const filter = e.target.dataset.filter;
                this.taskFilters = {
                    assignedToMe: filter === 'assigned',
                    dueToday: filter === 'due-today',
                    overdue: filter === 'overdue',
                    searchQuery: this.taskFilters.searchQuery
                };
                
                // Reload tasks
                this.loadTasks(container);
            });
        });
        
        // Search
        searchBar.on('search', (query) => {
            this.taskFilters.searchQuery = query;
            this.loadTasks(container);
        });
        
        // Advanced filters button
        container.querySelector('#advanced-filter-btn')?.addEventListener('click', () => {
            // TODO: Implement advanced filter modal
            console.log('Advanced filters not yet implemented');
        });
    }
    
    addTaskCardListeners(container) {
        // Open task buttons
        container.querySelectorAll('.open-task-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const taskId = e.target.dataset.taskId;
                const boardId = e.target.dataset.boardId;
                this.navigate(`/boards/${boardId}?item=${taskId}`);
            });
        });
        
        // Mark complete buttons
        container.querySelectorAll('.mark-complete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const taskId = e.target.dataset.taskId;
                try {
                    await this.apiService.items.update(taskId, { status: 'Done' });
                    // Reload tasks to reflect changes
                    const mainContainer = document.getElementById('main-content');
                    this.loadTasks(mainContainer);
                } catch (error) {
                    console.error('Error marking task complete:', error);
                    // TODO: Show error notification
                }
            });
        });
    }

    async renderCalendar(container) {
        try {
            container.innerHTML = `
                <div class="page-header">
                    <h1>Calendar</h1>
                    <div class="calendar-controls">
                        <button id="calendar-today-btn" class="btn btn-secondary">Today</button>
                        <div class="calendar-nav">
                            <button id="calendar-prev-btn" class="btn btn-outline">‹</button>
                            <span id="calendar-month-year" class="calendar-month-year"></span>
                            <button id="calendar-next-btn" class="btn btn-outline">›</button>
                        </div>
                        <div class="calendar-view-options">
                            <button class="btn btn-secondary" data-view="week">Week</button>
                            <button class="btn btn-secondary active" data-view="month">Month</button>
                        </div>
                    </div>
                </div>
                <div id="calendar-content" class="calendar-content">
                    <div id="calendar-grid" class="calendar-grid"></div>
                </div>
            `;
            
            // Initialize calendar state
            this.calendarState = {
                currentDate: new Date(),
                view: 'month',
                events: []
            };
            
            // Load calendar events (items with due dates)
            await this.loadCalendarEvents();
            
            // Render calendar
            this.renderCalendarGrid(container);
            
            // Add event listeners
            this.addCalendarEventListeners(container);
            
        } catch (error) {
            console.error('Error loading calendar:', error);
            container.innerHTML = `
                <div class="page-header">
                    <h1>Calendar</h1>
                </div>
                <div class="error-state">
                    <h3>Error loading calendar</h3>
                    <p>There was an error loading the calendar. Please try again.</p>
                    <button class="btn btn-primary" onclick="window.location.reload()">Retry</button>
                </div>
            `;
        }
    }
    
    async loadCalendarEvents() {
        try {
            // Get all workspaces and their boards to find items with due dates
            const workspaces = await this.apiService.workspaces.getAll();
            let allEvents = [];
            
            for (const workspace of workspaces) {
                const boards = await this.apiService.boards.getAll(workspace.id);
                for (const board of boards) {
                    const items = await this.apiService.items.getAll(board.id);
                    
                    // Convert items with due dates to calendar events
                    const events = items
                        .filter(item => item.dueDate)
                        .map(item => ({
                            id: item.id,
                            title: item.title,
                            date: new Date(item.dueDate),
                            type: 'item',
                            status: item.status,
                            boardName: board.name,
                            workspaceName: workspace.name,
                            boardId: board.id,
                            workspaceId: workspace.id,
                            assignees: item.assignees || []
                        }));
                    
                    allEvents = allEvents.concat(events);
                }
            }
            
            this.calendarState.events = allEvents;
            
        } catch (error) {
            console.error('Error loading calendar events:', error);
            this.calendarState.events = [];
        }
    }
    
    renderCalendarGrid(container) {
        const monthYearSpan = container.querySelector('#calendar-month-year');
        const calendarGrid = container.querySelector('#calendar-grid');
        
        const currentDate = this.calendarState.currentDate;
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        // Update month/year display
        monthYearSpan.textContent = currentDate.toLocaleDateString('en-US', { 
            month: 'long', 
            year: 'numeric' 
        });
        
        if (this.calendarState.view === 'month') {
            this.renderMonthView(calendarGrid, year, month);
        } else {
            this.renderWeekView(calendarGrid, currentDate);
        }
    }
    
    renderMonthView(container, year, month) {
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday
        
        const days = [];
        const currentDate = new Date(startDate);
        
        // Generate 6 weeks of days
        for (let week = 0; week < 6; week++) {
            for (let day = 0; day < 7; day++) {
                days.push(new Date(currentDate));
                currentDate.setDate(currentDate.getDate() + 1);
            }
        }
        
        container.innerHTML = `
            <div class="calendar-month-view">
                <div class="calendar-header">
                    <div class="calendar-day-header">Sun</div>
                    <div class="calendar-day-header">Mon</div>
                    <div class="calendar-day-header">Tue</div>
                    <div class="calendar-day-header">Wed</div>
                    <div class="calendar-day-header">Thu</div>
                    <div class="calendar-day-header">Fri</div>
                    <div class="calendar-day-header">Sat</div>
                </div>
                <div class="calendar-body">
                    ${days.map(date => this.renderCalendarDay(date, month)).join('')}
                </div>
            </div>
        `;
    }
    
    renderCalendarDay(date, currentMonth) {
        const isCurrentMonth = date.getMonth() === currentMonth;
        const isToday = date.toDateString() === new Date().toDateString();
        const dayEvents = this.getEventsForDate(date);
        
        return `
            <div class="calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}" 
                 data-date="${date.toISOString().split('T')[0]}">
                <div class="calendar-day-number">${date.getDate()}</div>
                <div class="calendar-day-events">
                    ${dayEvents.slice(0, 3).map(event => `
                        <div class="calendar-event calendar-event--${this.getStatusClass(event.status)}" 
                             data-event-id="${event.id}" 
                             title="${this.escapeHtml(event.title)} - ${event.boardName}">
                            <span class="event-title">${this.truncateText(event.title, 15)}</span>
                        </div>
                    `).join('')}
                    ${dayEvents.length > 3 ? `
                        <div class="calendar-event-more">
                            +${dayEvents.length - 3} more
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    renderWeekView(container, startDate) {
        // Implementation for week view would go here
        // For now, show month view
        const month = startDate.getMonth();
        const year = startDate.getFullYear();
        this.renderMonthView(container, year, month);
    }
    
    getEventsForDate(date) {
        const dateString = date.toDateString();
        return this.calendarState.events.filter(event => 
            event.date.toDateString() === dateString
        );
    }
    
    addCalendarEventListeners(container) {
        // Today button
        container.querySelector('#calendar-today-btn')?.addEventListener('click', () => {
            this.calendarState.currentDate = new Date();
            this.renderCalendarGrid(container);
        });
        
        // Previous/Next buttons
        container.querySelector('#calendar-prev-btn')?.addEventListener('click', () => {
            const currentDate = this.calendarState.currentDate;
            if (this.calendarState.view === 'month') {
                currentDate.setMonth(currentDate.getMonth() - 1);
            } else {
                currentDate.setDate(currentDate.getDate() - 7);
            }
            this.renderCalendarGrid(container);
        });
        
        container.querySelector('#calendar-next-btn')?.addEventListener('click', () => {
            const currentDate = this.calendarState.currentDate;
            if (this.calendarState.view === 'month') {
                currentDate.setMonth(currentDate.getMonth() + 1);
            } else {
                currentDate.setDate(currentDate.getDate() + 7);
            }
            this.renderCalendarGrid(container);
        });
        
        // View toggle buttons
        container.querySelectorAll('.calendar-view-options button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                container.querySelectorAll('.calendar-view-options button').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.calendarState.view = e.target.dataset.view;
                this.renderCalendarGrid(container);
            });
        });
        
        // Event clicks
        container.addEventListener('click', (e) => {
            if (e.target.closest('.calendar-event')) {
                const eventElement = e.target.closest('.calendar-event');
                const eventId = eventElement.dataset.eventId;
                const event = this.calendarState.events.find(e => e.id === eventId);
                if (event) {
                    this.navigate(`/boards/${event.boardId}?item=${event.id}`);
                }
            }
        });
    }
    
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    }

    async renderReports(container) {
        try {
            container.innerHTML = `
                <div class="page-header">
                    <h1>Reports</h1>
                    <div class="report-controls">
                        <select id="report-type" class="form-input">
                            <option value="progress">Project Progress</option>
                            <option value="performance">Team Performance</option>
                            <option value="workload">Workload Analysis</option>
                            <option value="timeline">Timeline Overview</option>
                        </select>
                        <button id="generate-report-btn" class="btn btn-primary">Generate Report</button>
                        <button id="export-report-btn" class="btn btn-secondary">Export</button>
                    </div>
                </div>
                <div id="reports-content" class="reports-content">
                    <div id="report-summary" class="report-summary">
                        <!-- Summary will be loaded here -->
                    </div>
                    <div id="report-charts" class="report-charts">
                        <!-- Charts will be loaded here -->
                    </div>
                    <div id="report-details" class="report-details">
                        <!-- Detailed data will be loaded here -->
                    </div>
                </div>
            `;
            
            // Load initial report data
            await this.loadReportData(container, 'progress');
            
            // Add event listeners
            this.addReportEventListeners(container);
            
        } catch (error) {
            console.error('Error loading reports:', error);
            container.innerHTML = `
                <div class="page-header">
                    <h1>Reports</h1>
                </div>
                <div class="error-state">
                    <h3>Error loading reports</h3>
                    <p>There was an error loading the reports. Please try again.</p>
                    <button class="btn btn-primary" onclick="window.location.reload()">Retry</button>
                </div>
            `;
        }
    }
    
    async loadReportData(container, reportType) {
        try {
            // Get all workspaces and their data for reports
            const workspaces = await this.apiService.workspaces.getAll();
            let allItems = [];
            let allBoards = [];
            
            for (const workspace of workspaces) {
                const boards = await this.apiService.boards.getAll(workspace.id);
                allBoards = allBoards.concat(boards.map(b => ({ ...b, workspaceName: workspace.name })));
                
                for (const board of boards) {
                    const items = await this.apiService.items.getAll(board.id);
                    allItems = allItems.concat(items.map(i => ({ 
                        ...i, 
                        boardName: board.name,
                        workspaceName: workspace.name,
                        boardId: board.id,
                        workspaceId: workspace.id
                    })));
                }
            }
            
            // Generate report based on type
            switch (reportType) {
                case 'progress':
                    this.renderProgressReport(container, allItems, allBoards);
                    break;
                case 'performance':
                    this.renderPerformanceReport(container, allItems, allBoards);
                    break;
                case 'workload':
                    this.renderWorkloadReport(container, allItems, allBoards);
                    break;
                case 'timeline':
                    this.renderTimelineReport(container, allItems, allBoards);
                    break;
                default:
                    this.renderProgressReport(container, allItems, allBoards);
            }
            
        } catch (error) {
            console.error('Error loading report data:', error);
            container.querySelector('#reports-content').innerHTML = `
                <div class="error-state">
                    <p>Error loading report data.</p>
                </div>
            `;
        }
    }
    
    renderProgressReport(container, items, boards) {
        const summaryContainer = container.querySelector('#report-summary');
        const chartsContainer = container.querySelector('#report-charts');
        const detailsContainer = container.querySelector('#report-details');
        
        // Calculate summary stats
        const totalItems = items.length;
        const completedItems = items.filter(item => item.status === 'Done').length;
        const inProgressItems = items.filter(item => item.status === 'In Progress').length;
        const todoItems = items.filter(item => item.status === 'To Do').length;
        const completionRate = totalItems > 0 ? (completedItems / totalItems * 100).toFixed(1) : 0;
        
        // Render summary
        summaryContainer.innerHTML = `
            <div class="summary-cards">
                <div class="summary-card">
                    <h3>${totalItems}</h3>
                    <p>Total Items</p>
                </div>
                <div class="summary-card">
                    <h3>${completedItems}</h3>
                    <p>Completed</p>
                </div>
                <div class="summary-card">
                    <h3>${inProgressItems}</h3>
                    <p>In Progress</p>
                </div>
                <div class="summary-card">
                    <h3>${completionRate}%</h3>
                    <p>Completion Rate</p>
                </div>
            </div>
        `;
        
        // Render simple progress charts
        chartsContainer.innerHTML = `
            <div class="charts-grid">
                <div class="chart-container">
                    <h4>Status Distribution</h4>
                    <div class="progress-chart">
                        <div class="progress-bar">
                            <div class="progress-segment progress-segment--done" style="width: ${(completedItems/totalItems*100)}%"></div>
                            <div class="progress-segment progress-segment--progress" style="width: ${(inProgressItems/totalItems*100)}%"></div>
                            <div class="progress-segment progress-segment--todo" style="width: ${(todoItems/totalItems*100)}%"></div>
                        </div>
                        <div class="progress-legend">
                            <span class="legend-item"><span class="legend-color legend-color--done"></span> Done (${completedItems})</span>
                            <span class="legend-item"><span class="legend-color legend-color--progress"></span> In Progress (${inProgressItems})</span>
                            <span class="legend-item"><span class="legend-color legend-color--todo"></span> To Do (${todoItems})</span>
                        </div>
                    </div>
                </div>
                <div class="chart-container">
                    <h4>Board Progress</h4>
                    <div class="board-progress-list">
                        ${boards.map(board => {
                            const boardItems = items.filter(item => item.boardId === board.id);
                            const boardCompleted = boardItems.filter(item => item.status === 'Done').length;
                            const boardTotal = boardItems.length;
                            const boardProgress = boardTotal > 0 ? (boardCompleted / boardTotal * 100).toFixed(1) : 0;
                            
                            return `
                                <div class="board-progress-item">
                                    <div class="board-info">
                                        <span class="board-name">${board.name}</span>
                                        <span class="board-stats">${boardCompleted}/${boardTotal} (${boardProgress}%)</span>
                                    </div>
                                    <div class="board-progress-bar">
                                        <div class="board-progress-fill" style="width: ${boardProgress}%"></div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        `;
        
        // Render details table
        detailsContainer.innerHTML = `
            <div class="report-table-container">
                <h4>Recent Activity</h4>
                <table class="report-table">
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Board</th>
                            <th>Workspace</th>
                            <th>Status</th>
                            <th>Due Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.slice(0, 20).map(item => `
                            <tr>
                                <td>${this.escapeHtml(item.title)}</td>
                                <td>${this.escapeHtml(item.boardName)}</td>
                                <td>${this.escapeHtml(item.workspaceName)}</td>
                                <td><span class="status-badge status-badge--${this.getStatusClass(item.status)}">${item.status}</span></td>
                                <td>${item.dueDate ? new Date(item.dueDate).toLocaleDateString() : '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }
    
    renderPerformanceReport(container, items, boards) {
        // Simple performance report implementation
        const summaryContainer = container.querySelector('#report-summary');
        const chartsContainer = container.querySelector('#report-charts');
        
        summaryContainer.innerHTML = `
            <div class="summary-cards">
                <div class="summary-card">
                    <h3>${boards.length}</h3>
                    <p>Active Boards</p>
                </div>
                <div class="summary-card">
                    <h3>${items.length}</h3>
                    <p>Total Tasks</p>
                </div>
            </div>
        `;
        
        chartsContainer.innerHTML = `
            <div class="chart-container">
                <h4>Performance metrics will be available in future updates</h4>
                <p>This will include team productivity, task completion times, and user activity metrics.</p>
            </div>
        `;
    }
    
    renderWorkloadReport(container, items, boards) {
        // Simple workload report implementation
        const summaryContainer = container.querySelector('#report-summary');
        const chartsContainer = container.querySelector('#report-charts');
        
        summaryContainer.innerHTML = `
            <div class="summary-cards">
                <div class="summary-card">
                    <h3>${items.filter(i => i.assignees?.includes(this.currentUser.id)).length}</h3>
                    <p>My Tasks</p>
                </div>
            </div>
        `;
        
        chartsContainer.innerHTML = `
            <div class="chart-container">
                <h4>Workload analysis will be available in future updates</h4>
                <p>This will include task distribution, workload balance, and capacity planning.</p>
            </div>
        `;
    }
    
    renderTimelineReport(container, items, boards) {
        // Simple timeline report implementation
        const summaryContainer = container.querySelector('#report-summary');
        const chartsContainer = container.querySelector('#report-charts');
        
        summaryContainer.innerHTML = `
            <div class="summary-cards">
                <div class="summary-card">
                    <h3>${items.filter(i => i.dueDate).length}</h3>
                    <p>Items with Due Dates</p>
                </div>
            </div>
        `;
        
        chartsContainer.innerHTML = `
            <div class="chart-container">
                <h4>Timeline analysis will be available in future updates</h4>
                <p>This will include project timelines, milestone tracking, and deadline analysis.</p>
            </div>
        `;
    }
    
    addReportEventListeners(container) {
        // Report type selector
        container.querySelector('#report-type')?.addEventListener('change', (e) => {
            this.loadReportData(container, e.target.value);
        });
        
        // Generate report button
        container.querySelector('#generate-report-btn')?.addEventListener('click', () => {
            const reportType = container.querySelector('#report-type').value;
            this.loadReportData(container, reportType);
        });
        
        // Export button
        container.querySelector('#export-report-btn')?.addEventListener('click', () => {
            this.exportReport();
        });
    }
    
    exportReport() {
        // Simple export functionality
        alert('Export functionality will be implemented in future updates. This will allow exporting reports as PDF or CSV.');
    }
    
    // Helper method for escaping HTML
    escapeHtml(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.toString().replace(/[&<>"']/g, (m) => map[m]);
    }
    
    // Helper method for getting status CSS class
    getStatusClass(status) {
        switch (status) {
            case 'To Do':
            case 'todo':
                return 'gray';
            case 'In Progress':
            case 'in-progress':
                return 'blue';
            case 'Done':
            case 'done':
                return 'green';
            case 'Blocked':
            case 'blocked':
                return 'red';
            default:
                return 'gray';
        }
    }

    async renderSettings(container) {
        container.innerHTML = `
            <div class="page-header">
                <h1>Settings</h1>
            </div>
            <div class="settings-content">
                <div class="settings-section">
                    <h3>Profile Settings</h3>
                    <div class="form-group">
                        <label>First Name</label>
                        <input type="text" value="${this.currentUser?.firstName || ''}" class="form-input">
                    </div>
                    <div class="form-group">
                        <label>Last Name</label>
                        <input type="text" value="${this.currentUser?.lastName || ''}" class="form-input">
                    </div>
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" value="${this.currentUser?.email || ''}" class="form-input">
                    </div>
                    <button class="btn btn-primary">Save Changes</button>
                </div>
                <div class="settings-section">
                    <h3>Preferences</h3>
                    <div class="form-group">
                        <label>Theme</label>
                        <select class="form-input">
                            <option>Light</option>
                            <option>Dark</option>
                            <option>Auto</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" checked> Email notifications
                        </label>
                    </div>
                    <button class="btn btn-primary">Save Preferences</button>
                </div>
            </div>
        `;
    }

    async renderHelp(container) {
        container.innerHTML = `
            <div class="page-header">
                <h1>Help & Support</h1>
            </div>
            <div class="help-content">
                <div class="help-section">
                    <h3>Getting Started</h3>
                    <ul>
                        <li><a href="#" class="help-link">Creating your first workspace</a></li>
                        <li><a href="#" class="help-link">Setting up boards and columns</a></li>
                        <li><a href="#" class="help-link">Inviting team members</a></li>
                        <li><a href="#" class="help-link">Managing tasks and assignments</a></li>
                    </ul>
                </div>
                <div class="help-section">
                    <h3>Features</h3>
                    <ul>
                        <li><a href="#" class="help-link">Board management</a></li>
                        <li><a href="#" class="help-link">Task tracking</a></li>
                        <li><a href="#" class="help-link">Team collaboration</a></li>
                        <li><a href="#" class="help-link">Reports and analytics</a></li>
                    </ul>
                </div>
                <div class="help-section">
                    <h3>Contact Support</h3>
                    <p>Need additional help? Contact our support team:</p>
                    <p>Email: support@pmplatform.com</p>
                    <p>Phone: 1-800-PM-HELP</p>
                </div>
            </div>
        `;
    }

    async render404(container) {
        container.innerHTML = `
            <div class="error-page">
                <h1>404 - Page Not Found</h1>
                <p>The page you're looking for doesn't exist.</p>
                <a href="/dashboard" class="btn btn-primary">Go to Dashboard</a>
            </div>
        `;
    }

    async handleLogin(formData) {
        try {
            const result = await this.apiService.auth.login({
                email: formData.get('email'),
                password: formData.get('password')
            });

            if (!result.success) {
                throw new Error(result.message || 'Login failed');
            }
            const { user, accessToken, refreshToken } = result.data;
            // Store tokens via TokenManager so all future requests are authenticated
            this.apiService.tokenManager.setTokens(accessToken, refreshToken);
            
            // Store user data in localStorage for persistence
            localStorage.setItem('current_user', JSON.stringify(user));

            this.currentUser = user;
            this.isAuthenticated = true;
            eventBus.emit('auth:login', user);

            // Auto-select first workspace after login
            try {
                const wsResult = await this.apiService.workspaces.getAll();
                const workspaces = Array.isArray(wsResult.data) ? wsResult.data : (wsResult.data.workspaces || []);
                if (workspaces.length > 0) {
                    const firstWs = workspaces[0];
                    eventBus.emit('workspace:selected', firstWs);
                }
            } catch(e) {
                console.warn('Could not auto-select workspace', e);
            }
        } catch (error) {
            console.error('Login error:', error);
            const mainContent = document.getElementById('main-content');
            if (mainContent) {
                await this.renderLogin(mainContent, error.message || 'Invalid email or password');
            }
        }
    }

    // handleRegister method removed - now handled inline in renderRegister fallback

    async handleForgotPassword(formData) {
        try {
            const response = await this.apiService.post('/auth/forgot-password', {
                email: formData.get('email')
            });

            if (response.ok) {
                this.showSuccess('Password reset email sent!');
            } else {
                const error = await response.json();
                this.showError(error.message || 'Failed to send reset email');
            }
        } catch (error) {
            console.error('Forgot password error:', error);
            this.showError('Failed to send reset email. Please try again.');
        }
    }

    async logout() {
        try {
            await this.apiService.auth.logout();
        } catch (error) {
            console.error('Logout error:', error);
        }
        // The API service handles token cleanup automatically
        this.currentUser = null;
        this.isAuthenticated = false;
        eventBus.emit('auth:logout');
    }

    navigate(path) {
        window.history.pushState({}, '', path);
        this.handleRouteChange();
    }

    showApp() {
        console.log('showApp called');
        const loadingScreen = document.getElementById('loading-screen');
        const appContent = document.getElementById('app-content');
        
        console.log('loadingScreen element:', loadingScreen);
        console.log('appContent element:', appContent);
        
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
            console.log('Loading screen hidden');
        } else {
            console.error('Loading screen element not found!');
        }
        
        if (appContent) {
            appContent.classList.remove('hidden');
            console.log('App content shown, classes:', appContent.className);
        } else {
            console.error('App content element not found!');
        }
        
        // Force show app content as fallback
        setTimeout(() => {
            const loadingScreen2 = document.getElementById('loading-screen');
            const appContent2 = document.getElementById('app-content');
            if (loadingScreen2) loadingScreen2.remove();
            if (appContent2) {
                appContent2.style.display = 'flex';
                appContent2.classList.remove('hidden');
            }
        }, 1000);
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
                <button class="notification-close">&times;</button>
            </div>
        `;

        const container = document.getElementById('notifications-container') || document.body;
        container.appendChild(notification);

        // Add close functionality
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            this.removeNotification(notification);
        });

        // Auto-remove after 5 seconds
        setTimeout(() => {
            this.removeNotification(notification);
        }, 5000);

        // Animate in
        setTimeout(() => {
            notification.classList.add('notification-show');
        }, 10);
    }

    removeNotification(notification) {
        if (notification && notification.parentNode) {
            notification.classList.remove('notification-show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }

    async showCreateBoardDialog(workspaceId) {
        const modal = document.createElement('div');
        modal.className = 'modal modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Create New Board</h2>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <form id="create-board-form" class="modal-body">
                    <div class="form-group">
                        <label for="board-name">Board Name *</label>
                        <input type="text" id="board-name" name="name" required placeholder="Enter board name">
                    </div>
                    <div class="form-group">
                        <label for="board-description">Description</label>
                        <textarea id="board-description" name="description" placeholder="Board description (optional)"></textarea>
                    </div>
                    <div class="form-group">
                        <label for="board-template">Template</label>
                        <select id="board-template" name="template">
                            <option value="kanban">Kanban Board</option>
                            <option value="scrum">Scrum Board</option>
                            <option value="custom">Custom Board</option>
                        </select>
                    </div>
                </form>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                    <button type="submit" form="create-board-form" class="btn btn-primary">Create Board</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Focus on the name input
        modal.querySelector('#board-name').focus();
        
        // Handle form submission
        modal.querySelector('#create-board-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const boardData = {
                name: formData.get('name'),
                description: formData.get('description'),
                template: formData.get('template')
            };
            
            try {
                const response = await this.apiService.boards.create(workspaceId, boardData);
                console.log('Board created:', response);
                
                // Close modal
                modal.remove();
                
                // Reload boards
                const boardsContainer = document.querySelector('#boards-container');
                if (boardsContainer) {
                    await this.loadWorkspaceBoards(workspaceId, boardsContainer);
                }
                
                // Navigate to the new board
                if (response.data && response.data.id) {
                    this.navigate(`/board/${response.data.id}`);
                }
                
            } catch (error) {
                console.error('Error creating board:', error);
                alert('Failed to create board. Please try again.');
            }
        });
    }

    async loadWorkspaceBoards(workspaceId, container) {
        try {
            console.log('Loading boards for workspace:', workspaceId);
            const response = await this.apiService.boards.getAll(workspaceId);
            console.log('Boards response:', response);
            
            const boards = Array.isArray(response.data) ? response.data : (response.data.boards || []);
            
            if (boards.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <p>No boards yet. Create your first board to get started!</p>
                    </div>
                `;
            } else {
                container.innerHTML = `
                    <div class="boards-grid">
                        ${boards.map(board => `
                            <div class="board-card" data-board-id="${board.id}">
                                <div class="board-header">
                                    <h3>${board.name}</h3>
                                    <div class="board-actions">
                                        <button class="btn btn-sm btn-secondary edit-board-btn" data-board-id="${board.id}">Edit</button>
                                        <button class="btn btn-sm btn-danger delete-board-btn" data-board-id="${board.id}">Delete</button>
                                    </div>
                                </div>
                                <p class="board-description">${board.description || 'No description'}</p>
                                <div class="board-stats">
                                    <span class="stat">
                                        <strong>${board.columnCount || 0}</strong> columns
                                    </span>
                                    <span class="stat">
                                        <strong>${board.itemCount || 0}</strong> items
                                    </span>
                                </div>
                                <div class="board-footer">
                                    <small>Updated ${new Date(board.updatedAt).toLocaleDateString()}</small>
                                    <button class="btn btn-primary btn-sm open-board-btn" data-board-id="${board.id}">Open</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
                
                // Add event listeners for board actions
                container.querySelectorAll('.open-board-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const boardId = e.target.dataset.boardId;
                        this.navigate(`/board/${boardId}`);
                    });
                });
                
                container.querySelectorAll('.edit-board-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const boardId = e.target.dataset.boardId;
                        this.showEditBoardDialog(boardId);
                    });
                });
                
                container.querySelectorAll('.delete-board-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const boardId = e.target.dataset.boardId;
                        this.confirmDeleteBoard(boardId, workspaceId);
                    });
                });
            }
            
        } catch (error) {
            console.error('Error loading boards:', error);
            container.innerHTML = `
                <div class="error-state">
                    <p>Error loading boards. Please try again.</p>
                    <button class="btn btn-primary" onclick="this.loadWorkspaceBoards('${workspaceId}', this.parentElement.parentElement)">Retry</button>
                </div>
            `;
        }
    }

    async confirmDeleteBoard(boardId, workspaceId) {
        if (confirm('Are you sure you want to delete this board? This action cannot be undone.')) {
            try {
                await this.apiService.boards.delete(boardId);
                
                // Reload boards
                const boardsContainer = document.querySelector('#boards-container');
                if (boardsContainer) {
                    await this.loadWorkspaceBoards(workspaceId, boardsContainer);
                }
                
            } catch (error) {
                console.error('Error deleting board:', error);
                alert('Failed to delete board. Please try again.');
            }
        }
    }

    async showEditBoardDialog(boardId) {
        // Implementation for editing boards
        alert('Board editing functionality will be implemented next!');
    }

    async renderBoardView(container, boardId) {
        try {
            console.log('Loading board:', boardId);
            
            // Fetch board data
            const board = await this.apiService.boards.getById(boardId);
            
            if (!board) {
                throw new Error(`Board with ID ${boardId} not found`);
            }
            
            console.log('Found board:', board);
            
            container.innerHTML = `
                <div class="board-page">
                    <div class="board-header">
                        <div class="board-info">
                            <h1>${board.name}</h1>
                            <p class="board-description">${board.description || 'No description'}</p>
                        </div>
                        <div class="board-actions">
                            <button id="board-settings-btn" class="btn btn-secondary">Settings</button>
                            <button id="add-column-btn" class="btn btn-primary">Add Column</button>
                        </div>
                    </div>
                    
                    <div class="board-content">
                        <div id="board-columns" class="board-columns">
                            <!-- Board columns will be loaded here -->
                        </div>
                    </div>
                </div>
            `;
            
            console.log('Board rendered successfully');
            
            // Add event listeners
            container.querySelector('#add-column-btn')?.addEventListener('click', () => {
                this.showCreateColumnDialog(boardId);
            });
            
            container.querySelector('#board-settings-btn')?.addEventListener('click', () => {
                this.showEditBoardDialog(boardId);
            });
            
            // Load board columns and items
            await this.loadBoardColumns(boardId, container.querySelector('#board-columns'));
            
        } catch (error) {
            console.error('Error loading board:', error);
            container.innerHTML = `
                <div class="board-page error-state">
                    <h1>Error Loading Board</h1>
                    <p>Board ID: ${boardId}</p>
                    <p>Error: ${error.message}</p>
                    <p>Unable to load board. Please try again.</p>
                    <button class="btn btn-primary" onclick="window.location.reload()">Retry</button>
                </div>
            `;
        }
    }

    async loadBoardColumns(boardId, container) {
        try {
            console.log('Loading columns and items for board:', boardId);
            
            // Load items from API
            let items = [];
            try {
                const itemsResponse = await this.apiService.items.getAll(boardId);
                items = Array.isArray(itemsResponse.data) ? itemsResponse.data : (itemsResponse.data.items || []);
                console.log('Loaded items:', items);
            } catch (error) {
                console.warn('No items found for board:', error);
                items = [];
            }
            
            // Define default columns with items grouped by status
            const defaultColumns = [
                { 
                    id: 'todo', 
                    name: 'To Do', 
                    items: items.filter(item => item.status === 'todo' || item.columnId === 'todo') 
                },
                { 
                    id: 'in-progress', 
                    name: 'In Progress', 
                    items: items.filter(item => item.status === 'in-progress' || item.columnId === 'in-progress') 
                },
                { 
                    id: 'done', 
                    name: 'Done', 
                    items: items.filter(item => item.status === 'done' || item.columnId === 'done') 
                }
            ];
            
            container.innerHTML = `
                <div class="columns-container">
                    ${defaultColumns.map(column => `
                        <div class="column" data-column-id="${column.id}">
                            <div class="column-header">
                                <h3>${column.name} <span class="item-count">(${column.items.length})</span></h3>
                                <div class="column-actions">
                                    <button class="btn btn-sm btn-secondary add-item-btn" data-column-id="${column.id}" title="Add Item">+ Add Item</button>
                                    <button class="btn btn-sm btn-secondary column-menu-btn" data-column-id="${column.id}" title="Column Menu">⋯</button>
                                </div>
                            </div>
                            <div class="column-items" data-column-id="${column.id}">
                                ${column.items.length === 0 ? 
                                    '<div class="empty-column">No items yet. Click "Add Item" to create one.</div>' : 
                                    column.items.map(item => this.renderBoardItem(item)).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            
            // Add event listeners for adding items
            container.querySelectorAll('.add-item-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const columnId = e.target.dataset.columnId;
                    this.showCreateItemDialog(boardId, columnId);
                });
            });
            
            // Add event listeners for column menu
            container.querySelectorAll('.column-menu-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const columnId = e.target.dataset.columnId;
                    this.showColumnMenu(boardId, columnId);
                });
            });
            
            // Add event listeners for item actions
            container.querySelectorAll('.edit-item-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const itemId = e.target.dataset.itemId;
                    this.showEditItemDialog(boardId, itemId);
                });
            });
            
            container.querySelectorAll('.delete-item-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const itemId = e.target.dataset.itemId;
                    this.confirmDeleteItem(boardId, itemId);
                });
            });
            
            container.querySelectorAll('.board-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    if (!e.target.closest('.item-actions')) {
                        const itemId = item.dataset.itemId;
                        this.showItemDetailModal(boardId, itemId);
                    }
                });
            });
            
            // Initialize drag and drop
            this.initializeDragAndDrop(boardId, container);
            
        } catch (error) {
            console.error('Error loading board columns:', error);
            container.innerHTML = `
                <div class="error-state">
                    <p>Error loading board columns. Please try again.</p>
                    <button class="btn btn-primary" onclick="this.loadBoardColumns('${boardId}', this.parentElement.parentElement)">Retry</button>
                </div>
            `;
        }
    }

    renderBoardItem(item) {
        const priorityClass = this.getPriorityClass(item.priority);
        const statusClass = this.getStatusClass(item.status);
        const isOverdue = item.dueDate && new Date(item.dueDate) < new Date();
        
        return `
            <div class="board-item ${priorityClass}" data-item-id="${item.id}" draggable="true">
                <div class="item-header">
                    <div class="item-priority ${item.priority}">${this.getPriorityIcon(item.priority)}</div>
                    <h4 class="item-title">${this.escapeHtml(item.title || item.name)}</h4>
                    <div class="item-actions">
                        <button class="btn btn-xs btn-secondary edit-item-btn" data-item-id="${item.id}" title="Edit Item">✏️</button>
                        <button class="btn btn-xs btn-danger delete-item-btn" data-item-id="${item.id}" title="Delete Item">🗑️</button>
                    </div>
                </div>
                
                ${item.description ? `<p class="item-description">${this.escapeHtml(item.description)}</p>` : ''}
                
                <div class="item-metadata">
                    <div class="item-tags">
                        <span class="item-status ${statusClass}">${this.capitalizeFirst(item.status || 'todo')}</span>
                        <span class="item-priority-badge priority-${item.priority || 'medium'}">${this.capitalizeFirst(item.priority || 'medium')}</span>
                    </div>
                    
                    ${item.assignee ? `
                        <div class="item-assignee">
                            <span class="assignee-avatar">${item.assignee.charAt(0).toUpperCase()}</span>
                            <span class="assignee-name">${this.escapeHtml(item.assignee)}</span>
                        </div>
                    ` : ''}
                    
                    ${item.dueDate ? `
                        <div class="item-due-date ${isOverdue ? 'overdue' : ''}">
                            <span class="due-date-icon">📅</span>
                            <span class="due-date-text">${new Date(item.dueDate).toLocaleDateString()}</span>
                            ${isOverdue ? '<span class="overdue-badge">⚠️ Overdue</span>' : ''}
                        </div>
                    ` : ''}
                </div>
                
                <div class="item-footer">
                    <div class="item-stats">
                        ${item.commentCount ? `<span class="comment-count">💬 ${item.commentCount}</span>` : ''}
                        ${item.attachmentCount ? `<span class="attachment-count">📎 ${item.attachmentCount}</span>` : ''}
                    </div>
                    <div class="item-dates">
                        <small class="created-date">Created ${this.formatRelativeTime(item.createdAt)}</small>
                        ${item.updatedAt && item.updatedAt !== item.createdAt ? 
                            `<small class="updated-date">Updated ${this.formatRelativeTime(item.updatedAt)}</small>` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    getPriorityClass(priority) {
        const priorityMap = {
            'critical': 'priority-critical',
            'high': 'priority-high',
            'medium': 'priority-medium',
            'low': 'priority-low'
        };
        return priorityMap[priority] || 'priority-medium';
    }

    getPriorityIcon(priority) {
        const iconMap = {
            'critical': '🔴',
            'high': '🟠',
            'medium': '🟡',
            'low': '🟢'
        };
        return iconMap[priority] || '🟡';
    }

    capitalizeFirst(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    formatRelativeTime(dateString) {
        if (!dateString) return '';
        
        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
        
        if (diffInHours < 1) return 'just now';
        if (diffInHours < 24) return `${diffInHours}h ago`;
        
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) return `${diffInDays}d ago`;
        
        const diffInWeeks = Math.floor(diffInDays / 7);
        if (diffInWeeks < 4) return `${diffInWeeks}w ago`;
        
        return date.toLocaleDateString();
    }

    async showCreateColumnDialog(boardId) {
        alert('Column creation functionality will be implemented next!');
    }

    async showCreateItemDialog(boardId, columnId) {
        const modal = document.createElement('div');
        modal.className = 'modal modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Create New Item</h2>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <form id="create-item-form" class="modal-body">
                    <div class="form-group">
                        <label for="item-title">Title *</label>
                        <input type="text" id="item-title" name="title" required placeholder="Enter item title">
                    </div>
                    <div class="form-group">
                        <label for="item-description">Description</label>
                        <textarea id="item-description" name="description" placeholder="Item description (optional)" rows="3"></textarea>
                    </div>
                    <div class="form-group">
                        <label for="item-priority">Priority</label>
                        <select id="item-priority" name="priority">
                            <option value="low">Low</option>
                            <option value="medium" selected>Medium</option>
                            <option value="high">High</option>
                            <option value="critical">Critical</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="item-status">Status</label>
                        <select id="item-status" name="status">
                            <option value="todo" ${columnId === 'todo' ? 'selected' : ''}>To Do</option>
                            <option value="in-progress" ${columnId === 'in-progress' ? 'selected' : ''}>In Progress</option>
                            <option value="done" ${columnId === 'done' ? 'selected' : ''}>Done</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="item-due-date">Due Date</label>
                        <input type="date" id="item-due-date" name="dueDate">
                    </div>
                    <div class="form-group">
                        <label for="item-assignee">Assignee</label>
                        <input type="email" id="item-assignee" name="assignee" placeholder="Enter email to assign">
                    </div>
                </form>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                    <button type="submit" form="create-item-form" class="btn btn-primary">Create Item</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Focus on the title input
        modal.querySelector('#item-title').focus();
        
        // Handle form submission
        modal.querySelector('#create-item-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const itemData = {
                title: formData.get('title'),
                description: formData.get('description'),
                priority: formData.get('priority'),
                status: formData.get('status'),
                dueDate: formData.get('dueDate') || null,
                assignee: formData.get('assignee') || null,
                columnId: columnId
            };
            
            try {
                const response = await this.apiService.items.create(boardId, itemData);
                console.log('Item created:', response);
                
                // Close modal
                modal.remove();
                
                // Reload board columns to show new item
                const boardColumnsContainer = document.querySelector('#board-columns');
                if (boardColumnsContainer) {
                    await this.loadBoardColumns(boardId, boardColumnsContainer);
                }
                
                this.showNotification('Item created successfully!', 'success');
                
            } catch (error) {
                console.error('Error creating item:', error);
                this.showNotification('Failed to create item. Please try again.', 'error');
            }
        });
    }

    async showEditItemDialog(boardId, itemId) {
        try {
            // Fetch item details
            const response = await this.apiService.items.getById(itemId);
            const item = response.data;
            
            const modal = document.createElement('div');
            modal.className = 'modal modal-overlay';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Edit Item</h2>
                        <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
                    </div>
                    <form id="edit-item-form" class="modal-body">
                        <div class="form-group">
                            <label for="edit-item-title">Title *</label>
                            <input type="text" id="edit-item-title" name="title" required value="${this.escapeHtml(item.title || item.name)}">
                        </div>
                        <div class="form-group">
                            <label for="edit-item-description">Description</label>
                            <textarea id="edit-item-description" name="description" rows="3">${this.escapeHtml(item.description || '')}</textarea>
                        </div>
                        <div class="form-group">
                            <label for="edit-item-priority">Priority</label>
                            <select id="edit-item-priority" name="priority">
                                <option value="low" ${item.priority === 'low' ? 'selected' : ''}>Low</option>
                                <option value="medium" ${item.priority === 'medium' ? 'selected' : ''}>Medium</option>
                                <option value="high" ${item.priority === 'high' ? 'selected' : ''}>High</option>
                                <option value="critical" ${item.priority === 'critical' ? 'selected' : ''}>Critical</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="edit-item-status">Status</label>
                            <select id="edit-item-status" name="status">
                                <option value="todo" ${item.status === 'todo' ? 'selected' : ''}>To Do</option>
                                <option value="in-progress" ${item.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
                                <option value="done" ${item.status === 'done' ? 'selected' : ''}>Done</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="edit-item-due-date">Due Date</label>
                            <input type="date" id="edit-item-due-date" name="dueDate" value="${item.dueDate ? item.dueDate.split('T')[0] : ''}">
                        </div>
                        <div class="form-group">
                            <label for="edit-item-assignee">Assignee</label>
                            <input type="email" id="edit-item-assignee" name="assignee" value="${this.escapeHtml(item.assignee || '')}">
                        </div>
                    </form>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                        <button type="submit" form="edit-item-form" class="btn btn-primary">Update Item</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            modal.querySelector('#edit-item-title').focus();
            
            // Handle form submission
            modal.querySelector('#edit-item-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const updates = {
                    title: formData.get('title'),
                    description: formData.get('description'),
                    priority: formData.get('priority'),
                    status: formData.get('status'),
                    dueDate: formData.get('dueDate') || null,
                    assignee: formData.get('assignee') || null
                };
                
                try {
                    await this.apiService.items.update(itemId, updates);
                    modal.remove();
                    
                    // Reload board columns
                    const boardColumnsContainer = document.querySelector('#board-columns');
                    if (boardColumnsContainer) {
                        await this.loadBoardColumns(boardId, boardColumnsContainer);
                    }
                    
                    this.showNotification('Item updated successfully!', 'success');
                    
                } catch (error) {
                    console.error('Error updating item:', error);
                    this.showNotification('Failed to update item. Please try again.', 'error');
                }
            });
            
        } catch (error) {
            console.error('Error loading item for editing:', error);
            this.showNotification('Failed to load item details. Please try again.', 'error');
        }
    }

    async confirmDeleteItem(boardId, itemId) {
        if (confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
            try {
                await this.apiService.items.delete(itemId);
                
                // Reload board columns
                const boardColumnsContainer = document.querySelector('#board-columns');
                if (boardColumnsContainer) {
                    await this.loadBoardColumns(boardId, boardColumnsContainer);
                }
                
                this.showNotification('Item deleted successfully!', 'success');
                
            } catch (error) {
                console.error('Error deleting item:', error);
                this.showNotification('Failed to delete item. Please try again.', 'error');
            }
        }
    }

    async showItemDetailModal(boardId, itemId) {
        try {
            const response = await this.apiService.items.getById(itemId);
            const item = response.data;
            
            const modal = document.createElement('div');
            modal.className = 'modal modal-overlay item-detail-modal';
            modal.innerHTML = `
                <div class="modal-content large">
                    <div class="modal-header">
                        <div class="item-title-section">
                            <div class="item-priority ${item.priority}">${this.getPriorityIcon(item.priority)}</div>
                            <h2>${this.escapeHtml(item.title || item.name)}</h2>
                        </div>
                        <div class="modal-actions">
                            <button class="btn btn-secondary edit-item-btn" data-item-id="${itemId}">Edit</button>
                            <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
                        </div>
                    </div>
                    <div class="modal-body item-detail-body">
                        <div class="item-main-content">
                            <div class="item-description-section">
                                <h3>Description</h3>
                                <p>${item.description ? this.escapeHtml(item.description) : 'No description provided.'}</p>
                            </div>
                            
                            <div class="item-metadata-section">
                                <div class="metadata-grid">
                                    <div class="metadata-item">
                                        <label>Status</label>
                                        <span class="item-status ${this.getStatusClass(item.status)}">${this.capitalizeFirst(item.status || 'todo')}</span>
                                    </div>
                                    <div class="metadata-item">
                                        <label>Priority</label>
                                        <span class="item-priority-badge priority-${item.priority || 'medium'}">${this.capitalizeFirst(item.priority || 'medium')}</span>
                                    </div>
                                    ${item.assignee ? `
                                        <div class="metadata-item">
                                            <label>Assignee</label>
                                            <div class="assignee-info">
                                                <span class="assignee-avatar">${item.assignee.charAt(0).toUpperCase()}</span>
                                                <span>${this.escapeHtml(item.assignee)}</span>
                                            </div>
                                        </div>
                                    ` : ''}
                                    ${item.dueDate ? `
                                        <div class="metadata-item">
                                            <label>Due Date</label>
                                            <span class="due-date ${new Date(item.dueDate) < new Date() ? 'overdue' : ''}">${new Date(item.dueDate).toLocaleDateString()}</span>
                                        </div>
                                    ` : ''}
                                    <div class="metadata-item">
                                        <label>Created</label>
                                        <span>${this.formatRelativeTime(item.createdAt)}</span>
                                    </div>
                                    ${item.updatedAt && item.updatedAt !== item.createdAt ? `
                                        <div class="metadata-item">
                                            <label>Last Updated</label>
                                            <span>${this.formatRelativeTime(item.updatedAt)}</span>
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                            
                            <div class="item-comments-section">
                                <h3>Comments <span class="comment-count">(${item.commentCount || 0})</span></h3>
                                <div id="item-comments">
                                    <!-- Comments will be loaded here -->
                                    <p class="no-comments">No comments yet. Be the first to add one!</p>
                                </div>
                                <div class="comment-composer">
                                    <textarea placeholder="Add a comment..." rows="3"></textarea>
                                    <button class="btn btn-primary">Add Comment</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Add event listener for edit button
            modal.querySelector('.edit-item-btn').addEventListener('click', () => {
                modal.remove();
                this.showEditItemDialog(boardId, itemId);
            });
            
        } catch (error) {
            console.error('Error loading item details:', error);
            this.showNotification('Failed to load item details. Please try again.', 'error');
        }
    }

    async showColumnMenu(boardId, columnId) {
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.innerHTML = `
            <div class="menu-item" data-action="add-item">
                <span class="menu-icon">➕</span>
                <span>Add Item</span>
            </div>
            <div class="menu-item" data-action="edit-column">
                <span class="menu-icon">✏️</span>
                <span>Edit Column</span>
            </div>
            <div class="menu-item" data-action="clear-column">
                <span class="menu-icon">🗑️</span>
                <span>Clear All Items</span>
            </div>
            <div class="menu-item" data-action="delete-column">
                <span class="menu-icon">❌</span>
                <span>Delete Column</span>
            </div>
        `;
        
        document.body.appendChild(menu);
        
        // Position menu near the clicked button
        const event = window.event;
        menu.style.position = 'fixed';
        menu.style.left = event.clientX + 'px';
        menu.style.top = event.clientY + 'px';
        
        // Add event listeners
        menu.addEventListener('click', (e) => {
            const action = e.target.closest('.menu-item')?.dataset.action;
            if (action) {
                switch (action) {
                    case 'add-item':
                        this.showCreateItemDialog(boardId, columnId);
                        break;
                    case 'edit-column':
                        this.showEditColumnDialog(boardId, columnId);
                        break;
                    case 'clear-column':
                        this.confirmClearColumn(boardId, columnId);
                        break;
                    case 'delete-column':
                        this.confirmDeleteColumn(boardId, columnId);
                        break;
                }
            }
            menu.remove();
        });
        
        // Close menu when clicking outside
        setTimeout(() => {
            document.addEventListener('click', () => menu.remove(), { once: true });
        }, 0);
    }

    async showEditColumnDialog(boardId, columnId) {
        alert('Column editing functionality will be implemented next!');
    }

    async confirmClearColumn(boardId, columnId) {
        if (confirm('Are you sure you want to clear all items from this column? This action cannot be undone.')) {
            // Implementation for clearing column items
            this.showNotification('Clear column functionality will be implemented next!', 'info');
        }
    }

    async confirmDeleteColumn(boardId, columnId) {
        if (confirm('Are you sure you want to delete this column and all its items? This action cannot be undone.')) {
            // Implementation for deleting column
            this.showNotification('Delete column functionality will be implemented next!', 'info');
        }
    }

    initializeDragAndDrop(boardId, container) {
        let draggedItem = null;
        let draggedFromColumn = null;
        let dragOverColumn = null;
        
        // Make items draggable
        container.querySelectorAll('.board-item').forEach(item => {
            item.addEventListener('dragstart', (e) => {
                draggedItem = item;
                draggedFromColumn = item.closest('.column-items').dataset.columnId;
                item.classList.add('dragging');
                
                // Set drag data
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/html', item.outerHTML);
                e.dataTransfer.setDragImage(item, e.offsetX, e.offsetY);
            });
            
            item.addEventListener('dragend', (e) => {
                item.classList.remove('dragging');
                container.querySelectorAll('.column-items').forEach(col => {
                    col.classList.remove('drag-over');
                });
                draggedItem = null;
                draggedFromColumn = null;
                dragOverColumn = null;
            });
        });
        
        // Make columns drop targets
        container.querySelectorAll('.column-items').forEach(columnItems => {
            columnItems.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                
                // Visual feedback
                dragOverColumn = columnItems.dataset.columnId;
                container.querySelectorAll('.column-items').forEach(col => {
                    col.classList.remove('drag-over');
                });
                columnItems.classList.add('drag-over');
                
                // Show drop indicator
                const afterElement = this.getDragAfterElement(columnItems, e.clientY);
                const dragIndicator = container.querySelector('.drag-indicator') || this.createDragIndicator();
                
                if (afterElement == null) {
                    columnItems.appendChild(dragIndicator);
                } else {
                    columnItems.insertBefore(dragIndicator, afterElement);
                }
            });
            
            columnItems.addEventListener('dragleave', (e) => {
                // Only remove drag-over if we're leaving the column entirely
                if (!columnItems.contains(e.relatedTarget)) {
                    columnItems.classList.remove('drag-over');
                }
            });
            
            columnItems.addEventListener('drop', async (e) => {
                e.preventDefault();
                
                if (!draggedItem) return;
                
                const targetColumnId = columnItems.dataset.columnId;
                const itemId = draggedItem.dataset.itemId;
                
                // Remove drag indicator
                const dragIndicator = container.querySelector('.drag-indicator');
                if (dragIndicator) {
                    dragIndicator.remove();
                }
                
                // Remove visual feedback
                columnItems.classList.remove('drag-over');
                
                // Don't do anything if dropped in same column at same position
                if (draggedFromColumn === targetColumnId) {
                    return;
                }
                
                try {
                    // Update item status based on column
                    const statusMap = {
                        'todo': 'todo',
                        'in-progress': 'in-progress', 
                        'done': 'done'
                    };
                    
                    const newStatus = statusMap[targetColumnId] || targetColumnId;
                    
                    // Call API to move item
                    await this.moveItem(itemId, targetColumnId, newStatus);
                    
                    // Reload board to reflect changes
                    await this.loadBoardColumns(boardId, container.closest('#board-columns'));
                    
                    this.showNotification('Item moved successfully!', 'success');
                    
                } catch (error) {
                    console.error('Error moving item:', error);
                    this.showNotification('Failed to move item. Please try again.', 'error');
                    
                    // Reload board to reset state
                    await this.loadBoardColumns(boardId, container.closest('#board-columns'));
                }
            });
        });
    }
    
    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.board-item:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }
    
    createDragIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'drag-indicator';
        indicator.innerHTML = '<div class="drag-line"></div>';
        return indicator;
    }
    
    async moveItem(itemId, targetColumnId, newStatus) {
        try {
            // Use the items.move API if available, otherwise update item status
            if (this.apiService.items.move) {
                await this.apiService.items.move(itemId, 0, targetColumnId);
            } else {
                // Fallback to updating item status
                await this.apiService.items.update(itemId, { 
                    status: newStatus,
                    columnId: targetColumnId 
                });
            }
        } catch (error) {
            console.error('Error in moveItem:', error);
            throw error;
        }
    }

    initializeKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Skip if user is typing in an input field
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.contentEditable === 'true') {
                return;
            }
            
            // Handle keyboard shortcuts
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'k': // Ctrl/Cmd + K - Quick search
                        e.preventDefault();
                        this.showQuickSearch();
                        break;
                    case 'n': // Ctrl/Cmd + N - New item/board
                        e.preventDefault();
                        this.handleQuickCreate();
                        break;
                    case '/': // Ctrl/Cmd + / - Help
                        e.preventDefault();
                        this.showKeyboardShortcuts();
                        break;
                    case 'b': // Ctrl/Cmd + B - Go to boards
                        e.preventDefault();
                        this.navigate('/boards');
                        break;
                    case 'w': // Ctrl/Cmd + W - Go to workspaces
                        e.preventDefault();
                        this.navigate('/workspaces');
                        break;
                    case 't': // Ctrl/Cmd + T - Go to tasks
                        e.preventDefault();
                        this.navigate('/tasks');
                        break;
                    case 'c': // Ctrl/Cmd + C - Go to calendar
                        e.preventDefault();
                        this.navigate('/calendar');
                        break;
                }
            } else {
                // Single key shortcuts
                switch (e.key) {
                    case 'Escape': // Close modals/dialogs
                        this.closeTopModal();
                        break;
                    case '?': // Show help
                        e.preventDefault();
                        this.showKeyboardShortcuts();
                        break;
                    case 'h': // Go to dashboard
                        if (!e.ctrlKey && !e.metaKey) {
                            this.navigate('/dashboard');
                        }
                        break;
                }
            }
        });
    }

    showQuickSearch() {
        const modal = document.createElement('div');
        modal.className = 'modal modal-overlay quick-search-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Quick Search</h2>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="search-input-container">
                        <input type="text" id="quick-search-input" placeholder="Search boards, items, workspaces..." autocomplete="off">
                        <div class="search-icon">🔍</div>
                    </div>
                    <div id="search-results" class="search-results">
                        <div class="search-hint">Start typing to search...</div>
                    </div>
                </div>
                <div class="modal-footer">
                    <div class="keyboard-hints">
                        <span>↑↓ Navigate</span>
                        <span>↵ Select</span>
                        <span>Esc Close</span>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        const searchInput = modal.querySelector('#quick-search-input');
        searchInput.focus();
        
        // Handle search
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.performQuickSearch(e.target.value, modal.querySelector('#search-results'));
            }, 300);
        });
        
        // Handle keyboard navigation
        let selectedIndex = -1;
        searchInput.addEventListener('keydown', (e) => {
            const results = modal.querySelectorAll('.search-result-item');
            
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    selectedIndex = Math.min(selectedIndex + 1, results.length - 1);
                    this.updateSearchSelection(results, selectedIndex);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    selectedIndex = Math.max(selectedIndex - 1, -1);
                    this.updateSearchSelection(results, selectedIndex);
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (selectedIndex >= 0 && results[selectedIndex]) {
                        results[selectedIndex].click();
                    }
                    break;
                case 'Escape':
                    modal.remove();
                    break;
            }
        });
    }

    async performQuickSearch(query, resultsContainer) {
        if (!query.trim()) {
            resultsContainer.innerHTML = '<div class="search-hint">Start typing to search...</div>';
            return;
        }
        
        resultsContainer.innerHTML = '<div class="search-loading">Searching...</div>';
        
        try {
            // Search across different types
            const searchPromises = [
                this.apiService.search.boards(query).catch(() => ({ data: [] })),
                this.apiService.search.items(query).catch(() => ({ data: [] })),
                this.apiService.workspaces.getAll().then(response => {
                    const workspaces = Array.isArray(response.data) ? response.data : (response.data.workspaces || []);
                    return {
                        data: workspaces.filter(ws => 
                            ws.name.toLowerCase().includes(query.toLowerCase()) ||
                            (ws.description && ws.description.toLowerCase().includes(query.toLowerCase()))
                        )
                    };
                }).catch(() => ({ data: [] }))
            ];
            
            const [boardResults, itemResults, workspaceResults] = await Promise.all(searchPromises);
            
            const allResults = [
                ...workspaceResults.data.map(ws => ({ ...ws, type: 'workspace' })),
                ...boardResults.data.map(board => ({ ...board, type: 'board' })),
                ...itemResults.data.map(item => ({ ...item, type: 'item' }))
            ].slice(0, 10); // Limit to 10 results
            
            if (allResults.length === 0) {
                resultsContainer.innerHTML = '<div class="search-no-results">No results found</div>';
                return;
            }
            
            resultsContainer.innerHTML = allResults.map(result => 
                this.renderSearchResult(result)
            ).join('');
            
            // Add click handlers
            resultsContainer.querySelectorAll('.search-result-item').forEach(item => {
                item.addEventListener('click', () => {
                    const type = item.dataset.type;
                    const id = item.dataset.id;
                    
                    // Navigate based on type
                    switch (type) {
                        case 'workspace':
                            this.navigate(`/workspace/${id}`);
                            break;
                        case 'board':
                            this.navigate(`/board/${id}`);
                            break;
                        case 'item':
                            const boardId = item.dataset.boardId;
                            if (boardId) {
                                this.navigate(`/board/${boardId}`);
                            }
                            break;
                    }
                    
                    // Close modal
                    item.closest('.modal').remove();
                });
            });
            
        } catch (error) {
            console.error('Search error:', error);
            resultsContainer.innerHTML = '<div class="search-error">Search failed. Please try again.</div>';
        }
    }

    renderSearchResult(result) {
        const icons = {
            workspace: '🏢',
            board: '📋',
            item: '📝'
        };
        
        return `
            <div class="search-result-item" data-type="${result.type}" data-id="${result.id}" data-board-id="${result.boardId || ''}">
                <div class="result-icon">${icons[result.type]}</div>
                <div class="result-content">
                    <div class="result-title">${this.escapeHtml(result.name || result.title)}</div>
                    <div class="result-subtitle">${this.getSearchResultSubtitle(result)}</div>
                </div>
                <div class="result-type">${result.type}</div>
            </div>
        `;
    }

    getSearchResultSubtitle(result) {
        switch (result.type) {
            case 'workspace':
                return this.escapeHtml(result.description || 'Workspace');
            case 'board':
                return this.escapeHtml(result.workspaceName || 'Board');
            case 'item':
                return this.escapeHtml(`${result.boardName || 'Unknown Board'} • ${result.status || 'No status'}`);
            default:
                return '';
        }
    }

    updateSearchSelection(results, selectedIndex) {
        results.forEach((result, index) => {
            if (index === selectedIndex) {
                result.classList.add('selected');
            } else {
                result.classList.remove('selected');
            }
        });
    }

    handleQuickCreate() {
        const currentPath = window.location.pathname;
        
        if (currentPath.startsWith('/board/')) {
            // If on a board, create new item
            const boardId = currentPath.split('/')[2];
            this.showCreateItemDialog(boardId, 'todo');
        } else if (currentPath.startsWith('/workspace/')) {
            // If in a workspace, create new board
            const workspaceId = currentPath.split('/')[2];
            this.showCreateBoardDialog(workspaceId);
        } else if (currentPath === '/workspaces') {
            // If on workspaces page, create new workspace
            this.showCreateWorkspaceDialog();
        } else {
            // Default to creating a workspace
            this.showCreateWorkspaceDialog();
        }
    }

    showKeyboardShortcuts() {
        const modal = document.createElement('div');
        modal.className = 'modal modal-overlay keyboard-shortcuts-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Keyboard Shortcuts</h2>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="shortcuts-grid">
                        <div class="shortcuts-section">
                            <h3>Navigation</h3>
                            <div class="shortcut-item">
                                <kbd>Ctrl</kbd> + <kbd>W</kbd>
                                <span>Go to Workspaces</span>
                            </div>
                            <div class="shortcut-item">
                                <kbd>Ctrl</kbd> + <kbd>B</kbd>
                                <span>Go to Boards</span>
                            </div>
                            <div class="shortcut-item">
                                <kbd>Ctrl</kbd> + <kbd>T</kbd>
                                <span>Go to Tasks</span>
                            </div>
                            <div class="shortcut-item">
                                <kbd>Ctrl</kbd> + <kbd>C</kbd>
                                <span>Go to Calendar</span>
                            </div>
                            <div class="shortcut-item">
                                <kbd>H</kbd>
                                <span>Go to Dashboard</span>
                            </div>
                        </div>
                        
                        <div class="shortcuts-section">
                            <h3>Actions</h3>
                            <div class="shortcut-item">
                                <kbd>Ctrl</kbd> + <kbd>K</kbd>
                                <span>Quick Search</span>
                            </div>
                            <div class="shortcut-item">
                                <kbd>Ctrl</kbd> + <kbd>N</kbd>
                                <span>Quick Create</span>
                            </div>
                            <div class="shortcut-item">
                                <kbd>Esc</kbd>
                                <span>Close Modal</span>
                            </div>
                            <div class="shortcut-item">
                                <kbd>?</kbd>
                                <span>Show Help</span>
                            </div>
                        </div>
                        
                        <div class="shortcuts-section">
                            <h3>Board Actions</h3>
                            <div class="shortcut-item">
                                <span class="drag-icon">🖱️</span>
                                <span>Drag & Drop Items</span>
                            </div>
                            <div class="shortcut-item">
                                <kbd>Click</kbd>
                                <span>Open Item Details</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="this.closest('.modal').remove()">Got it!</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    closeTopModal() {
        const modals = document.querySelectorAll('.modal');
        if (modals.length > 0) {
            modals[modals.length - 1].remove();
        }
    }

    initializeMobileNavigation() {
        const mobileToggle = document.getElementById('mobile-nav-toggle');
        const mobileOverlay = document.getElementById('mobile-nav-overlay');
        const mainNav = document.getElementById('main-nav');
        
        if (!mobileToggle || !mobileOverlay || !mainNav) return;
        
        // Toggle mobile navigation
        const toggleNav = () => {
            const isOpen = mainNav.classList.contains('open');
            
            if (isOpen) {
                mainNav.classList.remove('open');
                mobileOverlay.classList.remove('active');
                document.body.style.overflow = '';
            } else {
                mainNav.classList.add('open');
                mobileOverlay.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        };
        
        // Close mobile navigation
        const closeNav = () => {
            mainNav.classList.remove('open');
            mobileOverlay.classList.remove('active');
            document.body.style.overflow = '';
        };
        
        // Event listeners
        mobileToggle.addEventListener('click', toggleNav);
        mobileOverlay.addEventListener('click', closeNav);
        
        // Close on navigation
        mainNav.addEventListener('click', (e) => {
            if (e.target.closest('.nav-item')) {
                closeNav();
            }
        });
        
        // Handle window resize
        window.addEventListener('resize', () => {
            if (window.innerWidth >= 768) {
                closeNav();
            }
        });
        
        // Handle touch swipe to close
        let startX = 0;
        let startY = 0;
        
        mainNav.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        }, { passive: true });
        
        mainNav.addEventListener('touchmove', (e) => {
            if (!startX || !startY) return;
            
            const currentX = e.touches[0].clientX;
            const currentY = e.touches[0].clientY;
            
            const diffX = startX - currentX;
            const diffY = startY - currentY;
            
            // Swipe left to close
            if (Math.abs(diffX) > Math.abs(diffY) && diffX > 50) {
                closeNav();
            }
            
            startX = 0;
            startY = 0;
        }, { passive: true });
    }
}

// Initialize the application when DOM is ready
console.log('Main.js loaded, document.readyState:', document.readyState);

function initializeApp() {
    console.log('Initializing app...');
    console.log('DOM elements check:');
    console.log('- loading-screen:', document.getElementById('loading-screen'));
    console.log('- app-content:', document.getElementById('app-content'));
    
    try {
        const app = new App();
        console.log('App instance created:', app);
        app.init();
    } catch (error) {
        console.error('Failed to initialize app:', error);
        console.error('Error stack:', error.stack);
        
        // Fallback: just hide loading screen
        const loadingScreen = document.getElementById('loading-screen');
        const appContent = document.getElementById('app-content');
        if (loadingScreen) loadingScreen.style.display = 'none';
        if (appContent) {
            appContent.classList.remove('hidden');
            appContent.innerHTML = '<div style="padding: 20px;"><h1>Error loading application</h1><p>Please check the browser console for details.</p></div>';
        }
    }
}

if (document.readyState === 'loading') {
    console.log('DOM still loading, adding event listener');
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    console.log('DOM already ready, initializing immediately');
    initializeApp();
} 