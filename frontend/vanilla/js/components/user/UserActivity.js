/**
 * User Activity Component
 * Displays comprehensive user activity logs and analytics
 */

import { userManagementService } from '../../services/userManagement.js';
import { EventEmitter } from '../../utils/eventEmitter.js';

export class UserActivity extends EventEmitter {
  constructor(container, userId, options = {}) {
    super();
    this.container = container;
    this.userId = userId;
    this.options = {
      showFilters: true,
      showAnalytics: true,
      showTimeline: true,
      showExports: true,
      initialPage: 1,
      limit: 50,
      ...options
    };
    
    this.activities = [];
    this.filteredActivities = [];
    this.currentPage = this.options.initialPage;
    this.totalPages = 1;
    this.filters = {
      type: '',
      dateRange: '',
      action: '',
      workspaceId: '',
      boardId: ''
    };
    this.analytics = null;
    
    this.init();
  }

  async init() {
    this.render();
    this.attachEventListeners();
    await this.loadActivities();
    await this.loadAnalytics();
  }

  render() {
    this.container.innerHTML = `
      <div class="user-activity-container">
        ${this.renderHeader()}
        
        ${this.options.showFilters ? this.renderFilters() : ''}
        
        ${this.options.showAnalytics ? this.renderAnalytics() : ''}
        
        <div class="activity-content">
          ${this.options.showTimeline ? this.renderTimeline() : ''}
          ${this.renderActivityList()}
        </div>
        
        <div class="activity-footer">
          ${this.renderPagination()}
        </div>
      </div>
    `;
  }

  renderHeader() {
    return `
      <div class="activity-header">
        <h2>User Activity</h2>
        <div class="header-controls">
          ${this.options.showExports ? `
            <button class="btn btn-outline" data-action="export-csv">
              <i class="icon-download"></i> Export CSV
            </button>
            <button class="btn btn-outline" data-action="export-pdf">
              <i class="icon-file"></i> Export PDF
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  renderFilters() {
    return `
      <div class="activity-filters">
        <div class="filter-row">
          <div class="filter-group">
            <label>Activity Type</label>
            <select class="form-control" data-filter="type">
              <option value="">All Types</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
              <option value="view">View</option>
              <option value="login">Login</option>
              <option value="logout">Logout</option>
              <option value="invite">Invite</option>
              <option value="permission">Permission Change</option>
            </select>
          </div>
          
          <div class="filter-group">
            <label>Date Range</label>
            <select class="form-control" data-filter="dateRange">
              <option value="">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
          
          <div class="filter-group">
            <label>Action</label>
            <select class="form-control" data-filter="action">
              <option value="">All Actions</option>
              <option value="board_created">Board Created</option>
              <option value="board_updated">Board Updated</option>
              <option value="board_deleted">Board Deleted</option>
              <option value="item_created">Item Created</option>
              <option value="item_updated">Item Updated</option>
              <option value="item_deleted">Item Deleted</option>
              <option value="comment_added">Comment Added</option>
              <option value="member_invited">Member Invited</option>
              <option value="permission_changed">Permission Changed</option>
            </select>
          </div>
        </div>
        
        <div class="filter-row">
          ${this.renderWorkspaceFilter()}
          ${this.renderBoardFilter()}
          
          <div class="filter-actions">
            <button class="btn btn-secondary" data-action="clear-filters">Clear All</button>
            <button class="btn btn-primary" data-action="apply-filters">Apply Filters</button>
          </div>
        </div>
      </div>
    `;
  }

  renderWorkspaceFilter() {
    return `
      <div class="filter-group">
        <label>Workspace</label>
        <select class="form-control" data-filter="workspaceId">
          <option value="">All Workspaces</option>
          <!-- Dynamically populated -->
        </select>
      </div>
    `;
  }

  renderBoardFilter() {
    return `
      <div class="filter-group">
        <label>Board</label>
        <select class="form-control" data-filter="boardId">
          <option value="">All Boards</option>
          <!-- Dynamically populated -->
        </select>
      </div>
    `;
  }

  renderAnalytics() {
    if (!this.analytics) return '<div class="analytics-loading">Loading analytics...</div>';
    
    return `
      <div class="activity-analytics">
        <div class="analytics-grid">
          <div class="analytics-card">
            <div class="analytics-value">${this.analytics.totalActivities}</div>
            <div class="analytics-label">Total Activities</div>
          </div>
          
          <div class="analytics-card">
            <div class="analytics-value">${this.analytics.dailyAverage}</div>
            <div class="analytics-label">Daily Average</div>
          </div>
          
          <div class="analytics-card">
            <div class="analytics-value">${this.analytics.lastActive}</div>
            <div class="analytics-label">Last Active</div>
          </div>
          
          <div class="analytics-card">
            <div class="analytics-value">${this.analytics.mostActiveDay}</div>
            <div class="analytics-label">Most Active Day</div>
          </div>
        </div>
        
        <div class="analytics-chart">
          <canvas id="activityChart" width="400" height="200"></canvas>
        </div>
      </div>
    `;
  }

  renderTimeline() {
    return `
      <div class="activity-timeline">
        <div class="timeline-header">
          <h3>Activity Timeline</h3>
          <div class="timeline-controls">
            <button class="btn btn-sm btn-outline" data-action="filter-today">Today</button>
            <button class="btn btn-sm btn-outline" data-action="filter-week">This Week</button>
            <button class="btn btn-sm btn-outline" data-action="filter-month">This Month</button>
          </div>
        </div>
      </div>
    `;
  }

  renderActivityList() {
    if (this.filteredActivities.length === 0) {
      return `
        <div class="empty-state">
          <i class="icon-activity"></i>
          <h3>No activities found</h3>
          <p>Try adjusting your filters to see more results.</p>
        </div>
      `;
    }

    return `
      <div class="activity-list">
        ${this.filteredActivities.map(activity => this.renderActivityItem(activity)).join('')}
      </div>
    `;
  }

  renderActivityItem(activity) {
    const icon = this.getActivityIcon(activity.type);
    const badge = this.getActivityBadge(activity.type);
    
    return `
      <div class="activity-item" data-activity-id="${activity.id}">
        <div class="activity-timeline-marker"></div>
        <div class="activity-content">
          <div class="activity-icon ${badge.class}">
            <i class="${icon}"></i>
          </div>
          
          <div class="activity-details">
            <div class="activity-header">
              <h4 class="activity-title">${activity.title}</h4>
              <span class="activity-time">${this.formatActivityTime(activity.createdAt)}</span>
            </div>
            
            <p class="activity-description">${activity.description}</p>
            
            ${this.renderActivityMetadata(activity)}
            
            ${activity.details ? `
              <div class="activity-details-expanded">
                ${this.renderActivityDetails(activity.details)}
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }

  renderActivityMetadata(activity) {
    const metadata = [];
    
    if (activity.workspaceName) {
      metadata.push(`<span class="metadata-item"><i class="icon-workspace"></i> ${activity.workspaceName}</span>`);
    }
    
    if (activity.boardName) {
      metadata.push(`<span class="metadata-item"><i class="icon-board"></i> ${activity.boardName}</span>`);
    }
    
    if (activity.ipAddress) {
      metadata.push(`<span class="metadata-item"><i class="icon-location"></i> ${activity.ipAddress}</span>`);
    }
    
    if (activity.userAgent) {
      metadata.push(`<span class="metadata-item"><i class="icon-device"></i> ${this.getDeviceType(activity.userAgent)}</span>`);
    }
    
    return metadata.length > 0 ? `<div class="activity-metadata">${metadata.join('')}</div>` : '';
  }

  renderActivityDetails(details) {
    if (!details) return '';
    
    return Object.entries(details).map(([key, value]) => `
      <div class="detail-item">
        <span class="detail-key">${this.formatDetailKey(key)}:</span>
        <span class="detail-value">${this.formatDetailValue(key, value)}</span>
      </div>
    `).join('');
  }

  renderPagination() {
    if (this.totalPages <= 1) return '';
    
    return `
      <div class="pagination">
        <button class="btn btn-outline" data-action="prev-page" ${this.currentPage === 1 ? 'disabled' : ''}>
          Previous
        </button>
        <span class="page-info">
          Page ${this.currentPage} of ${this.totalPages}
        </span>
        <button class="btn btn-outline" data-action="next-page" ${this.currentPage === this.totalPages ? 'disabled' : ''}>
          Next
        </button>
      </div>
    `;
  }

  getActivityIcon(type) {
    const icons = {
      create: 'icon-plus',
      update: 'icon-edit',
      delete: 'icon-trash',
      view: 'icon-eye',
      login: 'icon-login',
      logout: 'icon-logout',
      invite: 'icon-user-plus',
      permission: 'icon-shield'
    };
    return icons[type] || 'icon-activity';
  }

  getActivityBadge(type) {
    const badges = {
      create: { class: 'badge-success' },
      update: { class: 'badge-warning' },
      delete: { class: 'badge-danger' },
      view: { class: 'badge-info' },
      login: { class: 'badge-primary' },
      logout: { class: 'badge-secondary' },
      invite: { class: 'badge-purple' },
      permission: { class: 'badge-warning' }
    };
    return badges[type] || { class: 'badge-secondary' };
  }

  formatActivityTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    if (diffMins < 10080) return `${Math.floor(diffMins / 1440)}d ago`;
    
    return date.toLocaleDateString();
  }

  formatDetailKey(key) {
    return key.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  formatDetailValue(key, value) {
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    if (key.includes('date') || key.includes('at')) {
      return new Date(value).toLocaleString();
    }
    return value;
  }

  getDeviceType(userAgent) {
    if (/mobile/i.test(userAgent)) return 'Mobile';
    if (/tablet/i.test(userAgent)) return 'Tablet';
    return 'Desktop';
  }

  attachEventListeners() {
    // Filter controls
    const filterInputs = this.container.querySelectorAll('[data-filter]');
    filterInputs.forEach(input => {
      input.addEventListener('change', (e) => {
        this.filters[e.target.dataset.filter] = e.target.value;
      });
    });

    // Filter actions
    this.container.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      if (action) {
        this.handleAction(action);
      }
    });

    // Pagination
    this.container.addEventListener('click', (e) => {
      if (e.target.dataset.action === 'prev-page') {
        this.goToPage(this.currentPage - 1);
      } else if (e.target.dataset.action === 'next-page') {
        this.goToPage(this.currentPage + 1);
      }
    });
  }

  handleAction(action) {
    switch (action) {
      case 'apply-filters':
        this.applyFilters();
        break;
      case 'clear-filters':
        this.clearFilters();
        break;
      case 'filter-today':
        this.setDateRange('today');
        break;
      case 'filter-week':
        this.setDateRange('week');
        break;
      case 'filter-month':
        this.setDateRange('month');
        break;
      case 'export-csv':
        this.exportData('csv');
        break;
      case 'export-pdf':
        this.exportData('pdf');
        break;
    }
  }

  async loadActivities() {
    try {
      const data = await userManagementService.getUserActivity(this.userId, {
        limit: this.options.limit,
        offset: (this.currentPage - 1) * this.options.limit,
        ...this.filters
      });
      
      this.activities = data.activities || data;
      this.filteredActivities = this.activities;
      this.totalPages = Math.ceil((data.total || this.activities.length) / this.options.limit);
      
      this.render();
    } catch (error) {
      console.error('Error loading activities:', error);
      this.showError('Failed to load user activities');
    }
  }

  async loadAnalytics() {
    try {
      // Generate analytics from activities
      if (this.activities.length > 0) {
        this.analytics = this.calculateAnalytics(this.activities);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  }

  calculateAnalytics(activities) {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const recentActivities = activities.filter(a => new Date(a.createdAt) >= oneWeekAgo);
    
    // Calculate daily average
    const dailyAverage = Math.round(recentActivities.length / 7);
    
    // Find most active day
    const dayCounts = {};
    activities.forEach(a => {
      const day = new Date(a.createdAt).toLocaleDateString();
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    });
    
    const mostActiveDay = Object.entries(dayCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';
    
    // Find last activity
    const lastActivity = activities[0] ? 
      this.formatActivityTime(activities[0].createdAt) : 'Never';
    
    return {
      totalActivities: activities.length,
      dailyAverage,
      lastActive: lastActivity,
      mostActiveDay
    };
  }

  applyFilters() {
    this.currentPage = 1;
    this.loadActivities();
  }

  clearFilters() {
    this.filters = {
      type: '',
      dateRange: '',
      action: '',
      workspaceId: '',
      boardId: ''
    };
    
    const filterInputs = this.container.querySelectorAll('[data-filter]');
    filterInputs.forEach(input => {
      input.value = '';
    });
    
    this.loadActivities();
  }

  setDateRange(range) {
    this.filters.dateRange = range;
    this.loadActivities();
  }

  goToPage(page) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadActivities();
    }
  }

  async exportData(format) {
    try {
      const data = await userManagementService.getUserActivity(this.userId, {
        ...this.filters,
        limit: 1000 // Get all data for export
      });
      
      if (format === 'csv') {
        this.exportToCSV(data.activities || data);
      } else if (format === 'pdf') {
        this.exportToPDF(data.activities || data);
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      this.showError('Failed to export data');
    }
  }

  exportToCSV(activities) {
    const headers = ['Date', 'Type', 'Action', 'Title', 'Description', 'Workspace', 'Board'];
    const rows = activities.map(a => [
      new Date(a.createdAt).toISOString(),
      a.type,
      a.action,
      a.title,
      a.description,
      a.workspaceName || '',
      a.boardName || ''
    ]);
    
    const csv = [headers, ...rows].map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');
    
    this.downloadFile(csv, 'user-activity.csv', 'text/csv');
  }

  exportToPDF(activities) {
    // Implementation for PDF export
    console.log('Exporting to PDF:', activities);
  }

  downloadFile(content, filename, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    this.container.appendChild(errorDiv);
    
    setTimeout(() => errorDiv.remove(), 5000);
  }

  async refresh() {
    await this.loadActivities();
    await this.loadAnalytics();
  }

  destroy() {
    this.container.innerHTML = '';
    this.removeAllListeners();
  }
}