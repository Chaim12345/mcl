/**
 * Filter Modal Component
 * Advanced filtering interface with condition builders and saved filters
 */

import { Component } from '../base/Component.js';
import { filterService } from '../../services/filter.js';
import { savedFilterService } from '../../services/saved-filter.js';
import { eventBus } from '../../utils/events.js';

export class FilterModal extends Component {
    constructor(container, options = {}) {
        super(container, options);
        
        this.state = {
            isOpen: false,
            activeTab: 'conditions', // conditions, saved, advanced
            filterQuery: {
                logic: 'AND',
                groups: []
            },
            currentGroup: {
                logic: 'AND',
                conditions: []
            },
            availableFields: [],
            savedFilters: [],
            isApplying: false,
            isSaving: false,
            errors: {},
            previewResults: null,
            previewCount: 0,
            isDirty: false,
            saveDialogOpen: false,
            saveFilterName: '',
            saveFilterDescription: '',
            makeFilterPublic: false
        };
        
        this.workspaceId = options.workspaceId;
        this.boardIds = options.boardIds || [];
        this.context = options.context || 'items';
        this.allowSavedFilters = options.allowSavedFilters !== false;
        this.allowAdvanced = options.allowAdvanced !== false;
        this.showPreview = options.showPreview !== false;
        this.maxConditions = options.maxConditions || 20;
        
        this.operators = {
            text: [
                { value: 'equals', label: 'equals', symbol: '=' },
                { value: 'not_equals', label: 'does not equal', symbol: '≠' },
                { value: 'contains', label: 'contains', symbol: '∋' },
                { value: 'not_contains', label: 'does not contain', symbol: '∌' },
                { value: 'starts_with', label: 'starts with', symbol: '⌐' },
                { value: 'ends_with', label: 'ends with', symbol: '¬' },
                { value: 'is_empty', label: 'is empty', symbol: '∅' },
                { value: 'is_not_empty', label: 'is not empty', symbol: '∄' }
            ],
            number: [
                { value: 'equals', label: 'equals', symbol: '=' },
                { value: 'not_equals', label: 'does not equal', symbol: '≠' },
                { value: 'greater_than', label: 'greater than', symbol: '>' },
                { value: 'greater_than_equal', label: 'greater than or equal', symbol: '≥' },
                { value: 'less_than', label: 'less than', symbol: '<' },
                { value: 'less_than_equal', label: 'less than or equal', symbol: '≤' },
                { value: 'between', label: 'between', symbol: '⟷' },
                { value: 'is_empty', label: 'is empty', symbol: '∅' },
                { value: 'is_not_empty', label: 'is not empty', symbol: '∄' }
            ],
            date: [
                { value: 'equals', label: 'is', symbol: '=' },
                { value: 'not_equals', label: 'is not', symbol: '≠' },
                { value: 'before', label: 'before', symbol: '<' },
                { value: 'after', label: 'after', symbol: '>' },
                { value: 'between', label: 'between', symbol: '⟷' },
                { value: 'in_last', label: 'in the last', symbol: '⟵' },
                { value: 'in_next', label: 'in the next', symbol: '⟶' },
                { value: 'is_empty', label: 'is empty', symbol: '∅' },
                { value: 'is_not_empty', label: 'is not empty', symbol: '∄' }
            ],
            select: [
                { value: 'equals', label: 'is', symbol: '=' },
                { value: 'not_equals', label: 'is not', symbol: '≠' },
                { value: 'in', label: 'is any of', symbol: '∈' },
                { value: 'not_in', label: 'is none of', symbol: '∉' },
                { value: 'is_empty', label: 'is empty', symbol: '∅' },
                { value: 'is_not_empty', label: 'is not empty', symbol: '∄' }
            ],
            boolean: [
                { value: 'equals', label: 'is', symbol: '=' },
                { value: 'not_equals', label: 'is not', symbol: '≠' }
            ],
            people: [
                { value: 'includes', label: 'includes', symbol: '∋' },
                { value: 'not_includes', label: 'does not include', symbol: '∌' },
                { value: 'includes_any', label: 'includes any of', symbol: '∈' },
                { value: 'includes_all', label: 'includes all of', symbol: '⊇' },
                { value: 'is_empty', label: 'is empty', symbol: '∅' },
                { value: 'is_not_empty', label: 'is not empty', symbol: '∄' }
            ]
        };
        
        this.init();
    }
    
    init() {
        this.loadAvailableFields();
        this.loadSavedFilters();
        this.render();
        this.bindEvents();
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        eventBus.on('search:toggle-filters', this.handleToggleFilters.bind(this));
        eventBus.on('filter:apply-saved', this.handleApplySavedFilter.bind(this));
        eventBus.on('workspace:changed', this.handleWorkspaceChanged.bind(this));
    }
    
    async loadAvailableFields() {
        try {
            const response = await filterService.getAvailableFields({
                workspaceId: this.workspaceId,
                boardIds: this.boardIds,
                context: this.context
            });
            
            if (response.success) {
                this.setState({ availableFields: response.data });
            }
        } catch (error) {
            console.error('Error loading available fields:', error);
        }
    }
    
    async loadSavedFilters() {
        if (!this.allowSavedFilters) return;
        
        try {
            const response = await savedFilterService.getSavedFilters({
                workspaceId: this.workspaceId,
                context: this.context
            });
            
            if (response.success) {
                this.setState({ savedFilters: response.data });
            }
        } catch (error) {
            console.error('Error loading saved filters:', error);
        }
    }
    
    render() {
        const { isOpen } = this.state;
        
        if (!isOpen) {
            this.container.innerHTML = '';
            return;
        }
        
        this.container.innerHTML = `
            <div class="filter-modal">
                <div class="filter-modal-overlay" data-action="close-modal"></div>
                <div class="filter-modal-content">
                    ${this.renderHeader()}
                    ${this.renderTabs()}
                    ${this.renderTabContent()}
                    ${this.renderFooter()}
                </div>
            </div>
        `;
        
        this.bindModalEvents();
        this.setupKeyboardNavigation();
    }
    
    renderHeader() {
        const { previewCount, isDirty } = this.state;
        
        return `
            <div class="filter-modal-header">
                <div class="filter-modal-title">
                    <h2>Advanced Filters</h2>
                    ${this.showPreview && previewCount !== null ? `
                        <span class="filter-preview-count">
                            ${previewCount.toLocaleString()} result${previewCount !== 1 ? 's' : ''}
                        </span>
                    ` : ''}
                </div>
                
                <div class="filter-modal-actions">
                    ${isDirty ? `
                        <span class="filter-unsaved-indicator" title="You have unsaved changes">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="8" x2="12" y2="12"></line>
                                <line x1="12" y1="16" x2="12.01" y2="16"></line>
                            </svg>
                        </span>
                    ` : ''}
                    
                    <button type="button" class="filter-modal-close" data-action="close-modal">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }
    
    renderTabs() {
        const { activeTab } = this.state;
        
        return `
            <div class="filter-modal-tabs">
                <button type="button" 
                        class="filter-tab ${activeTab === 'conditions' ? 'filter-tab--active' : ''}" 
                        data-action="switch-tab" 
                        data-tab="conditions">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46"></polygon>
                    </svg>
                    Conditions
                </button>
                
                ${this.allowSavedFilters ? `
                    <button type="button" 
                            class="filter-tab ${activeTab === 'saved' ? 'filter-tab--active' : ''}" 
                            data-action="switch-tab" 
                            data-tab="saved">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"></polygon>
                        </svg>
                        Saved Filters
                    </button>
                ` : ''}
                
                ${this.allowAdvanced ? `
                    <button type="button" 
                            class="filter-tab ${activeTab === 'advanced' ? 'filter-tab--active' : ''}" 
                            data-action="switch-tab" 
                            data-tab="advanced">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <polyline points="16,18 22,12 16,6"></polyline>
                            <polyline points="8,6 2,12 8,18"></polyline>
                        </svg>
                        Advanced
                    </button>
                ` : ''}
            </div>
        `;
    }
    
    renderTabContent() {
        const { activeTab } = this.state;
        
        switch (activeTab) {
            case 'conditions':
                return this.renderConditionsTab();
            case 'saved':
                return this.renderSavedFiltersTab();
            case 'advanced':
                return this.renderAdvancedTab();
            default:
                return '';
        }
    }
    
    renderConditionsTab() {
        const { filterQuery, errors } = this.state;
        
        return `
            <div class="filter-tab-content">
                <div class="filter-conditions">
                    <div class="filter-logic-selector">
                        <label class="filter-logic-label">Match:</label>
                        <div class="filter-logic-options">
                            <label class="filter-logic-option">
                                <input type="radio" name="queryLogic" value="AND" ${filterQuery.logic === 'AND' ? 'checked' : ''} />
                                <span class="logic-label">All conditions</span>
                            </label>
                            <label class="filter-logic-option">
                                <input type="radio" name="queryLogic" value="OR" ${filterQuery.logic === 'OR' ? 'checked' : ''} />
                                <span class="logic-label">Any condition</span>
                            </label>
                        </div>
                    </div>
                    
                    <div class="filter-groups">
                        ${filterQuery.groups.map((group, groupIndex) => this.renderConditionGroup(group, groupIndex)).join('')}
                        
                        ${filterQuery.groups.length === 0 ? `
                            <div class="filter-empty-state">
                                <div class="empty-filter-icon">
                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46"></polygon>
                                    </svg>
                                </div>
                                <h4 class="empty-filter-title">No conditions set</h4>
                                <p class="empty-filter-description">
                                    Add conditions to filter your results
                                </p>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="filter-add-actions">
                        <button type="button" class="btn btn--outline" data-action="add-condition">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            Add Condition
                        </button>
                        
                        ${filterQuery.groups.length > 0 ? `
                            <button type="button" class="btn btn--outline" data-action="add-group">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                    <line x1="12" y1="8" x2="12" y2="16"></line>
                                    <line x1="8" y1="12" x2="16" y2="12"></line>
                                </svg>
                                Add Group
                            </button>
                        ` : ''}
                    </div>
                </div>
                
                ${errors.conditions ? `
                    <div class="filter-error">
                        <svg class="error-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="15" y1="9" x2="9" y2="15"></line>
                            <line x1="9" y1="9" x2="15" y2="15"></line>
                        </svg>
                        <span>${errors.conditions}</span>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    renderConditionGroup(group, groupIndex) {
        const isFirstGroup = groupIndex === 0;
        const { filterQuery } = this.state;
        
        return `
            <div class="filter-condition-group" data-group-index="${groupIndex}">
                ${!isFirstGroup ? `
                    <div class="filter-group-connector">
                        <span class="group-logic">${filterQuery.logic}</span>
                    </div>
                ` : ''}
                
                <div class="filter-group-content">
                    <div class="filter-group-header">
                        <div class="filter-group-logic">
                            <select class="filter-group-logic-select" data-action="change-group-logic" data-group-index="${groupIndex}">
                                <option value="AND" ${group.logic === 'AND' ? 'selected' : ''}>All of</option>
                                <option value="OR" ${group.logic === 'OR' ? 'selected' : ''}>Any of</option>
                            </select>
                        </div>
                        
                        <div class="filter-group-actions">
                            <button type="button" class="filter-group-remove" data-action="remove-group" data-group-index="${groupIndex}">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                    </div>
                    
                    <div class="filter-group-conditions">
                        ${group.conditions.map((condition, conditionIndex) => 
                            this.renderCondition(condition, groupIndex, conditionIndex)
                        ).join('')}
                    </div>
                    
                    <div class="filter-group-add">
                        <button type="button" class="btn btn--ghost btn--sm" data-action="add-condition-to-group" data-group-index="${groupIndex}">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            Add condition
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderCondition(condition, groupIndex, conditionIndex) {
        const { availableFields } = this.state;
        const field = availableFields.find(f => f.id === condition.field);
        const operators = this.operators[field?.type] || this.operators.text;
        
        return `
            <div class="filter-condition" data-group-index="${groupIndex}" data-condition-index="${conditionIndex}">
                <div class="condition-field">
                    <select class="condition-field-select" data-action="change-field" data-group-index="${groupIndex}" data-condition-index="${conditionIndex}">
                        <option value="">Select field...</option>
                        ${availableFields.map(field => `
                            <option value="${field.id}" ${condition.field === field.id ? 'selected' : ''}>
                                ${this.escapeHtml(field.name)}
                            </option>
                        `).join('')}
                    </select>
                </div>
                
                <div class="condition-operator">
                    <select class="condition-operator-select" data-action="change-operator" data-group-index="${groupIndex}" data-condition-index="${conditionIndex}">
                        ${operators.map(op => `
                            <option value="${op.value}" ${condition.operator === op.value ? 'selected' : ''}>
                                ${op.label}
                            </option>
                        `).join('')}
                    </select>
                </div>
                
                <div class="condition-value">
                    ${this.renderConditionValue(condition, field, groupIndex, conditionIndex)}
                </div>
                
                <div class="condition-actions">
                    <button type="button" class="condition-remove" data-action="remove-condition" data-group-index="${groupIndex}" data-condition-index="${conditionIndex}">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }
    
    renderConditionValue(condition, field, groupIndex, conditionIndex) {
        if (!field || ['is_empty', 'is_not_empty'].includes(condition.operator)) {
            return '<span class="condition-no-value">—</span>';
        }
        
        const dataAttrs = `data-action="change-value" data-group-index="${groupIndex}" data-condition-index="${conditionIndex}"`;
        
        switch (field.type) {
            case 'text':
                return `
                    <input type="text" 
                           class="condition-value-input" 
                           value="${this.escapeHtml(condition.value || '')}" 
                           placeholder="Enter text..." 
                           ${dataAttrs} />
                `;
                
            case 'number':
                if (condition.operator === 'between') {
                    const values = Array.isArray(condition.value) ? condition.value : ['', ''];
                    return `
                        <div class="condition-value-range">
                            <input type="number" 
                                   class="condition-value-input condition-value-from" 
                                   value="${values[0] || ''}" 
                                   placeholder="From..." 
                                   ${dataAttrs} />
                            <span class="range-separator">to</span>
                            <input type="number" 
                                   class="condition-value-input condition-value-to" 
                                   value="${values[1] || ''}" 
                                   placeholder="To..." 
                                   ${dataAttrs} />
                        </div>
                    `;
                } else {
                    return `
                        <input type="number" 
                               class="condition-value-input" 
                               value="${condition.value || ''}" 
                               placeholder="Enter number..." 
                               ${dataAttrs} />
                    `;
                }
                
            case 'date':
                if (condition.operator === 'between') {
                    const values = Array.isArray(condition.value) ? condition.value : ['', ''];
                    return `
                        <div class="condition-value-range">
                            <input type="date" 
                                   class="condition-value-input condition-value-from" 
                                   value="${values[0] || ''}" 
                                   ${dataAttrs} />
                            <span class="range-separator">to</span>
                            <input type="date" 
                                   class="condition-value-input condition-value-to" 
                                   value="${values[1] || ''}" 
                                   ${dataAttrs} />
                        </div>
                    `;
                } else if (['in_last', 'in_next'].includes(condition.operator)) {
                    const parts = (condition.value || '').split(' ');
                    return `
                        <div class="condition-value-relative">
                            <input type="number" 
                                   class="condition-value-input condition-value-amount" 
                                   value="${parts[0] || ''}" 
                                   placeholder="0" 
                                   min="0"
                                   ${dataAttrs} />
                            <select class="condition-value-select condition-value-unit" ${dataAttrs}>
                                <option value="days" ${parts[1] === 'days' ? 'selected' : ''}>days</option>
                                <option value="weeks" ${parts[1] === 'weeks' ? 'selected' : ''}>weeks</option>
                                <option value="months" ${parts[1] === 'months' ? 'selected' : ''}>months</option>
                                <option value="years" ${parts[1] === 'years' ? 'selected' : ''}>years</option>
                            </select>
                        </div>
                    `;
                } else {
                    return `
                        <input type="date" 
                               class="condition-value-input" 
                               value="${condition.value || ''}" 
                               ${dataAttrs} />
                    `;
                }
                
            case 'select':
                if (['in', 'not_in'].includes(condition.operator)) {
                    return `
                        <select multiple 
                                class="condition-value-select condition-value-multi" 
                                ${dataAttrs}>
                            ${(field.options || []).map(option => `
                                <option value="${option.value}" 
                                        ${(condition.value || []).includes(option.value) ? 'selected' : ''}>
                                    ${this.escapeHtml(option.label)}
                                </option>
                            `).join('')}
                        </select>
                    `;
                } else {
                    return `
                        <select class="condition-value-select" ${dataAttrs}>
                            <option value="">Select value...</option>
                            ${(field.options || []).map(option => `
                                <option value="${option.value}" ${condition.value === option.value ? 'selected' : ''}>
                                    ${this.escapeHtml(option.label)}
                                </option>
                            `).join('')}
                        </select>
                    `;
                }
                
            case 'boolean':
                return `
                    <select class="condition-value-select" ${dataAttrs}>
                        <option value="true" ${condition.value === 'true' ? 'selected' : ''}>True</option>
                        <option value="false" ${condition.value === 'false' ? 'selected' : ''}>False</option>
                    </select>
                `;
                
            case 'people':
                return `
                    <div class="condition-value-people">
                        <input type="text" 
                               class="condition-value-input condition-people-search" 
                               placeholder="Search people..." 
                               ${dataAttrs} />
                        <div class="condition-people-selected">
                            ${(condition.value || []).map(person => `
                                <span class="selected-person" data-person-id="${person.id}">
                                    ${this.escapeHtml(person.name)}
                                    <button type="button" class="person-remove" data-action="remove-person" data-person-id="${person.id}">×</button>
                                </span>
                            `).join('')}
                        </div>
                    </div>
                `;
                
            default:
                return `
                    <input type="text" 
                           class="condition-value-input" 
                           value="${this.escapeHtml(condition.value || '')}" 
                           placeholder="Enter value..." 
                           ${dataAttrs} />
                `;
        }
    }
    
    renderSavedFiltersTab() {
        const { savedFilters, errors } = this.state;
        
        return `
            <div class="filter-tab-content">
                <div class="saved-filters">
                    ${savedFilters.length > 0 ? `
                        <div class="saved-filters-list">
                            ${savedFilters.map(filter => this.renderSavedFilter(filter)).join('')}
                        </div>
                    ` : `
                        <div class="saved-filters-empty">
                            <div class="empty-saved-icon">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"></polygon>
                                </svg>
                            </div>
                            <h4 class="empty-saved-title">No saved filters</h4>
                            <p class="empty-saved-description">
                                Create filters and save them for quick access
                            </p>
                        </div>
                    `}
                </div>
                
                ${errors.savedFilters ? `
                    <div class="filter-error">
                        <svg class="error-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="15" y1="9" x2="9" y2="15"></line>
                            <line x1="9" y1="9" x2="15" y2="15"></line>
                        </svg>
                        <span>${errors.savedFilters}</span>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    renderSavedFilter(filter) {
        return `
            <div class="saved-filter-item" data-filter-id="${filter.id}">
                <div class="saved-filter-content">
                    <div class="saved-filter-header">
                        <h4 class="saved-filter-name">${this.escapeHtml(filter.name)}</h4>
                        <div class="saved-filter-meta">
                            ${filter.isPublic ? `
                                <span class="saved-filter-public" title="Public filter">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <path d="M2 12h20"></path>
                                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                                    </svg>
                                </span>
                            ` : ''}
                            <span class="saved-filter-author">by ${this.escapeHtml(filter.author?.name || 'Unknown')}</span>
                            <span class="saved-filter-date">${this.formatDate(filter.createdAt)}</span>
                        </div>
                    </div>
                    
                    ${filter.description ? `
                        <p class="saved-filter-description">${this.escapeHtml(filter.description)}</p>
                    ` : ''}
                    
                    <div class="saved-filter-preview">
                        ${this.renderFilterSummary(filter.query)}
                    </div>
                </div>
                
                <div class="saved-filter-actions">
                    <button type="button" class="btn btn--ghost btn--sm" data-action="apply-saved-filter" data-filter-id="${filter.id}">
                        Apply
                    </button>
                    
                    ${filter.canEdit ? `
                        <button type="button" class="btn btn--ghost btn--sm" data-action="edit-saved-filter" data-filter-id="${filter.id}">
                            Edit
                        </button>
                        <button type="button" class="btn btn--ghost btn--sm btn--danger" data-action="delete-saved-filter" data-filter-id="${filter.id}">
                            Delete
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    renderAdvancedTab() {
        const { filterQuery } = this.state;
        
        return `
            <div class="filter-tab-content">
                <div class="filter-advanced">
                    <div class="filter-advanced-header">
                        <h4>JSON Query Editor</h4>
                        <p class="filter-advanced-description">
                            Advanced users can directly edit the filter query in JSON format.
                        </p>
                    </div>
                    
                    <div class="filter-advanced-editor">
                        <textarea class="filter-json-editor" 
                                  data-action="change-json" 
                                  rows="15"
                                  placeholder="Enter filter query as JSON...">${JSON.stringify(filterQuery, null, 2)}</textarea>
                    </div>
                    
                    <div class="filter-advanced-actions">
                        <button type="button" class="btn btn--outline btn--sm" data-action="format-json">
                            Format JSON
                        </button>
                        <button type="button" class="btn btn--outline btn--sm" data-action="validate-json">
                            Validate
                        </button>
                        <button type="button" class="btn btn--outline btn--sm" data-action="reset-json">
                            Reset
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderFooter() {
        const { isApplying, isSaving, isDirty, saveDialogOpen } = this.state;
        
        return `
            <div class="filter-modal-footer">
                <div class="filter-footer-actions">
                    <button type="button" class="btn btn--outline" data-action="clear-filters">
                        Clear All
                    </button>
                    
                    ${this.showPreview ? `
                        <button type="button" class="btn btn--outline" data-action="preview-filters">
                            Preview Results
                        </button>
                    ` : ''}
                    
                    ${this.allowSavedFilters ? `
                        <button type="button" 
                                class="btn btn--outline" 
                                data-action="save-filter"
                                ${!isDirty ? 'disabled' : ''}>
                            Save Filter
                        </button>
                    ` : ''}
                </div>
                
                <div class="filter-primary-actions">
                    <button type="button" class="btn btn--outline" data-action="close-modal">
                        Cancel
                    </button>
                    
                    <button type="button" 
                            class="btn btn--primary" 
                            data-action="apply-filters"
                            ${isApplying ? 'disabled' : ''}>
                        ${isApplying ? 'Applying...' : 'Apply Filters'}
                    </button>
                </div>
            </div>
            
            ${saveDialogOpen ? this.renderSaveDialog() : ''}
        `;
    }
    
    renderSaveDialog() {
        const { saveFilterName, saveFilterDescription, makeFilterPublic, isSaving } = this.state;
        
        return `
            <div class="save-filter-dialog">
                <div class="save-dialog-overlay" data-action="close-save-dialog"></div>
                <div class="save-dialog-content">
                    <div class="save-dialog-header">
                        <h3>Save Filter</h3>
                        <button type="button" class="save-dialog-close" data-action="close-save-dialog">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                    
                    <div class="save-dialog-body">
                        <div class="save-dialog-field">
                            <label class="save-dialog-label">Filter Name</label>
                            <input type="text" 
                                   class="save-dialog-input" 
                                   value="${this.escapeHtml(saveFilterName)}" 
                                   placeholder="Enter filter name..."
                                   data-save-name />
                        </div>
                        
                        <div class="save-dialog-field">
                            <label class="save-dialog-label">Description (Optional)</label>
                            <textarea class="save-dialog-textarea" 
                                      rows="3"
                                      placeholder="Describe what this filter does..."
                                      data-save-description>${this.escapeHtml(saveFilterDescription)}</textarea>
                        </div>
                        
                        <div class="save-dialog-field">
                            <label class="save-dialog-checkbox">
                                <input type="checkbox" 
                                       ${makeFilterPublic ? 'checked' : ''} 
                                       data-save-public />
                                <span class="checkbox-label">Make this filter public</span>
                                <span class="checkbox-description">Other workspace members can use this filter</span>
                            </label>
                        </div>
                    </div>
                    
                    <div class="save-dialog-footer">
                        <button type="button" class="btn btn--outline" data-action="close-save-dialog">
                            Cancel
                        </button>
                        <button type="button" 
                                class="btn btn--primary" 
                                data-action="confirm-save-filter"
                                ${isSaving || !saveFilterName.trim() ? 'disabled' : ''}>
                            ${isSaving ? 'Saving...' : 'Save Filter'}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderFilterSummary(query) {
        if (!query || !query.groups || query.groups.length === 0) {
            return '<span class="filter-summary-empty">No conditions</span>';
        }
        
        const parts = query.groups.map(group => {
            const conditions = group.conditions.map(condition => {
                const field = this.state.availableFields.find(f => f.id === condition.field);
                const operator = this.operators[field?.type]?.find(op => op.value === condition.operator);
                
                return `${field?.name || condition.field} ${operator?.symbol || condition.operator} ${condition.value || ''}`;
            });
            
            return conditions.length > 1 ? 
                `(${conditions.join(` ${group.logic} `)})` : 
                conditions[0];
        });
        
        return `<span class="filter-summary">${parts.join(` ${query.logic} `)}</span>`;
    }
    
    bindModalEvents() {
        // Radio buttons for query logic
        const queryLogicRadios = this.container.querySelectorAll('input[name="queryLogic"]');
        queryLogicRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                const filterQuery = { ...this.state.filterQuery };
                filterQuery.logic = e.target.value;
                this.setState({ filterQuery, isDirty: true });
                this.render();
            });
        });
        
        // Save dialog inputs
        const saveNameInput = this.container.querySelector('[data-save-name]');
        const saveDescInput = this.container.querySelector('[data-save-description]');
        const savePublicInput = this.container.querySelector('[data-save-public]');
        
        if (saveNameInput) {
            saveNameInput.addEventListener('input', (e) => {
                this.setState({ saveFilterName: e.target.value });
            });
        }
        
        if (saveDescInput) {
            saveDescInput.addEventListener('input', (e) => {
                this.setState({ saveFilterDescription: e.target.value });
            });
        }
        
        if (savePublicInput) {
            savePublicInput.addEventListener('change', (e) => {
                this.setState({ makeFilterPublic: e.target.checked });
            });
        }
    }
    
    setupKeyboardNavigation() {
        // ESC to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.state.isOpen) {
                this.closeModal();
            }
        });
    }
    
    bindEvents() {
        this.container.addEventListener('click', this.handleClick.bind(this));
        this.container.addEventListener('change', this.handleChange.bind(this));
        this.container.addEventListener('input', this.handleInput.bind(this));
    }
    
    async handleClick(e) {
        const action = e.target.closest('[data-action]')?.dataset.action;
        const groupIndex = e.target.closest('[data-group-index]')?.dataset.groupIndex;
        const conditionIndex = e.target.closest('[data-condition-index]')?.dataset.conditionIndex;
        const filterId = e.target.closest('[data-filter-id]')?.dataset.filterId;
        const tab = e.target.closest('[data-tab]')?.dataset.tab;
        
        switch (action) {
            case 'close-modal':
                this.closeModal();
                break;
            case 'switch-tab':
                this.setState({ activeTab: tab });
                this.render();
                break;
            case 'add-condition':
                this.addCondition();
                break;
            case 'add-group':
                this.addConditionGroup();
                break;
            case 'add-condition-to-group':
                this.addConditionToGroup(parseInt(groupIndex));
                break;
            case 'remove-condition':
                this.removeCondition(parseInt(groupIndex), parseInt(conditionIndex));
                break;
            case 'remove-group':
                this.removeConditionGroup(parseInt(groupIndex));
                break;
            case 'apply-saved-filter':
                await this.applySavedFilter(filterId);
                break;
            case 'edit-saved-filter':
                await this.editSavedFilter(filterId);
                break;
            case 'delete-saved-filter':
                await this.deleteSavedFilter(filterId);
                break;
            case 'clear-filters':
                this.clearFilters();
                break;
            case 'preview-filters':
                await this.previewFilters();
                break;
            case 'save-filter':
                this.openSaveDialog();
                break;
            case 'apply-filters':
                await this.applyFilters();
                break;
            case 'close-save-dialog':
                this.closeSaveDialog();
                break;
            case 'confirm-save-filter':
                await this.confirmSaveFilter();
                break;
            case 'format-json':
                this.formatJSON();
                break;
            case 'validate-json':
                this.validateJSON();
                break;
            case 'reset-json':
                this.resetJSON();
                break;
        }
    }
    
    handleChange(e) {
        const action = e.target.dataset.action;
        const groupIndex = parseInt(e.target.dataset.groupIndex);
        const conditionIndex = parseInt(e.target.dataset.conditionIndex);
        
        switch (action) {
            case 'change-group-logic':
                this.changeGroupLogic(groupIndex, e.target.value);
                break;
            case 'change-field':
                this.changeConditionField(groupIndex, conditionIndex, e.target.value);
                break;
            case 'change-operator':
                this.changeConditionOperator(groupIndex, conditionIndex, e.target.value);
                break;
            case 'change-value':
                this.changeConditionValue(groupIndex, conditionIndex, e.target);
                break;
            case 'change-json':
                this.changeJSON(e.target.value);
                break;
        }
    }
    
    handleInput(e) {
        const action = e.target.dataset.action;
        const groupIndex = parseInt(e.target.dataset.groupIndex);
        const conditionIndex = parseInt(e.target.dataset.conditionIndex);
        
        if (action === 'change-value') {
            this.changeConditionValue(groupIndex, conditionIndex, e.target);
        }
    }
    
    // Filter manipulation methods
    addCondition() {
        const filterQuery = { ...this.state.filterQuery };
        
        if (filterQuery.groups.length === 0) {
            filterQuery.groups.push({
                logic: 'AND',
                conditions: []
            });
        }
        
        filterQuery.groups[0].conditions.push({
            field: '',
            operator: 'equals',
            value: ''
        });
        
        this.setState({ filterQuery, isDirty: true });
        this.render();
    }
    
    addConditionGroup() {
        const filterQuery = { ...this.state.filterQuery };
        
        filterQuery.groups.push({
            logic: 'AND',
            conditions: [{
                field: '',
                operator: 'equals',
                value: ''
            }]
        });
        
        this.setState({ filterQuery, isDirty: true });
        this.render();
    }
    
    addConditionToGroup(groupIndex) {
        const filterQuery = { ...this.state.filterQuery };
        
        filterQuery.groups[groupIndex].conditions.push({
            field: '',
            operator: 'equals',
            value: ''
        });
        
        this.setState({ filterQuery, isDirty: true });
        this.render();
    }
    
    removeCondition(groupIndex, conditionIndex) {
        const filterQuery = { ...this.state.filterQuery };
        
        filterQuery.groups[groupIndex].conditions.splice(conditionIndex, 1);
        
        // Remove group if no conditions left
        if (filterQuery.groups[groupIndex].conditions.length === 0) {
            filterQuery.groups.splice(groupIndex, 1);
        }
        
        this.setState({ filterQuery, isDirty: true });
        this.render();
    }
    
    removeConditionGroup(groupIndex) {
        const filterQuery = { ...this.state.filterQuery };
        filterQuery.groups.splice(groupIndex, 1);
        
        this.setState({ filterQuery, isDirty: true });
        this.render();
    }
    
    changeGroupLogic(groupIndex, logic) {
        const filterQuery = { ...this.state.filterQuery };
        filterQuery.groups[groupIndex].logic = logic;
        
        this.setState({ filterQuery, isDirty: true });
        this.render();
    }
    
    changeConditionField(groupIndex, conditionIndex, fieldId) {
        const filterQuery = { ...this.state.filterQuery };
        const condition = filterQuery.groups[groupIndex].conditions[conditionIndex];
        
        condition.field = fieldId;
        condition.operator = 'equals'; // Reset operator
        condition.value = ''; // Reset value
        
        this.setState({ filterQuery, isDirty: true });
        this.render();
    }
    
    changeConditionOperator(groupIndex, conditionIndex, operator) {
        const filterQuery = { ...this.state.filterQuery };
        const condition = filterQuery.groups[groupIndex].conditions[conditionIndex];
        
        condition.operator = operator;
        condition.value = ''; // Reset value
        
        this.setState({ filterQuery, isDirty: true });
        this.render();
    }
    
    changeConditionValue(groupIndex, conditionIndex, target) {
        const filterQuery = { ...this.state.filterQuery };
        const condition = filterQuery.groups[groupIndex].conditions[conditionIndex];
        
        if (target.classList.contains('condition-value-from')) {
            const toValue = target.parentNode.querySelector('.condition-value-to').value;
            condition.value = [target.value, toValue];
        } else if (target.classList.contains('condition-value-to')) {
            const fromValue = target.parentNode.querySelector('.condition-value-from').value;
            condition.value = [fromValue, target.value];
        } else if (target.classList.contains('condition-value-amount')) {
            const unit = target.parentNode.querySelector('.condition-value-unit').value;
            condition.value = `${target.value} ${unit}`;
        } else if (target.classList.contains('condition-value-unit')) {
            const amount = target.parentNode.querySelector('.condition-value-amount').value;
            condition.value = `${amount} ${target.value}`;
        } else if (target.classList.contains('condition-value-multi')) {
            condition.value = Array.from(target.selectedOptions).map(opt => opt.value);
        } else {
            condition.value = target.value;
        }
        
        this.setState({ filterQuery, isDirty: true });
        
        // Debounced preview update
        this.debouncedPreview();
    }
    
    debouncedPreview() {
        clearTimeout(this.previewTimeout);
        this.previewTimeout = setTimeout(() => {
            if (this.showPreview) {
                this.previewFilters();
            }
        }, 500);
    }
    
    changeJSON(jsonString) {
        try {
            const filterQuery = JSON.parse(jsonString);
            this.setState({ filterQuery, isDirty: true, errors: {} });
        } catch (error) {
            this.setState({ 
                errors: { ...this.state.errors, json: 'Invalid JSON format' } 
            });
        }
    }
    
    formatJSON() {
        const textarea = this.container.querySelector('.filter-json-editor');
        if (textarea) {
            try {
                const formatted = JSON.stringify(JSON.parse(textarea.value), null, 2);
                textarea.value = formatted;
            } catch (error) {
                // Invalid JSON, don't format
            }
        }
    }
    
    validateJSON() {
        const textarea = this.container.querySelector('.filter-json-editor');
        if (textarea) {
            try {
                JSON.parse(textarea.value);
                alert('JSON is valid!');
            } catch (error) {
                alert('Invalid JSON: ' + error.message);
            }
        }
    }
    
    resetJSON() {
        this.setState({
            filterQuery: { logic: 'AND', groups: [] },
            isDirty: false
        });
        this.render();
    }
    
    clearFilters() {
        this.setState({
            filterQuery: { logic: 'AND', groups: [] },
            isDirty: false,
            previewResults: null,
            previewCount: 0
        });
        this.render();
    }
    
    async previewFilters() {
        try {
            const response = await filterService.previewFilter({
                query: this.state.filterQuery,
                workspaceId: this.workspaceId,
                boardIds: this.boardIds,
                context: this.context
            });
            
            if (response.success) {
                this.setState({
                    previewResults: response.data.results,
                    previewCount: response.data.totalCount
                });
                this.render();
            }
        } catch (error) {
            console.error('Error previewing filters:', error);
        }
    }
    
    async applyFilters() {
        this.setState({ isApplying: true });
        this.render();
        
        try {
            // Emit filter applied event
            eventBus.emit('filter:applied', {
                query: this.state.filterQuery,
                workspaceId: this.workspaceId,
                boardIds: this.boardIds,
                context: this.context
            });
            
            this.closeModal();
        } catch (error) {
            this.setState({ 
                isApplying: false,
                errors: { ...this.state.errors, apply: error.message }
            });
            this.render();
        }
    }
    
    async applySavedFilter(filterId) {
        const savedFilter = this.state.savedFilters.find(f => f.id === filterId);
        if (!savedFilter) return;
        
        this.setState({
            filterQuery: savedFilter.query,
            isDirty: false,
            activeTab: 'conditions'
        });
        this.render();
        
        // Auto-apply the filter
        await this.applyFilters();
    }
    
    async editSavedFilter(filterId) {
        const savedFilter = this.state.savedFilters.find(f => f.id === filterId);
        if (!savedFilter) return;
        
        this.setState({
            filterQuery: savedFilter.query,
            isDirty: false,
            activeTab: 'conditions',
            saveFilterName: savedFilter.name,
            saveFilterDescription: savedFilter.description || '',
            makeFilterPublic: savedFilter.isPublic
        });
        this.render();
    }
    
    async deleteSavedFilter(filterId) {
        if (!confirm('Are you sure you want to delete this saved filter?')) return;
        
        try {
            const response = await savedFilterService.deleteSavedFilter(filterId);
            
            if (response.success) {
                await this.loadSavedFilters();
                this.render();
            } else {
                throw new Error(response.error?.message || 'Failed to delete filter');
            }
        } catch (error) {
            this.setState({
                errors: { ...this.state.errors, savedFilters: error.message }
            });
            this.render();
        }
    }
    
    openSaveDialog() {
        this.setState({ 
            saveDialogOpen: true,
            saveFilterName: '',
            saveFilterDescription: '',
            makeFilterPublic: false
        });
        this.render();
    }
    
    closeSaveDialog() {
        this.setState({ saveDialogOpen: false });
        this.render();
    }
    
    async confirmSaveFilter() {
        const { saveFilterName, saveFilterDescription, makeFilterPublic, filterQuery } = this.state;
        
        if (!saveFilterName.trim()) return;
        
        this.setState({ isSaving: true });
        this.render();
        
        try {
            const response = await savedFilterService.createSavedFilter({
                name: saveFilterName.trim(),
                description: saveFilterDescription.trim(),
                query: filterQuery,
                isPublic: makeFilterPublic,
                workspaceId: this.workspaceId,
                context: this.context
            });
            
            if (response.success) {
                await this.loadSavedFilters();
                this.setState({ 
                    isSaving: false,
                    saveDialogOpen: false,
                    isDirty: false
                });
                this.render();
            } else {
                throw new Error(response.error?.message || 'Failed to save filter');
            }
        } catch (error) {
            this.setState({
                isSaving: false,
                errors: { ...this.state.errors, save: error.message }
            });
            this.render();
        }
    }
    
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString();
    }
    
    // Public methods
    openModal() {
        this.setState({ isOpen: true });
        this.render();
        
        // Focus first input
        setTimeout(() => {
            const firstInput = this.container.querySelector('input, select, textarea');
            if (firstInput) {
                firstInput.focus();
            }
        }, 100);
    }
    
    closeModal() {
        this.setState({ 
            isOpen: false,
            saveDialogOpen: false 
        });
        this.render();
    }
    
    setFilters(filterQuery) {
        this.setState({ 
            filterQuery: filterQuery || { logic: 'AND', groups: [] },
            isDirty: false 
        });
        this.render();
    }
    
    getFilters() {
        return this.state.filterQuery;
    }
    
    // Event handlers for external events
    handleToggleFilters() {
        if (this.state.isOpen) {
            this.closeModal();
        } else {
            this.openModal();
        }
    }
    
    handleApplySavedFilter(data) {
        this.applySavedFilter(data.filterId);
    }
    
    handleWorkspaceChanged(data) {
        this.workspaceId = data.workspaceId;
        this.loadAvailableFields();
        this.loadSavedFilters();
    }
    
    destroy() {
        clearTimeout(this.previewTimeout);
        
        // Remove event listeners
        eventBus.off('search:toggle-filters', this.handleToggleFilters);
        eventBus.off('filter:apply-saved', this.handleApplySavedFilter);
        eventBus.off('workspace:changed', this.handleWorkspaceChanged);
        
        super.destroy();
    }
} 