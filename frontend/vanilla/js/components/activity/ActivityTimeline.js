/**
 * ActivityTimeline Component
 * Displays activities in a chronological timeline format
 */

class ActivityTimeline {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            entityType: null,
            entityId: null,
            filters: {},
            autoRefresh: false,
            refreshInterval: 30000, // 30 seconds
            maxItems: null,
            showLoadMore: true,
            ...options
        };
        
        this.activities = [];
        this.filteredActivities = [];
        this.currentPage = 1;
        this.pageSize = 20;
        this.isLoading = false;
        this.hasMore = true;
        this.unsubscribe = null;
        
        this.init();
    }

    async init() {
        this.setupDOM();
        this.setupEventListeners();
        
        if (this.options.autoRefresh) {
            this.startAutoRefresh();
        }
        
        await this.loadActivities();
    }

    setupDOM() {
        this.container.innerHTML = `
            <div class="activity-timeline">
                <div class="timeline-header">
                    <h3 class="timeline-title">Activity Timeline</h3>
                    <div class="timeline-controls">
                        <button class="btn btn-icon refresh-btn" title="Refresh">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="timeline-content">
                    <div class="timeline-items"></div>
                    <div class="timeline-footer">
                        <button class="btn btn-secondary load-more-btn" style="display: none;">
                            Load More
                        </button>
                        <div class="timeline-loading" style="display: none;">
                            <div class="spinner"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.elements = {
            title: this.container.querySelector('.timeline-title'),
            refreshBtn: this.container.querySelector('.refresh-btn'),
            items: this.container.querySelector('.timeline-items'),
            loadMoreBtn: this.container.querySelector('.load-more-btn'),
            loading: this.container.querySelector('.timeline-loading')
        };
    }

    setupEventListeners() {
        this.elements.refreshBtn.addEventListener('click', () => this.refresh());
        this.elements.loadMoreBtn.addEventListener('click', () => this.loadMore());
        
        // Subscribe to real-time updates
        if (this.options.entityType && this.options.entityId) {
            this.unsubscribe = window.ActivityService.subscribeToActivityUpdates(
                (activity) => {
                    this.handleNewActivity(activity);
                },
                {
                    entityType: this.options.entityType,
                    entityId: this.options.entityId
                }
            );
        }
    }

    async loadActivities(append = false) {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.showLoading(true);
        
        try {
            let activities;
            
            if (this.options.entityType && this.options.entityId) {
                activities = await window.ActivityService.getActivities(
                    this.options.entityType,
                    this.options.entityId,
                    {
                        page: this.currentPage,
                        limit: this.pageSize,
                        ...this.options.filters
                    }
                );
            } else {
                activities = await window.ActivityService.getGlobalActivities({
                    page: this.currentPage,
                    limit: this.pageSize,
                    ...this.options.filters
                });
            }

            // Format activities
            activities = activities.map(a => window.ActivityService.formatActivity(a));
            
            if (append) {
                this.activities = [...this.activities, ...activities];
            } else {
                this.activities = activities;
            }
            
            // Apply filters
            this.applyFilters();
            
            // Check if more activities are available
            this.hasMore = activities.length === this.pageSize;
            
            // Update UI
            this.render();
            
        } catch (error) {
            console.error('Error loading activities:', error);
            this.showError('Failed to load activities');
        } finally {
            this.isLoading = false;
            this.showLoading(false);
        }
    }

    render() {
        if (this.filteredActivities.length === 0) {
            this.showEmptyState();
            return;
        }

        const groupedActivities = this.groupByDate(this.filteredActivities);
        const html = Object.entries(groupedActivities)
            .map(([date, activities]) => this.renderDateGroup(date, activities))
            .join('');

        this.elements.items.innerHTML = html;
        this.elements.loadMoreBtn.style.display = this.hasMore ? 'block' : 'none';
    }

    renderDateGroup(date, activities) {
        const formattedDate = this.formatDate(date);
        
        return `
            <div class="timeline-date-group">
                <div class="timeline-date">${formattedDate}</div>
                <div class="timeline-activities">
                    ${activities.map(activity => this.renderActivity(activity)).join('')}
                </div>
            </div>
        `;
    }

    renderActivity(activity) {
        const icon = window.ActivityService.getActivityIcon(activity.type);
        const color = window.ActivityService.getActivityColor(activity.type);
        const time = this.formatTime(activity.timestamp);
        
        return `
            <div class="timeline-item" data-activity-id="${activity.id}">
                <div class="timeline-marker">
                    <span class="timeline-icon ${color}">${icon}</span>
                </div>
                <div class="timeline-content-item">
                    <div class="timeline-time">${time}</div>
                    <div class="timeline-text">${activity.displayText}</div>
                    <div class="timeline-meta">
                        <span class="timeline-user">${activity.user?.name || 'Unknown'}</span>
                        ${activity.changes ? this.renderChanges(activity.changes) : ''}
                    </div>
                </div>
            </div>
        `;
    }

    renderChanges(changes) {
        if (!changes || Object.keys(changes).length === 0) return '';
        
        const changeItems = Object.entries(changes)
            .map(([field, change]) => {
                if (typeof change === 'object' && change.from !== undefined && change.to !== undefined) {
                    return `<span class="change-item">${field}: ${change.from} → ${change.to}</span>`;
                }
                return `<span class="change-item">${field} updated</span>`;
            })
            .join(', ');

        return `<div class="timeline-changes">Changes: ${changeItems}</div>`;
    }

    groupByDate(activities) {
        const grouped = {};
        
        activities.forEach(activity => {
            const date = activity.timestamp.toDateString();
            if (!grouped[date]) {
                grouped[date] = [];
            }
            grouped[date].push(activity);
        });

        return grouped;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString();
        }
    }

    formatTime(date) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    applyFilters() {
        this.filteredActivities = window.ActivityService.filterActivities(
            this.activities,
            this.options.filters
        );

        if (this.options.maxItems) {
            this.filteredActivities = this.filteredActivities.slice(0, this.options.maxItems);
        }
    }

    async refresh() {
        this.currentPage = 1;
        this.hasMore = true;
        await this.loadActivities(false);
    }

    async loadMore() {
        if (!this.hasMore || this.isLoading) return;
        
        this.currentPage++;
        await this.loadActivities(true);
    }

    handleNewActivity(activity) {
        const formattedActivity = window.ActivityService.formatActivity(activity);
        
        // Add to beginning of array
        this.activities.unshift(formattedActivity);
        
        // Apply filters
        this.applyFilters();
        
        // Update UI
        this.render();
        
        // Show notification
        this.showNewActivityNotification(formattedActivity);
    }

    showNewActivityNotification(activity) {
        const notification = document.createElement('div');
        notification.className = 'new-activity-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${window.ActivityService.getActivityIcon(activity.type)}</span>
                <span class="notification-text">${activity.displayText}</span>
            </div>
            <button class="notification-close">×</button>
        `;
        
        this.container.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            notification.remove();
        }, 5000);
        
        // Close button
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });
    }

    showEmptyState() {
        this.elements.items.innerHTML = `
            <div class="timeline-empty">
                <div class="empty-icon">📋</div>
                <div class="empty-text">No activities found</div>
                ${this.options.filters ? '<div class="empty-subtext">Try adjusting your filters</div>' : ''}
            </div>
        `;
    }

    showError(message) {
        this.elements.items.innerHTML = `
            <div class="timeline-error">
                <div class="error-icon">⚠️</div>
                <div class="error-text">${message}</div>
                <button class="btn btn-secondary retry-btn">Retry</button>
            </div>
        `;
        
        this.elements.items.querySelector('.retry-btn').addEventListener('click', () => {
            this.refresh();
        });
    }

    showLoading(show) {
        this.elements.loading.style.display = show ? 'block' : 'none';
        if (show) {
            this.elements.loadMoreBtn.style.display = 'none';
        }
    }

    startAutoRefresh() {
        this.refreshInterval = setInterval(() => {
            this.refresh();
        }, this.options.refreshInterval);
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
    }

    updateFilters(filters) {
        this.options.filters = { ...this.options.filters, ...filters };
        this.applyFilters();
        this.render();
    }

    destroy() {
        this.stopAutoRefresh();
        if (this.unsubscribe) {
            this.unsubscribe();
        }
        this.container.innerHTML = '';
    }
}

// CSS for the timeline
const timelineStyles = `
<style>
.activity-timeline {
    background: var(--bg-primary);
    border-radius: var(--border-radius-lg);
    padding: var(--spacing-lg);
    box-shadow: var(--shadow-md);
}

.timeline-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-lg);
    padding-bottom: var(--spacing-md);
    border-bottom: 1px solid var(--border-color);
}

.timeline-title {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-semibold);
    color: var(--text-primary);
}

.timeline-controls {
    display: flex;
    gap: var(--spacing-sm);
}

.timeline-content {
    position: relative;
}

.timeline-activities {
    position: relative;
}

.timeline-activities::before {
    content: '';
    position: absolute;
    left: 12px;
    top: 0;
    bottom: 0;
    width: 2px;
    background: var(--border-color);
}

.timeline-date-group {
    margin-bottom: var(--spacing-lg);
}

.timeline-date {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--text-secondary);
    margin-bottom: var(--spacing-md);
    padding-left: 32px;
}

.timeline-item {
    display: flex;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-md);
    position: relative;
}

.timeline-marker {
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: var(--bg-primary);
    border: 2px solid var(--border-color);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1;
}

.timeline-icon {
    font-size: 12px;
}

.timeline-content-item {
    flex: 1;
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--bg-secondary);
    border-radius: var(--border-radius-md);
}

.timeline-time {
    font-size: var(--font-size-xs);
    color: var(--text-tertiary);
    margin-bottom: var(--spacing-xs);
}

.timeline-text {
    font-size: var(--font-size-sm);
    color: var(--text-primary);
    margin-bottom: var(--spacing-xs);
}

.timeline-meta {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
}

.timeline-changes {
    font-size: var(--font-size-xs);
    color: var(--text-tertiary);
    margin-top: var(--spacing-xs);
}

.change-item {
    background: var(--bg-tertiary);
    padding: 2px 6px;
    border-radius: var(--border-radius-sm);
    margin-right: 4px;
}

.timeline-footer {
    text-align: center;
    margin-top: var(--spacing-lg);
}

.timeline-empty,
.timeline-error {
    text-align: center;
    padding: var(--spacing-xl);
    color: var(--text-secondary);
}

.empty-icon,
.error-icon {
    font-size: 48px;
    margin-bottom: var(--spacing-md);
}

.empty-text,
.error-text {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-semibold);
    margin-bottom: var(--spacing-sm);
}

.empty-subtext,
.retry-btn {
    color: var(--text-tertiary);
}

.new-activity-notification {
    position: absolute;
    top: 0;
    right: 0;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius-md);
    padding: var(--spacing-sm);
    box-shadow: var(--shadow-lg);
    max-width: 300px;
    z-index: 1000;
    animation: slideIn 0.3s ease;
}

.notification-content {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
}

.notification-close {
    position: absolute;
    top: 4px;
    right: 4px;
    background: none;
    border: none;
    font-size: 16px;
    cursor: pointer;
    color: var(--text-secondary);
}

@keyframes slideIn {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

@media (max-width: 768px) {
    .activity-timeline {
        padding: var(--spacing-md);
    }
    
    .timeline-activities::before {
        left: 8px;
    }
    
    .timeline-date {
        padding-left: 28px;
    }
}
</style>
`;

// Add styles to document
if (!document.querySelector('#activity-timeline-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'activity-timeline-styles';
    styleSheet.textContent = timelineStyles;
    document.head.appendChild(styleSheet);
}

export default ActivityTimeline;