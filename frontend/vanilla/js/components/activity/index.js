/**
 * Activity System Integration
 * Main entry point for activity components
 */

// Export all activity components
export { default as ActivityService } from '../../services/activity.js';
export { default as ActivityTimeline } from './ActivityTimeline.js';
export { default as ActivityItem } from './ActivityItem.js';
export { default as ActivityFilters } from './ActivityFilters.js';
export { default as ActivityCard } from './ActivityCard.js';
export { default as ActivityAnalytics } from './ActivityAnalytics.js';

// Utility function to initialize activity components
export class ActivitySystem {
    static initialize() {
        // Register ActivityService globally
        if (!window.ActivityService) {
            console.error('ActivityService not found. Make sure it is loaded.');
            return false;
        }

        // Add activity system to global namespace
        window.ActivitySystem = {
            createTimeline: ActivitySystem.createTimeline,
            createCard: ActivitySystem.createCard,
            createAnalytics: ActivitySystem.createAnalytics,
            createFeed: ActivitySystem.createFeed
        };

        return true;
    }

    static createTimeline(containerId, entityType, entityId, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container ${containerId} not found`);
            return null;
        }

        return new ActivityTimeline(container, {
            entityType,
            entityId,
            ...options
        });
    }

    static createCard(containerId, activity, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container ${containerId} not found`);
            return null;
        }

        return new ActivityCard(container, activity, options);
    }

    static createAnalytics(containerId, entityType, entityId, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container ${containerId} not found`);
            return null;
        }

        return new ActivityAnalytics(container, {
            entityType,
            entityId,
            ...options
        });
    }

    static createFeed(containerId, entityType, entityId, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container ${containerId} not found`);
            return null;
        }

        const feed = document.createElement('div');
        feed.className = 'activity-feed';
        container.appendChild(feed);

        // Create filters
        const filtersContainer = document.createElement('div');
        filtersContainer.className = 'activity-filters-container';
        feed.appendChild(filtersContainer);

        const filters = new ActivityFilters(filtersContainer, {
            onFilterChange: (filters) => timeline.updateFilters(filters)
        });

        // Create timeline
        const timelineContainer = document.createElement('div');
        timelineContainer.className = 'activity-timeline-container';
        feed.appendChild(timelineContainer);

        const timeline = new ActivityTimeline(timelineContainer, {
            entityType,
            entityId,
            filters: options.filters || {},
            ...options
        });

        return { feed, filters, timeline };
    }

    static async preloadDependencies() {
        // Ensure ActivityService is available
        if (!window.ActivityService) {
            // Try to load it if not available
            const script = document.createElement('script');
            script.src = '/frontend/vanilla/js/services/activity.js';
            document.head.appendChild(script);
            
            await new Promise(resolve => {
                script.onload = resolve;
            });
        }

        // Load required styles
        const styles = [
            '/frontend/vanilla/css/components/activity.css'
        ];

        styles.forEach(style => {
            if (!document.querySelector(`link[href="${style}"]`)) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = style;
                document.head.appendChild(link);
            }
        });

        return true;
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        ActivitySystem.initialize();
    });
} else {
    ActivitySystem.initialize();
}

// Example usage:
/*
// Create activity timeline for a board
const timeline = ActivitySystem.createTimeline('board-activity', 'board', 'board123', {
    autoRefresh: true,
    maxItems: 50
});

// Create activity feed for workspace
const feed = ActivitySystem.createFeed('workspace-feed', 'workspace', 'workspace123', {
    filters: { type: ['board.created', 'item.updated'] }
});

// Create activity analytics
const analytics = ActivitySystem.createAnalytics('analytics-chart', 'board', 'board123');
*/

export default ActivitySystem;