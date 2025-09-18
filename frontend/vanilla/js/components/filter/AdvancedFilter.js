/**
 * Advanced Filtering System for Monday.com Clone
 * Provides comprehensive filtering and sorting capabilities
 */

export class AdvancedFilter {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            onFilterChange: options.onFilterChange || (() => {}),
            onSortChange: options.onSortChange || (() => {}),
            availableColumns: options.availableColumns || [],
            ...options
        };
        
        this.filters = {
            search: '',
            status: [],
            priority: [],
            assignee: [],
            dateRange: { start: null, end: null },
            customFields: {}
        };
        
        this.sorting = {
            column: null,
            direction: 'asc'
        };
        
        this.isOpen = false;
        this.init();
    }
    
    init() {
        this.render();
        this.attachEventListeners();
    }
    
    render() {
        this.container.innerHTML = `
            <div class="advanced-filter-container">
                <div class="filter-header">
                    <div class="filter-search">
                        <input type="text" 
                               class="filter-search-input" 
                               placeholder="Search items..."
                               value="${this.filters.search}">
                        <button class="filter-search-clear" aria-label="Clear search">×</button>
                    </div>
                    <div class="filter-actions">
                        <button class="btn btn-outline btn-sm filter-toggle-btn" 
                                data-action="toggle-filters">
                            <span class="btn-icon">🔍</span>
                            Filters
                            ${this.getActiveFilterCount() > 0 ? `<span class="filter-count">${this.getActiveFilterCount()}</span>` : ''}
                        </button>
                        <button class="btn btn-outline btn-sm sort-toggle-btn" 
                                data-action="toggle-sort">
                            <span class="btn-icon">📊</span>
                            Sort
                        </button>
                        <button class="btn btn-outline btn-sm" 
                                data-action="clear-all"
                                ${this.getActiveFilterCount() === 0 ? 'disabled' : ''}>
                            Clear All
                        </button>
                    </div>
                </div>
                
                <div class="filter-panel ${this.isOpen ? 'open' : ''}">
                    <div class="filter-sections">
                        <div class="filter-section">
                            <h4>Status</h4>
                            <div class="filter-options">
                                ${this.renderStatusFilters()}
                            </div>
                        </div>
                        
                        <div class="filter-section">
                            <h4>Priority</h4>
                            <div class="filter-options">
                                ${this.renderPriorityFilters()}
                            </div>
                        </div>
                        
                        <div class="filter-section">
                            <h4>Assignee</h4>
                            <div class="filter-options">
                                ${this.renderAssigneeFilters()}
                            </div>
                        </div>
                        
                        <div class="filter-section">
                            <h4>Date Range</h4>
                            <div class="filter-options">
                                ${this.renderDateRangeFilters()}
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="sort-panel">
                    <div class="sort-options">
                        <select class="sort-column-select">
                            <option value="">Select column to sort by</option>
                            ${this.renderSortOptions()}
                        </select>
                        <select class="sort-direction-select">
                            <option value="asc" ${this.sorting.direction === 'asc' ? 'selected' : ''}>Ascending</option>
                            <option value="desc" ${this.sorting.direction === 'desc' ? 'selected' : ''}>Descending</option>
                        </select>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderStatusFilters() {
        const statuses = ['Not Started', 'Working on it', 'Stuck', 'Done'];
        return statuses.map(status => `
            <label class="filter-option">
                <input type="checkbox" 
                       value="${status}" 
                       ${this.filters.status.includes(status) ? 'checked' : ''}
                       data-filter="status">
                <span class="filter-option-label">${status}</span>
            </label>
        `).join('');
    }
    
    renderPriorityFilters() {
        const priorities = ['Low', 'Medium', 'High', 'Critical'];
        return priorities.map(priority => `
            <label class="filter-option">
                <input type="checkbox" 
                       value="${priority}" 
                       ${this.filters.priority.includes(priority) ? 'checked' : ''}
                       data-filter="priority">
                <span class="filter-option-label priority-${priority.toLowerCase()}">${priority}</span>
            </label>
        `).join('');
    }
    
    renderAssigneeFilters() {
        const assignees = [
            { id: 'user1', name: 'John Doe' },
            { id: 'user2', name: 'Jane Smith' },
            { id: 'user3', name: 'Mike Johnson' },
            { id: 'unassigned', name: 'Unassigned' }
        ];
        
        return assignees.map(assignee => `
            <label class="filter-option">
                <input type="checkbox" 
                       value="${assignee.id}" 
                       ${this.filters.assignee.includes(assignee.id) ? 'checked' : ''}
                       data-filter="assignee">
                <span class="filter-option-label">${assignee.name}</span>
            </label>
        `).join('');
    }
    
    renderDateRangeFilters() {
        return `
            <div class="date-range-inputs">
                <div class="date-input-group">
                    <label>From:</label>
                    <input type="date" 
                           class="date-from-input" 
                           value="${this.filters.dateRange.start || ''}"
                           data-filter="date-start">
                </div>
                <div class="date-input-group">
                    <label>To:</label>
                    <input type="date" 
                           class="date-to-input" 
                           value="${this.filters.dateRange.end || ''}"
                           data-filter="date-end">
                </div>
            </div>
        `;
    }
    
    renderSortOptions() {
        const sortableColumns = [
            { id: 'item', name: 'Item Name' },
            { id: 'status', name: 'Status' },
            { id: 'priority', name: 'Priority' },
            { id: 'date', name: 'Due Date' },
            { id: 'assignee', name: 'Assignee' }
        ];
        
        return sortableColumns.map(column => `
            <option value="${column.id}" ${this.sorting.column === column.id ? 'selected' : ''}>
                ${column.name}
            </option>
        `).join('');
    }
    
    attachEventListeners() {
        // Search input
        const searchInput = this.container.querySelector('.filter-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filters.search = e.target.value;
                this.applyFilters();
            });
        }
        
        // Clear search
        const clearBtn = this.container.querySelector('.filter-search-clear');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.filters.search = '';
                searchInput.value = '';
                this.applyFilters();
            });
        }
        
        // Filter toggles
        const filterToggle = this.container.querySelector('.filter-toggle-btn');
        if (filterToggle) {
            filterToggle.addEventListener('click', () => {
                this.toggleFilterPanel();
            });
        }
        
        // Checkbox filters
        const checkboxes = this.container.querySelectorAll('input[data-filter]');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                this.handleFilterChange(e.target);
            });
        });
        
        // Date range inputs
        const dateInputs = this.container.querySelectorAll('input[data-filter^="date"]');
        dateInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                this.handleDateRangeChange(e.target);
            });
        });
        
        // Sort options
        const sortColumn = this.container.querySelector('.sort-column-select');
        const sortDirection = this.container.querySelector('.sort-direction-select');
        
        if (sortColumn) {
            sortColumn.addEventListener('change', (e) => {
                this.sorting.column = e.target.value;
                this.applySorting();
            });
        }
        
        if (sortDirection) {
            sortDirection.addEventListener('change', (e) => {
                this.sorting.direction = e.target.value;
                this.applySorting();
            });
        }
        
        // Clear all
        const clearAllBtn = this.container.querySelector('[data-action="clear-all"]');
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', () => {
                this.clearAllFilters();
            });
        }
    }
    
    handleFilterChange(checkbox) {
        const filterType = checkbox.dataset.filter;
        const value = checkbox.value;
        
        if (checkbox.checked) {
            if (!this.filters[filterType].includes(value)) {
                this.filters[filterType].push(value);
            }
        } else {
            this.filters[filterType] = this.filters[filterType].filter(v => v !== value);
        }
        
        this.applyFilters();
    }
    
    handleDateRangeChange(input) {
        const filterType = input.dataset.filter;
        const value = input.value;
        
        if (filterType === 'date-start') {
            this.filters.dateRange.start = value;
        } else if (filterType === 'date-end') {
            this.filters.dateRange.end = value;
        }
        
        this.applyFilters();
    }
    
    toggleFilterPanel() {
        this.isOpen = !this.isOpen;
        const panel = this.container.querySelector('.filter-panel');
        if (panel) {
            panel.classList.toggle('open', this.isOpen);
        }
    }
    
    applyFilters() {
        this.render(); // Update UI
        this.options.onFilterChange(this.filters);
    }
    
    applySorting() {
        this.options.onSortChange(this.sorting);
    }
    
    clearAllFilters() {
        this.filters = {
            search: '',
            status: [],
            priority: [],
            assignee: [],
            dateRange: { start: null, end: null },
            customFields: {}
        };
        
        this.sorting = {
            column: null,
            direction: 'asc'
        };
        
        this.render();
        this.applyFilters();
        this.applySorting();
    }
    
    getActiveFilterCount() {
        let count = 0;
        if (this.filters.search) count++;
        if (this.filters.status.length > 0) count++;
        if (this.filters.priority.length > 0) count++;
        if (this.filters.assignee.length > 0) count++;
        if (this.filters.dateRange.start || this.filters.dateRange.end) count++;
        return count;
    }
    
    getFilters() {
        return this.filters;
    }
    
    getSorting() {
        return this.sorting;
    }
}
