/**
 * ActivityItem Component
 * Displays a single activity entry with detailed information
 */

class ActivityItem {
    constructor(container, activity, options = {}) {
        this.container = container;
        this.activity = window.ActivityService.formatActivity(activity);
        this.options = {
            compact: false,
            showUser: true,
            showTimestamp: true,
            showChanges: true,
            interactive: true,
            ...options
        };
        
        this.init();
    }

    init() {
        this.render();
        this.setupEventListeners();
    }

    render() {
        const html = this.options.compact 
            ? this.renderCompact()
            : this.renderFull();

        this.container.innerHTML = html;
    }

    renderCompact() {
        const { icon, color, displayText, user, timestamp } = this.activity;
        
        return `
            <div class="activity-item activity-item-compact">
                <div class="activity-icon ${color}">${icon}</div>
                <div class="activity-content">
                    <div class="activity-text">${displayText}</div>
                    <div class="activity-meta">
                        ${this.options.showUser ? `<span class="activity-user">${user.name}</span>` : ''}
                        ${this.options.showTimestamp ? `<span class="activity-time">${this.formatRelativeTime(timestamp)}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    renderFull() {
        const { icon, color, displayText, user, timestamp, type, changes, entity_title } = this.activity;
        
        return `
            <div class="activity-item activity-item-full">
                <div class="activity-header">
                    <div class="activity-icon-container">
                        <div class="activity-icon ${color}">${icon}</div>
                    </div>
                    <div class="activity-header-content">
                        <div class="activity-display-text">${displayText}</div>
                        <div class="activity-meta">
                            ${this.options.showUser ? `
                                <div class="activity-user-info">
                                    <img class="activity-avatar" src="${user.avatar_url || '/assets/default-avatar.png'}" alt="${user.name}" />
                                    <span class="activity-user-name">${user.name}</span>
                                </div>
                            ` : ''}
                            ${this.options.showTimestamp ? `
                                <time class="activity-timestamp" datetime="${timestamp.toISOString()}">
                                    ${this.formatRelativeTime(timestamp)}
                                </time>
                            ` : ''}
                        </div>
                    </div>
                    ${this.options.interactive ? `
                        <div class="activity-actions">
                            <button class="btn btn-icon activity-menu-btn" title="More options">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="1"></circle>
                                    <circle cx="12" cy="5" r="1"></circle>
                                    <circle cx="12" cy="19" r="1"></circle>
                                </svg>
                            </button>
                        </div>
                    ` : ''}
                </div>
                
                ${this.options.showChanges && changes ? this.renderChanges(changes) : ''}
                
                <div class="activity-footer">
                    <div class="activity-details">
                        <span class="activity-type">${type}</span>
                        ${entity_title ? `<span class="activity-entity">on "${entity_title}"</span>` : ''}
                    </div>
                </div>
                
                <div class="activity-menu" style="display: none;">
                    <button class="menu-item" data-action="view-details">View Details</button>
                    <button class="menu-item" data-action="copy-link">Copy Link</button>
                    <button class="menu-item" data-action="share">Share</button>
                </div>
            </div>
        `;
    }

    renderChanges(changes) {
        if (!changes || Object.keys(changes).length === 0) return '';

        const changeItems = Object.entries(changes)
            .map(([field, change]) => {
                if (typeof change === 'object' && change.from !== undefined && change.to !== undefined) {
                    return this.renderFieldChange(field, change.from, change.to);
                } else if (Array.isArray(change)) {
                    return this.renderArrayChange(field, change);
                } else {
                    return this.renderSimpleChange(field, change);
                }
            })
            .join('');

        return `
            <div class="activity-changes">
                <div class="changes-header">Changes:</div>
                <div class="changes-list">
                    ${changeItems}
                </div>
            </div>
        `;
    }

    renderFieldChange(field, from, to) {
        const fromDisplay = this.formatChangeValue(from);
        const toDisplay = this.formatChangeValue(to);
        
        return `
            <div class="change-item">
                <div class="change-field">${this.formatFieldName(field)}</div>
                <div class="change-values">
                    <span class="change-from">${fromDisplay}</span>
                    <span class="change-arrow">→</span>
                    <span class="change-to">${toDisplay}</span>
                </div>
            </div>
        `;
    }

    renderArrayChange(field, change) {
        const added = change.added || [];
        const removed = change.removed || [];
        
        return `
            <div class="change-item">
                <div class="change-field">${this.formatFieldName(field)}</div>
                ${added.length > 0 ? `
                    <div class="change-added">
                        <span class="change-label">Added:</span>
                        ${added.map(item => `<span class="change-tag">+${this.formatChangeValue(item)}</span>`).join('')}
                    </div>
                ` : ''}
                ${removed.length > 0 ? `
                    <div class="change-removed">
                        <span class="change-label">Removed:</span>
                        ${removed.map(item => `<span class="change-tag">-${this.formatChangeValue(item)}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderSimpleChange(field, value) {
        return `
            <div class="change-item">
                <div class="change-field">${this.formatFieldName(field)}</div>
                <div class="change-value">${this.formatChangeValue(value)}</div>
            </div>
        `;
    }

    formatFieldName(field) {
        return field
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    }

    formatChangeValue(value) {
        if (value === null || value === undefined) return 'None';
        if (typeof value === 'boolean') return value ? 'Yes' : 'No';
        if (typeof value === 'string' && value.length > 50) {
            return value.substring(0, 47) + '...';
        }
        return String(value);
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
        if (!this.options.interactive) return;

        const menuBtn = this.container.querySelector('.activity-menu-btn');
        const menu = this.container.querySelector('.activity-menu');
        
        if (menuBtn && menu) {
            menuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleMenu(menu);
            });
            
            menu.addEventListener('click', (e) => {
                e.stopPropagation();
                if (e.target.classList.contains('menu-item')) {
                    this.handleMenuAction(e.target.dataset.action);
                }
            });
            
            document.addEventListener('click', () => {
                menu.style.display = 'none';
            });
        }
    }

    toggleMenu(menu) {
        const isVisible = menu.style.display === 'block';
        menu.style.display = isVisible ? 'none' : 'block';
    }

    handleMenuAction(action) {
        switch (action) {
            case 'view-details':
                this.showDetails();
                break;
            case 'copy-link':
                this.copyActivityLink();
                break;
            case 'share':
                this.shareActivity();
                break;
        }
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
        const { type, action, entity_type, entity_id, entity_title, user, timestamp, changes, metadata } = this.activity;
        
        return `
            <div class="detailed-activity">
                <div class="activity-section">
                    <h4>Basic Information</h4>
                    <dl class="activity-details-list">
                        <dt>Activity Type:</dt>
                        <dd>${type}</dd>
                        <dt>Action:</dt>
                        <dd>${action}</dd>
                        <dt>Entity Type:</dt>
                        <dd>${entity_type}</dd>
                        <dt>Entity Title:</dt>
                        <dd>${entity_title || 'N/A'}</dd>
                        <dt>Entity ID:</dt>
                        <dd><code>${entity_id || 'N/A'}</code></dd>
                        <dt>Timestamp:</dt>
                        <dd>${timestamp.toLocaleString()}</dd>
                    </dl>
                </div>
                
                ${user ? `
                    <div class="activity-section">
                        <h4>User Information</h4>
                        <dl class="activity-details-list">
                            <dt>Name:</dt>
                            <dd>${user.name}</dd>
                            <dt>Email:</dt>
                            <dd>${user.email || 'N/A'}</dd>
                            <dt>User ID:</dt>
                            <dd><code>${user.id}</code></dd>
                        </dl>
                    </div>
                ` : ''}
                
                ${changes && Object.keys(changes).length > 0 ? `
                    <div class="activity-section">
                        <h4>Changes Made</h4>
                        ${this.renderChanges(changes)}
                    </div>
                ` : ''}
                
                ${metadata ? `
                    <div class="activity-section">
                        <h4>Additional Metadata</h4>
                        <pre class="activity-metadata">${JSON.stringify(metadata, null, 2)}</pre>
                    </div>
                ` : ''}
            </div>
        `;
    }

    copyActivityLink() {
        const url = `${window.location.origin}/activity/${this.activity.id}`;
        navigator.clipboard.writeText(url).then(() => {
            this.showToast('Activity link copied to clipboard');
        });
    }

    shareActivity() {
        if (navigator.share) {
            navigator.share({
                title: 'Activity',
                text: this.activity.displayText,
                url: `${window.location.origin}/activity/${this.activity.id}`
            });
        } else {
            this.copyActivityLink();
        }
    }

    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'activity-toast';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--bg-primary);
            color: var(--text-primary);
            padding: 12px 24px;
            border-radius: var(--border-radius-md);
            box-shadow: var(--shadow-lg);
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    updateActivity(activity) {
        this.activity = window.ActivityService.formatActivity(activity);
        this.render();
    }

    destroy() {
        this.container.innerHTML = '';
    }
}

// CSS for ActivityItem
const activityItemStyles = `
<style>
.activity-item {
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius-md);
    margin-bottom: var(--spacing-sm);
    transition: all 0.2s ease;
}

.activity-item:hover {
    box-shadow: var(--shadow-sm);
}

.activity-item-compact {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    padding: var(--spacing-sm) var(--spacing-md);
}

.activity-item-full {
    padding: var(--spacing-md);
}

.activity-header {
    display: flex;
    gap: var(--spacing-md);
    align-items: flex-start;
}

.activity-icon-container {
    flex-shrink: 0;
}

.activity-icon {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    background: var(--bg-secondary);
}

.activity-header-content {
    flex: 1;
    min-width: 0;
}

.activity-display-text {
    font-size: var(--font-size-sm);
    color: var(--text-primary);
    margin-bottom: var(--spacing-xs);
}

.activity-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--spacing-sm);
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
}

.activity-user-info {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
}

.activity-avatar {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    object-fit: cover;
}

.activity-timestamp {
    white-space: nowrap;
}

.activity-actions {
    flex-shrink: 0;
}

.activity-changes {
    margin-top: var(--spacing-sm);
    padding: var(--spacing-sm);
    background: var(--bg-secondary);
    border-radius: var(--border-radius-sm);
}

.changes-header {
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    color: var(--text-secondary);
    margin-bottom: var(--spacing-xs);
}

.changes-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
}

.change-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.change-field {
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    color: var(--text-primary);
}

.change-values {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    font-size: var(--font-size-xs);
}

.change-from {
    color: var(--text-danger);
    text-decoration: line-through;
}

.change-arrow {
    color: var(--text-secondary);
}

.change-to {
    color: var(--text-success);
}

.change-added,
.change-removed {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    font-size: var(--font-size-xs);
}

.change-label {
    font-weight: var(--font-weight-semibold);
    color: var(--text-secondary);
}

.change-tag {
    padding: 2px 6px;
    border-radius: var(--border-radius-sm);
    font-size: 10px;
}

.change-added .change-tag {
    background: var(--bg-success);
    color: var(--text-success);
}

.change-removed .change-tag {
    background: var(--bg-danger);
    color: var(--text-danger);
}

.activity-footer {
    margin-top: var(--spacing-sm);
    padding-top: var(--spacing-sm);
    border-top: 1px solid var(--border-color);
}

.activity-details {
    display: flex;
    gap: var(--spacing-sm);
    font-size: var(--font-size-xs);
    color: var(--text-tertiary);
}

.activity-menu {
    position: absolute;
    top: 100%;
    right: 0;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius-md);
    box-shadow: var(--shadow-lg);
    z-index: 100;
    min-width: 120px;
}

.menu-item {
    display: block;
    width: 100%;
    padding: var(--spacing-sm) var(--spacing-md);
    background: none;
    border: none;
    text-align: left;
    font-size: var(--font-size-sm);
    color: var(--text-primary);
    cursor: pointer;
}

.menu-item:hover {
    background: var(--bg-secondary);
}

.activity-details-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.modal-overlay {
    background: var(--bg-primary);
    border-radius: var(--border-radius-lg);
    max-width: 600px;
    max-height: 80vh;
    overflow-y: auto;
    margin: var(--spacing-lg);
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-lg);
    border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
    margin: 0;
}

.modal-close {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: var(--text-secondary);
}

.modal-body {
    padding: var(--spacing-lg);
}

.detailed-activity {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
}

.activity-section h4 {
    margin-bottom: var(--spacing-sm);
    font-size: var(--font-size-md);
}

.activity-details-list {
    display: grid;
    grid-template-columns: 100px 1fr;
    gap: var(--spacing-sm);
    font-size: var(--font-size-sm);
}

.activity-details-list dt {
    font-weight: var(--font-weight-semibold);
    color: var(--text-secondary);
}

.activity-metadata {
    background: var(--bg-secondary);
    padding: var(--spacing-sm);
    border-radius: var(--border-radius-sm);
    font-family: monospace;
    font-size: var(--font-size-xs);
    overflow-x: auto;
}

@media (max-width: 768px) {
    .activity-item-full {
        padding: var(--spacing-sm);
    }
    
    .activity-header {
        flex-direction: column;
        align-items: stretch;
    }
    
    .activity-actions {
        align-self: flex-end;
    }
    
    .change-values {
        flex-direction: column;
        align-items: flex-start;
    }
}
</style>
`;

// Add styles to document
if (!document.querySelector('#activity-item-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'activity-item-styles';
    styleSheet.textContent = activityItemStyles;
    document.head.appendChild(styleSheet);
}

export default ActivityItem;