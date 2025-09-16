/**
 * Tests for Search and Filter Components
 */

import { SearchBar } from '../js/components/search/SearchBar.js';
import { SearchResults } from '../js/components/search/SearchResults.js';
import { FilterModal } from '../js/components/filter/FilterModal.js';

// Mock services
const mockSearchService = {
    getSuggestions: jest.fn(),
    search: jest.fn(),
    getPopularSearches: jest.fn()
};

const mockFilterService = {
    getAvailableFields: jest.fn(),
    previewFilter: jest.fn()
};

const mockSavedFilterService = {
    getSavedFilters: jest.fn(),
    createSavedFilter: jest.fn(),
    deleteSavedFilter: jest.fn()
};

jest.mock('../js/services/search.js', () => ({
    searchService: mockSearchService
}));

jest.mock('../js/services/filter.js', () => ({
    filterService: mockFilterService
}));

jest.mock('../js/services/saved-filter.js', () => ({
    savedFilterService: mockSavedFilterService
}));

describe('SearchBar', () => {
    let container;
    let searchBar;
    let mockSuggestions;
    let mockPopularSearches;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);

        mockSuggestions = [
            {
                id: 'suggestion-1',
                type: 'item',
                title: 'Test Item',
                description: 'A test item for searching',
                boardName: 'Test Board'
            },
            {
                id: 'suggestion-2',
                type: 'query',
                title: 'test query',
                description: 'Previous search'
            }
        ];

        mockPopularSearches = [
            { query: 'popular search', count: 15 },
            { query: 'another search', count: 8 }
        ];

        mockSearchService.getSuggestions.mockResolvedValue({
            success: true,
            data: mockSuggestions
        });

        mockSearchService.getPopularSearches.mockResolvedValue({
            success: true,
            data: mockPopularSearches
        });

        // Mock localStorage
        const localStorageMock = {
            getItem: jest.fn(),
            setItem: jest.fn(),
            removeItem: jest.fn()
        };
        Object.defineProperty(window, 'localStorage', {
            value: localStorageMock
        });
    });

    afterEach(() => {
        if (searchBar) {
            searchBar.destroy();
        }
        document.body.removeChild(container);
        jest.clearAllMocks();
    });

    describe('Initialization', () => {
        test('should initialize with default state', () => {
            searchBar = new SearchBar(container, {
                workspaceId: 'workspace-1'
            });

            expect(container.querySelector('.search-bar')).toBeTruthy();
            expect(container.querySelector('.search-input')).toBeTruthy();
            expect(container.querySelector('.search-context-select')).toBeTruthy();
        });

        test('should load search history from localStorage', () => {
            const mockHistory = [
                { query: 'previous search', context: 'all', timestamp: '2024-01-15T10:00:00Z' }
            ];
            
            localStorage.getItem.mockReturnValue(JSON.stringify(mockHistory));

            searchBar = new SearchBar(container, {
                workspaceId: 'workspace-1'
            });

            expect(localStorage.getItem).toHaveBeenCalledWith('search-history-workspace-1');
            expect(searchBar.state.searchHistory).toEqual(mockHistory);
        });

        test('should load popular searches', async () => {
            searchBar = new SearchBar(container, {
                workspaceId: 'workspace-1'
            });

            await new Promise(resolve => setTimeout(resolve, 100));

            expect(mockSearchService.getPopularSearches).toHaveBeenCalledWith({
                workspaceId: 'workspace-1',
                limit: 5
            });
        });
    });

    describe('Search Input', () => {
        beforeEach(() => {
            searchBar = new SearchBar(container, {
                workspaceId: 'workspace-1'
            });
        });

        test('should update state on input', () => {
            const input = container.querySelector('.search-input');
            
            input.value = 'test query';
            input.dispatchEvent(new Event('input'));

            expect(searchBar.state.query).toBe('test query');
        });

        test('should show suggestions when typing', async () => {
            const input = container.querySelector('.search-input');
            
            input.value = 'test';
            input.dispatchEvent(new Event('input'));

            // Wait for debounce
            await new Promise(resolve => setTimeout(resolve, 350));

            expect(mockSearchService.getSuggestions).toHaveBeenCalledWith({
                query: 'test',
                context: 'all',
                workspaceId: 'workspace-1',
                boardIds: [],
                limit: 10
            });

            expect(container.querySelector('.search-suggestions')).toBeTruthy();
        });

        test('should not fetch suggestions for short queries', async () => {
            const input = container.querySelector('.search-input');
            
            input.value = 'a';
            input.dispatchEvent(new Event('input'));

            await new Promise(resolve => setTimeout(resolve, 350));

            expect(mockSearchService.getSuggestions).not.toHaveBeenCalled();
        });

        test('should clear search when clear button clicked', () => {
            const input = container.querySelector('.search-input');
            
            // Add some text first
            input.value = 'test query';
            input.dispatchEvent(new Event('input'));

            // Click clear button
            const clearBtn = container.querySelector('.search-clear-btn');
            clearBtn.click();

            expect(searchBar.state.query).toBe('');
            expect(input.value).toBe('');
        });
    });

    describe('Suggestions', () => {
        beforeEach(async () => {
            searchBar = new SearchBar(container, {
                workspaceId: 'workspace-1'
            });

            // Trigger suggestions
            const input = container.querySelector('.search-input');
            input.value = 'test';
            input.dispatchEvent(new Event('input'));
            await new Promise(resolve => setTimeout(resolve, 350));
        });

        test('should render suggestion items', () => {
            const suggestionItems = container.querySelectorAll('.search-suggestion-item');
            expect(suggestionItems).toHaveLength(2);

            const firstItem = suggestionItems[0];
            expect(firstItem.textContent).toContain('Test Item');
            expect(firstItem.textContent).toContain('A test item for searching');
        });

        test('should navigate suggestions with arrow keys', () => {
            const input = container.querySelector('.search-input');
            
            // Press arrow down
            const downEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
            input.dispatchEvent(downEvent);

            expect(searchBar.state.selectedSuggestionIndex).toBe(0);

            // Press arrow down again
            input.dispatchEvent(downEvent);

            expect(searchBar.state.selectedSuggestionIndex).toBe(1);

            // Press arrow up
            const upEvent = new KeyboardEvent('keydown', { key: 'ArrowUp' });
            input.dispatchEvent(upEvent);

            expect(searchBar.state.selectedSuggestionIndex).toBe(0);
        });

        test('should select suggestion with Enter key', () => {
            const input = container.querySelector('.search-input');
            
            // Navigate to first suggestion
            const downEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
            input.dispatchEvent(downEvent);

            // Select with Enter
            const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
            input.dispatchEvent(enterEvent);

            // Should update query for query type suggestions
            expect(searchBar.state.query).toBe('test query');
        });

        test('should select suggestion on click', () => {
            const suggestionItems = container.querySelectorAll('.search-suggestion-item');
            const secondItem = suggestionItems[1]; // Query suggestion

            secondItem.click();

            expect(searchBar.state.query).toBe('test query');
        });

        test('should hide suggestions on Escape', () => {
            const input = container.querySelector('.search-input');
            
            const escEvent = new KeyboardEvent('keydown', { key: 'Escape' });
            input.dispatchEvent(escEvent);

            expect(searchBar.state.showSuggestions).toBe(false);
        });
    });

    describe('Search History', () => {
        beforeEach(() => {
            searchBar = new SearchBar(container, {
                workspaceId: 'workspace-1'
            });
        });

        test('should show history when input is focused and empty', () => {
            const input = container.querySelector('.search-input');
            
            input.dispatchEvent(new Event('focusin'));

            expect(searchBar.state.showHistory).toBe(true);
        });

        test('should add to history when performing search', () => {
            const input = container.querySelector('.search-input');
            
            input.value = 'new search';
            input.dispatchEvent(new Event('input'));

            // Perform search
            const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
            input.dispatchEvent(enterEvent);

            expect(searchBar.state.searchHistory[0].query).toBe('new search');
            expect(localStorage.setItem).toHaveBeenCalled();
        });

        test('should remove history item when remove button clicked', () => {
            // Add some history first
            searchBar.setState({
                searchHistory: [
                    { query: 'search 1', context: 'all', timestamp: '2024-01-15T10:00:00Z' },
                    { query: 'search 2', context: 'all', timestamp: '2024-01-15T11:00:00Z' }
                ]
            });
            searchBar.render();

            // Show history
            const input = container.querySelector('.search-input');
            input.dispatchEvent(new Event('focusin'));

            const removeBtn = container.querySelector('.history-remove');
            removeBtn.click();

            expect(searchBar.state.searchHistory).toHaveLength(1);
            expect(searchBar.state.searchHistory[0].query).toBe('search 2');
        });

        test('should clear all history', () => {
            // Add some history first
            searchBar.setState({
                searchHistory: [
                    { query: 'search 1', context: 'all', timestamp: '2024-01-15T10:00:00Z' }
                ]
            });
            searchBar.render();

            // Show history
            const input = container.querySelector('.search-input');
            input.dispatchEvent(new Event('focusin'));

            const clearBtn = container.querySelector('.search-history-clear');
            clearBtn.click();

            expect(searchBar.state.searchHistory).toHaveLength(0);
        });
    });

    describe('Context Selection', () => {
        beforeEach(() => {
            searchBar = new SearchBar(container, {
                workspaceId: 'workspace-1'
            });
        });

        test('should change search context', () => {
            const contextSelect = container.querySelector('.search-context-select');
            
            contextSelect.value = 'items';
            contextSelect.dispatchEvent(new Event('input'));

            expect(searchBar.state.searchContext).toBe('items');
        });

        test('should trigger new search when context changes', async () => {
            const input = container.querySelector('.search-input');
            const contextSelect = container.querySelector('.search-context-select');
            
            // Set query first
            input.value = 'test';
            input.dispatchEvent(new Event('input'));

            // Change context
            contextSelect.value = 'items';
            contextSelect.dispatchEvent(new Event('input'));

            // Should trigger search event
            // This would be tested by listening to the event bus
        });
    });

    describe('Public Methods', () => {
        beforeEach(() => {
            searchBar = new SearchBar(container, {
                workspaceId: 'workspace-1'
            });
        });

        test('should set query programmatically', () => {
            searchBar.setQuery('programmatic query');

            expect(searchBar.state.query).toBe('programmatic query');
            expect(container.querySelector('.search-input').value).toBe('programmatic query');
        });

        test('should get current query', () => {
            searchBar.setState({ query: 'current query' });

            expect(searchBar.getQuery()).toBe('current query');
        });

        test('should focus input', () => {
            const input = container.querySelector('.search-input');
            input.focus = jest.fn();

            searchBar.focus();

            expect(input.focus).toHaveBeenCalled();
        });

        test('should set and get context', () => {
            searchBar.setContext('comments');
            expect(searchBar.getContext()).toBe('comments');
        });
    });
});

describe('SearchResults', () => {
    let container;
    let searchResults;
    let mockResults;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);

        mockResults = [
            {
                id: 'result-1',
                type: 'item',
                title: 'Test Item 1',
                description: 'Description for test item 1',
                boardName: 'Test Board',
                author: { id: 'user-1', name: 'John Doe', avatar: null },
                updatedAt: '2024-01-15T10:00:00Z'
            },
            {
                id: 'result-2',
                type: 'comment',
                title: 'Test Comment',
                snippet: 'This is a test comment snippet',
                boardName: 'Test Board',
                author: { id: 'user-2', name: 'Jane Smith', avatar: 'avatar.jpg' },
                createdAt: '2024-01-15T11:00:00Z'
            }
        ];

        mockSearchService.search.mockResolvedValue({
            success: true,
            data: {
                results: mockResults,
                totalCount: 2,
                hasMore: false,
                facets: {
                    type: {
                        buckets: [
                            { key: 'item', count: 1 },
                            { key: 'comment', count: 1 }
                        ]
                    }
                }
            }
        });
    });

    afterEach(() => {
        if (searchResults) {
            searchResults.destroy();
        }
        document.body.removeChild(container);
        jest.clearAllMocks();
    });

    describe('Initialization', () => {
        test('should initialize with empty state', () => {
            searchResults = new SearchResults(container, {
                workspaceId: 'workspace-1'
            });

            expect(container.querySelector('.search-results')).toBeTruthy();
        });

        test('should render empty search state initially', () => {
            searchResults = new SearchResults(container, {
                workspaceId: 'workspace-1'
            });

            expect(container.querySelector('.search-empty')).toBeTruthy();
            expect(container.textContent).toContain('Start searching');
        });
    });

    describe('Search Results Display', () => {
        beforeEach(async () => {
            searchResults = new SearchResults(container, {
                workspaceId: 'workspace-1'
            });

            // Trigger search
            searchResults.handleSearchPerformed({
                query: 'test query',
                context: 'all',
                workspaceId: 'workspace-1',
                boardIds: [],
                filters: {}
            });

            await new Promise(resolve => setTimeout(resolve, 100));
        });

        test('should render search header with results count', () => {
            const header = container.querySelector('.search-header');
            expect(header).toBeTruthy();
            expect(header.textContent).toContain('Search results for "test query"');
            expect(header.textContent).toContain('2 results');
        });

        test('should render result items', () => {
            const resultItems = container.querySelectorAll('.search-result-item');
            expect(resultItems).toHaveLength(2);

            const firstItem = resultItems[0];
            expect(firstItem.textContent).toContain('Test Item 1');
            expect(firstItem.textContent).toContain('Description for test item 1');
            expect(firstItem.textContent).toContain('John Doe');
        });

        test('should show facets when enabled', () => {
            const facets = container.querySelector('.search-facets');
            expect(facets).toBeTruthy();

            const facetItems = container.querySelectorAll('.facet-item');
            expect(facetItems.length).toBeGreaterThan(0);
        });

        test('should render different result types correctly', () => {
            const resultItems = container.querySelectorAll('.search-result-item');
            
            // First item (item type)
            expect(resultItems[0].textContent).toContain('Item');
            
            // Second item (comment type)
            expect(resultItems[1].textContent).toContain('Comment');
            expect(resultItems[1].textContent).toContain('This is a test comment snippet');
        });
    });

    describe('Sorting and Filtering', () => {
        beforeEach(async () => {
            searchResults = new SearchResults(container, {
                workspaceId: 'workspace-1'
            });

            searchResults.handleSearchPerformed({
                query: 'test query',
                context: 'all',
                workspaceId: 'workspace-1',
                boardIds: [],
                filters: {}
            });

            await new Promise(resolve => setTimeout(resolve, 100));
        });

        test('should change sort order', async () => {
            const sortSelect = container.querySelector('[data-sort-by]');
            
            sortSelect.value = 'date';
            sortSelect.dispatchEvent(new Event('change'));

            expect(searchResults.state.sortBy).toBe('date');
        });

        test('should change sort direction', async () => {
            const orderSelect = container.querySelector('[data-sort-order]');
            
            orderSelect.value = 'asc';
            orderSelect.dispatchEvent(new Event('change'));

            expect(searchResults.state.sortOrder).toBe('asc');
        });

        test('should change grouping', () => {
            const groupSelect = container.querySelector('[data-group-by]');
            
            groupSelect.value = 'type';
            groupSelect.dispatchEvent(new Event('change'));

            expect(searchResults.state.groupBy).toBe('type');
            expect(container.querySelector('.search-results-grouped')).toBeTruthy();
        });

        test('should handle facet selection', () => {
            const facetCheckbox = container.querySelector('.facet-checkbox');
            
            facetCheckbox.checked = true;
            facetCheckbox.dispatchEvent(new Event('change'));

            const facet = facetCheckbox.dataset.facet;
            const value = facetCheckbox.dataset.value;
            
            expect(searchResults.state.filters[facet]).toContain(value);
        });
    });

    describe('Result Selection', () => {
        beforeEach(async () => {
            searchResults = new SearchResults(container, {
                workspaceId: 'workspace-1',
                allowSelection: true
            });

            searchResults.handleSearchPerformed({
                query: 'test query',
                context: 'all',
                workspaceId: 'workspace-1',
                boardIds: [],
                filters: {}
            });

            await new Promise(resolve => setTimeout(resolve, 100));
        });

        test('should select individual results', () => {
            const resultCheckbox = container.querySelector('.result-checkbox');
            
            resultCheckbox.checked = true;
            resultCheckbox.dispatchEvent(new Event('change'));

            const resultId = resultCheckbox.dataset.resultId;
            expect(searchResults.state.selectedResults).toContain(resultId);
        });

        test('should select all results', () => {
            const selectAllBtn = container.querySelector('[data-action="select-all"]');
            selectAllBtn.click();

            expect(searchResults.state.selectedResults).toHaveLength(2);
            
            const checkboxes = container.querySelectorAll('.result-checkbox');
            checkboxes.forEach(checkbox => {
                expect(checkbox.checked).toBe(true);
            });
        });

        test('should clear selection', () => {
            // Select all first
            searchResults.setState({ selectedResults: ['result-1', 'result-2'] });
            searchResults.render();

            const clearBtn = container.querySelector('[data-action="clear-selection"]');
            clearBtn.click();

            expect(searchResults.state.selectedResults).toHaveLength(0);
        });
    });

    describe('Pagination', () => {
        beforeEach(async () => {
            // Mock response with pagination
            mockSearchService.search.mockResolvedValue({
                success: true,
                data: {
                    results: mockResults,
                    totalCount: 50,
                    hasMore: true
                }
            });

            searchResults = new SearchResults(container, {
                workspaceId: 'workspace-1',
                pageSize: 2
            });

            searchResults.handleSearchPerformed({
                query: 'test query',
                context: 'all',
                workspaceId: 'workspace-1',
                boardIds: [],
                filters: {}
            });

            await new Promise(resolve => setTimeout(resolve, 100));
        });

        test('should show pagination controls', () => {
            const pagination = container.querySelector('.search-pagination');
            expect(pagination).toBeTruthy();

            const nextBtn = container.querySelector('[data-action="next-page"]');
            expect(nextBtn).toBeTruthy();
            expect(nextBtn.disabled).toBe(false);
        });

        test('should navigate to next page', async () => {
            const nextBtn = container.querySelector('[data-action="next-page"]');
            nextBtn.click();

            await new Promise(resolve => setTimeout(resolve, 100));

            expect(searchResults.state.currentPage).toBe(2);
        });

        test('should show load more button when hasMore is true', () => {
            const loadMoreBtn = container.querySelector('[data-action="load-more"]');
            expect(loadMoreBtn).toBeTruthy();
        });

        test('should load more results', async () => {
            const initialResultCount = searchResults.state.results.length;
            
            const loadMoreBtn = container.querySelector('[data-action="load-more"]');
            loadMoreBtn.click();

            await new Promise(resolve => setTimeout(resolve, 100));

            // Results should be appended (mocked to return same results)
            expect(searchResults.state.results.length).toBeGreaterThan(initialResultCount);
        });
    });

    describe('Result Preview', () => {
        beforeEach(async () => {
            searchResults = new SearchResults(container, {
                workspaceId: 'workspace-1',
                showPreviews: true
            });

            searchResults.handleSearchPerformed({
                query: 'test query',
                context: 'all',
                workspaceId: 'workspace-1',
                boardIds: [],
                filters: {}
            });

            await new Promise(resolve => setTimeout(resolve, 100));
        });

        test('should show preview button for results', () => {
            const previewBtn = container.querySelector('[data-action="preview-result"]');
            expect(previewBtn).toBeTruthy();
        });

        test('should open preview modal', () => {
            const previewBtn = container.querySelector('[data-action="preview-result"]');
            previewBtn.click();

            expect(searchResults.state.showPreview).toBe(true);
            expect(container.querySelector('.search-result-preview')).toBeTruthy();
        });

        test('should close preview modal', () => {
            // Open preview first
            searchResults.setState({ 
                showPreview: true, 
                previewResult: mockResults[0] 
            });
            searchResults.render();

            const closeBtn = container.querySelector('[data-action="close-preview"]');
            closeBtn.click();

            expect(searchResults.state.showPreview).toBe(false);
        });
    });

    describe('No Results', () => {
        beforeEach(async () => {
            mockSearchService.search.mockResolvedValue({
                success: true,
                data: {
                    results: [],
                    totalCount: 0,
                    hasMore: false
                }
            });

            searchResults = new SearchResults(container, {
                workspaceId: 'workspace-1'
            });

            searchResults.handleSearchPerformed({
                query: 'nonexistent query',
                context: 'all',
                workspaceId: 'workspace-1',
                boardIds: [],
                filters: {}
            });

            await new Promise(resolve => setTimeout(resolve, 100));
        });

        test('should show no results message', () => {
            expect(container.querySelector('.search-no-results')).toBeTruthy();
            expect(container.textContent).toContain('No results found');
            expect(container.textContent).toContain('nonexistent query');
        });

        test('should show search suggestions', () => {
            expect(container.textContent).toContain('Try:');
            expect(container.textContent).toContain('Checking your spelling');
        });
    });

    describe('Public Methods', () => {
        beforeEach(() => {
            searchResults = new SearchResults(container, {
                workspaceId: 'workspace-1',
                allowSelection: true
            });
        });

        test('should get selected results', () => {
            searchResults.setState({
                results: mockResults,
                selectedResults: ['result-1']
            });

            const selected = searchResults.getSelectedResults();
            expect(selected).toHaveLength(1);
            expect(selected[0].id).toBe('result-1');
        });

        test('should clear results', () => {
            searchResults.setState({
                results: mockResults,
                totalCount: 2,
                selectedResults: ['result-1']
            });

            searchResults.clearResults();

            expect(searchResults.state.results).toHaveLength(0);
            expect(searchResults.state.totalCount).toBe(0);
            expect(searchResults.state.selectedResults).toHaveLength(0);
        });

        test('should refresh results', async () => {
            searchResults.setState({ query: 'test' });

            await searchResults.refresh();

            expect(mockSearchService.search).toHaveBeenCalled();
        });
    });
});

describe('FilterModal', () => {
    let container;
    let filterModal;
    let mockFields;
    let mockSavedFilters;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);

        mockFields = [
            {
                id: 'title',
                name: 'Title',
                type: 'text'
            },
            {
                id: 'status',
                name: 'Status',
                type: 'select',
                options: [
                    { value: 'todo', label: 'To Do' },
                    { value: 'in_progress', label: 'In Progress' },
                    { value: 'done', label: 'Done' }
                ]
            },
            {
                id: 'due_date',
                name: 'Due Date',
                type: 'date'
            }
        ];

        mockSavedFilters = [
            {
                id: 'filter-1',
                name: 'My Tasks',
                description: 'Tasks assigned to me',
                query: {
                    logic: 'AND',
                    groups: [{
                        logic: 'AND',
                        conditions: [{
                            field: 'assignee',
                            operator: 'equals',
                            value: 'current_user'
                        }]
                    }]
                },
                isPublic: false,
                author: { name: 'John Doe' },
                createdAt: '2024-01-15T10:00:00Z',
                canEdit: true
            }
        ];

        mockFilterService.getAvailableFields.mockResolvedValue({
            success: true,
            data: mockFields
        });

        mockSavedFilterService.getSavedFilters.mockResolvedValue({
            success: true,
            data: mockSavedFilters
        });

        mockFilterService.previewFilter.mockResolvedValue({
            success: true,
            data: {
                results: [],
                totalCount: 0
            }
        });
    });

    afterEach(() => {
        if (filterModal) {
            filterModal.destroy();
        }
        document.body.removeChild(container);
        jest.clearAllMocks();
    });

    describe('Initialization', () => {
        test('should initialize with closed state', () => {
            filterModal = new FilterModal(container, {
                workspaceId: 'workspace-1'
            });

            expect(container.innerHTML).toBe('');
            expect(filterModal.state.isOpen).toBe(false);
        });

        test('should load available fields and saved filters', async () => {
            filterModal = new FilterModal(container, {
                workspaceId: 'workspace-1'
            });

            await new Promise(resolve => setTimeout(resolve, 100));

            expect(mockFilterService.getAvailableFields).toHaveBeenCalled();
            expect(mockSavedFilterService.getSavedFilters).toHaveBeenCalled();
        });
    });

    describe('Modal Display', () => {
        beforeEach(async () => {
            filterModal = new FilterModal(container, {
                workspaceId: 'workspace-1'
            });

            await new Promise(resolve => setTimeout(resolve, 100));
            filterModal.openModal();
        });

        test('should render modal when opened', () => {
            expect(container.querySelector('.filter-modal')).toBeTruthy();
            expect(container.querySelector('.filter-modal-header')).toBeTruthy();
            expect(container.querySelector('.filter-modal-tabs')).toBeTruthy();
        });

        test('should show tabs for conditions, saved filters, and advanced', () => {
            const tabs = container.querySelectorAll('.filter-tab');
            expect(tabs).toHaveLength(3);
            
            expect(tabs[0].textContent).toContain('Conditions');
            expect(tabs[1].textContent).toContain('Saved Filters');
            expect(tabs[2].textContent).toContain('Advanced');
        });

        test('should close modal when close button clicked', () => {
            const closeBtn = container.querySelector('[data-action="close-modal"]');
            closeBtn.click();

            expect(filterModal.state.isOpen).toBe(false);
            expect(container.innerHTML).toBe('');
        });

        test('should close modal when overlay clicked', () => {
            const overlay = container.querySelector('.filter-modal-overlay');
            overlay.click();

            expect(filterModal.state.isOpen).toBe(false);
        });
    });

    describe('Filter Conditions', () => {
        beforeEach(async () => {
            filterModal = new FilterModal(container, {
                workspaceId: 'workspace-1'
            });

            await new Promise(resolve => setTimeout(resolve, 100));
            filterModal.openModal();
        });

        test('should start with empty conditions', () => {
            expect(container.querySelector('.filter-empty-state')).toBeTruthy();
            expect(container.textContent).toContain('No conditions set');
        });

        test('should add new condition', () => {
            const addBtn = container.querySelector('[data-action="add-condition"]');
            addBtn.click();

            expect(filterModal.state.filterQuery.groups).toHaveLength(1);
            expect(filterModal.state.filterQuery.groups[0].conditions).toHaveLength(1);
            expect(container.querySelector('.filter-condition')).toBeTruthy();
        });

        test('should add condition group', () => {
            // Add first condition
            const addBtn = container.querySelector('[data-action="add-condition"]');
            addBtn.click();

            // Add group
            const addGroupBtn = container.querySelector('[data-action="add-group"]');
            addGroupBtn.click();

            expect(filterModal.state.filterQuery.groups).toHaveLength(2);
        });

        test('should change field in condition', () => {
            // Add condition first
            filterModal.addCondition();

            const fieldSelect = container.querySelector('.condition-field-select');
            fieldSelect.value = 'title';
            fieldSelect.dispatchEvent(new Event('change'));

            const condition = filterModal.state.filterQuery.groups[0].conditions[0];
            expect(condition.field).toBe('title');
        });

        test('should change operator in condition', () => {
            // Add condition first
            filterModal.addCondition();

            const operatorSelect = container.querySelector('.condition-operator-select');
            operatorSelect.value = 'contains';
            operatorSelect.dispatchEvent(new Event('change'));

            const condition = filterModal.state.filterQuery.groups[0].conditions[0];
            expect(condition.operator).toBe('contains');
        });

        test('should change value in condition', () => {
            // Add condition first
            filterModal.addCondition();

            const valueInput = container.querySelector('.condition-value-input');
            valueInput.value = 'test value';
            valueInput.dispatchEvent(new Event('input'));

            const condition = filterModal.state.filterQuery.groups[0].conditions[0];
            expect(condition.value).toBe('test value');
        });

        test('should remove condition', () => {
            // Add condition first
            filterModal.addCondition();
            
            const removeBtn = container.querySelector('.condition-remove');
            removeBtn.click();

            expect(filterModal.state.filterQuery.groups).toHaveLength(0);
        });

        test('should change query logic', () => {
            const orRadio = container.querySelector('input[name="queryLogic"][value="OR"]');
            orRadio.checked = true;
            orRadio.dispatchEvent(new Event('change'));

            expect(filterModal.state.filterQuery.logic).toBe('OR');
        });
    });

    describe('Saved Filters Tab', () => {
        beforeEach(async () => {
            filterModal = new FilterModal(container, {
                workspaceId: 'workspace-1'
            });

            await new Promise(resolve => setTimeout(resolve, 100));
            filterModal.openModal();

            // Switch to saved filters tab
            const savedTab = container.querySelector('[data-tab="saved"]');
            savedTab.click();
        });

        test('should show saved filters', () => {
            const savedFilterItems = container.querySelectorAll('.saved-filter-item');
            expect(savedFilterItems).toHaveLength(1);

            const firstFilter = savedFilterItems[0];
            expect(firstFilter.textContent).toContain('My Tasks');
            expect(firstFilter.textContent).toContain('Tasks assigned to me');
        });

        test('should apply saved filter', async () => {
            const applyBtn = container.querySelector('[data-action="apply-saved-filter"]');
            applyBtn.click();

            expect(filterModal.state.filterQuery).toEqual(mockSavedFilters[0].query);
        });

        test('should edit saved filter', () => {
            const editBtn = container.querySelector('[data-action="edit-saved-filter"]');
            editBtn.click();

            expect(filterModal.state.filterQuery).toEqual(mockSavedFilters[0].query);
            expect(filterModal.state.activeTab).toBe('conditions');
        });

        test('should delete saved filter', async () => {
            global.confirm = jest.fn(() => true);
            mockSavedFilterService.deleteSavedFilter.mockResolvedValue({ success: true });

            const deleteBtn = container.querySelector('[data-action="delete-saved-filter"]');
            deleteBtn.click();

            expect(global.confirm).toHaveBeenCalled();
            expect(mockSavedFilterService.deleteSavedFilter).toHaveBeenCalled();
        });
    });

    describe('Advanced Tab', () => {
        beforeEach(async () => {
            filterModal = new FilterModal(container, {
                workspaceId: 'workspace-1'
            });

            await new Promise(resolve => setTimeout(resolve, 100));
            filterModal.openModal();

            // Switch to advanced tab
            const advancedTab = container.querySelector('[data-tab="advanced"]');
            advancedTab.click();
        });

        test('should show JSON editor', () => {
            expect(container.querySelector('.filter-json-editor')).toBeTruthy();
        });

        test('should format JSON', () => {
            const textarea = container.querySelector('.filter-json-editor');
            textarea.value = '{"logic":"AND","groups":[]}';

            const formatBtn = container.querySelector('[data-action="format-json"]');
            formatBtn.click();

            const expectedFormatted = JSON.stringify({ logic: 'AND', groups: [] }, null, 2);
            expect(textarea.value).toBe(expectedFormatted);
        });

        test('should validate JSON', () => {
            global.alert = jest.fn();
            const textarea = container.querySelector('.filter-json-editor');
            textarea.value = '{"logic":"AND","groups":[]}';

            const validateBtn = container.querySelector('[data-action="validate-json"]');
            validateBtn.click();

            expect(global.alert).toHaveBeenCalledWith('JSON is valid!');
        });

        test('should reset JSON', () => {
            const resetBtn = container.querySelector('[data-action="reset-json"]');
            resetBtn.click();

            expect(filterModal.state.filterQuery).toEqual({ logic: 'AND', groups: [] });
        });
    });

    describe('Filter Application', () => {
        beforeEach(async () => {
            filterModal = new FilterModal(container, {
                workspaceId: 'workspace-1'
            });

            await new Promise(resolve => setTimeout(resolve, 100));
            filterModal.openModal();
        });

        test('should clear all filters', () => {
            // Add some conditions first
            filterModal.addCondition();

            const clearBtn = container.querySelector('[data-action="clear-filters"]');
            clearBtn.click();

            expect(filterModal.state.filterQuery.groups).toHaveLength(0);
            expect(filterModal.state.isDirty).toBe(false);
        });

        test('should preview filters', async () => {
            filterModal.addCondition();

            const previewBtn = container.querySelector('[data-action="preview-filters"]');
            previewBtn.click();

            await new Promise(resolve => setTimeout(resolve, 100));

            expect(mockFilterService.previewFilter).toHaveBeenCalled();
        });

        test('should apply filters', async () => {
            filterModal.addCondition();

            const applyBtn = container.querySelector('[data-action="apply-filters"]');
            applyBtn.click();

            expect(filterModal.state.isOpen).toBe(false);
        });
    });

    describe('Save Filter Dialog', () => {
        beforeEach(async () => {
            filterModal = new FilterModal(container, {
                workspaceId: 'workspace-1'
            });

            await new Promise(resolve => setTimeout(resolve, 100));
            filterModal.openModal();
            
            // Add a condition to make filter dirty
            filterModal.addCondition();
        });

        test('should open save dialog', () => {
            const saveBtn = container.querySelector('[data-action="save-filter"]');
            saveBtn.click();

            expect(filterModal.state.saveDialogOpen).toBe(true);
            expect(container.querySelector('.save-filter-dialog')).toBeTruthy();
        });

        test('should close save dialog', () => {
            filterModal.openSaveDialog();

            const closeBtn = container.querySelector('[data-action="close-save-dialog"]');
            closeBtn.click();

            expect(filterModal.state.saveDialogOpen).toBe(false);
        });

        test('should save filter', async () => {
            mockSavedFilterService.createSavedFilter.mockResolvedValue({ success: true });

            filterModal.openSaveDialog();

            // Fill in form
            const nameInput = container.querySelector('[data-save-name]');
            nameInput.value = 'New Filter';
            nameInput.dispatchEvent(new Event('input'));

            const descInput = container.querySelector('[data-save-description]');
            descInput.value = 'Filter description';
            descInput.dispatchEvent(new Event('input'));

            const confirmBtn = container.querySelector('[data-action="confirm-save-filter"]');
            confirmBtn.click();

            await new Promise(resolve => setTimeout(resolve, 100));

            expect(mockSavedFilterService.createSavedFilter).toHaveBeenCalledWith({
                name: 'New Filter',
                description: 'Filter description',
                query: filterModal.state.filterQuery,
                isPublic: false,
                workspaceId: 'workspace-1',
                context: 'items'
            });
        });
    });

    describe('Public Methods', () => {
        beforeEach(() => {
            filterModal = new FilterModal(container, {
                workspaceId: 'workspace-1'
            });
        });

        test('should open and close modal', () => {
            filterModal.openModal();
            expect(filterModal.state.isOpen).toBe(true);

            filterModal.closeModal();
            expect(filterModal.state.isOpen).toBe(false);
        });

        test('should set and get filters', () => {
            const testQuery = {
                logic: 'OR',
                groups: [{
                    logic: 'AND',
                    conditions: [{
                        field: 'title',
                        operator: 'contains',
                        value: 'test'
                    }]
                }]
            };

            filterModal.setFilters(testQuery);
            expect(filterModal.getFilters()).toEqual(testQuery);
        });
    });
});

// Integration tests
describe('Search and Filter Integration', () => {
    let container;
    let searchBar;
    let searchResults;
    let filterModal;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);

        // Create sub-containers
        container.innerHTML = `
            <div id="search-bar"></div>
            <div id="search-results"></div>
            <div id="filter-modal"></div>
        `;

        searchBar = new SearchBar(document.getElementById('search-bar'), {
            workspaceId: 'workspace-1'
        });

        searchResults = new SearchResults(document.getElementById('search-results'), {
            workspaceId: 'workspace-1'
        });

        filterModal = new FilterModal(document.getElementById('filter-modal'), {
            workspaceId: 'workspace-1'
        });
    });

    afterEach(() => {
        searchBar.destroy();
        searchResults.destroy();
        filterModal.destroy();
        document.body.removeChild(container);
        jest.clearAllMocks();
    });

    test('should integrate search bar with results', async () => {
        mockSearchService.search.mockResolvedValue({
            success: true,
            data: {
                results: [],
                totalCount: 0,
                hasMore: false
            }
        });

        // Perform search from search bar
        const input = document.querySelector('.search-input');
        input.value = 'integration test';
        input.dispatchEvent(new Event('input'));

        const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
        input.dispatchEvent(enterEvent);

        await new Promise(resolve => setTimeout(resolve, 100));

        // Should trigger search in results component
        expect(mockSearchService.search).toHaveBeenCalled();
    });

    test('should integrate filter modal with search', async () => {
        // Apply filters from modal
        filterModal.openModal();
        filterModal.addCondition();

        const applyBtn = document.querySelector('[data-action="apply-filters"]');
        applyBtn.click();

        await new Promise(resolve => setTimeout(resolve, 100));

        // Should affect search results
        expect(filterModal.state.isOpen).toBe(false);
    });
}); 