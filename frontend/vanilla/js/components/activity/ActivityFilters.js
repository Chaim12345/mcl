/**
 * ActivityFilters Component
 * Provides filtering controls for activities
 */

class ActivityFilters {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            onFilterChange: null,
            filters: {},
            availableFilters: {
                type: true,
                user: true,
                dateRange: true,
                search: true
            },
            ...options
        };
        
        this.filters = { ...this.options.filters };
        this.availableTypes = [];
        this.availableUsers = [];
        
        this.init();
    }

    async init() {
        await this.loadFilterData();
        this.setupDOM();
        this.setupEventListeners();
        this.setInitialValues();
    }

    async loadFilterData() {
        try {
            // Load activity types
            const typesData = await window.ActivityService.getActivityTypes();
            this.availableTypes = Object.entries(typesData).map(([key, value]) => ({
                value: key,
                label: value.label || key,
                icon: value.icon || '📌'
            }));

            // Load available users
            this.availableUsers = this.loadUsersFromContext();
        } catch (error) {
            console.error('Error loading filter data:', error);
        }
    }

    loadUsersFromContext() {
        const users = [];
        
        // Try to get users from workspace
        if (window.workspace?.members) {
            users.push(...window.workspace.members.map(member => ({
                value: member.id,
                label: member.name,
                avatar: member.avatar_url
            })));
        }
        
        return users;
    }

    setupDOM() {
        const filterSections = [];
        
        if (this.options.availableFilters.search) {
            filterSections.push(`
                <div class="filter-section">
                    <label class="filter-label">Search</label>
                    <div class="filter-control">
                        <input type="text" class="filter-input filter-search" placeholder="Search activities...">
                    </div>
                </div>
            `);
        }

        if (this.options.availableFilters.type && this.availableTypes.length > 0) {
            filterSections.push(`
                <div class="filter-section">
                    <label class="filter-label">Activity Type</label>
                    <div class="filter-control">
                        <select class="filter-select filter-type" multiple>
                            ${this.availableTypes.map(type => `
                                <option value="${type.value}">${type.label}</option>
                            `).join('')}
                        </select>
                    </div>
                </div>
            `);
        }

        if (this.options.availableFilters.user && this.availableUsers.length > 0) {
            filterSections.push(`
                <div class="filter-section">
                    <label class="filter-label">User</label>
                    <div class="filter-control">
                        <select class="filter-select filter-user" multiple>
                            ${this.availableUsers.map(user => `
                                <option value="${user.value}">${user.label}</option>
                            `).join('')}
                        </select>
                    </div>
                </div>
            `);
        }

        if (this.options.availableFilters.dateRange) {
            filterSections.push(`
                <div class="filter-section">
                    <label class="filter-label">Date Range</label>
                    <div class="filter-control date-range-controls">
                        <input type="date" class="filter-input filter-date-from" placeholder="From">
                        <input type="date" class="filter-input filter-date-to" placeholder="To">
                    </div>
                </div>
            `);
        }

        this.container.innerHTML = `
            <div class="activity-filters">
                <div class="filters-header">
                    <h4>Filters</h4>
                    <button class="btn btn-text clear-filters-btn">Clear All</button>
                </div>
                <div class="filters-content">
                    ${filterSections.join('')}
                </div>
                <div class="filters-footer">
                    <button class="btn btn-primary apply-filters-btn">Apply Filters</button>
                    <button class="btn btn-secondary reset-filters-btn">Reset</button>
                </div>
            </div>
        `;

        this.elements = {
            searchInput: this.container.querySelector('.filter-search'),
            typeSelect: this.container.querySelector('.filter-type'),
            userSelect: this.container.querySelector('.filter-user'),
            dateFromInput: this.container.querySelector('.filter-date-from'),
            dateToInput: this.container.querySelector('.filter-date-to'),
            clearBtn: this.container.querySelector('.clear-filters-btn'),
            applyBtn: this.container.querySelector('.apply-filters-btn'),
            resetBtn: this.container.querySelector('.reset-filters-btn')
        };
    }

    setupEventListeners() {
        // Search input
        if (this.elements.searchInput) {
            this.elements.searchInput.addEventListener('input', this.debounce(() => {
                this.filters.search = this.elements.searchInput.value;
                this.emitFilterChange();
            }, 300));
        }

        // Date range inputs
        if (this.elements.dateFromInput) {
            this.elements.dateFromInput.addEventListener('change', () => {
                this.filters.dateFrom = this.elements.dateFromInput.value;
                this.emitFilterChange();
            });
        }

        if (this.elements.dateToInput) {
            this.elements.dateToInput.addEventListener('change', () => {
                this.filters.dateTo = this.elements.dateToInput.value;
                this.emitFilterChange();
            });
        }

        // Buttons
        this.elements.clearBtn?.addEventListener('click', () => this.clearAllFilters());
        this.elements.applyBtn?.addEventListener('click', () => this.applyFilters());
        this.elements.resetBtn?.addEventListener('click', () => this.resetFilters());

        // Multi-select change events
        [this.elements.typeSelect, this.elements.userSelect].forEach(select => {
            if (select) {
                select.addEventListener('change', () => {
                    const key = select.classList.contains('filter-type') ? 'type' : 'user';
                    this.filters[key] = Array.from(select.selectedOptions).map(opt => opt.value);
                    this.emitFilterChange();
                });
            }
        });
    }

    setInitialValues() {
        if (this.elements.searchInput && this.filters.search) {
            this.elements.searchInput.value = this.filters.search;
        }

        if (this.elements.dateFromInput && this.filters.dateFrom) {
            this.elements.dateFromInput.value = this.filters.dateFrom;
        }

        if (this.elements.dateToInput && this.filters.dateTo) {
            this.elements.dateToInput.value = this.filters.dateTo;
        }
    }

    clearAllFilters() {
        this.filters = {};
        
        // Clear form elements
        if (this.elements.searchInput) this.elements.searchInput.value = '';
        if (this.elements.dateFromInput) this.elements.dateFromInput.value = '';
        if (this.elements.dateToInput) this.elements.dateToInput.value = '';
        if (this.elements.typeSelect) this.elements.typeSelect.selectedIndex = -1;
        if (this.elements.userSelect) this.elements.userSelect.selectedIndex = -1;
        
        this.emitFilterChange();
    }

    resetFilters() {
        // Reset to initial filter values
        this.filters = { ...this.options.filters };
        this.setInitialValues();
        this.emitFilterChange();
    }

    applyFilters() {
        // Apply current filter values
        this.emitFilterChange();
    }

    emitFilterChange() {
        if (this.options.onFilterChange) {
            this.options.onFilterChange(this.filters);
        }
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    getFilters() {
        return { ...this.filters };
    }

    setFilters(filters) {
        this.filters = { ...filters };
        this.setInitialValues();
    }
}

// Export the class
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ActivityFilters;
} else if (typeof window !== 'undefined') {
    window.ActivityFilters = ActivityFilters;
}