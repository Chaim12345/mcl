/**
 * Workspace List Component
 */

import { Component } from '../base/Component.js';
import { workspaceService } from '../../services/workspace.js';
import { authService } from '../../services/auth.js';
import { eventBus } from '../../utils/events.js';

export class WorkspaceList extends Component {
    constructor(container, options = {}) {
        super(container, options);
        
        this.state = {
            isLoading: false,
            workspaces: [],
            currentWorkspace: null,
            searchQuery: '',
            sortBy: 'name', // name, created, updated
            sortOrder: 'asc', // asc, desc
            showCreateDialog: false,
            errors: {}
        };
        
        this.init();
    }
    
    init() {
        this.loadWorkspaces();
        this.render();
        this.bindEvents();
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Listen for workspace events
        eventBus.on('workspace:list_updated', this.handleWorkspacesUpdated.bind(this));
        eventBus.on('workspace:created', this.handleWorkspaceCreated.bind(this));
        eventBus.on('workspace:switched', this.handleWorkspaceSwitched.bind(this));
        eventBus.on('workspace:deleted', this.handleWorkspaceDeleted.bind(this));
    }
    
    async loadWorkspaces() {
        this.setState({ isLoading: true });
        
        try {
            const workspaces = await workspaceService.getWorkspaces();
            const currentWorkspace = workspaceService.getCurrentWorkspace();
            
            this.setState({
                isLoading: false,
                workspaces,
                currentWorkspace
            });
        } catch (error) {
            this.setState({
                isLoading: false,
                errors: { load: error.message }
            });
        }
    }
    
    render() {
        const { isLoading, workspaces, currentWorkspace, searchQuery, sortBy, sortOrder, showCreateDialog, errors } = this.state;
        
        if (showCreateDialog) {
            this.renderCreateDialog();
            return;
        }
        
        const filteredWorkspaces = this.filterAndSortWorkspaces(workspaces, searchQuery, sortBy, sortOrder);
        
        this.container.innerHTML = `
            <div class="workspace-list">
                <div class="workspace-list-header">
                    <div class="workspace-list-title">
                        <h2 class="heading-lg">Your Workspaces</h2>
                        <p class="text-muted">Manage and switch between your workspaces</p>
                    </div>
                    
                    <div class="workspace-list-actions">
                        <button type="button" class="btn btn--primary" data-action="create-workspace">
                            <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="8" x2="12" y2="16"></line>
                                <line x1="8" y1="12" x2="16" y2="12"></line>
                            </svg>
                            Create Workspace
                        </button>
                    </div>
                </div>
                
                ${workspaces.length > 0 ? `
                    <div class="workspace-list-controls">
                        <div class="search-box">
                            <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <circle cx="11" cy="11" r="8"></circle>
                                <path d="m21 21-4.35-4.35"></path>
                            </svg>
                            <input 
                                type="text" 
                                class="search-input" 
                                placeholder="Search workspaces..."
                                value="${searchQuery}"
                                data-search-input
                            />
                        </div>
                        
                        <div class="sort-controls">
                            <select class="sort-select" data-sort-by>
                                <option value="name" ${sortBy === 'name' ? 'selected' : ''}>Sort by Name</option>
                                <option value="created" ${sortBy === 'created' ? 'selected' : ''}>Sort by Created</option>
                                <option value="updated" ${sortBy === 'updated' ? 'selected' : ''}>Sort by Updated</option>
                            </select>
                            
                            <button 
                                type="button" 
                                class="btn btn--ghost sort-order-btn" 
                                data-action="toggle-sort-order"
                                title="${sortOrder === 'asc' ? 'Sort Descending' : 'Sort Ascending'}"
                            >
                                <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    ${sortOrder === 'asc' ? 
                                        '<path d="m3 16 4 4 4-4"></path><path d="M7 20V4"></path><path d="m21 8-4-4-4 4"></path><path d="M17 4v16"></path>' :
                                        '<path d="m3 8 4-4 4 4"></path><path d="M7 4v16"></path><path d="m21 16-4 4-4-4"></path><path d="M17 20V4"></path>'
                                    }
                                </svg>
                            </button>
                        </div>
                    </div>
                ` : ''}
                
                ${errors.load ? `
                    <div class="alert alert--error">
                        <svg class="alert-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="15" y1="9" x2="9" y2="15"></line>
                            <line x1="9" y1="9" x2="15" y2="15"></line>
                        </svg>
                        <p>${errors.load}</p>
                    </div>
                ` : ''}
                
                <div class="workspace-list-content">
                    ${isLoading ? this.renderLoadingState() : this.renderWorkspaces(filteredWorkspaces, currentWorkspace)}
                </div>
            </div>
        `;
    }
    
    renderLoadingState() {
        return `
            <div class="loading-state">
                <div class="loading-spinner">
                    <svg class="spinner" width="32" height="32" viewBox="0 0 24 24">
                        <circle class="spinner-circle" cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
                    </svg>
                </div>
                <p class="loading-text">Loading workspaces...</p>
            </div>
        `;
    }
    
    renderWorkspaces(workspaces, currentWorkspace) {
        if (workspaces.length === 0) {
            return this.renderEmptyState();
        }
        
        return `
            <div class="workspace-grid">
                ${workspaces.map(workspace => this.renderWorkspaceCard(workspace, currentWorkspace)).join('')}
            </div>
        `;
    }
    
    renderWorkspaceCard(workspace, currentWorkspace) {
        const isActive = currentWorkspace && currentWorkspace.id === workspace.id;
        const memberCount = workspace.memberCount || 0;
        const boardCount = workspace.boardCount || 0;
        
        return `
            <div class="workspace-card ${isActive ? 'workspace-card--active' : ''}" data-workspace-id="${workspace.id}">
                <div class="workspace-card-header">
                    <div class="workspace-avatar">
                        ${workspace.avatar ? 
                            `<img src="${workspace.avatar}" alt="${workspace.name}" class="workspace-avatar-img" />` :
                            `<div class="workspace-avatar-placeholder">${this.getWorkspaceInitials(workspace.name)}</div>`
                        }
                    </div>
                    
                    <div class="workspace-info">
                        <h3 class="workspace-name">${this.escapeHtml(workspace.name)}</h3>
                        ${workspace.description ? 
                            `<p class="workspace-description">${this.escapeHtml(workspace.description)}</p>` : 
                            '<p class="workspace-description text-muted">No description</p>'
                        }
                    </div>
                    
                    <div class="workspace-menu">
                        <button type="button" class="btn btn--ghost btn--icon" data-action="workspace-menu" data-workspace-id="${workspace.id}">
                            <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <circle cx="12" cy="12" r="1"></circle>
                                <circle cx="19" cy="12" r="1"></circle>
                                <circle cx="5" cy="12" r="1"></circle>
                            </svg>
                        </button>
                    </div>
                </div>
                
                <div class="workspace-card-body">
                    <div class="workspace-stats">
                        <div class="workspace-stat">
                            <svg class="workspace-stat-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                            <span class="workspace-stat-text">${memberCount} member${memberCount !== 1 ? 's' : ''}</span>
                        </div>
                        
                        <div class="workspace-stat">
                            <svg class="workspace-stat-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                <rect x="9" y="9" width="6" height="6"></rect>
                            </svg>
                            <span class="workspace-stat-text">${boardCount} board${boardCount !== 1 ? 's' : ''}</span>
                        </div>
                    </div>
                    
                    <div class="workspace-timestamps">
                        <p class="workspace-timestamp">
                            <span class="text-muted">Created:</span>
                            <time datetime="${workspace.createdAt}">${this.formatDate(workspace.createdAt)}</time>
                        </p>
                        ${workspace.updatedAt && workspace.updatedAt !== workspace.createdAt ? `
                            <p class="workspace-timestamp">
                                <span class="text-muted">Updated:</span>
                                <time datetime="${workspace.updatedAt}">${this.formatDate(workspace.updatedAt)}</time>
                            </p>
                        ` : ''}
                    </div>
                </div>
                
                <div class="workspace-card-footer">
                    ${isActive ? `
                        <button type="button" class="btn btn--outline btn--full-width" data-action="enter-workspace" data-workspace-id="${workspace.id}">
                            <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                <polyline points="16,17 21,12 16,7"></polyline>
                                <line x1="21" y1="12" x2="9" y2="12"></line>
                            </svg>
                            Enter Workspace
                        </button>
                    ` : `
                        <button type="button" class="btn btn--primary btn--full-width" data-action="switch-workspace" data-workspace-id="${workspace.id}">
                            <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <polyline points="9,18 15,12 9,6"></polyline>
                            </svg>
                            Switch to Workspace
                        </button>
                    `}
                </div>
                
                ${isActive ? '<div class="workspace-card-active-indicator"></div>' : ''}
            </div>
        `;
    }
    
    renderEmptyState() {
        const currentUser = authService.getCurrentUser();
        
        return `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <svg class="icon-large" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                </div>
                <h3 class="empty-state-title">No workspaces yet</h3>
                <p class="empty-state-description">
                    ${currentUser ? 
                        `Welcome ${currentUser.firstName}! Create your first workspace to get started with organizing your projects.` :
                        'Create your first workspace to get started with organizing your projects.'
                    }
                </p>
                <button type="button" class="btn btn--primary" data-action="create-workspace">
                    <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="16"></line>
                        <line x1="8" y1="12" x2="16" y2="12"></line>
                    </svg>
                    Create Your First Workspace
                </button>
            </div>
        `;
    }
    
    async renderCreateDialog() {
        try {
            // Import WorkspaceCreateDialog component
            const { WorkspaceCreateDialog } = await import('./WorkspaceCreateDialog.js');
            
            // Create modal container
            const modalContainer = document.createElement('div');
            modalContainer.className = 'modal-overlay';
            document.body.appendChild(modalContainer);
            
            // Initialize the dialog
            const createDialog = new WorkspaceCreateDialog(modalContainer, {
                onClose: () => {
                    document.body.removeChild(modalContainer);
                },
                onSuccess: (workspace) => {
                    document.body.removeChild(modalContainer);
                    this.refreshWorkspaces();
                    this.emit('workspace:created', workspace);
                }
            });
            
        } catch (error) {
            console.error('Error loading workspace create dialog:', error);
            // Fallback to simple prompt
            const name = prompt('Enter workspace name:');
            if (name) {
                await this.createWorkspace({ name, description: '' });
            }
        }
    }
    
    bindEvents() {
        this.container.addEventListener('click', this.handleClick.bind(this));
        this.container.addEventListener('input', this.handleInput.bind(this));
        this.container.addEventListener('change', this.handleChange.bind(this));
    }
    
    handleClick(event) {
        const action = event.target.closest('[data-action]')?.dataset.action;
        
        switch (action) {
            case 'create-workspace':
                this.handleCreateWorkspace();
                break;
            case 'switch-workspace':
                this.handleSwitchWorkspace(event.target.closest('[data-workspace-id]').dataset.workspaceId);
                break;
            case 'enter-workspace':
                this.handleEnterWorkspace(event.target.closest('[data-workspace-id]').dataset.workspaceId);
                break;
            case 'workspace-menu':
                this.handleWorkspaceMenu(event.target.closest('[data-workspace-id]').dataset.workspaceId, event.target);
                break;
            case 'toggle-sort-order':
                this.handleToggleSortOrder();
                break;
            case 'close-create-dialog':
                this.setState({ showCreateDialog: false });
                break;
        }
    }
    
    handleInput(event) {
        if (event.target.dataset.searchInput !== undefined) {
            this.setState({ searchQuery: event.target.value });
        }
    }
    
    handleChange(event) {
        if (event.target.dataset.sortBy !== undefined) {
            this.setState({ sortBy: event.target.value });
        }
    }
    
    handleCreateWorkspace() {
        if (this.options.onCreateWorkspace) {
            this.options.onCreateWorkspace();
        } else {
            this.setState({ showCreateDialog: true });
        }
    }
    
    async handleSwitchWorkspace(workspaceId) {
        try {
            await workspaceService.switchWorkspace(workspaceId);
        } catch (error) {
            // Error already handled by service
        }
    }
    
    handleEnterWorkspace(workspaceId) {
        if (this.options.onEnterWorkspace) {
            this.options.onEnterWorkspace(workspaceId);
        } else {
            // Default navigation to workspace dashboard
            window.location.href = `/workspace/${workspaceId}/dashboard`;
        }
    }
    
    handleWorkspaceMenu(workspaceId, target) {
        // Show context menu for workspace actions
        if (this.options.onWorkspaceMenu) {
            this.options.onWorkspaceMenu(workspaceId, target);
        }
    }
    
    handleToggleSortOrder() {
        const newOrder = this.state.sortOrder === 'asc' ? 'desc' : 'asc';
        this.setState({ sortOrder: newOrder });
    }
    
    // Event handlers for workspace service events
    handleWorkspacesUpdated({ workspaces }) {
        this.setState({ workspaces });
    }
    
    handleWorkspaceCreated({ workspace }) {
        this.setState({
            workspaces: [...this.state.workspaces, workspace],
            showCreateDialog: false
        });
    }
    
    handleWorkspaceSwitched({ workspace }) {
        this.setState({ currentWorkspace: workspace });
    }
    
    handleWorkspaceDeleted({ workspaceId }) {
        this.setState({
            workspaces: this.state.workspaces.filter(w => w.id !== workspaceId)
        });
    }
    
    filterAndSortWorkspaces(workspaces, searchQuery, sortBy, sortOrder) {
        let filtered = workspaces;
        
        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(workspace => 
                workspace.name.toLowerCase().includes(query) ||
                (workspace.description && workspace.description.toLowerCase().includes(query))
            );
        }
        
        // Sort
        filtered.sort((a, b) => {
            let aValue, bValue;
            
            switch (sortBy) {
                case 'name':
                    aValue = a.name.toLowerCase();
                    bValue = b.name.toLowerCase();
                    break;
                case 'created':
                    aValue = new Date(a.createdAt);
                    bValue = new Date(b.createdAt);
                    break;
                case 'updated':
                    aValue = new Date(a.updatedAt);
                    bValue = new Date(b.updatedAt);
                    break;
                default:
                    return 0;
            }
            
            if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
        
        return filtered;
    }
    
    getWorkspaceInitials(name) {
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    }
    
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Refresh workspaces
    async refresh() {
        await this.loadWorkspaces();
        this.render();
    }
    
    destroy() {
        // Remove event listeners
        eventBus.off('workspace:list_updated', this.handleWorkspacesUpdated);
        eventBus.off('workspace:created', this.handleWorkspaceCreated);
        eventBus.off('workspace:switched', this.handleWorkspaceSwitched);
        eventBus.off('workspace:deleted', this.handleWorkspaceDeleted);
        
        super.destroy();
    }
}