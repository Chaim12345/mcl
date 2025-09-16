/**
 * Mobile Navigation Component
 * Responsive navigation with hamburger menu, slide-out drawer, and touch gestures
 */

import { Component } from '../base/Component.js';
import { eventBus } from '../../utils/events.js';

export class MobileNavigation extends Component {
    constructor(container, options = {}) {
        super(container, options);
        
        this.state = {
            isOpen: false,
            activeSection: '',
            notifications: [],
            user: null,
            workspaces: [],
            currentWorkspace: null,
            isSearchFocused: false,
            scrollPosition: 0,
            isAnimating: false,
            touchStartX: 0,
            touchCurrentX: 0,
            isDragging: false,
            swipeThreshold: 50,
            swipeProgress: 0,
            hasNotifications: false,
            unreadCount: 0
        };
        
        this.drawerWidth = 320;
        this.backdropElement = null;
        this.drawerElement = null;
        this.startTime = 0;
        this.animationFrame = null;
        
        // Breakpoint for mobile navigation
        this.mobileBreakpoint = 768;
        
        // Navigation items configuration
        this.navigationItems = options.navigationItems || [
            {
                id: 'dashboard',
                label: 'Dashboard',
                icon: 'home',
                href: '/dashboard',
                badge: null,
                children: []
            },
            {
                id: 'boards',
                label: 'Boards',
                icon: 'boards',
                href: '/boards',
                badge: null,
                children: []
            },
            {
                id: 'search',
                label: 'Search',
                icon: 'search',
                href: '/search',
                badge: null,
                children: []
            },
            {
                id: 'notifications',
                label: 'Notifications',
                icon: 'bell',
                href: '/notifications',
                badge: 'unreadCount',
                children: []
            }
        ];
        
        this.init();
    }
    
    init() {
        this.render();
        this.bindEvents();
        this.setupEventListeners();
        this.checkBreakpoint();
        this.setupAccessibility();
        this.setupSwipeGestures();
    }
    
    setupEventListeners() {
        // Window resize handler
        window.addEventListener('resize', this.handleResize.bind(this));
        
        // Navigation events
        eventBus.on('navigation:toggle', this.toggle.bind(this));
        eventBus.on('navigation:close', this.close.bind(this));
        eventBus.on('navigation:open', this.open.bind(this));
        eventBus.on('navigation:setActive', this.setActiveSection.bind(this));
        
        // User and workspace events
        eventBus.on('user:updated', this.handleUserUpdated.bind(this));
        eventBus.on('workspace:changed', this.handleWorkspaceChanged.bind(this));
        eventBus.on('workspaces:updated', this.handleWorkspacesUpdated.bind(this));
        eventBus.on('notifications:updated', this.handleNotificationsUpdated.bind(this));
        
        // Search events
        eventBus.on('search:focus', this.handleSearchFocus.bind(this));
        eventBus.on('search:blur', this.handleSearchBlur.bind(this));
        
        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyboardShortcuts.bind(this));
    }
    
    render() {
        const { isOpen, activeSection, user, currentWorkspace, unreadCount, isAnimating } = this.state;
        
        this.container.innerHTML = `
            <nav class="mobile-navigation ${isOpen ? 'mobile-navigation--open' : ''} ${isAnimating ? 'mobile-navigation--animating' : ''}" 
                 role="navigation" 
                 aria-label="Main navigation">
                
                <!-- Mobile Header -->
                <div class="mobile-nav-header">
                    <div class="mobile-nav-header-content">
                        <!-- Logo / Brand -->
                        <div class="mobile-nav-brand">
                            <a href="/" class="brand-link" aria-label="Go to homepage">
                                <div class="brand-logo">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                        <line x1="3" y1="9" x2="21" y2="9"></line>
                                        <line x1="9" y1="21" x2="9" y2="9"></line>
                                    </svg>
                                </div>
                                <span class="brand-text">KiroMCL</span>
                            </a>
                        </div>
                        
                        <!-- Mobile Actions -->
                        <div class="mobile-nav-actions">
                            <!-- Quick Search Button -->
                            <button type="button" 
                                    class="mobile-action-btn mobile-search-btn" 
                                    data-action="open-search"
                                    aria-label="Open search">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <circle cx="11" cy="11" r="8"></circle>
                                    <path d="M21 21l-4.35-4.35"></path>
                                </svg>
                            </button>
                            
                            <!-- Notifications Button -->
                            <button type="button" 
                                    class="mobile-action-btn mobile-notifications-btn ${unreadCount > 0 ? 'has-notifications' : ''}" 
                                    data-action="open-notifications"
                                    aria-label="Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                                </svg>
                                ${unreadCount > 0 ? `<span class="notification-badge">${unreadCount > 99 ? '99+' : unreadCount}</span>` : ''}
                            </button>
                            
                            <!-- Hamburger Menu Button -->
                            <button type="button" 
                                    class="mobile-menu-btn ${isOpen ? 'mobile-menu-btn--open' : ''}" 
                                    data-action="toggle-menu"
                                    aria-label="${isOpen ? 'Close menu' : 'Open menu'}"
                                    aria-expanded="${isOpen}"
                                    aria-controls="mobile-drawer">
                                <span class="hamburger">
                                    <span class="hamburger-line"></span>
                                    <span class="hamburger-line"></span>
                                    <span class="hamburger-line"></span>
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Mobile Drawer Overlay -->
                <div class="mobile-drawer-overlay ${isOpen ? 'mobile-drawer-overlay--visible' : ''}" 
                     data-action="close-menu"
                     aria-hidden="true"></div>
                
                <!-- Mobile Drawer -->
                <aside class="mobile-drawer ${isOpen ? 'mobile-drawer--open' : ''}" 
                       id="mobile-drawer"
                       role="dialog"
                       aria-modal="true"
                       aria-label="Navigation menu">
                    
                    <!-- Drawer Header -->
                    <div class="mobile-drawer-header">
                        <!-- User Info -->
                        ${user ? `
                            <div class="mobile-user-info">
                                <div class="user-avatar">
                                    ${user.avatar ? 
                                        `<img src="${user.avatar}" alt="${user.name}" class="user-avatar-img" />` :
                                        `<div class="user-avatar-placeholder">${this.getInitials(user.name)}</div>`
                                    }
                                </div>
                                <div class="user-details">
                                    <div class="user-name">${this.escapeHtml(user.name)}</div>
                                    <div class="user-email">${this.escapeHtml(user.email)}</div>
                                </div>
                                <button type="button" 
                                        class="user-menu-btn" 
                                        data-action="toggle-user-menu"
                                        aria-label="User menu">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <polyline points="6,9 12,15 18,9"></polyline>
                                    </svg>
                                </button>
                            </div>
                        ` : `
                            <div class="mobile-auth-actions">
                                <a href="/login" class="btn btn--outline btn--sm">Sign In</a>
                                <a href="/register" class="btn btn--primary btn--sm">Sign Up</a>
                            </div>
                        `}
                        
                        <!-- Workspace Selector -->
                        ${currentWorkspace ? `
                            <div class="mobile-workspace-selector">
                                <button type="button" 
                                        class="workspace-selector-btn" 
                                        data-action="toggle-workspace-menu"
                                        aria-label="Select workspace">
                                    <div class="workspace-icon">
                                        ${currentWorkspace.icon ? 
                                            `<img src="${currentWorkspace.icon}" alt="" />` :
                                            `<div class="workspace-initial">${currentWorkspace.name.charAt(0).toUpperCase()}</div>`
                                        }
                                    </div>
                                    <div class="workspace-info">
                                        <div class="workspace-name">${this.escapeHtml(currentWorkspace.name)}</div>
                                        <div class="workspace-role">${this.escapeHtml(currentWorkspace.role || 'Member')}</div>
                                    </div>
                                    <svg class="workspace-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <polyline points="6,9 12,15 18,9"></polyline>
                                    </svg>
                                </button>
                            </div>
                        ` : ''}
                    </div>
                    
                    <!-- Drawer Content -->
                    <div class="mobile-drawer-content">
                        <!-- Primary Navigation -->
                        <nav class="mobile-nav-menu" role="menu">
                            ${this.renderNavigationItems()}
                        </nav>
                        
                        <!-- Secondary Actions -->
                        <div class="mobile-nav-secondary">
                            <div class="mobile-nav-section">
                                <div class="mobile-nav-section-title">Quick Actions</div>
                                <div class="mobile-nav-section-items">
                                    <button type="button" 
                                            class="mobile-nav-item mobile-nav-item--action" 
                                            data-action="create-board">
                                        <span class="mobile-nav-icon">
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                                <line x1="5" y1="12" x2="19" y2="12"></line>
                                            </svg>
                                        </span>
                                        <span class="mobile-nav-label">Create Board</span>
                                    </button>
                                    
                                    <button type="button" 
                                            class="mobile-nav-item mobile-nav-item--action" 
                                            data-action="invite-members">
                                        <span class="mobile-nav-icon">
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                                <circle cx="8.5" cy="7" r="4"></circle>
                                                <line x1="20" y1="8" x2="20" y2="14"></line>
                                                <line x1="23" y1="11" x2="17" y2="11"></line>
                                            </svg>
                                        </span>
                                        <span class="mobile-nav-label">Invite Members</span>
                                    </button>
                                </div>
                            </div>
                            
                            <!-- Settings and Help -->
                            <div class="mobile-nav-section">
                                <div class="mobile-nav-section-items">
                                    <a href="/settings" 
                                       class="mobile-nav-item"
                                       role="menuitem">
                                        <span class="mobile-nav-icon">
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                <circle cx="12" cy="12" r="3"></circle>
                                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                                            </svg>
                                        </span>
                                        <span class="mobile-nav-label">Settings</span>
                                    </a>
                                    
                                    <a href="/help" 
                                       class="mobile-nav-item"
                                       role="menuitem">
                                        <span class="mobile-nav-icon">
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                <circle cx="12" cy="12" r="10"></circle>
                                                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                                                <line x1="12" y1="17" x2="12.01" y2="17"></line>
                                            </svg>
                                        </span>
                                        <span class="mobile-nav-label">Help & Support</span>
                                    </a>
                                    
                                    ${user ? `
                                        <button type="button" 
                                                class="mobile-nav-item mobile-nav-item--action" 
                                                data-action="logout">
                                            <span class="mobile-nav-icon">
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                                    <polyline points="16,17 21,12 16,7"></polyline>
                                                    <line x1="21" y1="12" x2="9" y2="12"></line>
                                                </svg>
                                            </span>
                                            <span class="mobile-nav-label">Sign Out</span>
                                        </button>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Drawer Footer -->
                    <div class="mobile-drawer-footer">
                        <div class="mobile-app-info">
                            <div class="app-version">Version 1.0.0</div>
                            <div class="app-links">
                                <a href="/privacy" class="app-link">Privacy</a>
                                <a href="/terms" class="app-link">Terms</a>
                            </div>
                        </div>
                    </div>
                </aside>
            </nav>
        `;
        
        this.cacheElements();
        this.setupAccessibilityAttributes();
        this.updateActiveStates();
    }
    
    renderNavigationItems() {
        const { activeSection } = this.state;
        
        return this.navigationItems.map(item => {
            const isActive = activeSection === item.id;
            const badge = this.getBadgeValue(item.badge);
            
            if (item.children && item.children.length > 0) {
                // Render expandable navigation item
                return `
                    <div class="mobile-nav-group">
                        <button type="button" 
                                class="mobile-nav-item mobile-nav-item--expandable ${isActive ? 'mobile-nav-item--active' : ''}" 
                                data-action="toggle-nav-group" 
                                data-nav-id="${item.id}"
                                role="menuitem"
                                aria-expanded="false">
                            <span class="mobile-nav-icon">
                                ${this.getNavigationIcon(item.icon)}
                            </span>
                            <span class="mobile-nav-label">${this.escapeHtml(item.label)}</span>
                            ${badge ? `<span class="mobile-nav-badge">${badge}</span>` : ''}
                            <svg class="mobile-nav-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <polyline points="9,18 15,12 9,6"></polyline>
                            </svg>
                        </button>
                        <div class="mobile-nav-submenu" role="group">
                            ${item.children.map(child => `
                                <a href="${child.href}" 
                                   class="mobile-nav-subitem ${activeSection === child.id ? 'mobile-nav-subitem--active' : ''}"
                                   role="menuitem">
                                    ${child.icon ? `
                                        <span class="mobile-nav-icon">
                                            ${this.getNavigationIcon(child.icon)}
                                        </span>
                                    ` : ''}
                                    <span class="mobile-nav-label">${this.escapeHtml(child.label)}</span>
                                    ${this.getBadgeValue(child.badge) ? `<span class="mobile-nav-badge">${this.getBadgeValue(child.badge)}</span>` : ''}
                                </a>
                            `).join('')}
                        </div>
                    </div>
                `;
            } else {
                // Render simple navigation item
                return `
                    <a href="${item.href}" 
                       class="mobile-nav-item ${isActive ? 'mobile-nav-item--active' : ''}"
                       data-nav-id="${item.id}"
                       role="menuitem">
                        <span class="mobile-nav-icon">
                            ${this.getNavigationIcon(item.icon)}
                        </span>
                        <span class="mobile-nav-label">${this.escapeHtml(item.label)}</span>
                        ${badge ? `<span class="mobile-nav-badge">${badge}</span>` : ''}
                    </a>
                `;
            }
        }).join('');
    }
    
    getNavigationIcon(iconName) {
        const icons = {
            home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9,22 9,12 15,12 15,22"></polyline>',
            boards: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line>',
            search: '<circle cx="11" cy="11" r="8"></circle><path d="M21 21l-4.35-4.35"></path>',
            bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path>',
            users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>',
            settings: '<circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>'
        };
        
        const iconPath = icons[iconName] || icons.home;
        
        return `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                ${iconPath}
            </svg>
        `;
    }
    
    getBadgeValue(badge) {
        if (!badge) return null;
        
        switch (badge) {
            case 'unreadCount':
                return this.state.unreadCount > 0 ? (this.state.unreadCount > 99 ? '99+' : this.state.unreadCount) : null;
            default:
                return badge;
        }
    }
    
    cacheElements() {
        this.backdropElement = this.container.querySelector('.mobile-drawer-overlay');
        this.drawerElement = this.container.querySelector('.mobile-drawer');
        this.menuButton = this.container.querySelector('.mobile-menu-btn');
        this.drawerContent = this.container.querySelector('.mobile-drawer-content');
    }
    
    setupAccessibility() {
        // Set up proper ARIA attributes
        if (this.drawerElement) {
            this.drawerElement.setAttribute('aria-hidden', !this.state.isOpen);
        }
        
        // Focus management
        this.setupFocusTrap();
        
        // Announce state changes to screen readers
        if (this.state.isOpen) {
            this.announceToScreenReader('Navigation menu opened');
        }
    }
    
    setupAccessibilityAttributes() {
        // Update ARIA attributes based on current state
        const { isOpen } = this.state;
        
        if (this.menuButton) {
            this.menuButton.setAttribute('aria-expanded', isOpen);
        }
        
        if (this.drawerElement) {
            this.drawerElement.setAttribute('aria-hidden', !isOpen);
        }
    }
    
    setupFocusTrap() {
        if (!this.state.isOpen || !this.drawerElement) return;
        
        const focusableElements = this.drawerElement.querySelectorAll(
            'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        
        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];
        
        // Focus first element when drawer opens
        if (firstFocusable) {
            setTimeout(() => firstFocusable.focus(), 100);
        }
        
        // Trap focus within drawer
        this.drawerElement.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                if (e.shiftKey) {
                    if (document.activeElement === firstFocusable) {
                        e.preventDefault();
                        lastFocusable.focus();
                    }
                } else {
                    if (document.activeElement === lastFocusable) {
                        e.preventDefault();
                        firstFocusable.focus();
                    }
                }
            }
        });
    }
    
    setupSwipeGestures() {
        // Add touch event listeners for swipe gestures
        this.container.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        this.container.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        this.container.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
        
        // Prevent overscroll behavior
        document.addEventListener('touchmove', this.preventOverscroll.bind(this), { passive: false });
    }
    
    bindEvents() {
        this.container.addEventListener('click', this.handleClick.bind(this));
        this.container.addEventListener('keydown', this.handleKeyDown.bind(this));
        
        // Handle backdrop clicks
        if (this.backdropElement) {
            this.backdropElement.addEventListener('click', this.close.bind(this));
        }
    }
    
    handleClick(e) {
        const action = e.target.closest('[data-action]')?.dataset.action;
        const navId = e.target.closest('[data-nav-id]')?.dataset.navId;
        
        switch (action) {
            case 'toggle-menu':
                this.toggle();
                break;
            case 'close-menu':
                this.close();
                break;
            case 'open-search':
                this.handleOpenSearch();
                break;
            case 'open-notifications':
                this.handleOpenNotifications();
                break;
            case 'toggle-user-menu':
                this.handleToggleUserMenu();
                break;
            case 'toggle-workspace-menu':
                this.handleToggleWorkspaceMenu();
                break;
            case 'toggle-nav-group':
                this.handleToggleNavGroup(navId);
                break;
            case 'create-board':
                this.handleCreateBoard();
                break;
            case 'invite-members':
                this.handleInviteMembers();
                break;
            case 'logout':
                this.handleLogout();
                break;
        }
        
        // Handle navigation item clicks
        if (navId && !action) {
            this.setActiveSection(navId);
            // Auto-close on mobile after navigation
            if (window.innerWidth < this.mobileBreakpoint) {
                setTimeout(() => this.close(), 150);
            }
        }
    }
    
    handleKeyDown(e) {
        if (e.key === 'Escape' && this.state.isOpen) {
            this.close();
        }
    }
    
    handleKeyboardShortcuts(e) {
        // Global keyboard shortcuts
        if (e.metaKey || e.ctrlKey) {
            switch (e.key) {
                case '\\':
                    e.preventDefault();
                    this.toggle();
                    break;
                case 'k':
                    e.preventDefault();
                    this.handleOpenSearch();
                    break;
            }
        }
    }
    
    handleTouchStart(e) {
        if (!this.shouldHandleSwipe(e)) return;
        
        this.startTime = Date.now();
        this.state.touchStartX = e.touches[0].clientX;
        this.state.touchCurrentX = e.touches[0].clientX;
        this.state.isDragging = false;
        this.state.swipeProgress = 0;
    }
    
    handleTouchMove(e) {
        if (!this.shouldHandleSwipe(e)) return;
        
        this.state.touchCurrentX = e.touches[0].clientX;
        const deltaX = this.state.touchCurrentX - this.state.touchStartX;
        
        // Only handle horizontal swipes
        if (Math.abs(deltaX) > 10) {
            this.state.isDragging = true;
            e.preventDefault();
            
            if (this.state.isOpen) {
                // Swiping to close (left swipe)
                if (deltaX < 0) {
                    this.state.swipeProgress = Math.min(1, Math.abs(deltaX) / this.drawerWidth);
                    this.updateDrawerPosition();
                }
            } else {
                // Swiping to open (right swipe from edge)
                if (deltaX > 0 && this.state.touchStartX < 20) {
                    this.state.swipeProgress = Math.min(1, deltaX / this.drawerWidth);
                    this.updateDrawerPosition();
                }
            }
        }
    }
    
    handleTouchEnd(e) {
        if (!this.state.isDragging) return;
        
        const deltaX = this.state.touchCurrentX - this.state.touchStartX;
        const duration = Date.now() - this.startTime;
        const velocity = Math.abs(deltaX) / duration;
        
        // Determine if swipe should complete
        const shouldComplete = this.state.swipeProgress > 0.3 || velocity > 0.5;
        
        if (this.state.isOpen) {
            // Closing swipe
            if (deltaX < -this.state.swipeThreshold && shouldComplete) {
                this.close();
            } else {
                this.cancelSwipe();
            }
        } else {
            // Opening swipe
            if (deltaX > this.state.swipeThreshold && shouldComplete) {
                this.open();
            } else {
                this.cancelSwipe();
            }
        }
        
        this.resetSwipeState();
    }
    
    shouldHandleSwipe(e) {
        // Only handle swipes on mobile
        if (window.innerWidth >= this.mobileBreakpoint) return false;
        
        // Don't interfere with scrollable content
        const target = e.target.closest('.mobile-drawer-content');
        if (target && target.scrollTop > 0) return false;
        
        return true;
    }
    
    updateDrawerPosition() {
        if (!this.drawerElement) return;
        
        const progress = this.state.isOpen ? 1 - this.state.swipeProgress : this.state.swipeProgress;
        const translateX = (1 - progress) * -this.drawerWidth;
        
        this.drawerElement.style.transform = `translateX(${translateX}px)`;
        
        if (this.backdropElement) {
            this.backdropElement.style.opacity = progress * 0.5;
        }
    }
    
    cancelSwipe() {
        if (this.drawerElement) {
            this.drawerElement.style.transform = '';
        }
        
        if (this.backdropElement) {
            this.backdropElement.style.opacity = '';
        }
    }
    
    resetSwipeState() {
        this.state.isDragging = false;
        this.state.swipeProgress = 0;
        this.state.touchStartX = 0;
        this.state.touchCurrentX = 0;
    }
    
    preventOverscroll(e) {
        // Prevent body scroll when drawer is open
        if (this.state.isOpen && !e.target.closest('.mobile-drawer-content')) {
            e.preventDefault();
        }
    }
    
    handleResize() {
        this.checkBreakpoint();
        
        // Auto-close drawer on desktop
        if (window.innerWidth >= this.mobileBreakpoint && this.state.isOpen) {
            this.close();
        }
    }
    
    checkBreakpoint() {
        const isMobile = window.innerWidth < this.mobileBreakpoint;
        this.container.classList.toggle('mobile-navigation--mobile', isMobile);
        this.container.classList.toggle('mobile-navigation--desktop', !isMobile);
    }
    
    // Public methods
    open() {
        if (this.state.isAnimating) return;
        
        this.setState({ isOpen: true, isAnimating: true });
        this.render();
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
        
        // Save current scroll position
        this.state.scrollPosition = window.pageYOffset;
        
        // Complete animation
        setTimeout(() => {
            this.setState({ isAnimating: false });
            this.setupFocusTrap();
        }, 300);
        
        // Emit event
        eventBus.emit('navigation:opened');
        
        this.announceToScreenReader('Navigation menu opened');
    }
    
    close() {
        if (this.state.isAnimating) return;
        
        this.setState({ isOpen: false, isAnimating: true });
        this.render();
        
        // Restore body scroll
        document.body.style.overflow = '';
        
        // Restore scroll position
        if (this.state.scrollPosition) {
            window.scrollTo(0, this.state.scrollPosition);
        }
        
        // Complete animation
        setTimeout(() => {
            this.setState({ isAnimating: false });
        }, 300);
        
        // Return focus to menu button
        if (this.menuButton) {
            this.menuButton.focus();
        }
        
        // Emit event
        eventBus.emit('navigation:closed');
        
        this.announceToScreenReader('Navigation menu closed');
    }
    
    toggle() {
        if (this.state.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }
    
    setActiveSection(sectionId) {
        this.setState({ activeSection: sectionId });
        this.updateActiveStates();
    }
    
    updateActiveStates() {
        // Update active navigation items
        const navItems = this.container.querySelectorAll('.mobile-nav-item, .mobile-nav-subitem');
        navItems.forEach(item => {
            const navId = item.dataset.navId;
            item.classList.toggle('mobile-nav-item--active', navId === this.state.activeSection);
            item.classList.toggle('mobile-nav-subitem--active', navId === this.state.activeSection);
        });
    }
    
    // Event handlers
    handleOpenSearch() {
        eventBus.emit('search:open');
        this.close();
    }
    
    handleOpenNotifications() {
        eventBus.emit('notifications:open');
        this.close();
    }
    
    handleToggleUserMenu() {
        eventBus.emit('user-menu:toggle');
    }
    
    handleToggleWorkspaceMenu() {
        eventBus.emit('workspace-menu:toggle');
    }
    
    handleToggleNavGroup(navId) {
        const group = this.container.querySelector(`[data-nav-id="${navId}"]`);
        if (group) {
            const submenu = group.parentElement.querySelector('.mobile-nav-submenu');
            const isExpanded = group.getAttribute('aria-expanded') === 'true';
            
            group.setAttribute('aria-expanded', !isExpanded);
            if (submenu) {
                submenu.style.display = isExpanded ? 'none' : 'block';
            }
        }
    }
    
    handleCreateBoard() {
        eventBus.emit('board:create');
        this.close();
    }
    
    handleInviteMembers() {
        eventBus.emit('members:invite');
        this.close();
    }
    
    handleLogout() {
        eventBus.emit('auth:logout');
        this.close();
    }
    
    // External event handlers
    handleUserUpdated(data) {
        this.setState({ user: data.user });
        this.render();
    }
    
    handleWorkspaceChanged(data) {
        this.setState({ currentWorkspace: data.workspace });
        this.render();
    }
    
    handleWorkspacesUpdated(data) {
        this.setState({ workspaces: data.workspaces });
        this.render();
    }
    
    handleNotificationsUpdated(data) {
        this.setState({ 
            notifications: data.notifications,
            unreadCount: data.unreadCount || 0
        });
        this.render();
    }
    
    handleSearchFocus() {
        this.setState({ isSearchFocused: true });
    }
    
    handleSearchBlur() {
        this.setState({ isSearchFocused: false });
    }
    
    // Utility methods
    getInitials(name) {
        return name.split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    }
    
    announceToScreenReader(message) {
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.textContent = message;
        
        document.body.appendChild(announcement);
        
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    }
    
    destroy() {
        // Clean up event listeners
        window.removeEventListener('resize', this.handleResize);
        document.removeEventListener('keydown', this.handleKeyboardShortcuts);
        document.removeEventListener('touchmove', this.preventOverscroll);
        
        // Remove event bus listeners
        eventBus.off('navigation:toggle', this.toggle);
        eventBus.off('navigation:close', this.close);
        eventBus.off('navigation:open', this.open);
        eventBus.off('navigation:setActive', this.setActiveSection);
        eventBus.off('user:updated', this.handleUserUpdated);
        eventBus.off('workspace:changed', this.handleWorkspaceChanged);
        eventBus.off('workspaces:updated', this.handleWorkspacesUpdated);
        eventBus.off('notifications:updated', this.handleNotificationsUpdated);
        eventBus.off('search:focus', this.handleSearchFocus);
        eventBus.off('search:blur', this.handleSearchBlur);
        
        // Restore body scroll
        document.body.style.overflow = '';
        
        // Cancel animation frame
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        
        super.destroy();
    }
} 