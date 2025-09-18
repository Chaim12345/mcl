/**
 * Monday.com-style Workspace Manager Component
 */

import { apiClient } from '../../services/ApiClient.js';

export class WorkspaceManager {
    constructor(container) {
        this.container = container;
        this.apiClient = apiClient;
        this.workspaces = [];
        this.filteredWorkspaces = [];
        this.currentFilter = 'all';
        this.searchQuery = '';
        this.currentUser = this.getCurrentUser();
    }

    async init() {
        await this.loadWorkspaces();
        this.updateStats();
        this.render();
    }

    getCurrentUser() {
        // In a real app, this would get user info from the API or JWT token
        return {
            id: 'user-1',
            name: 'Current User',
            email: 'user@example.com'
        };
    }

    async loadWorkspaces() {
        try {
            // In a real app, this would make an API call
            // For now, using demo data
            this.workspaces = this.createDemoWorkspaces();
            this.filteredWorkspaces = [...this.workspaces];
        } catch (error) {
            console.error('Failed to load workspaces:', error);
            this.workspaces = this.createDemoWorkspaces();
            this.filteredWorkspaces = [...this.workspaces];
        }
    }

    createDemoWorkspaces() {
        const workspaceTypes = ['team', 'personal', 'client', 'department'];
        const privacyTypes = ['private', 'internal', 'public'];
        const workspaceNames = [
            'Marketing Team', 'Product Development', 'Design Studio', 'Sales Operations',
            'Customer Success', 'Engineering', 'HR & People', 'Finance & Operations',
            'Content Creation', 'Business Development', 'Quality Assurance', 'DevOps'
        ];
        
        return workspaceNames.map((name, index) => ({
            id: `workspace-${index + 1}`,
            name: name,
            description: `Collaborative workspace for ${name.toLowerCase()} activities and projects`,
            type: workspaceTypes[Math.floor(Math.random() * workspaceTypes.length)],
            privacy: privacyTypes[Math.floor(Math.random() * privacyTypes.length)],
            owner: index % 3 === 0 ? this.currentUser : {
                id: `user-${index + 2}`,
                name: `Team Lead ${index + 1}`,
                email: `lead${index + 1}@example.com`
            },
            members: this.generateMembers(5 + Math.floor(Math.random() * 15)),
            boards: this.generateBoards(2 + Math.floor(Math.random() * 8)),
            createdAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
            lastActivity: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
        }));
    }

    generateMembers(count) {
        const roles = ['Owner', 'Admin', 'Member', 'Viewer'];
        const names = ['John Doe', 'Jane Smith', 'Mike Johnson', 'Sarah Wilson', 'David Brown', 'Lisa Garcia', 'Tom Anderson', 'Emma Davis'];
        
        return Array.from({ length: count }, (_, i) => ({
            id: `member-${i + 1}`,
            name: names[i % names.length],
            email: `member${i + 1}@example.com`,
            role: roles[Math.floor(Math.random() * roles.length)],
            avatar: names[i % names.length].split(' ').map(n => n[0]).join(''),
            joinedAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000)
        }));
    }

    generateBoards(count) {
        const boardNames = [
            'Project Planning', 'Task Management', 'Content Calendar', 'Bug Tracking',
            'Sprint Planning', 'Client Projects', 'Marketing Campaigns', 'Product Roadmap',
            'Team Goals', 'Weekly Reviews', 'Resource Planning', 'Documentation'
        ];
        
        return Array.from({ length: count }, (_, i) => ({
            id: `board-${i + 1}`,
            name: boardNames[i % boardNames.length],
            description: `Board for managing ${boardNames[i % boardNames.length].toLowerCase()}`,
            itemCount: Math.floor(Math.random() * 50) + 5,
            lastUpdated: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
        }));
    }

    updateStats() {
        const totalWorkspaces = this.workspaces.length;
        const totalMembers = this.workspaces.reduce((sum, ws) => sum + ws.members.length, 0);
        const activeProjects = this.workspaces.reduce((sum, ws) => sum + ws.boards.length, 0);

        document.getElementById('total-workspaces').textContent = totalWorkspaces;
        document.getElementById('total-members').textContent = totalMembers;
        document.getElementById('active-projects').textContent = activeProjects;
    }

    filterWorkspaces(filter) {
        this.currentFilter = filter;
        this.applyFilters();
    }

    searchWorkspaces(query) {
        this.searchQuery = query.toLowerCase();
        this.applyFilters();
    }

    applyFilters() {
        let filtered = [...this.workspaces];

        // Apply filter
        if (this.currentFilter === 'owned') {
            filtered = filtered.filter(ws => ws.owner.id === this.currentUser.id);
        } else if (this.currentFilter === 'member') {
            filtered = filtered.filter(ws => 
                ws.owner.id !== this.currentUser.id && 
                ws.members.some(member => member.id === this.currentUser.id)
            );
        }

        // Apply search
        if (this.searchQuery) {
            filtered = filtered.filter(ws => 
                ws.name.toLowerCase().includes(this.searchQuery) ||
                ws.description.toLowerCase().includes(this.searchQuery) ||
                ws.type.toLowerCase().includes(this.searchQuery)
            );
        }

        this.filteredWorkspaces = filtered;
        this.render();
    }

    render() {
        if (this.filteredWorkspaces.length === 0) {
            this.container.innerHTML = this.renderEmptyState();
            return;
        }

        const html = this.filteredWorkspaces.map(workspace => 
            this.renderWorkspaceCard(workspace)
        ).join('');

        this.container.innerHTML = html;
        this.attachEventListeners();
    }

    renderWorkspaceCard(workspace) {
        const isOwner = workspace.owner.id === this.currentUser.id;
        const memberCount = workspace.members.length;
        const boardCount = workspace.boards.length;
        const avatar = workspace.name.split(' ').map(word => word[0]).join('').substring(0, 2);

        return `
            <div class="workspace-card" data-workspace-id="${workspace.id}">
                <div class="workspace-actions">
                    <button class="btn btn-icon btn-sm" onclick="this.event.stopPropagation(); openWorkspaceMenu('${workspace.id}')">
                        <span>⋮</span>
                    </button>
                </div>
                
                <div class="workspace-header-info">
                    <div class="workspace-avatar">${avatar}</div>
                    <div class="workspace-info">
                        <h3>${workspace.name}</h3>
                        <p>${workspace.description}</p>
                    </div>
                </div>
                
                <div class="workspace-badges">
                    <span class="badge type-${workspace.type}">${workspace.type}</span>
                    <span class="badge privacy-${workspace.privacy}">${workspace.privacy}</span>
                    ${isOwner ? '<span class="badge" style="background-color: var(--primary-color); color: white;">Owner</span>' : ''}
                </div>
                
                <div class="workspace-stats-mini">
                    <div class="workspace-stat">
                        <div class="workspace-stat-number">${memberCount}</div>
                        <div class="workspace-stat-label">Members</div>
                    </div>
                    <div class="workspace-stat">
                        <div class="workspace-stat-number">${boardCount}</div>
                        <div class="workspace-stat-label">Boards</div>
                    </div>
                    <div class="workspace-stat">
                        <div class="workspace-stat-number">${this.getRelativeTime(workspace.lastActivity)}</div>
                        <div class="workspace-stat-label">Last Active</div>
                    </div>
                </div>
            </div>
        `;
    }

    renderEmptyState() {
        let message = 'No workspaces found';
        let suggestion = 'Create your first workspace to get started';

        if (this.searchQuery) {
            message = `No workspaces match "${this.searchQuery}"`;
            suggestion = 'Try adjusting your search terms';
        } else if (this.currentFilter === 'owned') {
            message = 'You don\'t own any workspaces yet';
            suggestion = 'Create a new workspace to organize your projects';
        } else if (this.currentFilter === 'member') {
            message = 'You\'re not a member of any workspaces';
            suggestion = 'Ask a colleague to invite you to their workspace';
        }

        return `
            <div class="empty-state">
                <div class="empty-icon">📁</div>
                <h3>${message}</h3>
                <p>${suggestion}</p>
                ${this.currentFilter !== 'member' ? '<button class="btn btn-primary" onclick="openModal(\'create-workspace-modal\')">+ Create Workspace</button>' : ''}
            </div>
        `;
    }

    attachEventListeners() {
        // Workspace card click handlers
        this.container.querySelectorAll('.workspace-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.workspace-actions')) {
                    const workspaceId = card.dataset.workspaceId;
                    this.openWorkspaceDetails(workspaceId);
                }
            });
        });
    }

    openWorkspaceDetails(workspaceId) {
        const workspace = this.workspaces.find(ws => ws.id === workspaceId);
        if (!workspace) return;

        // Populate workspace details modal
        document.getElementById('workspace-details-title').textContent = workspace.name;
        document.getElementById('workspace-details-name').textContent = workspace.name;
        document.getElementById('workspace-details-description').textContent = workspace.description;
        
        const avatar = workspace.name.split(' ').map(word => word[0]).join('').substring(0, 2);
        document.getElementById('workspace-avatar').textContent = avatar;
        
        document.getElementById('workspace-type-badge').textContent = workspace.type;
        document.getElementById('workspace-type-badge').className = `badge type-${workspace.type}`;
        
        document.getElementById('workspace-privacy-badge').textContent = workspace.privacy;
        document.getElementById('workspace-privacy-badge').className = `badge privacy-${workspace.privacy}`;

        // Load members
        this.loadWorkspaceMembers(workspace);
        
        // Load boards
        this.loadWorkspaceBoards(workspace);
        
        // Load settings
        this.loadWorkspaceSettings(workspace);

        // Open modal
        document.getElementById('workspace-details-modal').classList.add('active');
    }

    loadWorkspaceMembers(workspace) {
        const membersContainer = document.getElementById('workspace-members');
        const html = workspace.members.map(member => `
            <div class="member-item">
                <div class="member-avatar">${member.avatar}</div>
                <div class="member-info">
                    <div class="member-name">${member.name}</div>
                    <div class="member-role">${member.role}</div>
                </div>
                <div class="member-actions">
                    <button class="btn btn-secondary btn-sm">Edit</button>
                    ${member.role !== 'Owner' ? '<button class="btn btn-outline btn-sm">Remove</button>' : ''}
                </div>
            </div>
        `).join('');
        
        membersContainer.innerHTML = html;
    }

    loadWorkspaceBoards(workspace) {
        const boardsContainer = document.getElementById('workspace-boards');
        const html = workspace.boards.map(board => `
            <div class="board-item">
                <div class="board-name">${board.name}</div>
                <div class="board-stats">${board.itemCount} items • Updated ${this.getRelativeTime(board.lastUpdated)}</div>
            </div>
        `).join('');
        
        boardsContainer.innerHTML = html;
    }

    loadWorkspaceSettings(workspace) {
        document.getElementById('settings-name').value = workspace.name;
        document.getElementById('settings-description').value = workspace.description;
        document.getElementById('settings-privacy').value = workspace.privacy;
    }

    async createWorkspace(workspaceData) {
        try {
            // In a real app, this would make an API call
            const newWorkspace = {
                id: `workspace-${Date.now()}`,
                ...workspaceData,
                owner: this.currentUser,
                members: [{
                    ...this.currentUser,
                    role: 'Owner',
                    avatar: this.currentUser.name.split(' ').map(n => n[0]).join(''),
                    joinedAt: new Date()
                }],
                boards: [],
                createdAt: new Date(),
                lastActivity: new Date()
            };

            this.workspaces.unshift(newWorkspace);
            this.applyFilters();
            this.updateStats();
            
            return newWorkspace;
        } catch (error) {
            console.error('Failed to create workspace:', error);
            throw error;
        }
    }

    getRelativeTime(date) {
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return '1d ago';
        if (diffDays < 7) return `${diffDays}d ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
        return `${Math.floor(diffDays / 30)}m ago`;
    }
}

// Global function for workspace menu
window.openWorkspaceMenu = function(workspaceId) {
    console.log('Opening menu for workspace:', workspaceId);
    // In a real app, this would show a context menu with options like Edit, Delete, etc.
};

