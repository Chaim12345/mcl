/**
 * Enhanced Main Application Entry Point
 * Improved version with better error handling, loading states, and UX
 */

import { eventBus } from './utils/events.js';
import { api as apiService } from './services/api.js';

// Enhanced Application State Management
class EnhancedApp {
    constructor() {
        this.currentUser = null;
        this.currentWorkspace = null;
        this.currentBoard = null;
        this.isAuthenticated = false;
        this.apiService = apiService;
        this.isLoading = false;
        this.connectionStatus = 'connected';
        
        // Enhanced UI state
        this.theme = localStorage.getItem('app_theme') || 'light';
        this.sidebarCollapsed = localStorage.getItem('sidebar_collapsed') === 'true';
        
        // Initialize enhanced features
        this.initializeEnhancedFeatures();
    }

    initializeEnhancedFeatures() {
        // Apply theme
        document.documentElement.setAttribute('data-theme', this.theme);
        
        // Initialize keyboard shortcuts
        this.initializeKeyboardShortcuts();
        
        // Initialize mobile navigation
        this.initializeMobileNavigation();
        
        // Initialize connection monitoring
        this.initializeConnectionMonitoring();
        
        // Initialize performance monitoring
        this.initializePerformanceMonitoring();
    }

    async init() {
        console.log('🚀 Initializing Enhanced Project Management Platform...');
        
        try {
            // Show enhanced loading screen
            this.showEnhancedLoadingScreen();
            
            // Initialize global event listeners
            this.initializeGlobalEvents();
            
            // Check authentication status
            await this.checkAuthStatus();
            
            // Initialize router
            this.initializeRouter();
            
            // Hide loading screen and show app
            this.showApp();
            
            console.log('✅ Application initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize application:', error);
            this.showEnhancedError('Failed to load application. Please refresh the page.', error);
        }
    }

    showEnhancedLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.innerHTML = `
                <div class="enhanced-loading">
                    <div class="loading-logo">
                        <div class="logo-animation">
                            <div class="logo-circle"></div>
                            <div class="logo-text">PM Platform</div>
                        </div>
                    </div>
                    <div class="loading-progress">
                        <div class="progress-bar">
                            <div class="progress-fill"></div>
                        </div>
                        <div class="loading-text">Loading your workspace...</div>
                    </div>
                    <div class="loading-tips">
                        <div class="tip">💡 Tip: Use Ctrl+K to quickly search across boards</div>
                    </div>
                </div>
            `;
            
            // Animate progress bar
            setTimeout(() => {
                const progressFill = loadingScreen.querySelector('.progress-fill');
                if (progressFill) {
                    progressFill.style.width = '100%';
                }
            }, 500);
        }
    }

    initializeConnectionMonitoring() {
        // Monitor online/offline status
        window.addEventListener('online', () => {
            this.connectionStatus = 'connected';
            this.showNotification('Connection restored', 'success');
            this.syncPendingChanges();
        });

        window.addEventListener('offline', () => {
            this.connectionStatus = 'offline';
            this.showNotification('Working offline', 'warning');
        });

        // Monitor API health
        setInterval(() => {
            this.checkAPIHealth();
        }, 30000); // Check every 30 seconds
    }

    async checkAPIHealth() {
        try {
            const response = await fetch('/health', { 
                method: 'GET',
                timeout: 5000 
            });
            
            if (response.ok) {
                if (this.connectionStatus === 'error') {
                    this.connectionStatus = 'connected';
                    this.showNotification('Connection restored', 'success');
                }
            } else {
                throw new Error('Health check failed');
            }
        } catch (error) {
            if (this.connectionStatus === 'connected') {
                this.connectionStatus = 'error';
                this.showNotification('Connection issues detected', 'error');
            }
        }
    }

    initializePerformanceMonitoring() {
        // Monitor page load performance
        window.addEventListener('load', () => {
            const perfData = performance.getEntriesByType('navigation')[0];
            console.log('📊 Page Load Performance:', {
                loadTime: Math.round(perfData.loadEventEnd - perfData.loadEventStart),
                domContentLoaded: Math.round(perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart),
                totalTime: Math.round(perfData.loadEventEnd - perfData.fetchStart)
            });
        });

        // Monitor memory usage (if available)
        if ('memory' in performance) {
            setInterval(() => {
                const memory = performance.memory;
                if (memory.usedJSHeapSize > memory.jsHeapSizeLimit * 0.9) {
                    console.warn('⚠️ High memory usage detected');
                }
            }, 60000); // Check every minute
        }
    }

    initializeKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Global shortcuts
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'k':
                        e.preventDefault();
                        this.openGlobalSearch();
                        break;
                    case 'n':
                        e.preventDefault();
                        this.openNewItemDialog();
                        break;
                    case 'b':
                        e.preventDefault();
                        this.toggleSidebar();
                        break;
                    case '/':
                        e.preventDefault();
                        this.showKeyboardShortcuts();
                        break;
                }
            }

            // Escape key
            if (e.key === 'Escape') {
                this.closeModals();
            }
        });
    }

    openGlobalSearch() {
        // Create and show global search modal
        const searchModal = document.createElement('div');
        searchModal.className = 'global-search-modal';
        searchModal.innerHTML = `
            <div class="search-modal-backdrop"></div>
            <div class="search-modal-content">
                <div class="search-input-container">
                    <input type="text" class="global-search-input" placeholder="Search boards, items, and more..." autofocus>
                    <div class="search-shortcuts">
                        <span class="shortcut">↑↓ Navigate</span>
                        <span class="shortcut">↵ Select</span>
                        <span class="shortcut">Esc Close</span>
                    </div>
                </div>
                <div class="search-results">
                    <div class="search-empty">
                        <div class="search-empty-icon">🔍</div>
                        <div class="search-empty-text">Start typing to search...</div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(searchModal);

        // Add search functionality
        const searchInput = searchModal.querySelector('.global-search-input');
        const searchResults = searchModal.querySelector('.search-results');
        let searchTimeout;

        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.performGlobalSearch(e.target.value, searchResults);
            }, 300);
        });

        // Close on backdrop click or escape
        searchModal.addEventListener('click', (e) => {
            if (e.target.classList.contains('search-modal-backdrop')) {
                document.body.removeChild(searchModal);
            }
        });

        document.addEventListener('keydown', function escapeHandler(e) {
            if (e.key === 'Escape') {
                document.body.removeChild(searchModal);
                document.removeEventListener('keydown', escapeHandler);
            }
        });
    }

    async performGlobalSearch(query, resultsContainer) {
        if (!query.trim()) {
            resultsContainer.innerHTML = `
                <div class="search-empty">
                    <div class="search-empty-icon">🔍</div>
                    <div class="search-empty-text">Start typing to search...</div>
                </div>
            `;
            return;
        }

        resultsContainer.innerHTML = `
            <div class="search-loading">
                <div class="loading-spinner"></div>
                <div>Searching...</div>
            </div>
        `;

        try {
            // Search across multiple entities
            const [boardResults, itemResults] = await Promise.all([
                this.apiService.search.boards(query),
                this.apiService.search.items(query)
            ]);

            const allResults = [
                ...boardResults.data.map(item => ({ ...item, type: 'board' })),
                ...itemResults.data.map(item => ({ ...item, type: 'item' }))
            ];

            if (allResults.length === 0) {
                resultsContainer.innerHTML = `
                    <div class="search-empty">
                        <div class="search-empty-icon">😔</div>
                        <div class="search-empty-text">No results found for "${query}"</div>
                    </div>
                `;
                return;
            }

            resultsContainer.innerHTML = allResults.map(result => `
                <div class="search-result-item" data-type="${result.type}" data-id="${result.id}">
                    <div class="result-icon">
                        ${result.type === 'board' ? '📋' : '📝'}
                    </div>
                    <div class="result-content">
                        <div class="result-title">${result.name || result.title}</div>
                        <div class="result-subtitle">
                            ${result.type === 'board' ? 'Board' : 'Item'} 
                            ${result.workspaceName ? `• ${result.workspaceName}` : ''}
                        </div>
                    </div>
                </div>
            `).join('');

            // Add click handlers
            resultsContainer.querySelectorAll('.search-result-item').forEach(item => {
                item.addEventListener('click', () => {
                    const type = item.dataset.type;
                    const id = item.dataset.id;
                    
                    if (type === 'board') {
                        this.navigate(`/board/${id}`);
                    } else if (type === 'item') {
                        this.navigate(`/item/${id}`);
                    }
                    
                    // Close search modal
                    const modal = document.querySelector('.global-search-modal');
                    if (modal) {
                        document.body.removeChild(modal);
                    }
                });
            });

        } catch (error) {
            console.error('Search error:', error);
            resultsContainer.innerHTML = `
                <div class="search-error">
                    <div class="search-error-icon">⚠️</div>
                    <div class="search-error-text">Search failed. Please try again.</div>
                </div>
            `;
        }
    }

    showNotification(message, type = 'info', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">
                    ${type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}
                </div>
                <div class="notification-message">${message}</div>
                <button class="notification-close">×</button>
            </div>
        `;

        const container = document.getElementById('notifications-container') || document.body;
        container.appendChild(notification);

        // Auto remove
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, duration);

        // Manual close
        notification.querySelector('.notification-close').addEventListener('click', () => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        });
    }

    showEnhancedError(message, error = null) {
        const errorContainer = document.createElement('div');
        errorContainer.className = 'enhanced-error-screen';
        errorContainer.innerHTML = `
            <div class="error-content">
                <div class="error-icon">😞</div>
                <h2 class="error-title">Oops! Something went wrong</h2>
                <p class="error-message">${message}</p>
                ${error ? `<details class="error-details">
                    <summary>Technical Details</summary>
                    <pre>${error.stack || error.message || error}</pre>
                </details>` : ''}
                <div class="error-actions">
                    <button class="btn btn-primary" onclick="window.location.reload()">
                        🔄 Reload Page
                    </button>
                    <button class="btn btn-secondary" onclick="this.parentElement.parentElement.parentElement.remove()">
                        ✖️ Dismiss
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(errorContainer);
    }

    // Enhanced navigation with loading states
    async navigate(path) {
        console.log('🧭 Navigating to:', path);
        
        // Show loading indicator
        this.showNavigationLoading();
        
        try {
            // Update URL
            window.history.pushState({}, '', path);
            
            // Handle route change
            await this.handleRouteChange();
            
        } catch (error) {
            console.error('Navigation error:', error);
            this.showNotification('Navigation failed', 'error');
        } finally {
            this.hideNavigationLoading();
        }
    }

    showNavigationLoading() {
        const loader = document.createElement('div');
        loader.id = 'navigation-loader';
        loader.className = 'navigation-loader';
        loader.innerHTML = `
            <div class="nav-loading-bar"></div>
        `;
        document.body.appendChild(loader);
    }

    hideNavigationLoading() {
        const loader = document.getElementById('navigation-loader');
        if (loader) {
            setTimeout(() => {
                loader.remove();
            }, 200);
        }
    }

    // Rest of the methods from the original App class...
    // (I'll continue with the enhanced versions of existing methods)
}

// Initialize enhanced application
const enhancedApp = new EnhancedApp();

// Start the application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => enhancedApp.init());
} else {
    enhancedApp.init();
}

// Export for global access
window.app = enhancedApp;

export default enhancedApp;