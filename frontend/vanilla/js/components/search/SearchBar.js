/**
 * Search Bar Component
 * Advanced search interface with autocomplete, history, and suggestions
 */

import { Component } from '../base/Component.js';
import { searchService } from '../../services/search.js';
import { eventBus } from '../../utils/events.js';

export class SearchBar extends Component {
    constructor(container, options = {}) {
        super(container, options);
        
        this.state = {
            query: '',
            isSearching: false,
            showSuggestions: false,
            suggestions: [],
            searchHistory: [],
            recentSearches: [],
            popularSearches: [],
            selectedSuggestionIndex: -1,
            showHistory: false,
            errors: {},
            filters: {},
            searchContext: 'all' // all, items, comments, boards, users
        };
        
        this.workspaceId = options.workspaceId;
        this.boardIds = options.boardIds || [];
        this.placeholder = options.placeholder || 'Search everything...';
        this.showFilters = options.showFilters !== false;
        this.showHistory = options.showHistory !== false;
        this.showSuggestions = options.showSuggestions !== false;
        this.minQueryLength = options.minQueryLength || 2;
        this.debounceDelay = options.debounceDelay || 300;
        this.maxSuggestions = options.maxSuggestions || 10;
        this.maxHistory = options.maxHistory || 20;
        
        this.searchInput = null;
        this.suggestionsDropdown = null;
        this.searchTimeout = null;
        this.isComposing = false;
        
        this.init();
    }
    
    init() {
        this.loadSearchHistory();
        this.loadPopularSearches();
        this.render();
        this.bindEvents();
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        eventBus.on('search:query-updated', this.handleExternalQueryUpdate.bind(this));
        eventBus.on('search:filters-updated', this.handleFiltersUpdated.bind(this));
        eventBus.on('workspace:changed', this.handleWorkspaceChanged.bind(this));
    }
    
    async loadSearchHistory() {
        try {
            const history = localStorage.getItem(`search-history-${this.workspaceId}`);
            if (history) {
                this.setState({ searchHistory: JSON.parse(history) });
            }
        } catch (error) {
            console.error('Error loading search history:', error);
        }
    }
    
    async loadPopularSearches() {
        if (!this.workspaceId) return;
        
        try {
            const response = await searchService.getPopularSearches({
                workspaceId: this.workspaceId,
                limit: 5
            });
            
            if (response.success) {
                this.setState({ popularSearches: response.data });
            }
        } catch (error) {
            console.error('Error loading popular searches:', error);
        }
    }
    
    render() {
        const { 
            query, 
            isSearching, 
            showSuggestions, 
            suggestions, 
            searchHistory, 
            recentSearches, 
            popularSearches,
            selectedSuggestionIndex, 
            showHistory,
            searchContext 
        } = this.state;
        
        this.container.innerHTML = `
            <div class="search-bar">
                <div class="search-input-wrapper">
                    <div class="search-input-container">
                        <svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <circle cx="11" cy="11" r="8"></circle>
                            <path d="M21 21l-4.35-4.35"></path>
                        </svg>
                        
                        <input 
                            type="text" 
                            class="search-input" 
                            placeholder="${this.placeholder}"
                            value="${this.escapeHtml(query)}"
                            autocomplete="off"
                            spellcheck="false"
                            ${isSearching ? 'disabled' : ''}
                        />
                        
                        ${query ? `
                            <button type="button" class="search-clear-btn" data-action="clear" title="Clear search">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        ` : ''}
                        
                        ${isSearching ? `
                            <div class="search-loading">
                                <svg class="search-spinner" width="16" height="16" viewBox="0 0 24 24">
                                    <circle class="spinner-circle" cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
                                </svg>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="search-controls">
                        <div class="search-context">
                            <select class="search-context-select" data-context-select>
                                <option value="all" ${searchContext === 'all' ? 'selected' : ''}>Everything</option>
                                <option value="items" ${searchContext === 'items' ? 'selected' : ''}>Items</option>
                                <option value="comments" ${searchContext === 'comments' ? 'selected' : ''}>Comments</option>
                                <option value="boards" ${searchContext === 'boards' ? 'selected' : ''}>Boards</option>
                                <option value="users" ${searchContext === 'users' ? 'selected' : ''}>People</option>
                            </select>
                        </div>
                        
                        ${this.showFilters ? `
                            <button type="button" class="search-filters-btn" data-action="toggle-filters">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46"></polygon>
                                </svg>
                                Filters
                                ${Object.keys(this.state.filters).length > 0 ? `
                                    <span class="filter-count">${Object.keys(this.state.filters).length}</span>
                                ` : ''}
                            </button>
                        ` : ''}
                    </div>
                </div>
                
                <div class="search-suggestions" style="display: ${(showSuggestions || showHistory) ? 'block' : 'none'};">
                    ${showHistory && !query ? this.renderSearchHistory() : ''}
                    ${showSuggestions && query ? this.renderSuggestions() : ''}
                </div>
            </div>
        `;
        
        this.cacheReferences();
        this.restoreInputState();
    }
    
    renderSearchHistory() {
        const { searchHistory, popularSearches } = this.state;
        
        return `
            <div class="search-history">
                ${searchHistory.length > 0 ? `
                    <div class="search-history-section">
                        <div class="search-history-header">
                            <span class="search-history-title">Recent searches</span>
                            <button type="button" class="search-history-clear" data-action="clear-history">
                                Clear all
                            </button>
                        </div>
                        <div class="search-history-list">
                            ${searchHistory.slice(0, 5).map((item, index) => `
                                <button type="button" class="search-history-item" data-action="select-history" data-query="${this.escapeHtml(item.query)}">
                                    <svg class="history-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <polyline points="12,6 12,12 16,14"></polyline>
                                    </svg>
                                    <span class="history-query">${this.escapeHtml(item.query)}</span>
                                    <span class="history-context">${this.getContextLabel(item.context)}</span>
                                    <button type="button" class="history-remove" data-action="remove-history" data-index="${index}">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                            <line x1="18" y1="6" x2="6" y2="18"></line>
                                            <line x1="6" y1="6" x2="18" y2="18"></line>
                                        </svg>
                                    </button>
                                </button>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                ${popularSearches.length > 0 ? `
                    <div class="search-popular-section">
                        <div class="search-popular-header">
                            <span class="search-popular-title">Popular searches</span>
                        </div>
                        <div class="search-popular-list">
                            ${popularSearches.map(item => `
                                <button type="button" class="search-popular-item" data-action="select-popular" data-query="${this.escapeHtml(item.query)}">
                                    <svg class="popular-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"></polygon>
                                    </svg>
                                    <span class="popular-query">${this.escapeHtml(item.query)}</span>
                                    <span class="popular-count">${item.count} searches</span>
                                </button>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                ${searchHistory.length === 0 && popularSearches.length === 0 ? `
                    <div class="search-empty-history">
                        <div class="empty-history-icon">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <circle cx="11" cy="11" r="8"></circle>
                                <path d="M21 21l-4.35-4.35"></path>
                            </svg>
                        </div>
                        <p class="empty-history-text">Start typing to search</p>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    renderSuggestions() {
        const { suggestions, selectedSuggestionIndex, query } = this.state;
        
        if (!suggestions.length) {
            return `
                <div class="search-suggestions-empty">
                    <div class="empty-suggestions-icon">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <circle cx="11" cy="11" r="8"></circle>
                            <path d="M21 21l-4.35-4.35"></path>
                        </svg>
                    </div>
                    <p class="empty-suggestions-text">No suggestions found</p>
                </div>
            `;
        }
        
        return `
            <div class="search-suggestions-list">
                ${suggestions.map((suggestion, index) => `
                    <button type="button" 
                            class="search-suggestion-item ${index === selectedSuggestionIndex ? 'suggestion-item--selected' : ''}" 
                            data-action="select-suggestion" 
                            data-index="${index}">
                        <div class="suggestion-icon">
                            ${this.getSuggestionIcon(suggestion.type)}
                        </div>
                        <div class="suggestion-content">
                            <div class="suggestion-title">
                                ${this.highlightQuery(suggestion.title, query)}
                            </div>
                            ${suggestion.description ? `
                                <div class="suggestion-description">
                                    ${this.highlightQuery(suggestion.description, query)}
                                </div>
                            ` : ''}
                            <div class="suggestion-meta">
                                <span class="suggestion-type">${this.getSuggestionTypeLabel(suggestion.type)}</span>
                                ${suggestion.boardName ? `
                                    <span class="suggestion-board">in ${this.escapeHtml(suggestion.boardName)}</span>
                                ` : ''}
                            </div>
                        </div>
                        <div class="suggestion-actions">
                            <kbd class="suggestion-shortcut">↵</kbd>
                        </div>
                    </button>
                `).join('')}
                
                <div class="search-suggestions-footer">
                    <div class="suggestions-navigation">
                        <kbd>↑</kbd><kbd>↓</kbd> to navigate
                        <kbd>↵</kbd> to select
                        <kbd>Esc</kbd> to close
                    </div>
                </div>
            </div>
        `;
    }
    
    getSuggestionIcon(type) {
        const icons = {
            item: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="9" x2="15" y2="9"></line><line x1="9" y1="13" x2="15" y2="13"></line>',
            comment: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>',
            board: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line>',
            user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>',
            query: '<circle cx="11" cy="11" r="8"></circle><path d="M21 21l-4.35-4.35"></path>'
        };
        
        const iconPath = icons[type] || icons.query;
        
        return `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                ${iconPath}
            </svg>
        `;
    }
    
    getSuggestionTypeLabel(type) {
        const labels = {
            item: 'Item',
            comment: 'Comment',
            board: 'Board',
            user: 'Person',
            query: 'Search'
        };
        
        return labels[type] || 'Result';
    }
    
    getContextLabel(context) {
        const labels = {
            all: 'Everything',
            items: 'Items',
            comments: 'Comments',
            boards: 'Boards',
            users: 'People'
        };
        
        return labels[context] || 'Everything';
    }
    
    highlightQuery(text, query) {
        if (!query || !text) return this.escapeHtml(text);
        
        const escapedQuery = this.escapeRegExp(query);
        const regex = new RegExp(`(${escapedQuery})`, 'gi');
        
        return this.escapeHtml(text).replace(regex, '<mark class="search-highlight">$1</mark>');
    }
    
    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    cacheReferences() {
        this.searchInput = this.container.querySelector('.search-input');
        this.suggestionsDropdown = this.container.querySelector('.search-suggestions');
    }
    
    restoreInputState() {
        if (this.searchInput) {
            this.searchInput.value = this.state.query;
            this.searchInput.focus();
        }
    }
    
    bindEvents() {
        this.container.addEventListener('click', this.handleClick.bind(this));
        this.container.addEventListener('input', this.handleInput.bind(this));
        this.container.addEventListener('keydown', this.handleKeyDown.bind(this));
        this.container.addEventListener('focusin', this.handleFocusIn.bind(this));
        this.container.addEventListener('focusout', this.handleFocusOut.bind(this));
        
        // Global click to close suggestions
        document.addEventListener('click', this.handleDocumentClick.bind(this));
        
        // Composition events for IME support
        if (this.searchInput) {
            this.searchInput.addEventListener('compositionstart', () => {
                this.isComposing = true;
            });
            
            this.searchInput.addEventListener('compositionend', () => {
                this.isComposing = false;
                this.handleSearchInput();
            });
        }
    }
    
    handleClick(e) {
        const action = e.target.closest('[data-action]')?.dataset.action;
        const index = e.target.closest('[data-index]')?.dataset.index;
        const query = e.target.closest('[data-query]')?.dataset.query;
        
        switch (action) {
            case 'clear':
                this.clearSearch();
                break;
            case 'toggle-filters':
                this.toggleFilters();
                break;
            case 'select-suggestion':
                this.selectSuggestion(parseInt(index));
                break;
            case 'select-history':
                this.selectHistoryItem(query);
                break;
            case 'select-popular':
                this.selectPopularItem(query);
                break;
            case 'remove-history':
                e.stopPropagation();
                this.removeHistoryItem(parseInt(index));
                break;
            case 'clear-history':
                this.clearSearchHistory();
                break;
        }
    }
    
    handleInput(e) {
        if (e.target === this.searchInput) {
            if (!this.isComposing) {
                this.handleSearchInput();
            }
        } else if (e.target.matches('[data-context-select]')) {
            this.setState({ searchContext: e.target.value });
            if (this.state.query) {
                this.performSearch();
            }
        }
    }
    
    handleKeyDown(e) {
        if (e.target === this.searchInput) {
            this.handleSearchKeyDown(e);
        }
    }
    
    handleSearchKeyDown(e) {
        const { showSuggestions, suggestions, selectedSuggestionIndex } = this.state;
        
        if (!showSuggestions || !suggestions.length) {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.performSearch();
            } else if (e.key === 'Escape') {
                this.hideSuggestions();
            }
            return;
        }
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.setState({
                    selectedSuggestionIndex: Math.min(selectedSuggestionIndex + 1, suggestions.length - 1)
                });
                this.updateSuggestionSelection();
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                this.setState({
                    selectedSuggestionIndex: Math.max(selectedSuggestionIndex - 1, -1)
                });
                this.updateSuggestionSelection();
                break;
                
            case 'Enter':
                e.preventDefault();
                if (selectedSuggestionIndex >= 0) {
                    this.selectSuggestion(selectedSuggestionIndex);
                } else {
                    this.performSearch();
                }
                break;
                
            case 'Escape':
                e.preventDefault();
                this.hideSuggestions();
                break;
                
            case 'Tab':
                if (selectedSuggestionIndex >= 0) {
                    e.preventDefault();
                    this.selectSuggestion(selectedSuggestionIndex);
                }
                break;
        }
    }
    
    handleFocusIn(e) {
        if (e.target === this.searchInput) {
            if (!this.state.query && this.showHistory) {
                this.setState({ showHistory: true });
                this.render();
            }
        }
    }
    
    handleFocusOut(e) {
        // Delay hiding to allow clicks on suggestions
        setTimeout(() => {
            if (!this.container.contains(document.activeElement)) {
                this.hideSuggestions();
            }
        }, 200);
    }
    
    handleDocumentClick(e) {
        if (!this.container.contains(e.target)) {
            this.hideSuggestions();
        }
    }
    
    handleSearchInput() {
        const query = this.searchInput.value;
        this.setState({ 
            query,
            showHistory: !query && this.showHistory,
            selectedSuggestionIndex: -1
        });
        
        if (query.length >= this.minQueryLength) {
            this.debouncedGetSuggestions();
        } else {
            this.setState({ 
                showSuggestions: false, 
                suggestions: [] 
            });
            this.render();
        }
    }
    
    debouncedGetSuggestions() {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.getSuggestions();
        }, this.debounceDelay);
    }
    
    async getSuggestions() {
        const { query, searchContext } = this.state;
        
        if (!query || query.length < this.minQueryLength) return;
        
        try {
            const response = await searchService.getSuggestions({
                query,
                context: searchContext,
                workspaceId: this.workspaceId,
                boardIds: this.boardIds,
                limit: this.maxSuggestions
            });
            
            if (response.success) {
                this.setState({
                    suggestions: response.data,
                    showSuggestions: true,
                    selectedSuggestionIndex: -1
                });
                this.render();
            }
        } catch (error) {
            console.error('Error getting suggestions:', error);
            this.setState({
                suggestions: [],
                showSuggestions: false
            });
        }
    }
    
    updateSuggestionSelection() {
        const items = this.container.querySelectorAll('.search-suggestion-item');
        items.forEach((item, index) => {
            item.classList.toggle('suggestion-item--selected', index === this.state.selectedSuggestionIndex);
        });
        
        // Scroll selected item into view
        const selectedItem = items[this.state.selectedSuggestionIndex];
        if (selectedItem) {
            selectedItem.scrollIntoView({ block: 'nearest' });
        }
    }
    
    selectSuggestion(index) {
        const suggestion = this.state.suggestions[index];
        if (!suggestion) return;
        
        if (suggestion.type === 'query') {
            // It's a search suggestion
            this.setState({ query: suggestion.title });
            this.searchInput.value = suggestion.title;
            this.performSearch();
        } else {
            // It's a direct result
            this.navigateToResult(suggestion);
        }
        
        this.addToSearchHistory(suggestion.title, this.state.searchContext);
        this.hideSuggestions();
    }
    
    selectHistoryItem(query) {
        this.setState({ query });
        this.searchInput.value = query;
        this.performSearch();
        this.hideSuggestions();
    }
    
    selectPopularItem(query) {
        this.setState({ query });
        this.searchInput.value = query;
        this.performSearch();
        this.addToSearchHistory(query, this.state.searchContext);
        this.hideSuggestions();
    }
    
    removeHistoryItem(index) {
        const history = [...this.state.searchHistory];
        history.splice(index, 1);
        this.setState({ searchHistory: history });
        this.saveSearchHistory(history);
        this.render();
    }
    
    clearSearchHistory() {
        this.setState({ searchHistory: [] });
        this.saveSearchHistory([]);
        this.render();
    }
    
    clearSearch() {
        this.setState({ 
            query: '', 
            showSuggestions: false, 
            suggestions: [],
            showHistory: this.showHistory,
            selectedSuggestionIndex: -1
        });
        this.searchInput.value = '';
        this.searchInput.focus();
        this.render();
        
        // Emit clear event
        eventBus.emit('search:cleared');
    }
    
    performSearch() {
        const { query, searchContext } = this.state;
        
        if (!query.trim()) return;
        
        this.setState({ isSearching: true });
        this.render();
        
        // Add to search history
        this.addToSearchHistory(query, searchContext);
        
        // Hide suggestions
        this.hideSuggestions();
        
        // Emit search event
        eventBus.emit('search:performed', {
            query: query.trim(),
            context: searchContext,
            workspaceId: this.workspaceId,
            boardIds: this.boardIds,
            filters: this.state.filters
        });
        
        // Reset searching state after a delay
        setTimeout(() => {
            this.setState({ isSearching: false });
            this.render();
        }, 1000);
    }
    
    navigateToResult(result) {
        // Navigate to the specific result
        eventBus.emit('search:result-selected', result);
        
        // Navigate based on result type
        switch (result.type) {
            case 'item':
                window.location.href = `/boards/${result.boardId}/items/${result.id}`;
                break;
            case 'board':
                window.location.href = `/boards/${result.id}`;
                break;
            case 'comment':
                window.location.href = `/boards/${result.boardId}/items/${result.itemId}#comment-${result.id}`;
                break;
            case 'user':
                window.location.href = `/users/${result.id}`;
                break;
        }
    }
    
    addToSearchHistory(query, context) {
        const history = [...this.state.searchHistory];
        
        // Remove existing entry if it exists
        const existingIndex = history.findIndex(item => 
            item.query === query && item.context === context
        );
        if (existingIndex >= 0) {
            history.splice(existingIndex, 1);
        }
        
        // Add to beginning
        history.unshift({
            query,
            context,
            timestamp: new Date().toISOString()
        });
        
        // Limit history size
        if (history.length > this.maxHistory) {
            history.splice(this.maxHistory);
        }
        
        this.setState({ searchHistory: history });
        this.saveSearchHistory(history);
    }
    
    saveSearchHistory(history) {
        try {
            localStorage.setItem(`search-history-${this.workspaceId}`, JSON.stringify(history));
        } catch (error) {
            console.error('Error saving search history:', error);
        }
    }
    
    hideSuggestions() {
        this.setState({ 
            showSuggestions: false, 
            showHistory: false,
            selectedSuggestionIndex: -1 
        });
        this.render();
    }
    
    toggleFilters() {
        eventBus.emit('search:toggle-filters');
    }
    
    // Event handlers for external events
    handleExternalQueryUpdate(data) {
        this.setState({ query: data.query });
        if (this.searchInput) {
            this.searchInput.value = data.query;
        }
        this.render();
    }
    
    handleFiltersUpdated(data) {
        this.setState({ filters: data.filters });
        this.render();
    }
    
    handleWorkspaceChanged(data) {
        this.workspaceId = data.workspaceId;
        this.loadSearchHistory();
        this.loadPopularSearches();
    }
    
    // Public methods
    setQuery(query) {
        this.setState({ query });
        if (this.searchInput) {
            this.searchInput.value = query;
        }
        this.render();
    }
    
    getQuery() {
        return this.state.query;
    }
    
    focus() {
        if (this.searchInput) {
            this.searchInput.focus();
        }
    }
    
    setFilters(filters) {
        this.setState({ filters });
        this.render();
    }
    
    getFilters() {
        return this.state.filters;
    }
    
    setContext(context) {
        this.setState({ searchContext: context });
        this.render();
    }
    
    getContext() {
        return this.state.searchContext;
    }
    
    destroy() {
        clearTimeout(this.searchTimeout);
        document.removeEventListener('click', this.handleDocumentClick);
        
        // Remove event listeners
        eventBus.off('search:query-updated', this.handleExternalQueryUpdate);
        eventBus.off('search:filters-updated', this.handleFiltersUpdated);
        eventBus.off('workspace:changed', this.handleWorkspaceChanged);
        
        super.destroy();
    }
} 