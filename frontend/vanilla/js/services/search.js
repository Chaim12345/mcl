/**
 * Search Service for Vanilla JavaScript Frontend
 */

import { authService } from './auth.js';
import { eventBus } from '../utils/events.js';
import { state } from '../utils/state.js';

// Configuration constants
const API_BASE_URL = '/api';
const SEARCH_HISTORY_KEY = 'search_history';
const MAX_SEARCH_HISTORY = 20;

/**
 * Search Service Class
 */
class SearchService {
    constructor() {
        this.searchHistory = [];
        this.recentSearches = [];
        this.searchCache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
        
        // Initialize from storage
        this.initializeFromStorage();
    }
    
    /**
     * Initialize search state from local storage
     */
    initializeFromStorage() {
        try {
            const searchHistory = localStorage.getItem(SEARCH_HISTORY_KEY);
            if (searchHistory) {
                this.searchHistory = JSON.parse(searchHistory);
            }
            
            // Update global state
            state.set('search', {
                history: this.searchHistory,
                recent: this.recentSearches
            });
        } catch (error) {
            console.error('Error initializing search from storage:', error);
            this.clearStorage();
        }
    }
    
    /**
     * Make authenticated API request
     */
    async makeRequest(endpoint, options = {}) {
        return await authService.makeRequest(endpoint, options);
    }
    
    /**
     * Perform search across all content types
     */
    async search(params = {}) {
        try {
            const searchParams = {
                q: params.query || '',
                context: params.context || 'all',
                workspaceId: params.workspaceId,
                boardIds: params.boardIds || [],
                page: params.page || 1,
                limit: params.limit || 20,
                sortBy: params.sortBy || 'relevance',
                sortOrder: params.sortOrder || 'desc',
                filters: params.filters || {},
                includeHighlights: params.includeHighlights !== false,
                includeFacets: params.includeFacets !== false
            };
            
            // Check cache first
            const cacheKey = this.generateCacheKey(searchParams);
            const cachedResult = this.getFromCache(cacheKey);
            if (cachedResult) {
                return cachedResult;
            }
            
            const startTime = Date.now();
            const response = await this.makeRequest('/search', {
                method: 'POST',
                body: JSON.stringify(searchParams)
            });
            
            if (response.success) {
                const searchTime = Date.now() - startTime;
                const result = {
                    success: true,
                    data: {
                        results: response.data.results || [],
                        totalCount: response.data.totalCount || 0,
                        hasMore: response.data.hasMore || false,
                        facets: response.data.facets || {},
                        searchTime,
                        query: searchParams.q,
                        context: searchParams.context
                    }
                };
                
                // Cache the result
                this.setCache(cacheKey, result);
                
                // Add to search history if it's a new search
                if (searchParams.page === 1 && searchParams.q.trim()) {
                    this.addToSearchHistory(searchParams.q, searchParams.context);
                }
                
                eventBus.emit('search:performed', result.data);
                return result;
            } else {
                throw new Error(response.message || 'Search failed');
            }
        } catch (error) {
            eventBus.emit('notification:error', { message: error.message });
            return { success: false, error: { message: error.message } };
        }
    }
    
    /**
     * Search for specific content types
     */
    async searchItems(params = {}) {
        return await this.search({ ...params, context: 'items' });
    }
    
    async searchComments(params = {}) {
        return await this.search({ ...params, context: 'comments' });
    }
    
    async searchBoards(params = {}) {
        return await this.search({ ...params, context: 'boards' });
    }
    
    async searchUsers(params = {}) {
        return await this.search({ ...params, context: 'users' });
    }
    
    /**
     * Get search suggestions/autocomplete
     */
    async getSuggestions(query, params = {}) {
        try {
            const searchParams = new URLSearchParams({
                q: query,
                workspaceId: params.workspaceId || '',
                context: params.context || 'all',
                limit: params.limit || 10
            });
            
            const response = await this.makeRequest(`/search/suggestions?${searchParams}`);
            
            if (response.success) {
                return {
                    success: true,
                    data: response.data.suggestions || []
                };
            } else {
                throw new Error(response.message || 'Failed to get suggestions');
            }
        } catch (error) {
            console.error('Error getting search suggestions:', error);
            return { success: false, data: [] };
        }
    }
    
    /**
     * Get popular searches
     */
    async getPopularSearches(params = {}) {
        try {
            const searchParams = new URLSearchParams({
                workspaceId: params.workspaceId || '',
                limit: params.limit || 10,
                timeRange: params.timeRange || 'week'
            });
            
            const response = await this.makeRequest(`/search/popular?${searchParams}`);
            
            if (response.success) {
                return {
                    success: true,
                    data: response.data.searches || []
                };
            } else {
                throw new Error(response.message || 'Failed to get popular searches');
            }
        } catch (error) {
            console.error('Error getting popular searches:', error);
            return { success: false, data: [] };
        }
    }
    
    /**
     * Get search analytics
     */
    async getSearchAnalytics(params = {}) {
        try {
            const searchParams = new URLSearchParams({
                workspaceId: params.workspaceId || '',
                timeRange: params.timeRange || 'week'
            });
            
            const response = await this.makeRequest(`/search/analytics?${searchParams}`);
            
            if (response.success) {
                return response.data;
            } else {
                throw new Error(response.message || 'Failed to get search analytics');
            }
        } catch (error) {
            console.error('Error getting search analytics:', error);
            return {
                totalSearches: 0,
                uniqueQueries: 0,
                avgResultsPerSearch: 0,
                topQueries: [],
                searchTrends: []
            };
        }
    }
    
    /**
     * Save search to history
     */
    addToSearchHistory(query, context = 'all') {
        if (!query.trim()) return;
        
        const searchEntry = {
            query: query.trim(),
            context,
            timestamp: new Date().toISOString(),
            count: 1
        };
        
        // Remove existing entry if it exists
        this.searchHistory = this.searchHistory.filter(entry => 
            !(entry.query === searchEntry.query && entry.context === searchEntry.context)
        );
        
        // Add to beginning
        this.searchHistory.unshift(searchEntry);
        
        // Limit history size
        if (this.searchHistory.length > MAX_SEARCH_HISTORY) {
            this.searchHistory = this.searchHistory.slice(0, MAX_SEARCH_HISTORY);
        }
        
        this.updateStorage();
        this.updateGlobalState();
        
        eventBus.emit('search:history-updated', { history: this.searchHistory });
    }
    
    /**
     * Remove search from history
     */
    removeFromSearchHistory(query, context = 'all') {
        this.searchHistory = this.searchHistory.filter(entry => 
            !(entry.query === query && entry.context === context)
        );
        
        this.updateStorage();
        this.updateGlobalState();
        
        eventBus.emit('search:history-updated', { history: this.searchHistory });
    }
    
    /**
     * Clear search history
     */
    clearSearchHistory() {
        this.searchHistory = [];
        this.updateStorage();
        this.updateGlobalState();
        
        eventBus.emit('search:history-cleared');
    }
    
    /**
     * Get search history
     */
    getSearchHistory() {
        return this.searchHistory;
    }
    
    /**
     * Generate cache key for search results
     */
    generateCacheKey(params) {
        return JSON.stringify({
            q: params.q,
            context: params.context,
            workspaceId: params.workspaceId,
            boardIds: params.boardIds?.sort(),
            page: params.page,
            limit: params.limit,
            sortBy: params.sortBy,
            sortOrder: params.sortOrder,
            filters: params.filters
        });
    }
    
    /**
     * Get result from cache
     */
    getFromCache(key) {
        const cached = this.searchCache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.result;
        }
        
        // Remove expired cache entry
        if (cached) {
            this.searchCache.delete(key);
        }
        
        return null;
    }
    
    /**
     * Set result in cache
     */
    setCache(key, result) {
        this.searchCache.set(key, {
            result,
            timestamp: Date.now()
        });
        
        // Limit cache size
        if (this.searchCache.size > 100) {
            const firstKey = this.searchCache.keys().next().value;
            this.searchCache.delete(firstKey);
        }
    }
    
    /**
     * Clear search cache
     */
    clearCache() {
        this.searchCache.clear();
    }
    
    /**
     * Highlight search terms in text
     */
    highlightSearchTerms(text, query, className = 'search-highlight') {
        if (!query || !text) return text;
        
        const terms = query.toLowerCase().split(/\s+/).filter(term => term.length > 0);
        let highlightedText = text;
        
        terms.forEach(term => {
            const regex = new RegExp(`(${this.escapeRegExp(term)})`, 'gi');
            highlightedText = highlightedText.replace(regex, `<mark class="${className}">$1</mark>`);
        });
        
        return highlightedText;
    }
    
    /**
     * Escape special regex characters
     */
    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    /**
     * Extract search snippet from content
     */
    extractSnippet(content, query, maxLength = 200) {
        if (!query || !content) return content.substring(0, maxLength);
        
        const lowerContent = content.toLowerCase();
        const lowerQuery = query.toLowerCase();
        const terms = lowerQuery.split(/\s+/).filter(term => term.length > 0);
        
        // Find the first occurrence of any search term
        let bestIndex = -1;
        let bestTerm = '';
        
        terms.forEach(term => {
            const index = lowerContent.indexOf(term);
            if (index !== -1 && (bestIndex === -1 || index < bestIndex)) {
                bestIndex = index;
                bestTerm = term;
            }
        });
        
        if (bestIndex === -1) {
            return content.substring(0, maxLength);
        }
        
        // Calculate snippet boundaries
        const halfLength = Math.floor(maxLength / 2);
        const start = Math.max(0, bestIndex - halfLength);
        const end = Math.min(content.length, start + maxLength);
        
        let snippet = content.substring(start, end);
        
        // Add ellipsis if needed
        if (start > 0) snippet = '...' + snippet;
        if (end < content.length) snippet = snippet + '...';
        
        return snippet;
    }
    
    /**
     * Update storage with current search data
     */
    updateStorage() {
        try {
            localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(this.searchHistory));
        } catch (error) {
            console.error('Error updating search storage:', error);
        }
    }
    
    /**
     * Update global state
     */
    updateGlobalState() {
        state.set('search', {
            history: this.searchHistory,
            recent: this.recentSearches
        });
    }
    
    /**
     * Clear storage
     */
    clearStorage() {
        localStorage.removeItem(SEARCH_HISTORY_KEY);
    }
    
    /**
     * Cleanup resources
     */
    destroy() {
        this.searchHistory = [];
        this.recentSearches = [];
        this.searchCache.clear();
        this.clearStorage();
        this.updateGlobalState();
    }
}

// Create and export singleton instance
export const searchService = new SearchService();

// Export the class for testing
export { SearchService };