/**
 * Tests for Comment Thread and Comment Composer Components
 */

import { CommentThread } from '../js/components/comments/CommentThread.js';
import { CommentComposer } from '../js/components/comments/CommentComposer.js';

// Mock services
const mockCommentService = {
    getComments: jest.fn(),
    createComment: jest.fn(),
    updateComment: jest.fn(),
    deleteComment: jest.fn(),
    resolveComment: jest.fn(),
    unresolveComment: jest.fn()
};

const mockUserService = {
    searchUsers: jest.fn()
};

const mockAuthService = {
    getCurrentUser: jest.fn()
};

jest.mock('../js/services/comment.js', () => ({
    commentService: mockCommentService
}));

jest.mock('../js/services/user.js', () => ({
    userService: mockUserService
}));

jest.mock('../js/services/auth.js', () => ({
    authService: mockAuthService
}));

describe('CommentThread', () => {
    let container;
    let commentThread;
    let mockComments;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);

        mockComments = [
            {
                id: 'comment-1',
                content: 'This is a test comment',
                author: {
                    id: 'user-1',
                    name: 'John Doe',
                    email: 'john@example.com',
                    avatar: null
                },
                authorId: 'user-1',
                itemId: 'item-1',
                parentId: null,
                status: 'active',
                createdAt: '2024-01-15T10:00:00Z',
                updatedAt: '2024-01-15T10:00:00Z',
                replies: []
            },
            {
                id: 'comment-2',
                content: 'This is a reply comment',
                author: {
                    id: 'user-2',
                    name: 'Jane Smith',
                    email: 'jane@example.com',
                    avatar: 'https://example.com/avatar.jpg'
                },
                authorId: 'user-2',
                itemId: 'item-1',
                parentId: 'comment-1',
                status: 'active',
                createdAt: '2024-01-15T11:00:00Z',
                updatedAt: '2024-01-15T11:00:00Z',
                replies: []
            }
        ];

        // Setup current user
        mockAuthService.getCurrentUser.mockReturnValue({
            id: 'user-1',
            name: 'John Doe',
            email: 'john@example.com'
        });

        // Setup comment service mock
        mockCommentService.getComments.mockResolvedValue({
            success: true,
            data: mockComments
        });
    });

    afterEach(() => {
        if (commentThread) {
            commentThread.destroy();
        }
        document.body.removeChild(container);
        jest.clearAllMocks();
    });

    describe('Initialization', () => {
        test('should initialize and load comments', async () => {
            commentThread = new CommentThread(container, {
                itemId: 'item-1',
                boardId: 'board-1'
            });

            await new Promise(resolve => setTimeout(resolve, 100));

            expect(mockCommentService.getComments).toHaveBeenCalledWith('item-1', {
                includeReplies: true,
                sortOrder: 'asc'
            });
            expect(container.querySelector('.comment-thread')).toBeTruthy();
        });

        test('should render empty state when no comments', async () => {
            mockCommentService.getComments.mockResolvedValue({
                success: true,
                data: []
            });

            commentThread = new CommentThread(container, {
                itemId: 'item-1',
                boardId: 'board-1'
            });

            await new Promise(resolve => setTimeout(resolve, 100));

            expect(container.querySelector('.comment-empty-state')).toBeTruthy();
            expect(container.textContent).toContain('No comments yet');
        });

        test('should handle loading error', async () => {
            mockCommentService.getComments.mockRejectedValue(new Error('Failed to load'));

            commentThread = new CommentThread(container, {
                itemId: 'item-1',
                boardId: 'board-1'
            });

            await new Promise(resolve => setTimeout(resolve, 100));

            expect(container.querySelector('.alert--error')).toBeTruthy();
            expect(container.textContent).toContain('Failed to load');
        });
    });

    describe('Comment Display', () => {
        beforeEach(async () => {
            commentThread = new CommentThread(container, {
                itemId: 'item-1',
                boardId: 'board-1'
            });
            await new Promise(resolve => setTimeout(resolve, 100));
        });

        test('should render comment list', () => {
            const commentItems = container.querySelectorAll('.comment-item');
            expect(commentItems).toHaveLength(1); // Only root comment, reply is nested
            
            const firstComment = commentItems[0];
            expect(firstComment.textContent).toContain('John Doe');
            expect(firstComment.textContent).toContain('This is a test comment');
        });

        test('should show comment meta information', () => {
            const commentTime = container.querySelector('.comment-time');
            expect(commentTime).toBeTruthy();
            
            const authorName = container.querySelector('.author-name');
            expect(authorName.textContent).toBe('John Doe');
        });

        test('should show user avatar or initials', () => {
            const avatarInitials = container.querySelector('.avatar-initials');
            expect(avatarInitials).toBeTruthy();
            expect(avatarInitials.textContent).toBe('JD');
        });

        test('should build comment tree structure', () => {
            const tree = commentThread.buildCommentTree(mockComments);
            expect(tree).toHaveLength(1); // One root comment
            expect(tree[0].replies).toHaveLength(1); // One reply
            expect(tree[0].replies[0].depth).toBe(1);
        });
    });

    describe('Comment Actions', () => {
        beforeEach(async () => {
            commentThread = new CommentThread(container, {
                itemId: 'item-1',
                boardId: 'board-1'
            });
            await new Promise(resolve => setTimeout(resolve, 100));
        });

        test('should show action buttons for own comments', () => {
            const editBtn = container.querySelector('[data-action="edit"]');
            const deleteBtn = container.querySelector('[data-action="delete"]');
            
            expect(editBtn).toBeTruthy();
            expect(deleteBtn).toBeTruthy();
        });

        test('should start editing comment', () => {
            const editBtn = container.querySelector('[data-action="edit"]');
            editBtn.click();

            expect(container.querySelector('.comment-editor')).toBeTruthy();
            expect(container.querySelector('.comment-editor-textarea')).toBeTruthy();
        });

        test('should save edited comment', async () => {
            mockCommentService.updateComment.mockResolvedValue({
                success: true,
                data: { id: 'comment-1', content: 'Updated content' }
            });

            // Start editing
            const editBtn = container.querySelector('[data-action="edit"]');
            editBtn.click();

            // Update content
            const textarea = container.querySelector('.comment-editor-textarea');
            textarea.value = 'Updated content';
            textarea.dispatchEvent(new Event('input'));

            // Save
            const saveBtn = container.querySelector('[data-action="save-edit"]');
            saveBtn.click();

            await new Promise(resolve => setTimeout(resolve, 100));

            expect(mockCommentService.updateComment).toHaveBeenCalledWith('comment-1', {
                content: 'Updated content'
            });
        });

        test('should cancel editing', () => {
            // Start editing
            const editBtn = container.querySelector('[data-action="edit"]');
            editBtn.click();

            // Cancel
            const cancelBtn = container.querySelector('[data-action="cancel-edit"]');
            cancelBtn.click();

            expect(container.querySelector('.comment-editor')).toBeFalsy();
        });

        test('should delete comment with confirmation', async () => {
            global.confirm = jest.fn(() => true);
            mockCommentService.deleteComment.mockResolvedValue({ success: true });

            const deleteBtn = container.querySelector('[data-action="delete"]');
            deleteBtn.click();

            expect(global.confirm).toHaveBeenCalledWith('Are you sure you want to delete this comment?');
            
            await new Promise(resolve => setTimeout(resolve, 100));
            
            expect(mockCommentService.deleteComment).toHaveBeenCalledWith('comment-1');
        });

        test('should resolve comment', async () => {
            mockCommentService.resolveComment.mockResolvedValue({ success: true });

            const resolveBtn = container.querySelector('[data-action="resolve"]');
            resolveBtn.click();

            await new Promise(resolve => setTimeout(resolve, 100));

            expect(mockCommentService.resolveComment).toHaveBeenCalledWith('comment-1');
        });
    });

    describe('Reply Functionality', () => {
        beforeEach(async () => {
            commentThread = new CommentThread(container, {
                itemId: 'item-1',
                boardId: 'board-1'
            });
            await new Promise(resolve => setTimeout(resolve, 100));
        });

        test('should start reply', () => {
            const replyBtn = container.querySelector('[data-action="reply"]');
            replyBtn.click();

            expect(container.querySelector('.reply-composer')).toBeTruthy();
            expect(container.querySelector('.reply-composer-textarea')).toBeTruthy();
        });

        test('should submit reply', async () => {
            mockCommentService.createComment.mockResolvedValue({
                success: true,
                data: { id: 'comment-3', content: 'Test reply' }
            });

            // Start reply
            const replyBtn = container.querySelector('[data-action="reply"]');
            replyBtn.click();

            // Enter content
            const textarea = container.querySelector('.reply-composer-textarea');
            textarea.value = 'Test reply';
            textarea.dispatchEvent(new Event('input'));

            // Submit
            const submitBtn = container.querySelector('[data-action="submit-reply"]');
            submitBtn.click();

            await new Promise(resolve => setTimeout(resolve, 100));

            expect(mockCommentService.createComment).toHaveBeenCalledWith({
                itemId: 'item-1',
                content: 'Test reply',
                parentId: 'comment-1'
            });
        });

        test('should cancel reply', () => {
            // Start reply
            const replyBtn = container.querySelector('[data-action="reply"]');
            replyBtn.click();

            // Cancel
            const cancelBtn = container.querySelector('[data-action="cancel-reply"]');
            cancelBtn.click();

            expect(container.querySelector('.reply-composer')).toBeFalsy();
        });
    });

    describe('Filtering and Sorting', () => {
        beforeEach(async () => {
            commentThread = new CommentThread(container, {
                itemId: 'item-1',
                boardId: 'board-1'
            });
            await new Promise(resolve => setTimeout(resolve, 100));
        });

        test('should change sort order', async () => {
            const sortSelect = container.querySelector('[data-sort-order]');
            sortSelect.value = 'desc';
            sortSelect.dispatchEvent(new Event('change'));

            await new Promise(resolve => setTimeout(resolve, 100));

            expect(mockCommentService.getComments).toHaveBeenCalledWith('item-1', {
                includeReplies: true,
                sortOrder: 'desc'
            });
        });

        test('should filter by resolved status', () => {
            const filterSelect = container.querySelector('[data-filter-by]');
            filterSelect.value = 'resolved';
            filterSelect.dispatchEvent(new Event('change'));

            // Should re-render with filtered comments
            expect(commentThread.state.filterBy).toBe('resolved');
        });
    });

    describe('Keyboard Shortcuts', () => {
        beforeEach(async () => {
            commentThread = new CommentThread(container, {
                itemId: 'item-1',
                boardId: 'board-1'
            });
            await new Promise(resolve => setTimeout(resolve, 100));
        });

        test('should save edit with Ctrl+Enter', async () => {
            mockCommentService.updateComment.mockResolvedValue({ success: true });

            // Start editing
            const editBtn = container.querySelector('[data-action="edit"]');
            editBtn.click();

            // Press Ctrl+Enter
            const textarea = container.querySelector('.comment-editor-textarea');
            const event = new KeyboardEvent('keydown', {
                key: 'Enter',
                ctrlKey: true
            });
            textarea.dispatchEvent(event);

            await new Promise(resolve => setTimeout(resolve, 100));

            expect(mockCommentService.updateComment).toHaveBeenCalled();
        });

        test('should cancel edit with Escape', () => {
            // Start editing
            const editBtn = container.querySelector('[data-action="edit"]');
            editBtn.click();

            // Press Escape
            const textarea = container.querySelector('.comment-editor-textarea');
            const event = new KeyboardEvent('keydown', { key: 'Escape' });
            textarea.dispatchEvent(event);

            expect(container.querySelector('.comment-editor')).toBeFalsy();
        });
    });
});

describe('CommentComposer', () => {
    let container;
    let commentComposer;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);

        mockAuthService.getCurrentUser.mockReturnValue({
            id: 'user-1',
            name: 'John Doe',
            email: 'john@example.com'
        });

        mockUserService.searchUsers.mockResolvedValue({
            success: true,
            data: [
                { id: 'user-2', name: 'Jane Smith', email: 'jane@example.com' },
                { id: 'user-3', name: 'Bob Johnson', email: 'bob@example.com' }
            ]
        });
    });

    afterEach(() => {
        if (commentComposer) {
            commentComposer.destroy();
        }
        document.body.removeChild(container);
        jest.clearAllMocks();
    });

    describe('Initialization', () => {
        test('should initialize with default state', () => {
            commentComposer = new CommentComposer(container, {
                itemId: 'item-1',
                boardId: 'board-1'
            });

            expect(container.querySelector('.comment-composer')).toBeTruthy();
            expect(container.querySelector('.composer-textarea')).toBeTruthy();
            expect(container.querySelector('.composer-submit-btn')).toBeTruthy();
        });

        test('should disable submit button initially', () => {
            commentComposer = new CommentComposer(container, {
                itemId: 'item-1',
                boardId: 'board-1'
            });

            const submitBtn = container.querySelector('.composer-submit-btn');
            expect(submitBtn.disabled).toBe(true);
        });

        test('should show user avatar', () => {
            commentComposer = new CommentComposer(container, {
                itemId: 'item-1',
                boardId: 'board-1'
            });

            const avatar = container.querySelector('.composer-avatar-initials');
            expect(avatar).toBeTruthy();
            expect(avatar.textContent).toBe('JD');
        });
    });

    describe('Text Input', () => {
        beforeEach(() => {
            commentComposer = new CommentComposer(container, {
                itemId: 'item-1',
                boardId: 'board-1'
            });
        });

        test('should update state on text input', () => {
            const textarea = container.querySelector('.composer-textarea');
            textarea.value = 'Test comment';
            textarea.dispatchEvent(new Event('input'));

            expect(commentComposer.state.content).toBe('Test comment');
        });

        test('should enable submit button when text is entered', () => {
            const textarea = container.querySelector('.composer-textarea');
            const submitBtn = container.querySelector('.composer-submit-btn');

            textarea.value = 'Test comment';
            textarea.dispatchEvent(new Event('input'));

            expect(submitBtn.disabled).toBe(false);
        });

        test('should adjust textarea height automatically', () => {
            const textarea = container.querySelector('.composer-textarea');
            
            // Simulate long content
            textarea.value = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5';
            textarea.dispatchEvent(new Event('input'));

            expect(parseInt(textarea.style.height)).toBeGreaterThan(80);
        });
    });

    describe('Mention Support', () => {
        beforeEach(() => {
            commentComposer = new CommentComposer(container, {
                itemId: 'item-1',
                boardId: 'board-1',
                allowMentions: true
            });
        });

        test('should show mention dropdown when typing @', async () => {
            const textarea = container.querySelector('.composer-textarea');
            
            textarea.value = 'Hello @j';
            textarea.selectionStart = textarea.selectionEnd = 8;
            textarea.dispatchEvent(new Event('input'));

            await new Promise(resolve => setTimeout(resolve, 100));

            expect(mockUserService.searchUsers).toHaveBeenCalledWith({
                query: 'j',
                boardId: 'board-1',
                limit: 10
            });

            const dropdown = container.querySelector('.composer-mentions-dropdown');
            expect(dropdown.style.display).toBe('block');
        });

        test('should hide mention dropdown when @ is not present', () => {
            const textarea = container.querySelector('.composer-textarea');
            
            textarea.value = 'Hello world';
            textarea.selectionStart = textarea.selectionEnd = 11;
            textarea.dispatchEvent(new Event('input'));

            const dropdown = container.querySelector('.composer-mentions-dropdown');
            expect(dropdown.style.display).toBe('none');
        });

        test('should select mention on click', async () => {
            const textarea = container.querySelector('.composer-textarea');
            
            // Trigger mention dropdown
            textarea.value = 'Hello @j';
            textarea.selectionStart = textarea.selectionEnd = 8;
            textarea.dispatchEvent(new Event('input'));

            await new Promise(resolve => setTimeout(resolve, 100));

            // Click on first mention
            const firstMention = container.querySelector('[data-action="select-mention"]');
            firstMention.click();

            expect(textarea.value).toBe('Hello @Jane Smith ');
        });

        test('should navigate mentions with arrow keys', async () => {
            const textarea = container.querySelector('.composer-textarea');
            
            // Trigger mention dropdown
            textarea.value = 'Hello @j';
            textarea.selectionStart = textarea.selectionEnd = 8;
            textarea.dispatchEvent(new Event('input'));

            await new Promise(resolve => setTimeout(resolve, 100));

            // Press arrow down
            const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
            textarea.dispatchEvent(event);

            expect(commentComposer.state.selectedMentionIndex).toBe(1);
        });

        test('should select mention with Enter key', async () => {
            const textarea = container.querySelector('.composer-textarea');
            
            // Trigger mention dropdown
            textarea.value = 'Hello @j';
            textarea.selectionStart = textarea.selectionEnd = 8;
            textarea.dispatchEvent(new Event('input'));

            await new Promise(resolve => setTimeout(resolve, 100));

            // Press Enter
            const event = new KeyboardEvent('keydown', { key: 'Enter' });
            textarea.dispatchEvent(event);

            expect(textarea.value).toBe('Hello @Jane Smith ');
        });
    });

    describe('File Attachments', () => {
        beforeEach(() => {
            commentComposer = new CommentComposer(container, {
                itemId: 'item-1',
                boardId: 'board-1',
                allowAttachments: true
            });
        });

        test('should show file input when attach button is clicked', () => {
            const attachBtn = container.querySelector('[data-action="attach"]');
            const fileInput = container.querySelector('.composer-file-input');
            
            fileInput.click = jest.fn();
            attachBtn.click();
            
            expect(fileInput.click).toHaveBeenCalled();
        });

        test('should validate file size', async () => {
            const file = new File(['content'], 'test.txt', { type: 'text/plain' });
            Object.defineProperty(file, 'size', { value: 20 * 1024 * 1024 }); // 20MB

            commentComposer.showError = jest.fn();
            await commentComposer.addAttachment(file);

            expect(commentComposer.showError).toHaveBeenCalledWith(
                expect.stringContaining('too large')
            );
        });

        test('should validate file type', async () => {
            const file = new File(['content'], 'test.exe', { type: 'application/exe' });

            commentComposer.showError = jest.fn();
            await commentComposer.addAttachment(file);

            expect(commentComposer.showError).toHaveBeenCalledWith(
                expect.stringContaining('not allowed')
            );
        });

        test('should handle drag and drop', () => {
            const dragEvent = new DragEvent('dragover', {
                dataTransfer: {
                    dropEffect: 'copy',
                    files: []
                }
            });
            
            Object.defineProperty(dragEvent, 'preventDefault', {
                value: jest.fn()
            });

            container.dispatchEvent(dragEvent);

            expect(dragEvent.preventDefault).toHaveBeenCalled();
            expect(container.classList.contains('comment-composer--drag-over')).toBe(true);
        });

        test('should remove attachment', () => {
            commentComposer.setState({
                attachments: [
                    { id: '1', name: 'file1.txt' },
                    { id: '2', name: 'file2.txt' }
                ]
            });
            commentComposer.render();

            const removeBtn = container.querySelector('[data-action="remove-attachment"]');
            removeBtn.click();

            expect(commentComposer.state.attachments).toHaveLength(1);
        });
    });

    describe('Comment Submission', () => {
        beforeEach(() => {
            commentComposer = new CommentComposer(container, {
                itemId: 'item-1',
                boardId: 'board-1'
            });
        });

        test('should submit comment successfully', async () => {
            mockCommentService.createComment.mockResolvedValue({
                success: true,
                data: { id: 'comment-1', content: 'Test comment' }
            });

            const textarea = container.querySelector('.composer-textarea');
            const submitBtn = container.querySelector('.composer-submit-btn');

            textarea.value = 'Test comment';
            textarea.dispatchEvent(new Event('input'));
            submitBtn.click();

            expect(commentComposer.state.isSubmitting).toBe(true);

            await new Promise(resolve => setTimeout(resolve, 100));

            expect(mockCommentService.createComment).toHaveBeenCalledWith({
                itemId: 'item-1',
                content: 'Test comment',
                attachments: []
            });

            expect(commentComposer.state.content).toBe('');
            expect(commentComposer.state.isSubmitting).toBe(false);
        });

        test('should handle submission error', async () => {
            mockCommentService.createComment.mockRejectedValue(new Error('Network error'));

            const textarea = container.querySelector('.composer-textarea');
            const submitBtn = container.querySelector('.composer-submit-btn');

            textarea.value = 'Test comment';
            textarea.dispatchEvent(new Event('input'));
            submitBtn.click();

            await new Promise(resolve => setTimeout(resolve, 100));

            expect(commentComposer.state.errors.submit).toBe('Network error');
            expect(container.querySelector('.comment-error')).toBeTruthy();
        });

        test('should prevent empty comment submission', () => {
            const submitBtn = container.querySelector('.composer-submit-btn');
            
            commentComposer.showError = jest.fn();
            submitBtn.click();

            expect(commentComposer.showError).toHaveBeenCalledWith('Comment cannot be empty');
        });

        test('should submit with Ctrl+Enter', async () => {
            mockCommentService.createComment.mockResolvedValue({
                success: true,
                data: { id: 'comment-1' }
            });

            const textarea = container.querySelector('.composer-textarea');
            textarea.value = 'Test comment';
            textarea.dispatchEvent(new Event('input'));

            const event = new KeyboardEvent('keydown', {
                key: 'Enter',
                ctrlKey: true
            });
            textarea.dispatchEvent(event);

            await new Promise(resolve => setTimeout(resolve, 100));

            expect(mockCommentService.createComment).toHaveBeenCalled();
        });
    });

    describe('Accessibility', () => {
        beforeEach(() => {
            commentComposer = new CommentComposer(container, {
                itemId: 'item-1',
                boardId: 'board-1'
            });
        });

        test('should have proper ARIA labels', () => {
            const textarea = container.querySelector('.composer-textarea');
            expect(textarea.getAttribute('placeholder')).toBeTruthy();
        });

        test('should support tab navigation', () => {
            const textarea = container.querySelector('.composer-textarea');
            const event = new KeyboardEvent('keydown', { key: 'Tab' });
            
            textarea.dispatchEvent(event);

            // Should focus on tool buttons
            const toolBtns = container.querySelectorAll('.composer-tool-btn');
            expect(toolBtns.length).toBeGreaterThan(0);
        });
    });

    describe('Public Methods', () => {
        beforeEach(() => {
            commentComposer = new CommentComposer(container, {
                itemId: 'item-1',
                boardId: 'board-1'
            });
        });

        test('should focus textarea', () => {
            const textarea = container.querySelector('.composer-textarea');
            textarea.focus = jest.fn();

            commentComposer.focus();

            expect(textarea.focus).toHaveBeenCalled();
        });

        test('should clear content', () => {
            commentComposer.setState({
                content: 'Test content',
                attachments: [{ id: '1', name: 'file.txt' }]
            });

            commentComposer.clear();

            expect(commentComposer.state.content).toBe('');
            expect(commentComposer.state.attachments).toHaveLength(0);
        });

        test('should set content', () => {
            commentComposer.setContent('New content');

            expect(commentComposer.state.content).toBe('New content');
        });
    });
}); 