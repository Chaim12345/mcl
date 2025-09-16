/**
 * ActivityAnalytics Component
 * Provides analytics and insights for activities
 */

class ActivityAnalytics {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            entityType: null,
            entityId: null,
            timeRange: '7d',
            ...options
        };
        
        this.analytics = null;
        this.charts = {};
        
        this.init();
    }

    async init() {
        this.setupDOM();
        this.setupEventListeners();
        await this.loadAnalytics();
    }

    setupDOM() {
        this.container.innerHTML = `
            <div class="activity-analytics">
                <div class="analytics-header">
                    <h3>Activity Analytics</h3>
                    <div class="analytics-controls">
                        <select class="time-range-select">
                            <option value="1d">Last 24 hours</option>
                            <option value="7d" selected>Last 7 days</option>
                            <option value="30d">Last 30 days</option>
                            <option value="90d">Last 90 days</option>
                        </select>
                    </div>
                </div>
                
                <div class="analytics-grid">
                    <div class="analytics-card">
                        <div class="card-header">
                            <h4>Total Activities</h4>
                        </div>
                        <div class="card-content">
                            <div class="stat-number" id="total-activities">-</div>
                            <div class="stat-label">activities</div>
                        </div>
                    </div>
                    
                    <div class="analytics-card">
                        <div class="card-header">
                            <h4>Most Active User</h4>
                        </div>
                        <div class="card-content">
                            <div class="stat-user" id="most-active-user">-</div>
                            <div class="stat-count" id="user-activities">-</div>
                        </div>
                    </div>
                    
                    <div class="analytics-card">
                        <div class="card-header">
                            <h4>Peak Activity</h4>
                        </div>
                        <div class="card-content">
                            <div class="stat-peak" id="peak-activity">-</div>
                            <div class="stat-time" id="peak-time">-</div>
                        </div>
                    </div>
                    
                    <div class="analytics-card">
                        <div class="card-header">
                            <h4>Activity Types</h4>
                        </div>
                        <div class="card-content">
                            <div id="activity-types-chart" class="chart-container"></div>
                        </div>
                    </div>
                </div>
                
                <div class="analytics-charts">
                    <div class="chart-section">
                        <h4>Activity Timeline</h4>
                        <div id="timeline-chart" class="chart-container"></div>
                    </div>
                    
                    <div class="chart-section">
                        <h4>User Activity</h4>
                        <div id="user-chart" class="chart-container"></div>
                    </div>
                </div>
            </div>
        `;

        this.elements = {
            timeRangeSelect: this.container.querySelector('.time-range-select'),
            totalActivities: this.container.querySelector('#total-activities'),
            mostActiveUser: this.container.querySelector('#most-active-user'),
            userActivities: this.container.querySelector('#user-activities'),
            peakActivity: this.container.querySelector('#peak-activity'),
            peakTime: this.container.querySelector('#peak-time'),
            activityTypesChart: this.container.querySelector('#activity-types-chart'),
            timelineChart: this.container.querySelector('#timeline-chart'),
            userChart: this.container.querySelector('#user-chart')
        };
    }

    setupEventListeners() {
        this.elements.timeRangeSelect.addEventListener('change', () => {
            this.options.timeRange = this.elements.timeRangeSelect.value;
            this.loadAnalytics();
        });
    }

    async loadAnalytics() {
        try {
            this.showLoading();
            
            this.analytics = await window.ActivityService.getActivityAnalytics(
                this.options.entityType,
                this.options.entityId,
                { timeRange: this.options.timeRange }
            );
            
            this.renderAnalytics();
            
        } catch (error) {
            console.error('Error loading analytics:', error);
            this.showError('Failed to load analytics');
        }
    }

    renderAnalytics() {
        if (!this.analytics) return;

        // Update summary stats
        this.elements.totalActivities.textContent = this.analytics.totalActivities || 0;
        
        if (this.analytics.mostActiveUser) {
            this.elements.mostActiveUser.textContent = this.analytics.mostActiveUser.name;
            this.elements.userActivities.textContent = `${this.analytics.mostActiveUser.count} activities`;
        }
        
        if (this.analytics.peakActivity) {
            this.elements.peakActivity.textContent = `${this.analytics.peakActivity.count} activities`;
            this.elements.peakTime.textContent = this.analytics.peakActivity.time;
        }

        // Render charts
        this.renderActivityTypesChart();
        this.renderTimelineChart();
        this.renderUserChart();
    }

    renderActivityTypesChart() {
        if (!this.analytics.activityTypes) return;
        
        const container = this.elements.activityTypesChart;
        container.innerHTML = '';
        
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 200;
        container.appendChild(canvas);
        
        const ctx = canvas.getContext('2d');
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(centerX, centerY) - 20;
        
        const total = Object.values(this.analytics.activityTypes).reduce((sum, count) => sum + count, 0);
        let currentAngle = -Math.PI / 2;
        
        const colors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
            '#FECA57', '#FF9FF3', '#54A0FF', '#5F27CD'
        ];
        
        let colorIndex = 0;
        
        Object.entries(this.analytics.activityTypes).forEach(([type, count]) => {
            const sliceAngle = (count / total) * 2 * Math.PI;
            
            // Draw slice
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
            ctx.closePath();
            ctx.fillStyle = colors[colorIndex % colors.length];
            ctx.fill();
            
            // Draw label
            const labelAngle = currentAngle + sliceAngle / 2;
            const labelX = centerX + Math.cos(labelAngle) * (radius * 0.7);
            const labelY = centerY + Math.sin(labelAngle) * (radius * 0.7);
            
            ctx.fillStyle = '#fff';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${Math.round(count / total * 100)}%`, labelX, labelY);
            
            currentAngle += sliceAngle;
            colorIndex++;
        });
        
        // Add legend
        const legend = document.createElement('div');
        legend.className = 'chart-legend';
        
        colorIndex = 0;
        Object.entries(this.analytics.activityTypes).forEach(([type, count]) => {
            const item = document.createElement('div');
            item.className = 'legend-item';
            item.innerHTML = `
                <span class="legend-color" style="background-color: ${colors[colorIndex % colors.length]}"></span>
                <span>${type}: ${count}</span>
            `;
            legend.appendChild(item);
            colorIndex++;
        });
        
        container.appendChild(legend);
    }

    renderTimelineChart() {
        if (!this.analytics.timeline) return;
        
        const container = this.elements.timelineChart;
        container.innerHTML = '';
        
        const canvas = document.createElement('canvas');
        canvas.width = container.offsetWidth;
        canvas.height = 200;
        container.appendChild(canvas);
        
        const ctx = canvas.getContext('2d');
        const padding = 40;
        const chartWidth = canvas.width - 2 * padding;
        const chartHeight = canvas.height - 2 * padding;
        
        const data = this.analytics.timeline;
        const maxValue = Math.max(...Object.values(data));
        
        // Draw axes
        ctx.strokeStyle = '#e0e0e0';
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, canvas.height - padding);
        ctx.lineTo(canvas.width - padding, canvas.height - padding);
        ctx.stroke();
        
        // Draw bars
        const entries = Object.entries(data);
        const barWidth = chartWidth / entries.length;
        
        entries.forEach(([date, value], index) => {
            const x = padding + index * barWidth;
            const barHeight = (value / maxValue) * chartHeight;
            const y = canvas.height - padding - barHeight;
            
            ctx.fillStyle = '#4ECDC4';
            ctx.fillRect(x + 2, y, barWidth - 4, barHeight);
            
            // Add date label
            ctx.fillStyle = '#666';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(new Date(date).toLocaleDateString(), x + barWidth / 2, canvas.height - padding + 15);
        });
    }

    renderUserChart() {
        if (!this.analytics.userActivity) return;
        
        const container = this.elements.userChart;
        container.innerHTML = '';
        
        const entries = Object.entries(this.analytics.userActivity).sort((a, b) => b[1] - a[1]);
        
        // Create horizontal bar chart
        const chart = document.createElement('div');
        chart.className = 'horizontal-bar-chart';
        
        const maxValue = Math.max(...entries.map(([_, count]) => count));
        
        entries.forEach(([user, count]) => {
            const bar = document.createElement('div');
            bar.className = 'bar-container';
            
            const barFill = document.createElement('div');
            barFill.className = 'bar-fill';
            barFill.style.width = `${(count / maxValue) * 100}%`;
            
            const label = document.createElement('div');
            label.className = 'bar-label';
            label.textContent = user;
            
            const value = document.createElement('div');
            value.className = 'bar-value';
            value.textContent = count;
            
            bar.appendChild(label);
            bar.appendChild(barFill);
            bar.appendChild(value);
            chart.appendChild(bar);
        });
        
        container.appendChild(chart);
    }

    showLoading() {
        this.container.innerHTML += `
            <div class="analytics-loading">
                <div class="spinner"></div>
                <p>Loading analytics...</p>
            </div>
        `;
    }

    showError(message) {
        const error = document.createElement('div');
        error.className = 'analytics-error';
        error.innerHTML = `
            <div class="error-message">${message}</div>
            <button class="btn btn-secondary retry-btn">Retry</button>
        `;
        
        this.container.appendChild(error);
        
        error.querySelector('.retry-btn').addEventListener('click', () => {
            this.loadAnalytics();
        });
    }

    updateTimeRange(timeRange) {
        this.options.timeRange = timeRange;
        this.elements.timeRangeSelect.value = timeRange;
        this.loadAnalytics();
    }

    destroy() {
        this.container.innerHTML = '';
    }
}

// CSS for ActivityAnalytics
const activityAnalyticsStyles = `
<style>
.activity-analytics {
    background: var(--bg-primary);
    border-radius: var(--border-radius-lg);
    padding: var(--spacing-lg);
}

.analytics-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-lg);
    padding-bottom: var(--spacing-md);
    border-bottom: 1px solid var(--border-color);
}

.analytics-header h3 {
    margin: 0;
    font-size: var(--font-size-lg);
}

.analytics-controls select {
    padding: var(--spacing-sm);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius-sm);
    font-size: var(--font-size-sm);
}

.analytics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-lg);
}

.analytics-card {
    background: var(--bg-secondary);
    border-radius: var(--border-radius-md);
    padding: var(--spacing-md);
    text-align: center;
}

.card-header h4 {
    margin: 0 0 var(--spacing-sm) 0;
    font-size: var(--font-size-md);
    color: var(--text-secondary);
}

.card-content {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
}

.stat-number {
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-bold);
    color: var(--text-primary);
}

.stat-label {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
}

.stat-user {
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-semibold);
    color: var(--text-primary);
}

.stat-count {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
}

.chart-container {
    position: relative;
    min-height: 200px;
}

.chart-legend {
    margin-top: var(--spacing-sm);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
}

.legend-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    font-size: var(--font-size-xs);
}

.legend-color {
    width: 12px;
    height: 12px;
    border-radius: 2px;
}

.horizontal-bar-chart {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
}

.bar-container {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
}

.bar-label {
    width: 80px;
    font-size: var(--font-size-xs);
    text-align: right;
    color: var(--text-secondary);
}

.bar-fill {
    height: 20px;
    background: var(--primary-color);
    border-radius: var(--border-radius-sm);
    transition: width 0.3s ease;
}

.bar-value {
    width: 30px;
    font-size: var(--font-size-xs);
    text-align: center;
    color: var(--text-primary);
}

.analytics-charts {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-lg);
}

.chart-section {
    background: var(--bg-secondary);
    border-radius: var(--border-radius-md);
    padding: var(--spacing-md);
}

.chart-section h4 {
    margin: 0 0 var(--spacing-md) 0;
    font-size: var(--font-size-md);
}

.analytics-loading,
.analytics-error {
    text-align: center;
    padding: var(--spacing-xl);
    color: var(--text-secondary);
}

.spinner {
    border: 3px solid var(--border-color);
    border-top: 3px solid var(--primary-color);
    border-radius: 50%;
    width: 40px;
    height: 40px;
    animation: spin 1s linear infinite;
    margin: 0 auto var(--spacing-md);
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

@media (max-width: 768px) {
    .analytics-grid {
        grid-template-columns: 1fr;
    }
    
    .analytics-charts {
        grid-template-columns: 1fr;
    }
}
</style>
`;

// Add styles to document
if (!document.querySelector('#activity-analytics-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'activity-analytics-styles';
    styleSheet.textContent = activityAnalyticsStyles;
    document.head.appendChild(styleSheet);
}

export default ActivityAnalytics;