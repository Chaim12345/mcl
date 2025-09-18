/**
 * Monday.com-style Calendar Component
 */

import { apiClient } from '../../services/ApiClient.js';

export class CalendarView {
    constructor(container) {
        this.container = container;
        this.apiClient = apiClient;
        this.currentDate = new Date();
        this.currentView = 'month'; // month, week, day
        this.events = [];
        this.selectedDate = null;
        
        this.monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        
        this.dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    }

    async init() {
        await this.loadEvents();
        this.setupEventListeners();
        this.render();
    }

    async loadEvents() {
        try {
            // Load events from API - for now using demo data
            this.events = this.createDemoEvents();
        } catch (error) {
            console.error('Failed to load events:', error);
            this.events = this.createDemoEvents();
        }
    }

    createDemoEvents() {
        const today = new Date();
        const events = [];
        
        // Create some demo events
        for (let i = 0; i < 10; i++) {
            const eventDate = new Date(today);
            eventDate.setDate(today.getDate() + (Math.random() * 30 - 15));
            
            events.push({
                id: `event-${i}`,
                title: [
                    'Team Meeting',
                    'Project Review',
                    'Client Call',
                    'Design Review',
                    'Sprint Planning',
                    'Code Review',
                    'Standup',
                    'Demo Day'
                ][Math.floor(Math.random() * 8)],
                date: eventDate.toISOString().split('T')[0],
                time: `${9 + Math.floor(Math.random() * 8)}:00`,
                priority: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)],
                description: 'Sample event description'
            });
        }
        
        return events;
    }

    setupEventListeners() {
        // View switcher
        document.querySelectorAll('[data-view]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchView(e.target.dataset.view);
            });
        });

        // Date navigation
        document.getElementById('prev-date')?.addEventListener('click', () => {
            this.navigateDate(-1);
        });

        document.getElementById('next-date')?.addEventListener('click', () => {
            this.navigateDate(1);
        });

        document.getElementById('today-btn')?.addEventListener('click', () => {
            this.goToToday();
        });
    }

    switchView(view) {
        this.currentView = view;
        
        // Update active button
        document.querySelectorAll('[data-view]').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-view="${view}"]`)?.classList.add('active');
        
        this.render();
    }

    navigateDate(direction) {
        if (this.currentView === 'month') {
            this.currentDate.setMonth(this.currentDate.getMonth() + direction);
        } else if (this.currentView === 'week') {
            this.currentDate.setDate(this.currentDate.getDate() + (direction * 7));
        } else if (this.currentView === 'day') {
            this.currentDate.setDate(this.currentDate.getDate() + direction);
        }
        
        this.render();
    }

    goToToday() {
        this.currentDate = new Date();
        this.render();
    }

    render() {
        this.updateDateDisplay();
        
        if (this.currentView === 'month') {
            this.renderMonthView();
        } else if (this.currentView === 'week') {
            this.renderWeekView();
        } else if (this.currentView === 'day') {
            this.renderDayView();
        }
    }

    updateDateDisplay() {
        const dateElement = document.getElementById('current-date');
        if (!dateElement) return;

        if (this.currentView === 'month') {
            dateElement.textContent = `${this.monthNames[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`;
        } else if (this.currentView === 'week') {
            const weekStart = this.getWeekStart(this.currentDate);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            
            if (weekStart.getMonth() === weekEnd.getMonth()) {
                dateElement.textContent = `${this.monthNames[weekStart.getMonth()]} ${weekStart.getDate()}-${weekEnd.getDate()}, ${weekStart.getFullYear()}`;
            } else {
                dateElement.textContent = `${this.monthNames[weekStart.getMonth()]} ${weekStart.getDate()} - ${this.monthNames[weekEnd.getMonth()]} ${weekEnd.getDate()}, ${weekStart.getFullYear()}`;
            }
        } else if (this.currentView === 'day') {
            dateElement.textContent = `${this.monthNames[this.currentDate.getMonth()]} ${this.currentDate.getDate()}, ${this.currentDate.getFullYear()}`;
        }
    }

    renderMonthView() {
        this.container.className = 'calendar-grid month-view';
        
        const firstDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
        const lastDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);
        const startDate = this.getWeekStart(firstDay);
        
        let html = '';
        
        // Header row
        html += '<div class="calendar-header-row">';
        this.dayNames.forEach(day => {
            html += `<div class="calendar-day-header">${day}</div>`;
        });
        html += '</div>';
        
        // Calendar days
        const currentDate = new Date(startDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        for (let week = 0; week < 6; week++) {
            for (let day = 0; day < 7; day++) {
                const isCurrentMonth = currentDate.getMonth() === this.currentDate.getMonth();
                const isToday = currentDate.getTime() === today.getTime();
                const dayEvents = this.getEventsForDate(currentDate);
                
                let dayClass = 'calendar-day';
                if (!isCurrentMonth) dayClass += ' other-month';
                if (isToday) dayClass += ' today';
                
                html += `<div class="${dayClass}" data-date="${currentDate.toISOString().split('T')[0]}">`;
                html += `<div class="day-number">${currentDate.getDate()}</div>`;
                html += '<div class="calendar-events">';
                
                dayEvents.slice(0, 3).forEach(event => {
                    html += `<div class="calendar-event priority-${event.priority}" title="${event.title} - ${event.time}">
                        ${event.title}
                    </div>`;
                });
                
                if (dayEvents.length > 3) {
                    html += `<div class="calendar-event more-events">+${dayEvents.length - 3} more</div>`;
                }
                
                html += '</div>';
                html += '<button class="add-event-btn" onclick="openEventModal(\'' + currentDate.toISOString().split('T')[0] + '\')">+</button>';
                html += '</div>';
                
                currentDate.setDate(currentDate.getDate() + 1);
            }
            
            // Stop if we've gone past the current month and filled at least 4 weeks
            if (week >= 3 && currentDate.getMonth() !== this.currentDate.getMonth()) {
                break;
            }
        }
        
        this.container.innerHTML = html;
        this.attachEventListeners();
    }

    renderWeekView() {
        this.container.className = 'calendar-grid week-view';
        
        const weekStart = this.getWeekStart(this.currentDate);
        let html = '';
        
        // Time column header
        html += '<div class="time-slot"></div>';
        
        // Day headers
        for (let i = 0; i < 7; i++) {
            const date = new Date(weekStart);
            date.setDate(date.getDate() + i);
            const isToday = this.isToday(date);
            
            html += `<div class="calendar-day-header ${isToday ? 'today' : ''}">
                ${this.dayNames[i]}<br>
                <span class="date-number">${date.getDate()}</span>
            </div>`;
        }
        
        // Time slots and events
        for (let hour = 0; hour < 24; hour++) {
            html += `<div class="time-slot">${hour.toString().padStart(2, '0')}:00</div>`;
            
            for (let day = 0; day < 7; day++) {
                const date = new Date(weekStart);
                date.setDate(date.getDate() + day);
                const dayEvents = this.getEventsForDate(date).filter(event => {
                    const eventHour = parseInt(event.time.split(':')[0]);
                    return eventHour === hour;
                });
                
                let dayClass = 'calendar-day';
                if (this.isToday(date)) dayClass += ' today';
                
                html += `<div class="${dayClass}" data-date="${date.toISOString().split('T')[0]}">`;
                
                dayEvents.forEach(event => {
                    html += `<div class="calendar-event priority-${event.priority}">
                        ${event.title}
                    </div>`;
                });
                
                html += '</div>';
            }
        }
        
        this.container.innerHTML = html;
        this.attachEventListeners();
    }

    renderDayView() {
        this.container.className = 'calendar-grid day-view';
        
        const dayEvents = this.getEventsForDate(this.currentDate);
        let html = '';
        
        // Time slots
        for (let hour = 0; hour < 24; hour++) {
            html += `<div class="time-slot">${hour.toString().padStart(2, '0')}:00</div>`;
            
            const hourEvents = dayEvents.filter(event => {
                const eventHour = parseInt(event.time.split(':')[0]);
                return eventHour === hour;
            });
            
            html += '<div class="calendar-day">';
            
            hourEvents.forEach(event => {
                html += `<div class="calendar-event priority-${event.priority}">
                    <strong>${event.title}</strong><br>
                    ${event.time}<br>
                    ${event.description}
                </div>`;
            });
            
            html += '</div>';
        }
        
        this.container.innerHTML = html;
        this.attachEventListeners();
    }

    attachEventListeners() {
        // Add click listeners for calendar days
        this.container.querySelectorAll('.calendar-day').forEach(day => {
            day.addEventListener('click', (e) => {
                if (!e.target.classList.contains('add-event-btn')) {
                    const date = day.dataset.date;
                    this.selectDate(date);
                }
            });
        });
    }

    selectDate(dateString) {
        this.selectedDate = dateString;
        
        // Update visual selection
        this.container.querySelectorAll('.calendar-day').forEach(day => {
            day.classList.remove('selected');
        });
        
        const selectedDay = this.container.querySelector(`[data-date="${dateString}"]`);
        if (selectedDay) {
            selectedDay.classList.add('selected');
        }
    }

    getWeekStart(date) {
        const start = new Date(date);
        const day = start.getDay();
        const diff = start.getDate() - day;
        start.setDate(diff);
        start.setHours(0, 0, 0, 0);
        return start;
    }

    isToday(date) {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    }

    getEventsForDate(date) {
        const dateString = date.toISOString().split('T')[0];
        return this.events.filter(event => event.date === dateString);
    }

    async addEvent(eventData) {
        try {
            // In a real app, this would make an API call
            const newEvent = {
                id: `event-${Date.now()}`,
                ...eventData
            };
            
            this.events.push(newEvent);
            return newEvent;
        } catch (error) {
            console.error('Failed to add event:', error);
            throw error;
        }
    }

    async deleteEvent(eventId) {
        try {
            // In a real app, this would make an API call
            this.events = this.events.filter(event => event.id !== eventId);
        } catch (error) {
            console.error('Failed to delete event:', error);
            throw error;
        }
    }
}

// Global function for opening event modal
window.openEventModal = function(date) {
    if (date) {
        document.getElementById('event-date').value = date;
    }
    document.getElementById('event-modal').classList.add('active');
};

