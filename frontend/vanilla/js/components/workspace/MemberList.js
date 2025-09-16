/**
 * Member List Component
 */

import { Component } from '../base/Component.js';
import { workspaceService } from '../../services/workspace.js';
import { authService } from '../../services/auth.js';
import { eventBus } from '../../utils/events.js';

export class MemberList extends Component {
    constructor(container, options = {}) {
        super(container, options);
        
        this.state = {
            isLoading: false,
            members: [],
            currentUser: null,
            currentWorkspace: null,
            searchQuery: '',
            sortBy: 'name', // name, role, joinedAt
            sortOrder: 'asc',
            selectedMembers: [],
            showInviteDialog: false,
            showRemoveConfirmation: false,
            memberToRemove: null,
            errors: {}
        };
        
        this.roles = [
            {
                value: 'owner',
                label: 'Owner',
                description: 'Full access to workspace and billing',
                permissions: ['read', 'write', 'delete', 'manage_members', 'manage_workspace', 'billing']
            },
            {
                value: 'admin',
                label: 'Admin',
                description: 'Can manage members and workspace settings',
                permissions: ['read', 'write', 'delete', 'manage_members', 'manage_workspace']
            },
            {
                value: 'editor',
                label: 'Editor',
                description: 'Can create and edit content',
                permissions: ['read', 'write', 'delete']
            },
            {
                value: 'viewer',
                label: 'Viewer',
                description: 'Can only view content',
                permissions: ['read']
            }
        ];
        
        this.init();
    }
    
    init() {
        this.currentUser = authService.getCurrentUser();
        this.currentWorkspace = workspaceService.getCurrentWorkspace();
        
        if (this.currentWorkspace) {
            this.loadMembers();
        }
        
        this.render();
        this.bindEvents();
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Listen for workspace and member events
        eventBus.on('workspace:members_updated', this.handleMembersUpdated.bind(this));
        eventBus.on('workspace:member_invited', this.handleMemberInvited.bind(this));
        eventBus.on('workspace:member_role_updated', this.handleMemberRoleUpdated.bind(this));
        eventBus.on('workspace:member_removed', this.handleMemberRemoved.bind(this));
        eventBus.on('workspace:switched', this.handleWorkspaceSwitched.bind(this));
    }
    
    async loadMembers() {
        if (!this.currentWorkspace) return;
        
        this.setState({ isLoading: true });
        
        try {
            const members = await workspaceService.getWorkspaceMembers(this.currentWorkspace.id);
            this.setState({
                isLoading: false,
                members
            });
        } catch (error) {
            this.setState({
                isLoading: false,
                errors: { load: error.message }
            });
        }
    }
    
    render() {
        const { isLoading, members, searchQuery, sortBy, sortOrder, selectedMembers, showInviteDialog, showRemoveConfirmation, errors } = this.state;
        
        if (showInviteDialog) {
            this.renderInviteDialog();
            return;
        }
        
        if (showRemoveConfirmation) {
            this.renderRemoveConfirmation();
            return;
        }
        
        const filteredMembers = this.filterAndSortMembers(members, searchQuery, sortBy, sortOrder);
        const canManageMembers = this.canManageMembers();
        
        this.container.innerHTML = `
            <div class="member-list">
                <div class="member-list-header">
                    <div class="member-list-title">
                        <h2 class="heading-lg">Members</h2>
                        <p class="text-muted">Manage workspace members and their permissions</p>
                    </div>
                    
                    ${canManageMembers ? `
                        <div class="member-list-actions">
                            <button type="button" class="btn btn--primary" data-action="invite-member">
                                <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="12" cy="7" r="4"></circle>
                                    <line x1="20" y1="8" x2="20" y2="14"></line>
                                    <line x1="23" y1="11" x2="17" y2="11"></line>
                                </svg>
                                Invite Member
                            </button>
                        </div>
                    ` : ''}
                </div>
                
                ${members.length > 0 ? `
                    <div class="member-list-controls">
                        <div class="search-box">
                            <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <circle cx="11" cy="11" r="8"></circle>
                                <path d="m21 21-4.35-4.35"></path>
                            </svg>
                            <input 
                                type="text" 
                                class="search-input" 
                                placeholder="Search members..."
                                value="${searchQuery}"
                                data-search-input
                            />
                        </div>
                        
                        <div class="sort-controls">
                            <select class="sort-select" data-sort-by>
                                <option value="name" ${sortBy === 'name' ? 'selected' : ''}>Sort by Name</option>
                                <option value="role" ${sortBy === 'role' ? 'selected' : ''}>Sort by Role</option>
                                <option value="joinedAt" ${sortBy === 'joinedAt' ? 'selected' : ''}>Sort by Joined</option>
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
                        
                        ${selectedMembers.length > 0 && canManageMembers ? `
                            <div class="bulk-actions">
                                <span class="bulk-count">${selectedMembers.length} selected</span>
                                <button type="button" class="btn btn--outline btn--danger" data-action="bulk-remove">
                                    <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <polyline points="3,6 5,6 21,6"></polyline>
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    </svg>
                                    Remove Selected
                                </button>
                            </div>
                        ` : ''}
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
                
                <div class="member-list-content">
                    ${isLoading ? this.renderLoadingState() : this.renderMembers(filteredMembers, canManageMembers)}
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
                <p class="loading-text">Loading members...</p>
            </div>
        `;
    }
    
    renderMembers(members, canManageMembers) {
        if (members.length === 0) {
            return this.renderEmptyState();
        }
        
        return `
            <div class="member-table-container">
                <table class="member-table">
                    <thead>
                        <tr>
                            ${canManageMembers ? `
                                <th class="member-table-cell member-table-cell--checkbox">
                                    <label class="checkbox-label">
                                        <input 
                                            type="checkbox" 
                                            data-select-all
                                            ${this.isAllSelected(members) ? 'checked' : ''}
                                        />
                                        <span class="checkbox-checkmark"></span>
                                    </label>
                                </th>
                            ` : ''}
                            <th class="member-table-cell member-table-cell--member">Member</th>
                            <th class="member-table-cell member-table-cell--role">Role</th>
                            <th class="member-table-cell member-table-cell--status">Status</th>
                            <th class="member-table-cell member-table-cell--joined">Joined</th>
                            ${canManageMembers ? `
                                <th class="member-table-cell member-table-cell--actions">Actions</th>
                            ` : ''}
                        </tr>
                    </thead>
                    <tbody>
                        ${members.map(member => this.renderMemberRow(member, canManageMembers)).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }
    
    renderMemberRow(member, canManageMembers) {
        const isCurrentUser = this.currentUser && member.userId === this.currentUser.id;
        const isSelected = this.state.selectedMembers.includes(member.id);
        const canEditRole = canManageMembers && !isCurrentUser && member.role !== 'owner';
        const canRemove = canManageMembers && !isCurrentUser && member.role !== 'owner';
        
        return `
            <tr class="member-table-row ${isCurrentUser ? 'member-table-row--current' : ''}" data-member-id="${member.id}">
                ${canManageMembers ? `
                    <td class="member-table-cell member-table-cell--checkbox">
                        ${canRemove ? `
                            <label class="checkbox-label">
                                <input 
                                    type="checkbox" 
                                    data-select-member
                                    data-member-id="${member.id}"
                                    ${isSelected ? 'checked' : ''}
                                />
                                <span class="checkbox-checkmark"></span>
                            </label>
                        ` : ''}
                    </td>
                ` : ''}
                
                <td class="member-table-cell member-table-cell--member">
                    <div class="member-info">
                        <div class="member-avatar">
                            ${member.user.avatar ? 
                                `<img src="${member.user.avatar}" alt="${member.user.firstName} ${member.user.lastName}" class="member-avatar-img" />` :
                                `<div class="member-avatar-placeholder">${this.getUserInitials(member.user)}</div>`
                            }
                        </div>
                        <div class="member-details">
                            <div class="member-name">
                                ${member.user.firstName} ${member.user.lastName}
                                ${isCurrentUser ? '<span class="member-badge member-badge--you">You</span>' : ''}
                            </div>
                            <div class="member-email">${member.user.email}</div>
                        </div>
                    </div>
                </td>
                
                <td class="member-table-cell member-table-cell--role">
                    ${canEditRole ? `
                        <select 
                            class="role-select" 
                            data-action="change-role" 
                            data-member-id="${member.id}"
                            data-current-role="${member.role}"
                        >
                            ${this.roles.filter(role => role.value !== 'owner').map(role => `
                                <option value="${role.value}" ${role.value === member.role ? 'selected' : ''}>
                                    ${role.label}
                                </option>
                            `).join('')}
                        </select>
                    ` : `
                        <span class="role-badge role-badge--${member.role}">
                            ${this.getRoleLabel(member.role)}
                            ${member.role === 'owner' ? `
                                <svg class="role-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                    <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                            ` : ''}
                        </span>
                    `}
                </td>
                
                <td class="member-table-cell member-table-cell--status">
                    <span class="status-badge status-badge--${member.status || 'active'}">
                        ${this.getStatusLabel(member.status || 'active')}
                    </span>
                </td>
                
                <td class="member-table-cell member-table-cell--joined">
                    <time datetime="${member.joinedAt}" title="${this.formatFullDate(member.joinedAt)}">
                        ${this.formatRelativeDate(member.joinedAt)}
                    </time>
                </td>
                
                ${canManageMembers ? `
                    <td class="member-table-cell member-table-cell--actions">
                        <div class="member-actions">
                            ${canRemove ? `
                                <button 
                                    type="button" 
                                    class="btn btn--ghost btn--icon" 
                                    data-action="remove-member" 
                                    data-member-id="${member.id}"
                                    title="Remove member"
                                >
                                    <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <polyline points="3,6 5,6 21,6"></polyline>
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    </svg>
                                </button>
                            ` : ''}
                            
                            <button 
                                type="button" 
                                class="btn btn--ghost btn--icon" 
                                data-action="member-menu" 
                                data-member-id="${member.id}"
                                title="More actions"
                            >
                                <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <circle cx="12" cy="12" r="1"></circle>
                                    <circle cx="19" cy="12" r="1"></circle>
                                    <circle cx="5" cy="12" r="1"></circle>
                                </svg>
                            </button>
                        </div>
                    </td>
                ` : ''}
            </tr>
        `;
    }
    
    renderEmptyState() {
        return `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <svg class="icon-large" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                </div>
                <h3 class="empty-state-title">No members found</h3>
                <p class="empty-state-description">
                    ${this.state.searchQuery ? 
                        'No members match your search criteria. Try adjusting your search terms.' :
                        'This workspace doesn\'t have any members yet. Invite your team to get started.'
                    }
                </p>
                ${this.canManageMembers() && !this.state.searchQuery ? `
                    <button type="button" class="btn btn--primary" data-action="invite-member">
                        <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                            <line x1="20" y1="8" x2="20" y2="14"></line>
                            <line x1="23" y1="11" x2="17" y2="11"></line>
                        </svg>
                        Invite Your First Member
                    </button>
                ` : ''}
            </div>
        `;
    }
    
    renderInviteDialog() {
        // This will be handled by MemberInviteDialog component
        this.container.innerHTML = `
            <div class="member-invite-dialog">
                <div class="dialog-overlay" data-action="close-invite-dialog"></div>
                <div class="dialog-content">
                    <p>Member invitation dialog will be implemented in MemberInviteDialog component</p>
                    <button type="button" class="btn btn--outline" data-action="close-invite-dialog">Close</button>
                </div>
            </div>
        `;
    }
    
    renderRemoveConfirmation() {
        const member = this.state.memberToRemove;
        if (!member) return '';
        
        this.container.innerHTML = `
            <div class="confirmation-dialog">
                <div class="dialog-overlay" data-action="close-remove-confirmation"></div>
                <div class="dialog-content">
                    <div class="dialog-header">
                        <h3 class="dialog-title">Remove Member</h3>
                    </div>
                    
                    <div class="dialog-body">
                        <div class="warning-icon">
                            <svg class="icon-large text-warning" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="8" x2="12" y2="12"></line>
                                <line x1="12" y1="16" x2="12.01" y2="16"></line>
                            </svg>
                        </div>
                        
                        <div class="confirmation-content">
                            <p class="confirmation-message">
                                Are you sure you want to remove <strong>${member.user.firstName} ${member.user.lastName}</strong> from this workspace?
                            </p>
                            
                            <div class="confirmation-details">
                                <p class="text-muted">This action will:</p>
                                <ul class="confirmation-list">
                                    <li>Remove their access to this workspace</li>
                                    <li>Remove them from all boards and projects</li>
                                    <li>Notify them via email about the removal</li>
                                </ul>
                                <p class="text-warning"><strong>This action cannot be undone.</strong></p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="dialog-footer">
                        <div class="dialog-actions">
                            <button type="button" class="btn btn--outline" data-action="close-remove-confirmation">
                                Cancel
                            </button>
                            <button type="button" class="btn btn--danger" data-action="confirm-remove-member">
                                <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <polyline points="3,6 5,6 21,6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                                Remove Member
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    bindEvents() {
        this.container.addEventListener('click', this.handleClick.bind(this));
        this.container.addEventListener('input', this.handleInput.bind(this));
        this.container.addEventListener('change', this.handleChange.bind(this));
    }
    
    handleClick(event) {
        const action = event.target.closest('[data-action]')?.dataset.action;
        
        switch (action) {
            case 'invite-member':
                this.handleInviteMember();
                break;
            case 'remove-member':
                this.handleRemoveMember(event.target.closest('[data-member-id]').dataset.memberId);
                break;
            case 'bulk-remove':
                this.handleBulkRemove();
                break;
            case 'member-menu':
                this.handleMemberMenu(event.target.closest('[data-member-id]').dataset.memberId, event.target);
                break;
            case 'toggle-sort-order':
                this.handleToggleSortOrder();
                break;
            case 'close-invite-dialog':
                this.setState({ showInviteDialog: false });
                break;
            case 'close-remove-confirmation':
                this.setState({ showRemoveConfirmation: false, memberToRemove: null });
                break;
            case 'confirm-remove-member':
                this.handleConfirmRemoveMember();
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
        } else if (event.target.dataset.selectAll !== undefined) {
            this.handleSelectAll(event.target.checked);
        } else if (event.target.dataset.selectMember !== undefined) {
            this.handleSelectMember(event.target.dataset.memberId, event.target.checked);
        } else if (event.target.dataset.action === 'change-role') {
            this.handleChangeRole(event.target.dataset.memberId, event.target.value, event.target.dataset.currentRole);
        }
    }
    
    handleInviteMember() {
        if (this.options.onInviteMember) {
            this.options.onInviteMember();
        } else {
            this.setState({ showInviteDialog: true });
        }
    }
    
    handleRemoveMember(memberId) {
        const member = this.state.members.find(m => m.id === memberId);
        if (member) {
            this.setState({ 
                showRemoveConfirmation: true, 
                memberToRemove: member 
            });
        }
    }
    
    async handleConfirmRemoveMember() {
        const member = this.state.memberToRemove;
        if (!member || !this.currentWorkspace) return;
        
        try {
            await workspaceService.removeMember(this.currentWorkspace.id, member.id);
            this.setState({ 
                showRemoveConfirmation: false, 
                memberToRemove: null 
            });
        } catch (error) {
            // Error already handled by service
        }
    }
    
    handleBulkRemove() {
        // Show confirmation for bulk removal
        if (this.state.selectedMembers.length === 0) return;
        
        // For now, remove members one by one
        // In a real implementation, you might want a bulk remove API
        Promise.all(
            this.state.selectedMembers.map(memberId => 
                workspaceService.removeMember(this.currentWorkspace.id, memberId)
            )
        ).then(() => {
            this.setState({ selectedMembers: [] });
        }).catch(() => {
            // Errors already handled by service
        });
    }
    
    async handleChangeRole(memberId, newRole, currentRole) {
        if (newRole === currentRole || !this.currentWorkspace) return;
        
        try {
            await workspaceService.updateMemberRole(this.currentWorkspace.id, memberId, newRole);
        } catch (error) {
            // Revert the select value
            const selectElement = this.container.querySelector(`[data-member-id="${memberId}"][data-action="change-role"]`);
            if (selectElement) {
                selectElement.value = currentRole;
            }
        }
    }
    
    handleMemberMenu(memberId, target) {
        // Show context menu for member actions
        if (this.options.onMemberMenu) {
            this.options.onMemberMenu(memberId, target);
        }
    }
    
    handleSelectAll(checked) {
        const removableMembers = this.state.members
            .filter(member => 
                this.currentUser && 
                member.userId !== this.currentUser.id && 
                member.role !== 'owner'
            )
            .map(member => member.id);
            
        this.setState({
            selectedMembers: checked ? removableMembers : []
        });
    }
    
    handleSelectMember(memberId, checked) {
        const selectedMembers = [...this.state.selectedMembers];
        
        if (checked) {
            if (!selectedMembers.includes(memberId)) {
                selectedMembers.push(memberId);
            }
        } else {
            const index = selectedMembers.indexOf(memberId);
            if (index > -1) {
                selectedMembers.splice(index, 1);
            }
        }
        
        this.setState({ selectedMembers });
    }
    
    handleToggleSortOrder() {
        const newOrder = this.state.sortOrder === 'asc' ? 'desc' : 'asc';
        this.setState({ sortOrder: newOrder });
    }
    
    // Event handlers for workspace service events
    handleMembersUpdated({ members }) {
        this.setState({ members });
    }
    
    handleMemberInvited() {
        // Refresh member list
        this.loadMembers();
    }
    
    handleMemberRoleUpdated({ memberId, role }) {
        const members = [...this.state.members];
        const memberIndex = members.findIndex(m => m.id === memberId);
        
        if (memberIndex !== -1) {
            members[memberIndex].role = role;
            this.setState({ members });
        }
    }
    
    handleMemberRemoved({ memberId }) {
        this.setState({
            members: this.state.members.filter(m => m.id !== memberId),
            selectedMembers: this.state.selectedMembers.filter(id => id !== memberId)
        });
    }
    
    handleWorkspaceSwitched({ workspace }) {
        this.currentWorkspace = workspace;
        this.loadMembers();
    }
    
    filterAndSortMembers(members, searchQuery, sortBy, sortOrder) {
        let filtered = members;
        
        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(member => 
                `${member.user.firstName} ${member.user.lastName}`.toLowerCase().includes(query) ||
                member.user.email.toLowerCase().includes(query) ||
                this.getRoleLabel(member.role).toLowerCase().includes(query)
            );
        }
        
        // Sort
        filtered.sort((a, b) => {
            let aValue, bValue;
            
            switch (sortBy) {
                case 'name':
                    aValue = `${a.user.firstName} ${a.user.lastName}`.toLowerCase();
                    bValue = `${b.user.firstName} ${b.user.lastName}`.toLowerCase();
                    break;
                case 'role':
                    const roleOrder = { owner: 0, admin: 1, editor: 2, viewer: 3 };
                    aValue = roleOrder[a.role] || 999;
                    bValue = roleOrder[b.role] || 999;
                    break;
                case 'joinedAt':
                    aValue = new Date(a.joinedAt);
                    bValue = new Date(b.joinedAt);
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
    
    isAllSelected(members) {
        const removableMembers = members
            .filter(member => 
                this.currentUser && 
                member.userId !== this.currentUser.id && 
                member.role !== 'owner'
            );
            
        return removableMembers.length > 0 && 
               removableMembers.every(member => this.state.selectedMembers.includes(member.id));
    }
    
    canManageMembers() {
        return workspaceService.hasPermission('manage_members');
    }
    
    getUserInitials(user) {
        return `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();
    }
    
    getRoleLabel(role) {
        const roleInfo = this.roles.find(r => r.value === role);
        return roleInfo ? roleInfo.label : role;
    }
    
    getStatusLabel(status) {
        const statusLabels = {
            active: 'Active',
            pending: 'Pending',
            suspended: 'Suspended'
        };
        return statusLabels[status] || status;
    }
    
    formatRelativeDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
        
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
    
    formatFullDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    // Refresh members
    async refresh() {
        await this.loadMembers();
        this.render();
    }
    
    destroy() {
        // Remove event listeners
        eventBus.off('workspace:members_updated', this.handleMembersUpdated);
        eventBus.off('workspace:member_invited', this.handleMemberInvited);
        eventBus.off('workspace:member_role_updated', this.handleMemberRoleUpdated);
        eventBus.off('workspace:member_removed', this.handleMemberRemoved);
        eventBus.off('workspace:switched', this.handleWorkspaceSwitched);
        
        super.destroy();
    }
} 