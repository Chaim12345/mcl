/**
 * Activity Service
 * Handles all activity-related API calls and data management
 */

class ActivityService {
    constructor() {
        this.baseURL = '/api/v1';
        this.activityCache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
        this.wsService = window.WebSocketService;
    }

    /**
     * Get activities for a specific entity
     * @param {string} entityType - Type of entity (board, item, workspace, user)
     * @param {string} entityId - ID of the entity
     * @param {Object} options - Filtering options
     * @returns {Promise<Array>} Array of activities
     */
    async getActivities(entityType, entityId, options = {}) {
        const cacheKey = `${entityType}-${entityId}-${JSON.stringify(options)}`;
        
        // Check cache
        if (this.activityCache.has(cacheKey)) {
            const cached = this.activityCache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
        }

        try {
            const params = new URLSearchParams({
                entity_type: entityType,
                entity_id: entityId,
                ...options
            });

            const response = await fetch(`${this.baseURL}/activities?${params}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch activities: ${response.statusText}`);
            }

            const data = await response.json();
            
            // Cache the result
            this.activityCache.set(cacheKey, {
                data: data.activities || data,
                timestamp: Date.now()
            });

            return data.activities || data;
        } catch (error) {
            console.error('Error fetching activities:', error);
            throw error;
        }
    }

    /**
     * Get activities for a user
     * @param {string} userId - User ID
     * @param {Object} options - Filtering options
     * @returns {Promise<Array>} Array of activities
     */
    async getUserActivities(userId, options = {}) {
        return this.getActivities('user', userId, options);
    }

    /**
     * Get activities for a workspace
     * @param {string} workspaceId - Workspace ID
     * @param {Object} options - Filtering options
     * @returns {Promise<Array>} Array of activities
     */
    async getWorkspaceActivities(workspaceId, options = {}) {
        return this.getActivities('workspace', workspaceId, options);
    }

    /**
     * Get activities for a board
     * @param {string} boardId - Board ID
     * @param {Object} options - Filtering options
     * @returns {Promise<Array>} Array of activities
     */
    async getBoardActivities(boardId, options = {}) {
        return this.getActivities('board', boardId, options);
    }

    /**
     * Get activities for an item
     * @param {string} itemId - Item ID
     * @param {Object} options - Filtering options
     * @returns {Promise<Array>} Array of activities
     */
    async getItemActivities(itemId, options = {}) {
        return this.getActivities('item', itemId, options);
    }

    /**
     * Get global activity feed
     * @param {Object} options - Filtering options
     * @returns {Promise<Array>} Array of activities
     */
    async getGlobalActivities(options = {}) {
        try {
            const params = new URLSearchParams(options);
            const response = await fetch(`${this.baseURL}/activities/global?${params}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch global activities: ${response.statusText}`);
            }

            const data = await response.json();
            return data.activities || data;
        } catch (error) {
            console.error('Error fetching global activities:', error);
            throw error;
        }
    }

    /**
     * Create a new activity
     * @param {Object} activity - Activity data
     * @returns {Promise<Object>} Created activity
     */
    async createActivity(activity) {
        try {
            const response = await fetch(`${this.baseURL}/activities`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(activity)
            });

            if (!response.ok) {
                throw new Error(`Failed to create activity: ${response.statusText}`);
            }

            const createdActivity = await response.json();
            
            // Clear cache for related entities
            this.clearCache();
            
            // Emit via WebSocket if available
            if (this.wsService && this.wsService.isConnected()) {
                this.wsService.emit('activity:created', createdActivity);
            }

            return createdActivity;
        } catch (error) {
            console.error('Error creating activity:', error);
            throw error;
        }
    }

    /**
     * Get activity analytics
     * @param {string} entityType - Type of entity
     * @param {string} entityId - Entity ID
     * @param {Object} options - Analytics options
     * @returns {Promise<Object>} Analytics data
     */
    async getActivityAnalytics(entityType, entityId, options = {}) {
        try {
            const params = new URLSearchParams({
                entity_type: entityType,
                entity_id: entityId,
                ...options
            });

            const response = await fetch(`${this.baseURL}/activities/analytics?${params}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch activity analytics: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching activity analytics:', error);
            throw error;
        }
    }

    /**
     * Get activity types and their descriptions
     * @returns {Promise<Object>} Activity types
     */
    async getActivityTypes() {
        try {
            const response = await fetch(`${this.baseURL}/activities/types`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch activity types: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching activity types:', error);
            throw error;
        }
    }

    /**
     * Subscribe to real-time activity updates
     * @param {Function} callback - Callback for activity updates
     * @param {Object} filters - Filter criteria
     */
    subscribeToActivityUpdates(callback, filters = {}) {
        if (!this.wsService) return;

        const eventName = filters.entityType && filters.entityId 
            ? `activity:${filters.entityType}:${filters.entityId}`
            : 'activity:global';

        this.wsService.on(eventName, callback);
        return () => this.wsService.off(eventName, callback);
    }

    /**
     * Clear cache for specific entity or all
     * @param {string} entityType - Type of entity
     * @param {string} entityId - Entity ID
     */
    clearCache(entityType, entityId) {
        if (entityType && entityId) {
            // Clear specific entity cache
            for (const [key] of this.activityCache) {
                if (key.startsWith(`${entityType}-${entityId}-`)) {
                    this.activityCache.delete(key);
                }
            }
        } else {
            // Clear all cache
            this.activityCache.clear();
        }
    }

    /**
     * Format activity for display
     * @param {Object} activity - Activity object
     * @returns {Object} Formatted activity
     */
    formatActivity(activity) {
        const formatted = {
            ...activity,
            timestamp: new Date(activity.created_at || activity.timestamp),
            displayText: this.generateDisplayText(activity),
            icon: this.getActivityIcon(activity.type),
            color: this.getActivityColor(activity.type),
            user: activity.user || activity.actor || {}
        };

        return formatted;
    }

    /**
     * Generate display text for activity
     * @param {Object} activity - Activity object
     * @returns {string} Display text
     */
    generateDisplayText(activity) {
        const { type, action, entity_type, entity_title, changes } = activity;
        
        const templates = {
            'board.created': ({ user_name, entity_title }) => 
                `${user_name} created board "${entity_title}"`,
            'board.updated': ({ user_name, entity_title, changes }) => 
                `${user_name} updated ${Object.keys(changes || {}).join(', ')} in "${entity_title}"`,
            'board.deleted': ({ user_name, entity_title }) => 
                `${user_name} deleted board "${entity_title}"`,
            'item.created': ({ user_name, entity_title }) => 
                `${user_name} created item "${entity_title}"`,
            'item.updated': ({ user_name, entity_title, changes }) => 
                `${user_name} updated ${Object.keys(changes || {}).join(', ')} in "${entity_title}"`,
            'item.moved': ({ user_name, entity_title, changes }) => {
                const from = changes?.status?.from || 'previous status';
                const to = changes?.status?.to || 'new status';
                return `${user_name} moved "${entity_title}" from ${from} to ${to}`;
            },
            'item.deleted': ({ user_name, entity_title }) => 
                `${user_name} deleted item "${entity_title}"`,
            'comment.created': ({ user_name, entity_title }) => 
                `${user_name} commented on "${entity_title}"`,
            'comment.updated': ({ user_name, entity_title }) => 
                `${user_name} updated comment on "${entity_title}"`,
            'comment.deleted': ({ user_name, entity_title }) => 
                `${user_name} deleted comment on "${entity_title}"`,
            'member.added': ({ user_name, entity_title, changes }) => 
                `${user_name} added ${changes?.member?.name || 'a member'} to "${entity_title}"`,
            'member.removed': ({ user_name, entity_title, changes }) => 
                `${user_name} removed ${changes?.member?.name || 'a member'} from "${entity_title}"`,
            'workspace.created': ({ user_name, entity_title }) => 
                `${user_name} created workspace "${entity_title}"`,
            'workspace.updated': ({ user_name, entity_title, changes }) => 
                `${user_name} updated ${Object.keys(changes || {}).join(', ')} in workspace "${entity_title}"`,
            'user.joined': ({ user_name, entity_title }) => 
                `${user_name} joined workspace "${entity_title}"`,
            'user.left': ({ user_name, entity_title }) => 
                `${user_name} left workspace "${entity_title}"`
        };

        const template = templates[`${entity_type}.${action}`];
        if (template) {
            return template({
                user_name: activity.user?.name || activity.actor?.name || 'Someone',
                entity_title: entity_title || 'Untitled',
                changes: changes || {}
            });
        }

        return `${activity.user?.name || 'Someone'} ${action} ${entity_type} "${entity_title || 'Untitled'}"`;
    }

    /**
     * Get activity icon
     * @param {string} type - Activity type
     * @returns {string} Icon class
     */
    getActivityIcon(type) {
        const icons = {
            'board.created': '📋',
            'board.updated': '✏️',
            'board.deleted': '🗑️',
            'item.created': '📝',
            'item.updated': '✏️',
            'item.moved': '➡️',
            'item.deleted': '🗑️',
            'comment.created': '💬',
            'comment.updated': '✏️',
            'comment.deleted': '🗑️',
            'member.added': '➕',
            'member.removed': '➖',
            'workspace.created': '🏢',
            'workspace.updated': '✏️',
            'user.joined': '👋',
            'user.left': '👋'
        };

        return icons[type] || '📌';
    }

    /**
     * Get activity color
     * @param {string} type - Activity type
     * @returns {string} Color class
     */
    getActivityColor(type) {
        const colors = {
            'board.created': 'text-blue-600',
            'board.updated': 'text-yellow-600',
            'board.deleted': 'text-red-600',
            'item.created': 'text-green-600',
            'item.updated': 'text-yellow-600',
            'item.moved': 'text-purple-600',
            'item.deleted': 'text-red-600',
            'comment.created': 'text-blue-500',
            'comment.updated': 'text-yellow-500',
            'comment.deleted': 'text-red-500',
            'member.added': 'text-green-600',
            'member.removed': 'text-red-600',
            'workspace.created': 'text-indigo-600',
            'workspace.updated': 'text-yellow-600',
            'user.joined': 'text-green-600',
            'user.left': 'text-red-600'
        };

        return colors[type] || 'text-gray-600';
    }

    /**
     * Group activities by date
     * @param {Array} activities - Array of activities
     * @returns {Object} Activities grouped by date
     */
    groupActivitiesByDate(activities) {
        const grouped = {};
        
        activities.forEach(activity => {
            const date = new Date(activity.created_at || activity.timestamp).toDateString();
            if (!grouped[date]) {
                grouped[date] = [];
            }
            grouped[date].push(activity);
        });

        return grouped;
    }

    /**
     * Filter activities
     * @param {Array} activities - Activities to filter
     * @param {Object} filters - Filter criteria
     * @returns {Array} Filtered activities
     */
    filterActivities(activities, filters) {
        let filtered = [...activities];

        if (filters.type) {
            filtered = filtered.filter(a => a.type === filters.type);
        }

        if (filters.user) {
            filtered = filtered.filter(a => a.user?.id === filters.user || a.actor?.id === filters.user);
        }

        if (filters.dateFrom) {
            const from = new Date(filters.dateFrom);
            filtered = filtered.filter(a => new Date(a.created_at || a.timestamp) >= from);
        }

        if (filters.dateTo) {
            const to = new Date(filters.dateTo);
            to.setHours(23, 59, 59, 999);
            filtered = filtered.filter(a => new Date(a.created_at || a.timestamp) <= to);
        }

        if (filters.search) {
            const search = filters.search.toLowerCase();
            filtered = filtered.filter(a => 
                this.generateDisplayText(a).toLowerCase().includes(search) ||
                a.entity_title?.toLowerCase().includes(search) ||
                a.user?.name?.toLowerCase().includes(search) ||
                a.actor?.name?.toLowerCase().includes(search)
            );
        }

        return filtered;
    }
}

// Create and export instance
window.ActivityService = new ActivityService();

export default window.ActivityService;