/**
 * Search Results Component
 * Displays search results with highlighting, filtering, and pagination
 */

import { Component } from '../base/Component.js';
import { searchService } from '../../services/search.js';
import { eventBus } from '../../utils/events.js';

export class SearchResults extends Component {
    constructor(container, options = {}) {
        super(container, options);
        
        this.state = {
            results: [],
            totalCount: 0,
            isLoading: false,
            hasMore: false,
            currentPage: 1,
            query: '',
            context: 'all',
            filters: {},
            sortBy: 'relevance', // relevance, date, title
            sortOrder: 'desc',
            groupBy: 'type', // none, type, board, date
            selectedResults: [],
            showPreview: false,
            previewResult: null,
            errors: {},
            facets: {},
            searchTime: 0
        };
        
        this.workspaceId = options.workspaceId;
        this.boardIds = options.boardIds || [];
        this.pageSize = options.pageSize || 20;
        this.showFacets = options.showFacets !== false;
        this.allowSelection = options.allowSelection !== false;
        this.showPreviews = options.showPreviews !== false;
        this.highlightQuery = options.highlightQuery !== false;
        
        this.loadingStates = new Set();
        
        this.init();
    }
    
    init() {
        this.render();
        this.bindEvents();
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        eventBus.on('search:performed', this.handleSearchPerformed.bind(this));
        eventBus.on('search:cleared', this.handleSearchCleared.bind(this));
        eventBus.on('search:filters-updated', this.handleFiltersUpdated.bind(this));
    }
    
    render() {
        const { 
            results, 
            totalCount, 
            isLoading, 
            hasMore, 
            query, 
            context,
            sortBy, 
            sortOrder, 
            groupBy, 
            errors, 
            facets, 
            searchTime,
            showPreview,
            previewResult 
        } = this.state;
        
        this.container.innerHTML = `
            <div class="search-results">
                ${query ? this.renderSearchHeader() : ''}
                
                ${errors.search ? `
                    <div class="search-error">
                        <div class="search-error-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="15" y1="9" x2="9" y2="15"></line>
                                <line x1="9" y1="9" x2="15" y2="15"></line>
                            </svg>
                        </div>
                        <div class="search-error-content">
                            <h3 class="search-error-title">Search Error</h3>
                            <p class="search-error-message">${errors.search}</p>
                            <button type="button" class="btn btn--outline btn--sm" data-action="retry-search">
                                Try Again
                            </button>
                        </div>
                    </div>
                ` : ''}
                
                <div class="search-results-container">
                    ${this.showFacets && Object.keys(facets).length > 0 ? `
                        <div class="search-facets">
                            ${this.renderFacets()}
                        </div>
                    ` : ''}
                    
                    <div class="search-results-main">
                        ${isLoading && results.length === 0 ? 
                            this.renderLoadingState() : 
                            this.renderResults()
                        }
                    </div>
                </div>
                
                ${showPreview && previewResult ? this.renderPreview() : ''}
            </div>
        `;
        
        this.bindResultEvents();
    }
    
    renderSearchHeader() {
        const { query, totalCount, context, sortBy, sortOrder, groupBy, searchTime } = this.state;
        
        return `
            <div class="search-header">
                <div class="search-header-info">
                    <h2 class="search-header-title">
                        Search results for "${this.escapeHtml(query)}"
                    </h2>
                    <div class="search-header-meta">
                        <span class="search-count">
                            ${totalCount.toLocaleString()} result${totalCount !== 1 ? 's' : ''}
                        </span>
                        ${context !== 'all' ? `
                            <span class="search-context">in ${this.getContextLabel(context)}</span>
                        ` : ''}
                        ${searchTime > 0 ? `
                            <span class="search-time">(${searchTime}ms)</span>
                        ` : ''}
                    </div>
                </div>
                
                <div class="search-header-controls">
                    <div class="search-sort">
                        <label class="search-sort-label">Sort by:</label>
                        <select class="search-sort-select" data-sort-by>
                            <option value="relevance" ${sortBy === 'relevance' ? 'selected' : ''}>Relevance</option>
                            <option value="date" ${sortBy === 'date' ? 'selected' : ''}>Date</option>
                            <option value="title" ${sortBy === 'title' ? 'selected' : ''}>Title</option>
                        </select>
                        <select class="search-order-select" data-sort-order>
                            <option value="desc" ${sortOrder === 'desc' ? 'selected' : ''}>Descending</option>
                            <option value="asc" ${sortOrder === 'asc' ? 'selected' : ''}>Ascending</option>
                        </select>
                    </div>
                    
                    <div class="search-group">
                        <label class="search-group-label">Group by:</label>
                        <select class="search-group-select" data-group-by>
                            <option value="none" ${groupBy === 'none' ? 'selected' : ''}>None</option>
                            <option value="type" ${groupBy === 'type' ? 'selected' : ''}>Type</option>
                            <option value="board" ${groupBy === 'board' ? 'selected' : ''}>Board</option>
                            <option value="date" ${groupBy === 'date' ? 'selected' : ''}>Date</option>
                        </select>
                    </div>
                    
                    ${this.allowSelection ? `
                        <div class="search-actions">
                            <button type="button" class="btn btn--outline btn--sm" data-action="select-all">
                                Select All
                            </button>
                            <button type="button" class="btn btn--outline btn--sm" data-action="clear-selection" disabled>
                                Clear Selection
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    renderFacets() {
        const { facets } = this.state;
        
        return `
            <div class="facets-container">
                <h3 class="facets-title">Refine Results</h3>
                
                ${Object.entries(facets).map(([facetKey, facetData]) => `
                    <div class="facet-group">
                        <h4 class="facet-title">${this.getFacetTitle(facetKey)}</h4>
                        <div class="facet-items">
                            ${facetData.buckets.map(bucket => `
                                <label class="facet-item">
                                    <input 
                                        type="checkbox" 
                                        class="facet-checkbox" 
                                        data-facet="${facetKey}" 
                                        data-value="${bucket.key}"
                                        ${bucket.selected ? 'checked' : ''}
                                    />
                                    <span class="facet-label">${this.escapeHtml(bucket.key)}</span>
                                    <span class="facet-count">${bucket.count}</span>
                                </label>
                            `).join('')}
                        </div>
                        ${facetData.buckets.length > 5 ? `
                            <button type="button" class="facet-show-more" data-action="show-more-facets" data-facet="${facetKey}">
                                Show more
                            </button>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    renderLoadingState() {
        return `
            <div class="search-loading">
                <div class="search-loading-spinner">
                    <svg class="spinner" width="32" height="32" viewBox="0 0 24 24">
                        <circle class="spinner-circle" cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
                    </svg>
                </div>
                <p class="search-loading-text">Searching...</p>
            </div>
        `;
    }
    
    renderResults() {
        const { results, query, groupBy, totalCount } = this.state;
        
        if (!query) {
            return this.renderEmptySearch();
        }
        
        if (results.length === 0) {
            return this.renderNoResults();
        }
        
        if (groupBy === 'none') {
            return `
                <div class="search-results-list">
                    ${results.map(result => this.renderResult(result)).join('')}
                </div>
                ${this.renderPagination()}
            `;
        } else {
            return this.renderGroupedResults();
        }
    }
    
    renderEmptySearch() {
        return `
            <div class="search-empty">
                <div class="search-empty-icon">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <circle cx="11" cy="11" r="8"></circle>
                        <path d="M21 21l-4.35-4.35"></path>
                    </svg>
                </div>
                <h3 class="search-empty-title">Start searching</h3>
                <p class="search-empty-description">
                    Enter a search term to find items, comments, boards, and people.
                </p>
            </div>
        `;
    }
    
    renderNoResults() {
        const { query } = this.state;
        
        return `
            <div class="search-no-results">
                <div class="no-results-icon">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <circle cx="11" cy="11" r="8"></circle>
                        <path d="M21 21l-4.35-4.35"></path>
                        <line x1="15" y1="9" x2="9" y2="15"></line>
                        <line x1="9" y1="9" x2="15" y2="15"></line>
                    </svg>
                </div>
                <h3 class="no-results-title">No results found</h3>
                <p class="no-results-description">
                    We couldn't find anything matching "${this.escapeHtml(query)}".
                </p>
                <div class="no-results-suggestions">
                    <h4 class="suggestions-title">Try:</h4>
                    <ul class="suggestions-list">
                        <li>Checking your spelling</li>
                        <li>Using different keywords</li>
                        <li>Removing filters</li>
                        <li>Searching in all categories</li>
                    </ul>
                </div>
            </div>
        `;
    }
    
    renderGroupedResults() {
        const { results, groupBy } = this.state;
        const groups = this.groupResults(results, groupBy);
        
        return `
            <div class="search-results-grouped">
                ${Object.entries(groups).map(([groupKey, groupResults]) => `
                    <div class="search-result-group">
                        <div class="search-group-header">
                            <h3 class="search-group-title">${this.getGroupTitle(groupKey, groupBy)}</h3>
                            <span class="search-group-count">${groupResults.length} result${groupResults.length !== 1 ? 's' : ''}</span>
                        </div>
                        <div class="search-group-results">
                            ${groupResults.map(result => this.renderResult(result)).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
            ${this.renderPagination()}
        `;
    }
    
    renderResult(result) {
        const { query, selectedResults } = this.state;
        const isSelected = selectedResults.includes(result.id);
        
        return `
            <div class="search-result-item ${isSelected ? 'result-item--selected' : ''}" data-result-id="${result.id}">
                ${this.allowSelection ? `
                    <div class="result-selection">
                        <input 
                            type="checkbox" 
                            class="result-checkbox" 
                            data-result-id="${result.id}"
                            ${isSelected ? 'checked' : ''}
                        />
                    </div>
                ` : ''}
                
                <div class="result-icon">
                    ${this.getResultIcon(result.type)}
                </div>
                
                <div class="result-content" data-action="open-result" data-result-id="${result.id}">
                    <div class="result-header">
                        <h4 class="result-title">
                            ${this.highlightQuery ? this.highlightText(result.title, query) : this.escapeHtml(result.title)}
                        </h4>
                        <div class="result-meta">
                            <span class="result-type">${this.getResultTypeLabel(result.type)}</span>
                            ${result.boardName ? `
                                <span class="result-board">in ${this.escapeHtml(result.boardName)}</span>
                            ` : ''}
                            <span class="result-date">${this.formatDate(result.updatedAt || result.createdAt)}</span>
                        </div>
                    </div>
                    
                    ${result.description ? `
                        <div class="result-description">
                            ${this.highlightQuery ? this.highlightText(result.description, query) : this.escapeHtml(result.description)}
                        </div>
                    ` : ''}
                    
                    ${result.snippet ? `
                        <div class="result-snippet">
                            ${this.highlightQuery ? this.highlightText(result.snippet, query) : this.escapeHtml(result.snippet)}
                        </div>
                    ` : ''}
                    
                    ${result.tags && result.tags.length > 0 ? `
                        <div class="result-tags">
                            ${result.tags.slice(0, 3).map(tag => `
                                <span class="result-tag">${this.escapeHtml(tag)}</span>
                            `).join('')}
                            ${result.tags.length > 3 ? `
                                <span class="result-tag result-tag--more">+${result.tags.length - 3}</span>
                            ` : ''}
                        </div>
                    ` : ''}
                    
                    <div class="result-footer">
                        <div class="result-author">
                            ${result.author ? `
                                <div class="author-avatar">
                                    ${result.author.avatar ? 
                                        `<img src="${result.author.avatar}" alt="${result.author.name}" />` :
                                        `<div class="author-initials">${this.getInitials(result.author.name)}</div>`
                                    }
                                </div>
                                <span class="author-name">${this.escapeHtml(result.author.name)}</span>
                            ` : ''}
                        </div>
                        
                        <div class="result-actions">
                            ${this.showPreviews ? `
                                <button type="button" class="result-action-btn" data-action="preview-result" data-result-id="${result.id}">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                        <circle cx="12" cy="12" r="3"></circle>
                                    </svg>
                                    Preview
                                </button>
                            ` : ''}
                            
                            <button type="button" class="result-action-btn" data-action="open-result" data-result-id="${result.id}">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                    <polyline points="15,3 21,3 21,9"></polyline>
                                    <line x1="10" y1="14" x2="21" y2="3"></line>
                                </svg>
                                Open
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderPagination() {
        const { currentPage, hasMore, totalCount, isLoading } = this.state;
        const totalPages = Math.ceil(totalCount / this.pageSize);
        
        if (totalPages <= 1) return '';
        
        return `
            <div class="search-pagination">
                <div class="pagination-info">
                    Page ${currentPage} of ${totalPages}
                </div>
                
                <div class="pagination-controls">
                    <button 
                        type="button" 
                        class="pagination-btn pagination-btn--prev" 
                        data-action="prev-page"
                        ${currentPage <= 1 ? 'disabled' : ''}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <polyline points="15,18 9,12 15,6"></polyline>
                        </svg>
                        Previous
                    </button>
                    
                    <div class="pagination-pages">
                        ${this.renderPageNumbers()}
                    </div>
                    
                    <button 
                        type="button" 
                        class="pagination-btn pagination-btn--next" 
                        data-action="next-page"
                        ${!hasMore || isLoading ? 'disabled' : ''}
                    >
                        Next
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <polyline points="9,18 15,12 9,6"></polyline>
                        </svg>
                    </button>
                </div>
                
                ${hasMore ? `
                    <button 
                        type="button" 
                        class="load-more-btn" 
                        data-action="load-more"
                        ${isLoading ? 'disabled' : ''}
                    >
                        ${isLoading ? 'Loading...' : 'Load More Results'}
                    </button>
                ` : ''}
            </div>
        `;
    }
    
    renderPageNumbers() {
        const { currentPage, totalCount } = this.state;
        const totalPages = Math.ceil(totalCount / this.pageSize);
        const pages = [];
        
        // Show first page
        if (currentPage > 3) {
            pages.push(1);
            if (currentPage > 4) {
                pages.push('...');
            }
        }
        
        // Show pages around current
        for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
            pages.push(i);
        }
        
        // Show last page
        if (currentPage < totalPages - 2) {
            if (currentPage < totalPages - 3) {
                pages.push('...');
            }
            pages.push(totalPages);
        }
        
        return pages.map(page => {
            if (page === '...') {
                return '<span class="pagination-ellipsis">...</span>';
            }
            
            return `
                <button 
                    type="button" 
                    class="pagination-page ${page === currentPage ? 'pagination-page--active' : ''}" 
                    data-action="goto-page" 
                    data-page="${page}"
                >
                    ${page}
                </button>
            `;
        }).join('');
    }
    
    renderPreview() {
        const { previewResult } = this.state;
        
        return `
            <div class="search-result-preview">
                <div class="preview-overlay" data-action="close-preview"></div>
                <div class="preview-content">
                    <div class="preview-header">
                        <h3 class="preview-title">${this.escapeHtml(previewResult.title)}</h3>
                        <button type="button" class="preview-close" data-action="close-preview">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                    
                    <div class="preview-body">
                        ${this.renderPreviewContent(previewResult)}
                    </div>
                    
                    <div class="preview-footer">
                        <button type="button" class="btn btn--primary" data-action="open-result" data-result-id="${previewResult.id}">
                            Open Full View
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderPreviewContent(result) {
        switch (result.type) {
            case 'item':
                return this.renderItemPreview(result);
            case 'comment':
                return this.renderCommentPreview(result);
            case 'board':
                return this.renderBoardPreview(result);
            case 'user':
                return this.renderUserPreview(result);
            default:
                return `<p class="preview-fallback">Preview not available for this content type.</p>`;
        }
    }
    
    renderItemPreview(item) {
        return `
            <div class="item-preview">
                <div class="item-preview-meta">
                    <span class="item-status">${this.escapeHtml(item.status || 'No Status')}</span>
                    <span class="item-board">in ${this.escapeHtml(item.boardName)}</span>
                </div>
                
                ${item.description ? `
                    <div class="item-preview-description">
                        <h4>Description</h4>
                        <p>${this.escapeHtml(item.description)}</p>
                    </div>
                ` : ''}
                
                ${item.fields && item.fields.length > 0 ? `
                    <div class="item-preview-fields">
                        <h4>Fields</h4>
                        <div class="preview-fields-list">
                            ${item.fields.slice(0, 3).map(field => `
                                <div class="preview-field">
                                    <span class="field-name">${this.escapeHtml(field.name)}:</span>
                                    <span class="field-value">${this.escapeHtml(field.value || 'No value')}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    renderCommentPreview(comment) {
        return `
            <div class="comment-preview">
                <div class="comment-preview-content">
                    <p>${this.escapeHtml(comment.content)}</p>
                </div>
                
                <div class="comment-preview-meta">
                    <div class="comment-author">
                        <div class="author-avatar">
                            ${comment.author?.avatar ? 
                                `<img src="${comment.author.avatar}" alt="${comment.author.name}" />` :
                                `<div class="author-initials">${this.getInitials(comment.author?.name || 'U')}</div>`
                            }
                        </div>
                        <span class="author-name">${this.escapeHtml(comment.author?.name || 'Unknown')}</span>
                    </div>
                    
                    <span class="comment-date">${this.formatDate(comment.createdAt)}</span>
                </div>
                
                ${comment.itemTitle ? `
                    <div class="comment-context">
                        <span class="context-label">On item:</span>
                        <span class="context-value">${this.escapeHtml(comment.itemTitle)}</span>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    renderBoardPreview(board) {
        return `
            <div class="board-preview">
                ${board.description ? `
                    <div class="board-preview-description">
                        <p>${this.escapeHtml(board.description)}</p>
                    </div>
                ` : ''}
                
                <div class="board-preview-stats">
                    <div class="board-stat">
                        <span class="stat-value">${board.itemCount || 0}</span>
                        <span class="stat-label">Items</span>
                    </div>
                    <div class="board-stat">
                        <span class="stat-value">${board.memberCount || 0}</span>
                        <span class="stat-label">Members</span>
                    </div>
                    <div class="board-stat">
                        <span class="stat-value">${board.columnCount || 0}</span>
                        <span class="stat-label">Columns</span>
                    </div>
                </div>
                
                ${board.tags && board.tags.length > 0 ? `
                    <div class="board-preview-tags">
                        <h4>Tags</h4>
                        <div class="preview-tags">
                            ${board.tags.map(tag => `
                                <span class="preview-tag">${this.escapeHtml(tag)}</span>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    renderUserPreview(user) {
        return `
            <div class="user-preview">
                <div class="user-preview-header">
                    <div class="user-avatar-large">
                        ${user.avatar ? 
                            `<img src="${user.avatar}" alt="${user.name}" />` :
                            `<div class="user-initials-large">${this.getInitials(user.name)}</div>`
                        }
                    </div>
                    <div class="user-info">
                        <h4 class="user-name">${this.escapeHtml(user.name)}</h4>
                        <p class="user-email">${this.escapeHtml(user.email)}</p>
                        ${user.title ? `
                            <p class="user-title">${this.escapeHtml(user.title)}</p>
                        ` : ''}
                    </div>
                </div>
                
                ${user.bio ? `
                    <div class="user-preview-bio">
                        <p>${this.escapeHtml(user.bio)}</p>
                    </div>
                ` : ''}
                
                <div class="user-preview-stats">
                    <div class="user-stat">
                        <span class="stat-value">${user.itemCount || 0}</span>
                        <span class="stat-label">Items</span>
                    </div>
                    <div class="user-stat">
                        <span class="stat-value">${user.commentCount || 0}</span>
                        <span class="stat-label">Comments</span>
                    </div>
                    <div class="user-stat">
                        <span class="stat-value">${user.boardCount || 0}</span>
                        <span class="stat-label">Boards</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Helper methods
    getResultIcon(type) {
        const icons = {
            item: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="9" x2="15" y2="9"></line><line x1="9" y1="13" x2="15" y2="13"></line>',
            comment: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>',
            board: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line>',
            user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>'
        };
        
        const iconPath = icons[type] || icons.item;
        
        return `
            <svg class="result-icon-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                ${iconPath}
            </svg>
        `;
    }
    
    getResultTypeLabel(type) {
        const labels = {
            item: 'Item',
            comment: 'Comment',
            board: 'Board',
            user: 'Person'
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
    
    getFacetTitle(facetKey) {
        const titles = {
            type: 'Content Type',
            board: 'Board',
            author: 'Author',
            status: 'Status',
            tags: 'Tags',
            dateRange: 'Date Range'
        };
        
        return titles[facetKey] || facetKey;
    }
    
    getGroupTitle(groupKey, groupBy) {
        switch (groupBy) {
            case 'type':
                return this.getResultTypeLabel(groupKey);
            case 'board':
                return groupKey || 'No Board';
            case 'date':
                return this.formatDateGroup(groupKey);
            default:
                return groupKey;
        }
    }
    
    groupResults(results, groupBy) {
        const groups = {};
        
        results.forEach(result => {
            let groupKey;
            
            switch (groupBy) {
                case 'type':
                    groupKey = result.type;
                    break;
                case 'board':
                    groupKey = result.boardName || 'No Board';
                    break;
                case 'date':
                    groupKey = this.getDateGroup(result.updatedAt || result.createdAt);
                    break;
                default:
                    groupKey = 'all';
            }
            
            if (!groups[groupKey]) {
                groups[groupKey] = [];
            }
            groups[groupKey].push(result);
        });
        
        return groups;
    }
    
    getDateGroup(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        
        if (date >= today) {
            return 'Today';
        } else if (date >= yesterday) {
            return 'Yesterday';
        } else if (date >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)) {
            return 'This week';
        } else if (date >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)) {
            return 'This month';
        } else {
            return 'Older';
        }
    }
    
    formatDateGroup(groupKey) {
        return groupKey;
    }
    
    highlightText(text, query) {
        if (!query || !text) return this.escapeHtml(text);
        
        const escapedQuery = this.escapeRegExp(query);
        const regex = new RegExp(`(${escapedQuery})`, 'gi');
        
        return this.escapeHtml(text).replace(regex, '<mark class="search-highlight">$1</mark>');
    }
    
    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = (now - date) / (1000 * 60 * 60);
        
        if (diffInHours < 1) {
            return 'Just now';
        } else if (diffInHours < 24) {
            return `${Math.floor(diffInHours)}h ago`;
        } else if (diffInHours < 168) {
            return `${Math.floor(diffInHours / 24)}d ago`;
        } else {
            return date.toLocaleDateString();
        }
    }
    
    getInitials(name) {
        return name.split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    }
    
    bindResultEvents() {
        // Sort and group controls
        const sortBySelect = this.container.querySelector('[data-sort-by]');
        const sortOrderSelect = this.container.querySelector('[data-sort-order]');
        const groupBySelect = this.container.querySelector('[data-group-by]');
        
        if (sortBySelect) {
            sortBySelect.addEventListener('change', (e) => {
                this.setState({ sortBy: e.target.value });
                this.performSearch();
            });
        }
        
        if (sortOrderSelect) {
            sortOrderSelect.addEventListener('change', (e) => {
                this.setState({ sortOrder: e.target.value });
                this.performSearch();
            });
        }
        
        if (groupBySelect) {
            groupBySelect.addEventListener('change', (e) => {
                this.setState({ groupBy: e.target.value });
                this.render();
            });
        }
        
        // Facet checkboxes
        const facetCheckboxes = this.container.querySelectorAll('.facet-checkbox');
        facetCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', this.handleFacetChange.bind(this));
        });
        
        // Result checkboxes
        const resultCheckboxes = this.container.querySelectorAll('.result-checkbox');
        resultCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', this.handleResultSelection.bind(this));
        });
    }
    
    bindEvents() {
        this.container.addEventListener('click', this.handleClick.bind(this));
    }
    
    async handleClick(e) {
        const action = e.target.closest('[data-action]')?.dataset.action;
        const resultId = e.target.closest('[data-result-id]')?.dataset.resultId;
        const page = e.target.closest('[data-page]')?.dataset.page;
        
        switch (action) {
            case 'retry-search':
                await this.performSearch();
                break;
            case 'open-result':
                this.openResult(resultId);
                break;
            case 'preview-result':
                await this.previewResult(resultId);
                break;
            case 'close-preview':
                this.closePreview();
                break;
            case 'select-all':
                this.selectAllResults();
                break;
            case 'clear-selection':
                this.clearSelection();
                break;
            case 'prev-page':
                await this.goToPage(this.state.currentPage - 1);
                break;
            case 'next-page':
                await this.goToPage(this.state.currentPage + 1);
                break;
            case 'goto-page':
                await this.goToPage(parseInt(page));
                break;
            case 'load-more':
                await this.loadMoreResults();
                break;
        }
    }
    
    handleFacetChange(e) {
        const facet = e.target.dataset.facet;
        const value = e.target.dataset.value;
        const isChecked = e.target.checked;
        
        const filters = { ...this.state.filters };
        
        if (!filters[facet]) {
            filters[facet] = [];
        }
        
        if (isChecked) {
            if (!filters[facet].includes(value)) {
                filters[facet].push(value);
            }
        } else {
            filters[facet] = filters[facet].filter(v => v !== value);
            if (filters[facet].length === 0) {
                delete filters[facet];
            }
        }
        
        this.setState({ filters });
        this.performSearch();
        
        // Emit filters updated event
        eventBus.emit('search:filters-updated', { filters });
    }
    
    handleResultSelection(e) {
        const resultId = e.target.dataset.resultId;
        const isChecked = e.target.checked;
        
        let selectedResults = [...this.state.selectedResults];
        
        if (isChecked) {
            if (!selectedResults.includes(resultId)) {
                selectedResults.push(resultId);
            }
        } else {
            selectedResults = selectedResults.filter(id => id !== resultId);
        }
        
        this.setState({ selectedResults });
        this.updateSelectionControls();
        
        // Emit selection event
        eventBus.emit('search:selection-changed', { 
            selectedResults, 
            selectedCount: selectedResults.length 
        });
    }
    
    updateSelectionControls() {
        const clearBtn = this.container.querySelector('[data-action="clear-selection"]');
        if (clearBtn) {
            clearBtn.disabled = this.state.selectedResults.length === 0;
        }
    }
    
    selectAllResults() {
        const allResultIds = this.state.results.map(result => result.id);
        this.setState({ selectedResults: allResultIds });
        
        // Update checkboxes
        const checkboxes = this.container.querySelectorAll('.result-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = true;
        });
        
        this.updateSelectionControls();
        
        eventBus.emit('search:selection-changed', { 
            selectedResults: allResultIds, 
            selectedCount: allResultIds.length 
        });
    }
    
    clearSelection() {
        this.setState({ selectedResults: [] });
        
        // Update checkboxes
        const checkboxes = this.container.querySelectorAll('.result-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        
        this.updateSelectionControls();
        
        eventBus.emit('search:selection-changed', { 
            selectedResults: [], 
            selectedCount: 0 
        });
    }
    
    async performSearch(resetPagination = true) {
        const { query, context, filters, sortBy, sortOrder } = this.state;
        
        if (!query.trim()) return;
        
        this.setState({ 
            isLoading: true, 
            errors: {},
            ...(resetPagination && { currentPage: 1, results: [] })
        });
        this.render();
        
        try {
            const startTime = Date.now();
            
            const response = await searchService.search({
                query: query.trim(),
                context,
                workspaceId: this.workspaceId,
                boardIds: this.boardIds,
                filters,
                sortBy,
                sortOrder,
                page: resetPagination ? 1 : this.state.currentPage,
                limit: this.pageSize,
                includeFacets: this.showFacets
            });
            
            const searchTime = Date.now() - startTime;
            
            if (response.success) {
                const newResults = resetPagination ? 
                    response.data.results : 
                    [...this.state.results, ...response.data.results];
                
                this.setState({
                    results: newResults,
                    totalCount: response.data.totalCount,
                    hasMore: response.data.hasMore,
                    facets: response.data.facets || {},
                    searchTime,
                    isLoading: false
                });
            } else {
                throw new Error(response.error?.message || 'Search failed');
            }
        } catch (error) {
            this.setState({
                isLoading: false,
                errors: { search: error.message }
            });
        }
        
        this.render();
    }
    
    async goToPage(page) {
        if (page < 1 || page === this.state.currentPage) return;
        
        this.setState({ currentPage: page });
        await this.performSearch(false);
    }
    
    async loadMoreResults() {
        if (this.state.isLoading || !this.state.hasMore) return;
        
        const nextPage = this.state.currentPage + 1;
        this.setState({ currentPage: nextPage });
        await this.performSearch(false);
    }
    
    openResult(resultId) {
        const result = this.state.results.find(r => r.id === resultId);
        if (!result) return;
        
        // Track result click
        eventBus.emit('search:result-clicked', result);
        
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
    
    async previewResult(resultId) {
        const result = this.state.results.find(r => r.id === resultId);
        if (!result) return;
        
        this.setState({ 
            showPreview: true, 
            previewResult: result 
        });
        this.render();
        
        // Track preview
        eventBus.emit('search:result-previewed', result);
    }
    
    closePreview() {
        this.setState({ 
            showPreview: false, 
            previewResult: null 
        });
        this.render();
    }
    
    // Event handlers for external events
    async handleSearchPerformed(data) {
        this.setState({
            query: data.query,
            context: data.context,
            filters: data.filters || {},
            selectedResults: []
        });
        
        await this.performSearch(true);
    }
    
    handleSearchCleared() {
        this.setState({
            query: '',
            results: [],
            totalCount: 0,
            selectedResults: [],
            errors: {},
            facets: {}
        });
        this.render();
    }
    
    handleFiltersUpdated(data) {
        this.setState({ filters: data.filters });
        if (this.state.query) {
            this.performSearch();
        }
    }
    
    // Public methods
    getSelectedResults() {
        return this.state.results.filter(result => 
            this.state.selectedResults.includes(result.id)
        );
    }
    
    clearResults() {
        this.setState({
            results: [],
            totalCount: 0,
            selectedResults: [],
            errors: {},
            facets: {}
        });
        this.render();
    }
    
    refresh() {
        if (this.state.query) {
            return this.performSearch(true);
        }
    }
    
    destroy() {
        // Remove event listeners
        eventBus.off('search:performed', this.handleSearchPerformed);
        eventBus.off('search:cleared', this.handleSearchCleared);
        eventBus.off('search:filters-updated', this.handleFiltersUpdated);
        
        super.destroy();
    }
} 