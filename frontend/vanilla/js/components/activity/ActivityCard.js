/**
 * ActivityCard Component
 * Displays activities in card/masonry layout
 */

class ActivityCard {
    constructor(container, activity, options = {}) {
        this.container = container;
        this.activity = window.ActivityService.formatActivity(activity);
        this.options = {
            compact: false,
            showUser: true,
            showTimestamp: true,
            showPreview: true,
            ...options
        };
        
        this.init();
    }

    init() {
        this.render();
        this.setupEventListeners();
    }

    render() {
        const html = this.options.compact ? this.renderCompact() : this.renderFull();
        this.container.innerHTML = html;
    }

    renderCompact() {
        const { icon, color, displayText, user, timestamp } = this.activity;
        
        return `
            <div class="activity-card activity-card-compact">
                <div class="card-header">
                    <div class="card-icon ${color}">${icon}</div>
                    <div class="card-meta">
                        <div class="card-text">${displayText}</div>
                        <div class="card-time">${this.formatRelativeTime(timestamp)}</div>
                    </div>
                </div>
            </div>
        `;
    }

    renderFull() {
        const { icon, color, displayText, user, timestamp, entity_title, changes } = this.activity;
        
        return `
            <div class="activity-card activity-card-full">
                <div class="card-header">
                    <div class="card-icon ${color}">${icon}</div>
                    <div class="card-meta">
                        <div class="card-text">${displayText}</div>
                        <div class="card-details">
                            ${entity_title ? `<div class="card-entity">on "${entity_title}"</div>` : ''}
                            <div class="card-user-time">
                                ${this.options.showUser && user ? `
                                    <span class="card-user">
                                        <img class="card-avatar" src="${user.avatar_url || '/assets/default-avatar.png'}" alt="${user.name}" />
                                        ${user.name}
                                    </span>
                                ` : ''}
                                ${this.options.showTimestamp ? `
                                    <time class="card-time">${this.formatRelativeTime(timestamp)}</time>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
                
                ${this.options.showPreview && changes ? `
                    <div class="card-preview">
                        ${this.renderChangesPreview(changes)}
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderChangesPreview(changes) {
        if (!changes || Object.keys(changes).length === 0) return '';

        const fields = Object.keys(changes);
        const preview = fields.slice(0, 3).map(field => {
            const change = changes[field];
            if (typeof change === 'object' && change.from !== undefined && change.to !== undefined) {
                return `${field}: ${change.from} → ${change.to}`;
            }
            return `${field} updated`;
        });

        const more = fields.length > 3 ? ` +${fields.length - 3} more` : '';
        return `<div class="card-changes">${preview.join(', ')}${more}</div>`;
    }

    formatRelativeTime(date) {
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) return 'just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        
        const days = Math.floor(diffInSeconds / 86400);
        if (days === 1) return 'yesterday';
        if (days < 7) return `${days} days ago`;
        if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
        
        return date.toLocaleDateString();
    }

    setupEventListeners() {
        // Add hover effect
        this.container.addEventListener('mouseenter', () => {
            this.container.classList.add('hover');
        });

        this.container.addEventListener('mouseleave', () => {
            this.container.classList.remove('hover');
        });

        // Add click handler for details
        this.container.addEventListener('click', () => {
            this.showDetails();
        });
    }

    showDetails() {
        const modal = document.createElement('div');
        modal.className = 'activity-details-modal';
        modal.innerHTML = `
            <div class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Activity Details</h3>
                        <button class="modal-close">×</button>
                    </div>
                    <div class="modal-body">
                        ${this.renderDetailedActivity()}
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.remove();
        });
        
        modal.querySelector('.modal-overlay').addEventListener('click', (e) => {
            if (e.target === modal.querySelector('.modal-overlay')) {
                modal.remove();
            }
        });
    }

    renderDetailedActivity() {
        const { type, action, entity_type, entity_id, entity_title, user, timestamp, changes } = this.activity;
        
        return `
            <div class="detailed-activity">
                <div class="detail-section">
                    <h4>Activity</h4>
                    <p>${this.activity.displayText}</p>
                    <p><strong>Time:</strong> ${timestamp.toLocaleString()}</p>
                    ${entity_title ? `<p><strong>Entity:</strong> ${entity_title}</p>` : ''}
                </div>
                
                ${user ? `
                    <div class="detail-section">
                        <h4>User</h4>
                        <div class="user-info">
                            <img class="user-avatar" src="${user.avatar_url || '/assets/default-avatar.png'}" alt="${user.name}" />
                            <div>
                                <p><strong>Name:</strong> ${user.name}</p>
                                <p><strong>Email:</strong> ${user.email || 'N/A'}</p>
                            </div>
                        </div>
                    </div>
                ` : ''}
                
                ${changes ? `
                    <div class="detail-section">
                        <h4>Changes</h4>
                        <div class="changes-list">
                            ${Object.entries(changes).map(([field, change]) => `
                                <div class="change-item">
                                    <strong>${field}:</strong>
                                    ${typeof change === 'object' && change.from !== undefined && change.to !== undefined
                                        ? `<span class="change-from">${change.from}</span> → <span class="change-to">${change.to}</span>`
                                        : `<span>${change}</span>`
                                    }
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    updateActivity(activity) {
        this.activity = window.ActivityService.formatActivity(activity);
        this.render();
    }

    destroy() {
        this.container.innerHTML = '';
    }
}

// CSS for ActivityCard
const activityCardStyles = `
<style>
.activity-card {
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius-md);
    padding: var(--spacing-md);
    transition: all 0.2s ease;
    cursor: pointer;
}

.activity-card:hover {
    box-shadow: var(--shadow-md);
    transform: translateY(-2px);
}

.activity-card-compact {
    padding: var(--spacing-sm);
}

.card-header {
    display: flex;
    gap: var(--spacing-sm);
    align-items: flex-start;
}

.card-icon {
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    background: var(--bg-secondary);
}

.card-meta {
    flex: 1;
    min-width: 0;
}

.card-text {
    font-size: var(--font-size-sm);
    color: var(--text-primary);
    margin-bottom: var(--spacing-xs);
    line-height: 1.4;
}

.card-details {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
}

.card-entity {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
}

.card-user-time {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    flex-wrap: wrap;
}

.card-user {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
}

.card-avatar {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    object-fit: cover;
}

.card-time {
    font-size: var(--font-size-xs);
    color: var(--text-tertiary);
}

.card-preview {
    margin-top: var(--spacing-sm);
    padding-top: var(--spacing-sm);
    border-top: 1px solid var(--border-color);
}

.card-changes {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
    line-height: 1.3;
}

.detail-section {
    margin-bottom: var(--spacing-md);
}

.detail-section h4 {
    margin-bottom: var(--spacing-sm);
    font-size: var(--font-size-md);
}

.user-info {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
}

.user-avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    object-fit: cover;
}

.changes-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
}

.change-item {
    padding: var(--spacing-xs);
    background: var(--bg-secondary);
    border-radius: var(--border-radius-sm);
    font-size: var(--font-size-sm);
}

.change-from {
    color: var(--text-danger);
    text-decoration: line-through;
}

.change-to {
    color: var(--text-success);
}

@media (max-width: 768px) {
    .activity-card {
        padding: var(--spacing-sm);
    }
    
    .card-header {
        flex-direction: column;
        align-items: flex-start;
    }
}
</style>
`;

// Add styles to document
if (!document.querySelector('#activity-card-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'activity-card-styles';
    styleSheet.textContent = activityCardStyles;
    document.head.appendChild(styleSheet);
}

export default ActivityCard;