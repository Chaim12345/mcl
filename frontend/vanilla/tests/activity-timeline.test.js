/**
 * Tests for Activity Timeline Component
 */

import { ActivityTimeline } from '../js/components/activity/ActivityTimeline.js';

// Mock services
const mockActivityService = {
    getActivities: jest.fn(),
    getActivityUsers: jest.fn()
};

const mockAuthService = {
    getCurrentUser: jest.fn()
};

jest.mock('../js/services/activity.js', () => ({
    activityService: mockActivityService
}));

jest.mock('../js/services/auth.js', () => ({
    authService: mockAuthService
}));

describe('ActivityTimeline', () => {
    let container;
    let activityTimeline;
    let mockActivities;
    let mockUsers;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);

        mockActivities = [
            {
                id: 'activity-1',
                type: 'item_created',
                description: 'Item was created',
                user: {
                    id: 'user-1',
                    name: 'John Doe',
                    email: 'john@example.com',
                    avatar: null
                },
                userId: 'user-1',
                itemId: 'item-1',
                createdAt: '2024-01-15T10:00:00Z',
                details: {
                    itemName: 'Test Item'
                }
            },
            {
                id: 'activity-2',
                type: 'comment_created',
                description: 'Comment was added',
                user: {
                    id: 'user-2',
                    name: 'Jane Smith',
                    email: 'jane@example.com',
                    avatar: 'https://example.com/avatar.jpg'
                },
                userId: 'user-2',
                itemId: 'item-1',
                createdAt: '2024-01-15T11:00:00Z',
                details: {
                    commentContent: 'Great work!'
                }
            },
            {
                id: 'activity-3',
                type: 'field_updated',
                description: 'Field was updated',
                user: {
                    id: 'user-1',
                    name: 'John Doe',
                    email: 'john@example.com',
                    avatar: null
                },
                userId: 'user-1',
                itemId: 'item-1',
                createdAt: '2024-01-15T12:00:00Z',
                details: {
                    fieldName: 'Status',
                    oldValue: 'To Do',
                    newValue: 'In Progress'
                }
            }
        ];

        mockUsers = [
            { id: 'user-1', name: 'John Doe', email: 'john@example.com' },
            { id: 'user-2', name: 'Jane Smith', email: 'jane@example.com' }
        ];

        // Setup service mocks
        mockActivityService.getActivities.mockResolvedValue({
            success: true,
            data: {
                activities: mockActivities,
                totalCount: 3,
                hasMore: false
            }
        });

        mockActivityService.getActivityUsers.mockResolvedValue({
            success: true,
            data: mockUsers
        });

        mockAuthService.getCurrentUser.mockReturnValue({
            id: 'user-1',
            name: 'John Doe',
            email: 'john@example.com'
        });
    });

    afterEach(() => {
        if (activityTimeline) {
            activityTimeline.destroy();
        }
        document.body.removeChild(container);
        jest.clearAllMocks();
    });

    describe('Initialization', () => {
        test('should initialize and load activities', async () => {
            activityTimeline = new ActivityTimeline(container, {
                itemId: 'item-1',
                boardId: 'board-1'
            });

            await new Promise(resolve => setTimeout(resolve, 100));

            expect(mockActivityService.getActivities).toHaveBeenCalled();
            expect(mockActivityService.getActivityUsers).toHaveBeenCalled();
            expect(container.querySelector('.activity-timeline')).toBeTruthy();
        });

        test('should render empty state when no activities', async () => {
            mockActivityService.getActivities.mockResolvedValue({
                success: true,
                data: {
                    activities: [],
                    totalCount: 0,
                    hasMore: false
                }
            });

            activityTimeline = new ActivityTimeline(container, {
                itemId: 'item-1',
                boardId: 'board-1'
            });

            await new Promise(resolve => setTimeout(resolve, 100));

            expect(container.querySelector('.activity-empty-state')).toBeTruthy();
            expect(container.textContent).toContain('No activity found');
        });

        test('should handle loading error', async () => {
            mockActivityService.getActivities.mockRejectedValue(new Error('Failed to load'));

            activityTimeline = new ActivityTimeline(container, {
                itemId: 'item-1',
                boardId: 'board-1'
            });

            await new Promise(resolve => setTimeout(resolve, 100));

            expect(container.querySelector('.alert--error')).toBeTruthy();
            expect(container.textContent).toContain('Failed to load');
        });

        test('should disable auto-refresh when specified', () => {
            activityTimeline = new ActivityTimeline(container, {
                itemId: 'item-1',
                boardId: 'board-1',
                autoRefresh: false
            });

            expect(activityTimeline.refreshTimer).toBeNull();
        });
    });

    describe('Activity Display', () => {
        beforeEach(async () => {
            activityTimeline = new ActivityTimeline(container, {
                itemId: 'item-1',
                boardId: 'board-1'
            });
            await new Promise(resolve => setTimeout(resolve, 100));
        });

        test('should render activity list', () => {
            const activityItems = container.querySelectorAll('.activity-item');
            expect(activityItems).toHaveLength(3);
        });

        test('should show activity count', () => {
            const countElement = container.querySelector('.activity-count');
            expect(countElement.textContent).toContain('3');
        });

        test('should render user avatars and initials', () => {
            const avatarInitials = container.querySelectorAll('.activity-user-initials');
            expect(avatarInitials).toHaveLength(2); // John Doe appears twice, Jane Smith once

            const avatarImages = container.querySelectorAll('.activity-user-avatar');
            expect(avatarImages).toHaveLength(1); // Jane Smith has avatar
        });

        test('should show activity type icons', () => {
            const typeIcons = container.querySelectorAll('.activity-type-icon');
            expect(typeIcons).toHaveLength(3);

            const typeSvgs = container.querySelectorAll('.activity-type-svg');
            expect(typeSvgs).toHaveLength(3);
        });

        test('should render activity descriptions correctly', () => {
            const descriptions = container.querySelectorAll('.activity-description');
            
            expect(descriptions[0].textContent).toContain('John Doe');
            expect(descriptions[0].textContent).toContain('created this item');
            
            expect(descriptions[1].textContent).toContain('Jane Smith');
            expect(descriptions[1].textContent).toContain('added a comment');
            
            expect(descriptions[2].textContent).toContain('John Doe');
            expect(descriptions[2].textContent).toContain('updated');
            expect(descriptions[2].textContent).toContain('Status');
        });

        test('should show time ago correctly', () => {
            const timeElements = container.querySelectorAll('.activity-time');
            expect(timeElements).toHaveLength(3);
            
            // All activities should show relative time
            timeElements.forEach(element => {
                expect(element.textContent).toMatch(/ago|just now/);
            });
        });
    });

    describe('Activity Details', () => {
        beforeEach(async () => {
            activityTimeline = new ActivityTimeline(container, {
                itemId: 'item-1',
                boardId: 'board-1'
            });
            await new Promise(resolve => setTimeout(resolve, 100));
        });

        test('should show details button when details exist', () => {
            const detailsButtons = container.querySelectorAll('.activity-details-btn');
            expect(detailsButtons).toHaveLength(3); // All activities have details
        });

        test('should toggle activity details', () => {
            const firstDetailsBtn = container.querySelector('.activity-details-btn');
            firstDetailsBtn.click();

            expect(container.querySelector('.activity-details')).toBeTruthy();
            expect(container.querySelector('.details-icon--expanded')).toBeTruthy();

            // Click again to hide
            firstDetailsBtn.click();

            expect(container.querySelector('.activity-details')).toBeFalsy();
        });

        test('should render activity details content', () => {
            const firstDetailsBtn = container.querySelector('.activity-details-btn');
            firstDetailsBtn.click();

            const detailsContent = container.querySelector('.activity-details-content');
            expect(detailsContent).toBeTruthy();

            const detailItems = container.querySelectorAll('.detail-item');
            expect(detailItems.length).toBeGreaterThan(0);
        });

        test('should format detail keys properly', () => {
            const formattedKey = activityTimeline.formatDetailKey('itemName');
            expect(formattedKey).toBe('Item Name');

            const formattedKey2 = activityTimeline.formatDetailKey('old_value');
            expect(formattedKey2).toBe('Old Value');
        });

        test('should format detail values properly', () => {
            const boolValue = activityTimeline.formatDetailValue(true, 'isActive');
            expect(boolValue).toBe('Yes');

            const nullValue = activityTimeline.formatDetailValue(null, 'value');
            expect(nullValue).toBe('<em>None</em>');

            const dateValue = activityTimeline.formatDetailValue('2024-01-15T10:00:00Z', 'createdDate');
            expect(dateValue).toContain('2024');
        });
    });

    describe('Filtering', () => {
        beforeEach(async () => {
            activityTimeline = new ActivityTimeline(container, {
                itemId: 'item-1',
                boardId: 'board-1'
            });
            await new Promise(resolve => setTimeout(resolve, 100));
        });

        test('should show filters panel when toggled', () => {
            const filtersBtn = container.querySelector('[data-action="toggle-filters"]');
            filtersBtn.click();

            const filtersPanel = container.querySelector('.activity-filters');
            expect(filtersPanel.style.display).toBe('block');
        });

        test('should filter by activity type', async () => {
            // Show filters first
            const filtersBtn = container.querySelector('[data-action="toggle-filters"]');
            filtersBtn.click();

            const typeFilter = container.querySelector('[data-filter="type"]');
            typeFilter.value = 'comment';
            typeFilter.dispatchEvent(new Event('change'));

            await new Promise(resolve => setTimeout(resolve, 100));

            expect(mockActivityService.getActivities).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'comment'
                })
            );
        });

        test('should filter by user', async () => {
            // Show filters first
            const filtersBtn = container.querySelector('[data-action="toggle-filters"]');
            filtersBtn.click();

            const userFilter = container.querySelector('[data-filter="user"]');
            userFilter.value = 'user-1';
            userFilter.dispatchEvent(new Event('change'));

            await new Promise(resolve => setTimeout(resolve, 100));

            expect(mockActivityService.getActivities).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: 'user-1'
                })
            );
        });

        test('should filter by date range', async () => {
            // Show filters first
            const filtersBtn = container.querySelector('[data-action="toggle-filters"]');
            filtersBtn.click();

            const dateFilter = container.querySelector('[data-filter="dateRange"]');
            dateFilter.value = 'today';
            dateFilter.dispatchEvent(new Event('change'));

            await new Promise(resolve => setTimeout(resolve, 100));

            expect(mockActivityService.getActivities).toHaveBeenCalledWith(
                expect.objectContaining({
                    dateStart: expect.any(String)
                })
            );
        });

        test('should clear all filters', async () => {
            const filtersBtn = container.querySelector('[data-action="toggle-filters"]');
            filtersBtn.click();

            const clearBtn = container.querySelector('[data-action="clear-filters"]');
            clearBtn.click();

            expect(activityTimeline.state.filters.type).toBe('all');
            expect(activityTimeline.state.filters.user).toBe('all');
            expect(activityTimeline.state.searchQuery).toBe('');
        });
    });

    describe('Search', () => {
        beforeEach(async () => {
            activityTimeline = new ActivityTimeline(container, {
                itemId: 'item-1',
                boardId: 'board-1',
                showSearch: true
            });
            await new Promise(resolve => setTimeout(resolve, 100));
        });

        test('should show search input', () => {
            const searchInput = container.querySelector('[data-search-input]');
            expect(searchInput).toBeTruthy();
        });

        test('should search activities with debounce', async () => {
            const searchInput = container.querySelector('[data-search-input]');
            
            searchInput.value = 'comment';
            searchInput.dispatchEvent(new Event('input'));

            // Wait for debounce
            await new Promise(resolve => setTimeout(resolve, 350));

            expect(mockActivityService.getActivities).toHaveBeenCalledWith(
                expect.objectContaining({
                    search: 'comment'
                })
            );
        });
    });

    describe('Sorting', () => {
        beforeEach(async () => {
            activityTimeline = new ActivityTimeline(container, {
                itemId: 'item-1',
                boardId: 'board-1'
            });
            await new Promise(resolve => setTimeout(resolve, 100));
        });

        test('should change sort order', async () => {
            // Show filters first
            const filtersBtn = container.querySelector('[data-action="toggle-filters"]');
            filtersBtn.click();

            const sortFilter = container.querySelector('[data-filter="sortOrder"]');
            sortFilter.value = 'asc';
            sortFilter.dispatchEvent(new Event('change'));

            await new Promise(resolve => setTimeout(resolve, 100));

            expect(mockActivityService.getActivities).toHaveBeenCalledWith(
                expect.objectContaining({
                    sortOrder: 'asc'
                })
            );
        });
    });

    describe('Grouping', () => {
        beforeEach(async () => {
            activityTimeline = new ActivityTimeline(container, {
                itemId: 'item-1',
                boardId: 'board-1'
            });
            await new Promise(resolve => setTimeout(resolve, 100));
        });

        test('should group activities by date', () => {
            // Show filters first
            const filtersBtn = container.querySelector('[data-action="toggle-filters"]');
            filtersBtn.click();

            const groupFilter = container.querySelector('[data-filter="groupBy"]');
            groupFilter.value = 'date';
            groupFilter.dispatchEvent(new Event('change'));

            expect(container.querySelector('.activity-groups')).toBeTruthy();
            expect(container.querySelectorAll('.activity-group')).toHaveLength(1); // All same date
        });

        test('should group activities by user', () => {
            // Show filters first
            const filtersBtn = container.querySelector('[data-action="toggle-filters"]');
            filtersBtn.click();

            const groupFilter = container.querySelector('[data-filter="groupBy"]');
            groupFilter.value = 'user';
            groupFilter.dispatchEvent(new Event('change'));

            expect(container.querySelector('.activity-groups')).toBeTruthy();
            expect(container.querySelectorAll('.activity-group')).toHaveLength(2); // Two users
        });

        test('should group activities by type', () => {
            // Show filters first
            const filtersBtn = container.querySelector('[data-action="toggle-filters"]');
            filtersBtn.click();

            const groupFilter = container.querySelector('[data-filter="groupBy"]');
            groupFilter.value = 'type';
            groupFilter.dispatchEvent(new Event('change'));

            expect(container.querySelector('.activity-groups')).toBeTruthy();
            expect(container.querySelectorAll('.activity-group')).toHaveLength(3); // Three types
        });

        test('should get correct group titles', () => {
            const dateTitle = activityTimeline.getGroupTitle('Mon Jan 15 2024', 'date');
            expect(dateTitle).toContain('January');

            const userTitle = activityTimeline.getGroupTitle('John Doe', 'user');
            expect(userTitle).toBe('John Doe');

            const typeTitle = activityTimeline.getGroupTitle('Item Created', 'type');
            expect(typeTitle).toBe('Item Created');
        });
    });

    describe('Load More', () => {
        beforeEach(async () => {
            mockActivityService.getActivities.mockResolvedValue({
                success: true,
                data: {
                    activities: mockActivities,
                    totalCount: 10,
                    hasMore: true
                }
            });

            activityTimeline = new ActivityTimeline(container, {
                itemId: 'item-1',
                boardId: 'board-1'
            });
            await new Promise(resolve => setTimeout(resolve, 100));
        });

        test('should show load more button when hasMore is true', () => {
            const loadMoreBtn = container.querySelector('[data-action="load-more"]');
            expect(loadMoreBtn).toBeTruthy();
            expect(loadMoreBtn.textContent).toContain('Load More');
        });

        test('should load more activities when clicked', async () => {
            const loadMoreBtn = container.querySelector('[data-action="load-more"]');
            loadMoreBtn.click();

            await new Promise(resolve => setTimeout(resolve, 100));

            expect(mockActivityService.getActivities).toHaveBeenCalledWith(
                expect.objectContaining({
                    page: 2
                })
            );
        });
    });

    describe('Refresh', () => {
        beforeEach(async () => {
            activityTimeline = new ActivityTimeline(container, {
                itemId: 'item-1',
                boardId: 'board-1'
            });
            await new Promise(resolve => setTimeout(resolve, 100));
        });

        test('should refresh activities when button clicked', async () => {
            const refreshBtn = container.querySelector('[data-action="refresh"]');
            refreshBtn.click();

            await new Promise(resolve => setTimeout(resolve, 100));

            expect(mockActivityService.getActivities).toHaveBeenCalledTimes(2); // Initial + refresh
        });

        test('should auto-refresh periodically', async () => {
            jest.useFakeTimers();

            activityTimeline = new ActivityTimeline(container, {
                itemId: 'item-1',
                boardId: 'board-1',
                refreshInterval: 1000
            });

            await new Promise(resolve => setTimeout(resolve, 100));

            // Fast-forward time
            jest.advanceTimersByTime(1000);

            expect(mockActivityService.getActivities).toHaveBeenCalledTimes(2);

            jest.useRealTimers();
        });
    });

    describe('Activity Type Labels and Icons', () => {
        test('should get correct activity type labels', () => {
            const timeline = new ActivityTimeline(document.createElement('div'));

            expect(timeline.getActivityTypeLabel('item_created')).toBe('Item Created');
            expect(timeline.getActivityTypeLabel('comment_created')).toBe('Comment Added');
            expect(timeline.getActivityTypeLabel('field_updated')).toBe('Field Updated');
            expect(timeline.getActivityTypeLabel('unknown_type')).toBe('Activity');
        });

        test('should render activity type icons', () => {
            const timeline = new ActivityTimeline(document.createElement('div'));

            const icon = timeline.getActivityTypeIcon('item_created');
            expect(icon).toContain('<svg');
            expect(icon).toContain('activity-type-svg');
        });
    });

    describe('Date Range Calculations', () => {
        test('should calculate today date range', () => {
            const timeline = new ActivityTimeline(document.createElement('div'));
            const range = timeline.getDateRange('today');

            expect(range.start).toBeTruthy();
            expect(range.end).toBeTruthy();

            const startDate = new Date(range.start);
            const endDate = new Date(range.end);
            expect(endDate.getTime() - startDate.getTime()).toBe(24 * 60 * 60 * 1000);
        });

        test('should calculate week date range', () => {
            const timeline = new ActivityTimeline(document.createElement('div'));
            const range = timeline.getDateRange('week');

            expect(range.start).toBeTruthy();
            expect(range.end).toBeNull();
        });

        test('should calculate month date range', () => {
            const timeline = new ActivityTimeline(document.createElement('div'));
            const range = timeline.getDateRange('month');

            expect(range.start).toBeTruthy();
            expect(range.end).toBeNull();

            const startDate = new Date(range.start);
            expect(startDate.getDate()).toBe(1); // First day of month
        });
    });

    describe('Event Handling', () => {
        beforeEach(async () => {
            activityTimeline = new ActivityTimeline(container, {
                itemId: 'item-1',
                boardId: 'board-1'
            });
            await new Promise(resolve => setTimeout(resolve, 100));
        });

        test('should handle activity created event', () => {
            const newActivity = {
                id: 'activity-4',
                type: 'item_updated',
                user: { id: 'user-1', name: 'John Doe' },
                createdAt: new Date().toISOString()
            };

            activityTimeline.handleActivityCreated(newActivity);

            expect(activityTimeline.state.activities[0]).toBe(newActivity);
            expect(activityTimeline.state.totalCount).toBe(4);
        });
    });

    describe('Public Methods', () => {
        beforeEach(async () => {
            activityTimeline = new ActivityTimeline(container, {
                itemId: 'item-1',
                boardId: 'board-1'
            });
            await new Promise(resolve => setTimeout(resolve, 100));
        });

        test('should refresh activities via public method', async () => {
            await activityTimeline.refresh();

            expect(mockActivityService.getActivities).toHaveBeenCalledTimes(2);
        });

        test('should set filters via public method', async () => {
            activityTimeline.setFilters({ type: 'comment', user: 'user-1' });

            expect(activityTimeline.state.filters.type).toBe('comment');
            expect(activityTimeline.state.filters.user).toBe('user-1');
        });

        test('should search via public method', async () => {
            activityTimeline.search('test query');

            expect(activityTimeline.state.searchQuery).toBe('test query');
        });
    });

    describe('Cleanup', () => {
        test('should stop auto-refresh on destroy', () => {
            activityTimeline = new ActivityTimeline(container, {
                itemId: 'item-1',
                boardId: 'board-1',
                autoRefresh: true
            });

            const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
            
            activityTimeline.destroy();

            expect(clearIntervalSpy).toHaveBeenCalled();
        });
    });
}); 