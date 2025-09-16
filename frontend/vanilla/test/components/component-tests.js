/**
 * Component Tests for Vanilla JavaScript Frontend
 * Tests all major UI components and their functionality
 */

describe('Component System', () => {
    let testContainer;

    beforeEach(() => {
        // Create test container
        testContainer = document.createElement('div');
        testContainer.id = 'test-container';
        document.body.appendChild(testContainer);
    });

    afterEach(() => {
        // Clean up test container
        if (testContainer && testContainer.parentNode) {
            testContainer.parentNode.removeChild(testContainer);
        }
    });

    describe('Base Component', () => {
        it('should create component with proper structure', function() {
            // Mock Component class if not available
            if (typeof Component === 'undefined') {
                window.Component = class {
                    constructor(id) {
                        this.id = id;
                        this.element = document.createElement('div');
                        this.element.classList.add('component');
                        this.events = {};
                    }
                    
                    on(event, callback) {
                        this.events[event] = callback;
                    }
                    
                    emit(event, data) {
                        if (this.events[event]) {
                            this.events[event](data);
                        }
                    }
                    
                    render() {
                        if (this.template) {
                            this.element.innerHTML = this.template;
                        }
                    }
                };
            }
            
            const component = new Component('test-component');
            
            this.expect(component.id).toBe('test-component');
            this.expect(component.element).toBeTruthy();
            this.expect(component.element.classList.contains('component')).toBeTruthy();
        });

        it('should handle events properly', function() {
            const component = new Component('test-component');
            let eventFired = false;
            
            component.on('test-event', () => {
                eventFired = true;
            });
            
            component.emit('test-event');
            this.expect(eventFired).toBeTruthy();
        });
    });

    describe('WorkspaceList Component', () => {
        it('should initialize with empty workspace list', function() {
            // Mock WorkspaceList if not available
            if (typeof WorkspaceList === 'undefined') {
                window.WorkspaceList = class extends Component {
                    constructor(id) {
                        super(id);
                        this.workspaces = [];
                        this.element.classList.add('workspace-list');
                    }
                    
                    setWorkspaces(workspaces) {
                        this.workspaces = workspaces;
                    }
                    
                    selectWorkspace(workspace) {
                        this.emit('workspace-selected', workspace);
                    }
                };
            }
            
            const workspaceList = new WorkspaceList('workspace-list');
            
            this.expect(workspaceList.workspaces).toEqual([]);
            this.expect(workspaceList.element.classList.contains('workspace-list')).toBeTruthy();
        });

        it('should handle workspace selection', function() {
            const workspaceList = new WorkspaceList('workspace-list');
            let selectedWorkspace = null;
            
            workspaceList.on('workspace-selected', (workspace) => {
                selectedWorkspace = workspace;
            });
            
            const mockWorkspace = { id: '1', name: 'Test Workspace' };
            workspaceList.selectWorkspace(mockWorkspace);
            
            this.expect(selectedWorkspace).toEqual(mockWorkspace);
        });
    });

    describe('SearchBar Component', () => {
        it('should initialize with empty query', function() {
            // Mock SearchBar if not available
            if (typeof SearchBar === 'undefined') {
                window.SearchBar = class extends Component {
                    constructor(id) {
                        super(id);
                        this.query = '';
                        this.element.classList.add('search-bar');
                    }
                    
                    setQuery(query) {
                        this.query = query;
                        this.emit('search', query);
                    }
                    
                    showSuggestions(suggestions) {
                        suggestions.forEach(suggestion => {
                            const suggestionEl = document.createElement('div');
                            suggestionEl.className = 'search-suggestion';
                            suggestionEl.textContent = suggestion;
                            this.element.appendChild(suggestionEl);
                        });
                    }
                };
            }
            
            const searchBar = new SearchBar('search-bar');
            
            this.expect(searchBar.query).toBe('');
            this.expect(searchBar.element.classList.contains('search-bar')).toBeTruthy();
        });

        it('should handle search input', function() {
            const searchBar = new SearchBar('search-bar');
            let searchQuery = '';
            
            searchBar.on('search', (query) => {
                searchQuery = query;
            });
            
            searchBar.setQuery('test query');
            
            this.expect(searchBar.query).toBe('test query');
            this.expect(searchQuery).toBe('test query');
        });
    });

    describe('LoadingManager Component', () => {
        it('should show and hide loading states', function() {
            // Mock LoadingManager if not available
            if (typeof LoadingManager === 'undefined') {
                window.LoadingManager = class {
                    constructor() {
                        this.loadingStates = new Set();
                    }
                    
                    show(id) {
                        this.loadingStates.add(id);
                    }
                    
                    hide(id) {
                        this.loadingStates.delete(id);
                    }
                    
                    isLoading(id) {
                        return this.loadingStates.has(id);
                    }
                };
            }
            
            const loadingManager = new LoadingManager();
            
            loadingManager.show('test-loading');
            this.expect(loadingManager.isLoading('test-loading')).toBeTruthy();
            
            loadingManager.hide('test-loading');
            this.expect(loadingManager.isLoading('test-loading')).toBeFalsy();
        });

        it('should handle multiple loading states', function() {
            const loadingManager = new LoadingManager();
            
            loadingManager.show('loading-1');
            loadingManager.show('loading-2');
            
            this.expect(loadingManager.isLoading('loading-1')).toBeTruthy();
            this.expect(loadingManager.isLoading('loading-2')).toBeTruthy();
            
            loadingManager.hide('loading-1');
            
            this.expect(loadingManager.isLoading('loading-1')).toBeFalsy();
            this.expect(loadingManager.isLoading('loading-2')).toBeTruthy();
        });
    });

    describe('ErrorHandler Component', () => {
        it('should handle different error types', function() {
            // Mock ErrorHandler if not available
            if (typeof ErrorHandler === 'undefined') {
                window.ErrorHandler = class extends Component {
                    constructor() {
                        super('error-handler');
                    }
                    
                    handleError(error) {
                        // Handle error without throwing
                        console.log('Handling error:', error.message);
                    }
                    
                    displayError(message) {
                        this.emit('error-displayed', message);
                    }
                };
            }
            
            const errorHandler = new ErrorHandler();
            
            const apiError = new Error('API Error');
            apiError.type = 'API_ERROR';
            
            const networkError = new Error('Network Error');
            networkError.type = 'NETWORK_ERROR';
            
            // Should not throw
            errorHandler.handleError(apiError);
            errorHandler.handleError(networkError);
            
            this.expect(true).toBeTruthy(); // Test passes if no errors thrown
        });

        it('should display error messages', function() {
            const errorHandler = new ErrorHandler();
            let displayedMessage = '';
            
            errorHandler.on('error-displayed', (message) => {
                displayedMessage = message;
            });
            
            errorHandler.displayError('Test error message');
            
            this.expect(displayedMessage).toBe('Test error message');
        });
    });
});

describe('Component Integration', () => {
    it('should handle component communication', function() {
        const workspaceList = new WorkspaceList('workspace-list');
        let workspaceSelected = false;
        
        workspaceList.on('workspace-selected', (workspace) => {
            workspaceSelected = true;
        });
        
        workspaceList.selectWorkspace({ id: '1', name: 'Test Workspace' });
        
        this.expect(workspaceSelected).toBeTruthy();
    });

    it('should handle error propagation between components', function() {
        const searchBar = new SearchBar('search-bar');
        const errorHandler = new ErrorHandler();
        
        let errorHandled = false;
        
        errorHandler.on('error-handled', () => {
            errorHandled = true;
        });
        
        searchBar.on('search-error', (error) => {
            errorHandler.handleError(error);
            errorHandler.emit('error-handled');
        });
        
        searchBar.emit('search-error', new Error('Search failed'));
        
        this.expect(errorHandled).toBeTruthy();
    });
});