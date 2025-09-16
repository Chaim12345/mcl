/**
 * Filter Service for Vanilla JavaScript Frontend
 */

import { authService } from './auth.js';
import { eventBus } from '../utils/events.js';
import { state } from '../utils/state.js';

// Configuration constants
const API_BASE_URL = '/api';

/**
 * Filter Service Class
 */
class FilterService {
    constructor() {
        this.activeFilters = {};
        this.availableFields = [];
        this.filterCache = new Map();
        
        // Initialize from state
        this.initializeFromState();
    }
    
    /**
     * Initialize filter state
     */
    initializeFromState() {
        const currentState = state.get('filter');
        if (currentState) {
            this.activeFilters = currentState.active || {};
            this.availableFields = currentState.fields || [];
        }
    }
    
    /**
     * Make authenticated API request
     */
    async makeRequest(endpoint, options = {}) {
        return await authService.makeRequest(endpoint, options);
    }
    
    /**
     * Get available fields for filtering
     */
    async getAvailableFields(context = 'items', workspaceId = null, boardIds = []) {
        try {
            const params = new URLSearchParams({
                context,
                workspaceId: workspaceId || '',
                boardIds: boardIds.join(',')
            });
            
            const response = await this.makeRequest(`/filters/fields?${params}`);
            
            if (response.success) {
                this.availableFields = response.data.fields || [];
                this.updateGlobalState();
                
                return {
                    success: true,
                    data: this.availableFields
                };
            } else {
                throw new Error(response.message || 'Failed to get available fields');
            }
        } catch (error) {
            console.error('Error getting available fields:', error);
            return { success: false, data: [] };
        }
    }
    
    /**
     * Apply filters to get filtered results
     */
    async applyFilters(filterQuery, params = {}) {
        try {
            const requestData = {
                filterQuery,
                context: params.context || 'items',
                workspaceId: params.workspaceId,
                boardIds: params.boardIds || [],
                page: params.page || 1,
                limit: params.limit || 20,
                sortBy: params.sortBy || 'created',
                sortOrder: params.sortOrder || 'desc'
            };
            
            const response = await this.makeRequest('/filters/apply', {
                method: 'POST',
                body: JSON.stringify(requestData)
            });
            
            if (response.success) {
                // Store active filters
                this.activeFilters[params.context || 'items'] = filterQuery;
                this.updateGlobalState();
                
                eventBus.emit('filter:applied', {
                    filterQuery,
                    context: params.context,
                    results: response.data
                });
                
                return {
                    success: true,
                    data: {
                        results: response.data.results || [],
                        totalCount: response.data.totalCount || 0,
                        hasMore: response.data.hasMore || false,
                        facets: response.data.facets || {}
                    }
                };
            } else {
                throw new Error(response.message || 'Failed to apply filters');
            }
        } catch (error) {
            eventBus.emit('notification:error', { message: error.message });
            return { success: false, error: { message: error.message } };
        }
    }
    
    /**
     * Preview filter results (get count without full results)
     */
    async previewFilter(filterQuery, params = {}) {
        try {
            const requestData = {
                filterQuery,
                context: params.context || 'items',
                workspaceId: params.workspaceId,
                boardIds: params.boardIds || []
            };
            
            const response = await this.makeRequest('/filters/preview', {
                method: 'POST',
                body: JSON.stringify(requestData)
            });
            
            if (response.success) {
                return {
                    success: true,
                    data: {
                        count: response.data.count || 0,
                        sample: response.data.sample || []
                    }
                };
            } else {
                throw new Error(response.message || 'Failed to preview filter');
            }
        } catch (error) {
            console.error('Error previewing filter:', error);
            return { success: false, data: { count: 0, sample: [] } };
        }
    }
    
    /**
     * Clear filters for a context
     */
    clearFilters(context = 'items') {
        delete this.activeFilters[context];
        this.updateGlobalState();
        
        eventBus.emit('filter:cleared', { context });
    }
    
    /**
     * Get active filters for a context
     */
    getActiveFilters(context = 'items') {
        return this.activeFilters[context] || null;
    }
    
    /**
     * Build filter query from conditions
     */
    buildFilterQuery(conditions, logic = 'AND') {
        if (!conditions || conditions.length === 0) {
            return null;
        }
        
        return {
            logic,
            conditions: conditions.map(condition => ({
                field: condition.field,
                operator: condition.operator,
                value: condition.value,
                type: condition.type || 'text'
            }))
        };
    }
    
    /**
     * Build complex filter query with groups
     */
    buildComplexFilterQuery(groups, logic = 'AND') {
        if (!groups || groups.length === 0) {
            return null;
        }
        
        return {
            logic,
            groups: groups.map(group => ({
                logic: group.logic || 'AND',
                conditions: group.conditions.map(condition => ({
                    field: condition.field,
                    operator: condition.operator,
                    value: condition.value,
                    type: condition.type || 'text'
                }))
            }))
        };
    }
    
    /**
     * Validate filter condition
     */
    validateCondition(condition) {
        const errors = [];
        
        if (!condition.field) {
            errors.push('Field is required');
        }
        
        if (!condition.operator) {
            errors.push('Operator is required');
        }
        
        // Check if value is required for this operator
        const noValueOperators = ['is_empty', 'is_not_empty'];
        if (!noValueOperators.includes(condition.operator) && 
            (condition.value === undefined || condition.value === null || condition.value === '')) {
            errors.push('Value is required for this operator');
        }
        
        // Validate value based on field type
        if (condition.value !== undefined && condition.value !== null && condition.value !== '') {
            const field = this.availableFields.find(f => f.id === condition.field);
            if (field) {
                const validationError = this.validateFieldValue(condition.value, field.type, condition.operator);
                if (validationError) {
                    errors.push(validationError);
                }
            }
        }
        
        return errors;
    }
    
    /**
     * Validate field value based on type
     */
    validateFieldValue(value, fieldType, operator) {
        switch (fieldType) {
            case 'number':
                if (operator === 'between') {
                    if (!Array.isArray(value) || value.length !== 2) {
                        return 'Between operator requires two values';
                    }
                    if (isNaN(value[0]) || isNaN(value[1])) {
                        return 'Both values must be numbers';
                    }
                } else if (isNaN(value)) {
                    return 'Value must be a number';
                }
                break;
                
            case 'date':
                if (operator === 'between') {
                    if (!Array.isArray(value) || value.length !== 2) {
                        return 'Between operator requires two dates';
                    }
                    if (!this.isValidDate(value[0]) || !this.isValidDate(value[1])) {
                        return 'Both values must be valid dates';
                    }
                } else if (!this.isValidDate(value)) {
                    return 'Value must be a valid date';
                }
                break;
                
            case 'select':
                if (['in', 'not_in'].includes(operator)) {
                    if (!Array.isArray(value) || value.length === 0) {
                        return 'At least one option must be selected';
                    }
                }
                break;
        }
        
        return null;
    }
    
    /**
     * Check if value is a valid date
     */
    isValidDate(value) {
        const date = new Date(value);
        return date instanceof Date && !isNaN(date);
    }
    
    /**
     * Convert filter query to human readable text
     */
    filterQueryToText(filterQuery) {
        if (!filterQuery) return '';
        
        if (filterQuery.conditions) {
            return this.conditionsToText(filterQuery.conditions, filterQuery.logic);
        }
        
        if (filterQuery.groups) {
            return filterQuery.groups.map(group => 
                `(${this.conditionsToText(group.conditions, group.logic)})`
            ).join(` ${filterQuery.logic} `);
        }
        
        return '';
    }
    
    /**
     * Convert conditions array to text
     */
    conditionsToText(conditions, logic = 'AND') {
        return conditions.map(condition => {
            const field = this.availableFields.find(f => f.id === condition.field);
            const fieldName = field ? field.name : condition.field;
            const operator = this.getOperatorLabel(condition.operator, field?.type);
            
            let valueText = '';
            if (condition.value !== undefined && condition.value !== null) {
                if (Array.isArray(condition.value)) {
                    valueText = condition.value.join(', ');
                } else {
                    valueText = String(condition.value);
                }
            }
            
            return `${fieldName} ${operator}${valueText ? ` ${valueText}` : ''}`;
        }).join(` ${logic} `);
    }
    
    /**
     * Get operator label for display
     */
    getOperatorLabel(operatorValue, fieldType = 'text') {
        const operators = {
            text: {
                'equals': 'equals',
                'not_equals': 'does not equal',
                'contains': 'contains',
                'not_contains': 'does not contain',
                'starts_with': 'starts with',
                'ends_with': 'ends with',
                'is_empty': 'is empty',
                'is_not_empty': 'is not empty'
            },
            number: {
                'equals': 'equals',
                'not_equals': 'does not equal',
                'greater_than': 'greater than',
                'greater_than_equal': 'greater than or equal to',
                'less_than': 'less than',
                'less_than_equal': 'less than or equal to',
                'between': 'between',
                'is_empty': 'is empty',
                'is_not_empty': 'is not empty'
            },
            date: {
                'equals': 'is',
                'not_equals': 'is not',
                'before': 'before',
                'after': 'after',
                'between': 'between',
                'in_last': 'in the last',
                'in_next': 'in the next',
                'is_empty': 'is empty',
                'is_not_empty': 'is not empty'
            },
            select: {
                'equals': 'is',
                'not_equals': 'is not',
                'in': 'is any of',
                'not_in': 'is none of',
                'is_empty': 'is empty',
                'is_not_empty': 'is not empty'
            }
        };
        
        return operators[fieldType]?.[operatorValue] || operatorValue;
    }
    
    /**
     * Get field options for select fields
     */
    async getFieldOptions(fieldId, params = {}) {
        try {
            const queryParams = new URLSearchParams({
                fieldId,
                workspaceId: params.workspaceId || '',
                boardIds: (params.boardIds || []).join(','),
                search: params.search || '',
                limit: params.limit || 50
            });
            
            const response = await this.makeRequest(`/filters/field-options?${queryParams}`);
            
            if (response.success) {
                return {
                    success: true,
                    data: response.data.options || []
                };
            } else {
                throw new Error(response.message || 'Failed to get field options');
            }
        } catch (error) {
            console.error('Error getting field options:', error);
            return { success: false, data: [] };
        }
    }
    
    /**
     * Update global state
     */
    updateGlobalState() {
        state.set('filter', {
            active: this.activeFilters,
            fields: this.availableFields
        });
    }
    
    /**
     * Get available fields
     */
    getAvailableFieldsSync() {
        return this.availableFields;
    }
    
    /**
     * Cleanup resources
     */
    destroy() {
        this.activeFilters = {};
        this.availableFields = [];
        this.filterCache.clear();
        this.updateGlobalState();
    }
}

// Create and export singleton instance
export const filterService = new FilterService();

// Export the class for testing
export { FilterService };