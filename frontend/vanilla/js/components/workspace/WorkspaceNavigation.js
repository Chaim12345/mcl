/**
 * WorkspaceNavigation Component
 * Navigation component for workspace selection and switching
 */

import { Component } from '../base/Component.js';
import { api } from '../../services/api.js';
import { eventBus } from '../../utils/events.js';

export class WorkspaceNavigation extends Component {
    get defaultOptions() {
        return {
            showCreateButton: true,
            showWorkspaceInfo: true,
            compact: false
        };
    }

    get initialState() {
        return {
            workspaces: [],
            currentWorkspace: null,
            loading: false,
            dropdownOpen: false
        };
    }

    init() {
        this.loadWorkspaces();
        
        // Listen for workspace events
        eventBus.on('workspace:created', this.handleWorkspaceCreated.bind(this));
        eventBus.on('workspace:updated', this.handleWorkspaceUpdated.bind(this));
        eventBus.on('workspace:deleted', this.handleWorkspaceDeleted.bind(this));
        eventBus.on('workspace:selected', this.handleWorkspaceSelected.bind(this));
        
        // Close dropdown when clicking outside
        this.handleDocumentClick = this.handleDocumentClick.bind(this);
        document.addEventListener('click', this.handleDocumentClick);
    }

    async loadWorkspaces() {
        this.setState({ loading: true });
        
        try {
            const workspaces = await api.workspaces.getAll();
            this.setState({ 
                workspaces, 
                loading: false 
            });
            
            // Set current workspace if not set
            if (!this.state.currentWorkspace && workspaces.length > 0) {
                this.setCurrentWorkspace(workspaces[0]);
            }
        } catch (error) {
            console.error('Failed to load workspaces:', error);
            this.setState({ loading: false });
        }
    }

    template() {
        const { workspaces, currentWorkspace, loading, dropdownOpen } = this.state;
        const { showCreateButton, showWorkspaceInfo, compact } = this.options;

        if (loading) {
            return `
                <div class="workspace-navigation loading ${compact ? 'compact' : ''}">
                    <div class="workspace-selector">
                        <div class="workspace-current loading">
                            <div class="workspace-avatar skeleton"></div>
                            <div class="workspace-info">
                                <div class="workspace-name skeleton"></div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        if (!currentWorkspace) {
            return `
                <div class="workspace-navigation empty ${compact ? 'compact' : ''}">
                    <div class="empty-state">
                        <p>No workspace selected</p>
                        ${showCreateButton ? '<button class="btn btn-sm btn-primary create-workspace-btn">Create Workspace</button>' : ''}
                    </div>
                </div>
            `;
        }

        const workspaceDropdown = workspaces.length > 1 ? `
            <div class="workspace-dropdown ${dropdownOpen ? 'open' : ''}">
                <div class="dropdown-header">
                    <span>Switch Workspace</span>
                </div>
                <div class="dropdown-list">
                    ${workspaces.map(workspace => `
                        <div class="dropdown-item ${workspace.id === currentWorkspace.id ? 'active' : ''}" 
                             data-workspace-id="${workspace.id}">
                            <div class="workspace-avatar">
                                ${workspace.name.charAt(0).toUpperCase()}
                            </div>
                            <div class="workspace-info">
                                <div class="workspace-name">${this.escapeHtml(workspace.name)}</div>
                                <div class="workspace-meta">${workspace.memberCount || 0} members</div>
                            </div>
                            ${workspace.id === currentWorkspace.id ? '<div class="active-indicator">✓</div>' : ''}
                        </div>
                    `).join('')}
                </div>
                ${showCreateButton ? `
                    <div class="dropdown-footer">
                        <button class="btn btn-sm btn-outline create-workspace-btn">
                            + Create New Workspace
                        </button>
                    </div>
                ` : ''}
            </div>
        ` : '';

        return `
            <div class="workspace-navigation ${compact ? 'compact' : ''}">
                <div class="workspace-selector">
                    <div class="workspace-current ${workspaces.length > 1 ? 'clickable' : ''}" 
                         ${workspaces.length > 1 ? 'role="button" tabindex="0"' : ''}>
                        <div class="workspace-avatar">
                            ${currentWorkspace.name.charAt(0).toUpperCase()}
                        </div>
                        <div class="workspace-info">
                            <div class="workspace-name">${this.escapeHtml(currentWorkspace.name)}</div>
                            ${showWorkspaceInfo && !compact ? `
                                <div class="workspace-meta">
                                    ${currentWorkspace.memberCount || 0} members • ${currentWorkspace.boardCount || 0} boards
                                </div>
                            ` : ''}
                        </div>
                        ${workspaces.length > 1 ? `
                            <div class="dropdown-arrow ${dropdownOpen ? 'open' : ''}">
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                                    <path d="M6 8L2 4h8L6 8z"/>
                                </svg>
                            </div>
                        ` : ''}
                    </div>
                    ${workspaceDropdown}
                </div>
                
                ${!compact ? `
                    <div class="workspace-actions">
                        <button class="btn btn-sm btn-ghost workspace-settings-btn" 
                                title="Workspace Settings">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M8 12a4 4 0 100-8 4 4 0 000 8zM8 0a8 8 0 100 16A8 8 0 008 0z"/>
                                <path d="M8 4a4 4 0 100 8 4 4 0 000-8z"/>
                            </svg>
                        </button>
                        ${showCreateButton && workspaces.length === 0 ? `
                            <button class="btn btn-sm btn-primary create-workspace-btn">
                                + New
                            </button>
                        ` : ''}
                    </div>
                ` : ''}
            </div>
        `;
    }

    bindEvents() {
        // Workspace selector click
        const workspaceCurrent = this.find('.workspace-current.clickable');
        if (workspaceCurrent) {
            this.addEventListener(workspaceCurrent, 'click', this.toggleDropdown);
            this.addEventListener(workspaceCurrent, 'keydown', this.handleKeyDown);
        }

        // Dropdown items
        const dropdownItems = this.findAll('.dropdown-item');
        dropdownItems.forEach(item => {
            this.addEventListener(item, 'click', this.handleWorkspaceSelect);
        });

        // Create workspace buttons
        const createBtns = this.findAll('.create-workspace-btn');
        createBtns.forEach(btn => {
            this.addEventListener(btn, 'click', this.handleCreateWorkspace);
        });

        // Settings button
        const settingsBtn = this.find('.workspace-settings-btn');
        if (settingsBtn) {
            this.addEventListener(settingsBtn, 'click', this.handleWorkspaceSettings);
        }
    }

    toggleDropdown(event) {
        event.stopPropagation();
        this.setState({ dropdownOpen: !this.state.dropdownOpen });
    }

    closeDropdown() {
        this.setState({ dropdownOpen: false });
    }

    handleKeyDown(event) {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            this.toggleDropdown(event);
        } else if (event.key === 'Escape') {
            this.closeDropdown();
        }
    }

    handleDocumentClick(event) {
        if (!this.element.contains(event.target)) {
            this.closeDropdown();
        }
    }

    handleWorkspaceSelect(event) {
        const workspaceId = event.currentTarget.dataset.workspaceId;
        const workspace = this.state.workspaces.find(w => w.id === workspaceId);
        
        if (workspace && workspace.id !== this.state.currentWorkspace?.id) {
            this.setCurrentWorkspace(workspace);
            this.closeDropdown();
        }
    }

    handleCreateWorkspace(event) {
        event.preventDefault();
        event.stopPropagation();
        this.closeDropdown();
        this.emit('workspace:create-requested');
    }

    handleWorkspaceSettings(event) {
        event.preventDefault();
        if (this.state.currentWorkspace) {
            this.emit('workspace:settings', { workspace: this.state.currentWorkspace });
        }
    }

    handleWorkspaceCreated(event) {
        const { workspace } = event.detail;
        this.setState({
            workspaces: [...this.state.workspaces, workspace]
        });
        
        // Auto-select new workspace
        this.setCurrentWorkspace(workspace);
    }

    handleWorkspaceUpdated(event) {
        const { workspace } = event.detail;
        this.setState({
            workspaces: this.state.workspaces.map(w => 
                w.id === workspace.id ? workspace : w
            )
        });
        
        // Update current workspace if it's the updated one
        if (this.state.currentWorkspace?.id === workspace.id) {
            this.setState({ currentWorkspace: workspace });
        }
    }

    handleWorkspaceDeleted(event) {
        const { workspaceId } = event.detail;
        const updatedWorkspaces = this.state.workspaces.filter(w => w.id !== workspaceId);
        
        this.setState({ workspaces: updatedWorkspaces });
        
        // If current workspace was deleted, select another one
        if (this.state.currentWorkspace?.id === workspaceId) {
            const newCurrent = updatedWorkspaces.length > 0 ? updatedWorkspaces[0] : null;
            this.setCurrentWorkspace(newCurrent);
        }
    }

    handleWorkspaceSelected(event) {
        const { workspace } = event.detail;
        this.setCurrentWorkspace(workspace);
    }

    setCurrentWorkspace(workspace) {
        this.setState({ currentWorkspace: workspace });
        
        if (workspace) {
            eventBus.emit('workspace:current-changed', { workspace });
            this.emit('workspace:changed', { workspace });
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Public methods
    getCurrentWorkspace() {
        return this.state.currentWorkspace;
    }

    selectWorkspace(workspaceId) {
        const workspace = this.state.workspaces.find(w => w.id === workspaceId);
        if (workspace) {
            this.setCurrentWorkspace(workspace);
        }
    }

    refresh() {
        this.loadWorkspaces();
    }

    // Cleanup
    destroy() {
        document.removeEventListener('click', this.handleDocumentClick);
        super.destroy();
    }
}