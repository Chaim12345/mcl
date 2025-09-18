/**
 * Monday.com-style Dashboard Manager
 */

import { apiClient } from '../../services/ApiClient.js';

export class DashboardManager {
    constructor() {
        this.apiClient = apiClient;
        this.currentUser = this.getCurrentUser();
        this.tasks = [];
        this.activities = [];
        this.teamMembers = [];
        this.deadlines = [];
        this.chart = null;
    }

    getCurrentUser() {
        // In a real app, this would get user info from the API or JWT token
        return {
            id: 'user-1',
            name: 'Current User',
            email: 'user@example.com',
            avatar: 'CU'
        };
    }

    async init() {
        try {
            await this.loadDashboardData();
            this.updateWelcomeMessage();
            this.renderRecentActivity();
            this.renderMyTasks();
            this.renderTeamPerformance();
            this.renderUpcomingDeadlines();
            this.initializeChart();
            this.updateMetrics();
        } catch (error) {
            console.error('Failed to initialize dashboard:', error);
            this.showErrorState();
        }
    }

    async loadDashboardData() {
        try {
            // In a real app, these would be API calls
            this.tasks = this.generateDemoTasks();
            this.activities = this.generateDemoActivities();
            this.teamMembers = this.generateDemoTeamMembers();
            this.deadlines = this.generateDemoDeadlines();
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            // Use demo data as fallback
            this.tasks = this.generateDemoTasks();
            this.activities = this.generateDemoActivities();
            this.teamMembers = this.generateDemoTeamMembers();
            this.deadlines = this.generateDemoDeadlines();
        }
    }

    generateDemoTasks() {
        const taskNames = [
            'Review project proposal',
            'Update website content',
            'Prepare presentation slides',
            'Schedule team meeting',
            'Fix login bug',
            'Design new logo',
            'Write documentation',
            'Test mobile app',
            'Update database schema',
            'Create marketing materials'
        ];

        const priorities = ['low', 'medium', 'high'];
        const statuses = ['pending', 'in-progress', 'completed', 'overdue'];

        return taskNames.map((name, index) => ({
            id: `task-${index + 1}`,
            title: name,
            priority: priorities[Math.floor(Math.random() * priorities.length)],
            status: statuses[Math.floor(Math.random() * statuses.length)],
            dueDate: new Date(Date.now() + (Math.random() * 7 - 3) * 24 * 60 * 60 * 1000),
            boardName: ['Project Alpha', 'Marketing', 'Development', 'Design'][Math.floor(Math.random() * 4)],
            assignee: this.currentUser,
            completed: Math.random() > 0.7
        }));
    }

    generateDemoActivities() {
        const activities = [
            'John completed "Design wireframes"',
            'Sarah added a comment to "User feedback"',
            'Mike updated the status of "Bug fixes"',
            'Lisa created a new task "Content review"',
            'Tom marked "Testing phase" as done',
            'Anna assigned "Code review" to you',
            'David uploaded files to "Documentation"',
            'Emma started working on "Mobile design"'
        ];

        return activities.map((text, index) => ({
            id: `activity-${index + 1}`,
            text: text,
            user: {
                name: text.split(' ')[0],
                avatar: text.split(' ')[0].substring(0, 2).toUpperCase()
            },
            timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
            type: ['task', 'comment', 'status', 'assignment'][Math.floor(Math.random() * 4)]
        }));
    }

    generateDemoTeamMembers() {
        const members = [
            { name: 'John Smith', role: 'Developer', completionRate: 92 },
            { name: 'Sarah Wilson', role: 'Designer', completionRate: 88 },
            { name: 'Mike Johnson', role: 'QA Tester', completionRate: 95 },
            { name: 'Lisa Brown', role: 'Content Writer', completionRate: 87 },
            { name: 'Tom Davis', role: 'Project Manager', completionRate: 91 }
        ];

        return members.map((member, index) => ({
            id: `member-${index + 1}`,
            ...member,
            avatar: member.name.split(' ').map(n => n[0]).join(''),
            tasksCompleted: Math.floor(Math.random() * 20) + 5,
            tasksTotal: Math.floor(Math.random() * 30) + 15
        }));
    }

    generateDemoDeadlines() {
        const tasks = [
            { title: 'Project presentation', board: 'Marketing Campaign' },
            { title: 'Code review deadline', board: 'Development Sprint' },
            { title: 'Design approval', board: 'UI/UX Design' },
            { title: 'Content submission', board: 'Website Update' },
            { title: 'Testing completion', board: 'Quality Assurance' }
        ];

        return tasks.map((task, index) => {
            const dueDate = new Date(Date.now() + (index + 1) * 2 * 24 * 60 * 60 * 1000);
            const daysUntil = Math.ceil((dueDate - new Date()) / (24 * 60 * 60 * 1000));
            
            let status = 'upcoming';
            if (daysUntil <= 1) status = 'urgent';
            else if (daysUntil <= 3) status = 'soon';

            return {
                id: `deadline-${index + 1}`,
                ...task,
                dueDate: dueDate,
                status: status,
                daysUntil: daysUntil
            };
        });
    }

    updateWelcomeMessage() {
        const nameElement = document.getElementById('user-name');
        if (nameElement) {
            nameElement.textContent = this.currentUser.name;
        }
    }

    renderRecentActivity() {
        const container = document.getElementById('recent-activity');
        if (!container) return;

        const html = this.activities.slice(0, 6).map(activity => `
            <div class="activity-item">
                <div class="activity-avatar">${activity.user.avatar}</div>
                <div class="activity-content">
                    <div class="activity-text">${activity.text}</div>
                    <div class="activity-time">${this.getRelativeTime(activity.timestamp)}</div>
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    renderMyTasks() {
        const container = document.getElementById('my-tasks');
        if (!container) return;

        const html = this.tasks.slice(0, 8).map(task => `
            <div class="task-item">
                <div class="task-checkbox ${task.completed ? 'completed' : ''}" onclick="toggleTask('${task.id}')">
                    ${task.completed ? '✓' : ''}
                </div>
                <div class="task-content">
                    <div class="task-title">${task.title}</div>
                    <div class="task-meta">
                        <span class="task-priority ${task.priority}">${task.priority}</span>
                        <span class="task-board">${task.boardName}</span>
                        <span class="task-due">Due ${this.formatDate(task.dueDate)}</span>
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    renderTeamPerformance() {
        const container = document.getElementById('team-performance');
        if (!container) return;

        const html = this.teamMembers.map(member => {
            const completionRate = Math.round((member.tasksCompleted / member.tasksTotal) * 100);
            
            return `
                <div class="team-member">
                    <div class="member-avatar">${member.avatar}</div>
                    <div class="member-info">
                        <div class="member-name">${member.name}</div>
                        <div class="member-stats">${member.tasksCompleted}/${member.tasksTotal} tasks completed</div>
                    </div>
                    <div class="member-progress">
                        <div class="member-progress-bar" style="width: ${completionRate}%"></div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    }

    renderUpcomingDeadlines() {
        const container = document.getElementById('upcoming-deadlines');
        if (!container) return;

        const html = this.deadlines.map(deadline => `
            <div class="deadline-item">
                <div class="deadline-date">
                    ${deadline.daysUntil === 0 ? 'Today' : 
                      deadline.daysUntil === 1 ? 'Tomorrow' : 
                      `${deadline.daysUntil}d`}
                </div>
                <div class="deadline-content">
                    <div class="deadline-title">${deadline.title}</div>
                    <div class="deadline-board">${deadline.board}</div>
                </div>
                <div class="deadline-status ${deadline.status}">${deadline.status}</div>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    initializeChart() {
        const canvas = document.getElementById('progress-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        // Generate weekly progress data
        const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const completedTasks = [3, 5, 4, 7, 6, 2, 4];
        const totalTasks = [5, 8, 6, 9, 8, 4, 6];

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: weekDays,
                datasets: [
                    {
                        label: 'Completed Tasks',
                        data: completedTasks,
                        borderColor: '#00c875',
                        backgroundColor: 'rgba(0, 200, 117, 0.1)',
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Total Tasks',
                        data: totalTasks,
                        borderColor: '#fdab3d',
                        backgroundColor: 'rgba(253, 171, 61, 0.1)',
                        fill: false,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: '#f0f0f0'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    updateMetrics() {
        const totalTasks = this.tasks.length;
        const completedTasks = this.tasks.filter(task => task.completed).length;
        const inProgressTasks = this.tasks.filter(task => task.status === 'in-progress').length;
        const overdueTasks = this.tasks.filter(task => task.status === 'overdue').length;

        document.getElementById('total-tasks').textContent = totalTasks;
        document.getElementById('completed-tasks').textContent = completedTasks;
        document.getElementById('pending-tasks').textContent = inProgressTasks;
        document.getElementById('overdue-tasks').textContent = overdueTasks;
    }

    filterTasks(filter) {
        let filteredTasks = this.tasks;
        
        switch (filter) {
            case 'today':
                filteredTasks = this.tasks.filter(task => {
                    const today = new Date();
                    const taskDate = new Date(task.dueDate);
                    return taskDate.toDateString() === today.toDateString();
                });
                break;
            case 'overdue':
                filteredTasks = this.tasks.filter(task => task.status === 'overdue');
                break;
            default:
                filteredTasks = this.tasks;
        }

        this.renderFilteredTasks(filteredTasks);
    }

    renderFilteredTasks(tasks) {
        const container = document.getElementById('my-tasks');
        if (!container) return;

        const html = tasks.slice(0, 8).map(task => `
            <div class="task-item">
                <div class="task-checkbox ${task.completed ? 'completed' : ''}" onclick="toggleTask('${task.id}')">
                    ${task.completed ? '✓' : ''}
                </div>
                <div class="task-content">
                    <div class="task-title">${task.title}</div>
                    <div class="task-meta">
                        <span class="task-priority ${task.priority}">${task.priority}</span>
                        <span class="task-board">${task.boardName}</span>
                        <span class="task-due">Due ${this.formatDate(task.dueDate)}</span>
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    toggleTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.completed = !task.completed;
            this.renderMyTasks();
            this.updateMetrics();
        }
    }

    showErrorState() {
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">⚠️</div>
                    <h2>Unable to load dashboard</h2>
                    <p>Please check your connection and try again.</p>
                    <button class="btn btn-primary" onclick="location.reload()">Retry</button>
                </div>
            `;
        }
    }

    getRelativeTime(date) {
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffMinutes = Math.floor(diffTime / (1000 * 60));
        const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffMinutes < 60) {
            return `${diffMinutes}m ago`;
        } else if (diffHours < 24) {
            return `${diffHours}h ago`;
        } else {
            return `${diffDays}d ago`;
        }
    }

    formatDate(date) {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        if (date.toDateString() === today.toDateString()) {
            return 'today';
        } else if (date.toDateString() === tomorrow.toDateString()) {
            return 'tomorrow';
        } else {
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
    }
}

// Global function for task toggle
window.toggleTask = function(taskId) {
    // This would be handled by the dashboard instance
    console.log('Toggle task:', taskId);
};

