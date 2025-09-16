/**
 * Tests for Enhanced Cell Editor Component
 */

import { EnhancedCellEditor } from '../js/components/board/EnhancedCellEditor.js';

describe('EnhancedCellEditor', () => {
    let container;
    let editor;
    let mockColumn;
    let mockOnSave;
    let mockOnCancel;

    beforeEach(() => {
        // Create container element
        container = document.createElement('div');
        document.body.appendChild(container);

        // Mock functions
        mockOnSave = jest.fn().mockResolvedValue();
        mockOnCancel = jest.fn();

        // Mock column
        mockColumn = {
            id: 'test-column',
            type: 'text',
            name: 'Test Column',
            settings: {}
        };
    });

    afterEach(() => {
        if (editor) {
            editor.destroy();
        }
        document.body.removeChild(container);
    });

    describe('Text Field', () => {
        beforeEach(() => {
            editor = new EnhancedCellEditor(container, {
                itemId: 'test-item',
                column: mockColumn,
                value: 'Test Value',
                onSave: mockOnSave,
                onCancel: mockOnCancel
            });
        });

        test('should render text value in display mode', () => {
            expect(container.innerHTML).toContain('Test Value');
            expect(container.querySelector('.cell-text')).toBeTruthy();
        });

        test('should enter edit mode on double click', () => {
            const displayElement = container.querySelector('.cell-display');
            displayElement.dispatchEvent(new Event('dblclick'));

            expect(container.querySelector('.cell-editor-input')).toBeTruthy();
            expect(container.querySelector('.cell-editor-actions')).toBeTruthy();
        });

        test('should save value on enter key', async () => {
            // Enter edit mode
            editor.startEditing();
            
            const input = container.querySelector('.cell-editor-input');
            input.value = 'Updated Value';
            input.dispatchEvent(new Event('input'));

            // Simulate enter key
            const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
            container.dispatchEvent(enterEvent);

            expect(mockOnSave).toHaveBeenCalledWith('test-item', 'test-column', 'Updated Value');
        });

        test('should cancel editing on escape key', () => {
            // Enter edit mode
            editor.startEditing();
            
            // Simulate escape key
            const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
            container.dispatchEvent(escapeEvent);

            expect(mockOnCancel).toHaveBeenCalledWith('test-column');
            expect(container.querySelector('.cell-editor-input')).toBeFalsy();
        });

        test('should validate required field', () => {
            mockColumn.settings.required = true;
            editor = new EnhancedCellEditor(container, {
                itemId: 'test-item',
                column: mockColumn,
                value: '',
                onSave: mockOnSave,
                onCancel: mockOnCancel
            });

            editor.startEditing();
            
            const input = container.querySelector('.cell-editor-input');
            input.value = '';
            input.dispatchEvent(new Event('input'));

            // Try to save
            const saveBtn = container.querySelector('[data-action="save"]');
            saveBtn.click();

            expect(container.querySelector('.cell-error-text')).toBeTruthy();
            expect(mockOnSave).not.toHaveBeenCalled();
        });

        test('should validate max length', () => {
            mockColumn.settings.maxLength = 10;
            editor = new EnhancedCellEditor(container, {
                itemId: 'test-item',
                column: mockColumn,
                value: '',
                onSave: mockOnSave,
                onCancel: mockOnCancel
            });

            editor.startEditing();
            
            const input = container.querySelector('.cell-editor-input');
            input.value = 'This is a very long text that exceeds the limit';
            input.dispatchEvent(new Event('input'));

            // Try to save
            const saveBtn = container.querySelector('[data-action="save"]');
            saveBtn.click();

            expect(container.querySelector('.cell-error-text')).toBeTruthy();
            expect(mockOnSave).not.toHaveBeenCalled();
        });
    });

    describe('Email Field', () => {
        beforeEach(() => {
            mockColumn.type = 'email';
            editor = new EnhancedCellEditor(container, {
                itemId: 'test-item',
                column: mockColumn,
                value: 'test@example.com',
                onSave: mockOnSave,
                onCancel: mockOnCancel
            });
        });

        test('should render email value', () => {
            expect(container.innerHTML).toContain('test@example.com');
        });

        test('should validate email format', () => {
            editor.startEditing();
            
            const input = container.querySelector('.cell-editor-input');
            input.value = 'invalid-email';
            input.dispatchEvent(new Event('input'));

            // Try to save
            const saveBtn = container.querySelector('[data-action="save"]');
            saveBtn.click();

            expect(container.querySelector('.cell-error-text')).toBeTruthy();
            expect(mockOnSave).not.toHaveBeenCalled();
        });

        test('should accept valid email', async () => {
            editor.startEditing();
            
            const input = container.querySelector('.cell-editor-input');
            input.value = 'valid@example.com';
            input.dispatchEvent(new Event('input'));

            // Try to save
            const saveBtn = container.querySelector('[data-action="save"]');
            saveBtn.click();

            expect(mockOnSave).toHaveBeenCalledWith('test-item', 'test-column', 'valid@example.com');
        });
    });

    describe('Number Field', () => {
        beforeEach(() => {
            mockColumn.type = 'number';
            mockColumn.settings.unit = 'kg';
            editor = new EnhancedCellEditor(container, {
                itemId: 'test-item',
                column: mockColumn,
                value: 42,
                onSave: mockOnSave,
                onCancel: mockOnCancel
            });
        });

        test('should render number value with unit', () => {
            expect(container.innerHTML).toContain('42');
            expect(container.innerHTML).toContain('kg');
        });

        test('should validate number format', () => {
            editor.startEditing();
            
            const input = container.querySelector('.cell-editor-input');
            input.value = 'not-a-number';
            input.dispatchEvent(new Event('input'));

            // Try to save
            const saveBtn = container.querySelector('[data-action="save"]');
            saveBtn.click();

            expect(container.querySelector('.cell-error-text')).toBeTruthy();
            expect(mockOnSave).not.toHaveBeenCalled();
        });

        test('should validate min/max values', () => {
            mockColumn.settings.min = 10;
            mockColumn.settings.max = 100;
            
            editor = new EnhancedCellEditor(container, {
                itemId: 'test-item',
                column: mockColumn,
                value: 42,
                onSave: mockOnSave,
                onCancel: mockOnCancel
            });

            editor.startEditing();
            
            const input = container.querySelector('.cell-editor-input');
            input.value = '5'; // Below minimum
            input.dispatchEvent(new Event('input'));

            // Try to save
            const saveBtn = container.querySelector('[data-action="save"]');
            saveBtn.click();

            expect(container.querySelector('.cell-error-text')).toBeTruthy();
            expect(mockOnSave).not.toHaveBeenCalled();
        });
    });

    describe('Checkbox Field', () => {
        beforeEach(() => {
            mockColumn.type = 'checkbox';
            editor = new EnhancedCellEditor(container, {
                itemId: 'test-item',
                column: mockColumn,
                value: false,
                onSave: mockOnSave,
                onCancel: mockOnCancel
            });
        });

        test('should render checkbox unchecked', () => {
            expect(container.querySelector('.checkbox-icon')).toBeTruthy();
            expect(container.innerHTML).toContain('Not completed');
        });

        test('should toggle checkbox on click', async () => {
            const checkboxDisplay = container.querySelector('.cell-checkbox');
            checkboxDisplay.click();

            expect(mockOnSave).toHaveBeenCalledWith('test-item', 'test-column', true);
        });

        test('should render checkbox checked', () => {
            editor = new EnhancedCellEditor(container, {
                itemId: 'test-item',
                column: mockColumn,
                value: true,
                onSave: mockOnSave,
                onCancel: mockOnCancel
            });

            expect(container.innerHTML).toContain('Completed');
            expect(container.querySelector('.checkbox-icon--checked')).toBeTruthy();
        });
    });

    describe('Status Field', () => {
        beforeEach(() => {
            mockColumn.type = 'status';
            mockColumn.settings.options = ['Todo', 'In Progress', 'Done'];
            editor = new EnhancedCellEditor(container, {
                itemId: 'test-item',
                column: mockColumn,
                value: 'In Progress',
                onSave: mockOnSave,
                onCancel: mockOnCancel
            });
        });

        test('should render status badge', () => {
            expect(container.querySelector('.status-badge')).toBeTruthy();
            expect(container.innerHTML).toContain('In Progress');
        });

        test('should show select dropdown in edit mode', () => {
            editor.startEditing();
            
            const select = container.querySelector('.cell-editor-select');
            expect(select).toBeTruthy();
            expect(select.querySelectorAll('option')).toHaveLength(4); // Including empty option
        });

        test('should auto-save on selection change', async () => {
            editor.startEditing();
            
            const select = container.querySelector('.cell-editor-select');
            select.value = 'Done';
            select.dispatchEvent(new Event('change'));

            // Wait for auto-save timeout
            await new Promise(resolve => setTimeout(resolve, 150));

            expect(mockOnSave).toHaveBeenCalledWith('test-item', 'test-column', 'Done');
        });
    });

    describe('Date Field', () => {
        beforeEach(() => {
            mockColumn.type = 'date';
            editor = new EnhancedCellEditor(container, {
                itemId: 'test-item',
                column: mockColumn,
                value: '2024-01-15',
                onSave: mockOnSave,
                onCancel: mockOnCancel
            });
        });

        test('should render date display', () => {
            expect(container.querySelector('.cell-date')).toBeTruthy();
            expect(container.querySelector('.cell-date-icon')).toBeTruthy();
            expect(container.innerHTML).toContain('Jan 15, 2024');
        });

        test('should show date input in edit mode', () => {
            editor.startEditing();
            
            const input = container.querySelector('.cell-editor-input');
            expect(input.type).toBe('date');
            expect(input.value).toBe('2024-01-15');
        });

        test('should mark overdue dates', () => {
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 1);
            
            editor = new EnhancedCellEditor(container, {
                itemId: 'test-item',
                column: mockColumn,
                value: pastDate.toISOString().split('T')[0],
                onSave: mockOnSave,
                onCancel: mockOnCancel
            });

            expect(container.querySelector('.cell-date--overdue')).toBeTruthy();
        });
    });

    describe('Tags Field', () => {
        beforeEach(() => {
            mockColumn.type = 'tags';
            editor = new EnhancedCellEditor(container, {
                itemId: 'test-item',
                column: mockColumn,
                value: ['tag1', 'tag2', 'tag3', 'tag4'],
                onSave: mockOnSave,
                onCancel: mockOnCancel
            });
        });

        test('should render tags with overflow indicator', () => {
            expect(container.querySelectorAll('.tag')).toHaveLength(4); // 3 visible + more indicator
            expect(container.querySelector('.tag--more')).toBeTruthy();
            expect(container.innerHTML).toContain('+1');
        });

        test('should convert comma-separated string to array', async () => {
            editor.startEditing();
            
            const input = container.querySelector('.cell-editor-input');
            input.value = 'new-tag1, new-tag2, new-tag3';
            input.dispatchEvent(new Event('input'));

            const saveBtn = container.querySelector('[data-action="save"]');
            saveBtn.click();

            expect(mockOnSave).toHaveBeenCalledWith('test-item', 'test-column', ['new-tag1', 'new-tag2', 'new-tag3']);
        });
    });

    describe('People Field', () => {
        beforeEach(() => {
            mockColumn.type = 'people';
            editor = new EnhancedCellEditor(container, {
                itemId: 'test-item',
                column: mockColumn,
                value: [
                    { id: '1', name: 'John Doe', email: 'john@example.com' },
                    { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
                    { id: '3', name: 'Bob Johnson', email: 'bob@example.com' },
                    { id: '4', name: 'Alice Brown', email: 'alice@example.com' }
                ],
                onSave: mockOnSave,
                onCancel: mockOnCancel
            });
        });

        test('should render people avatars with overflow', () => {
            expect(container.querySelectorAll('.person-avatar')).toHaveLength(4); // 3 visible + more indicator
            expect(container.querySelector('.person-avatar--more')).toBeTruthy();
            expect(container.innerHTML).toContain('+1');
        });

        test('should show initials for people without avatars', () => {
            expect(container.querySelector('.person-initials')).toBeTruthy();
            expect(container.innerHTML).toContain('JD'); // John Doe initials
        });
    });

    describe('Error Handling', () => {
        beforeEach(() => {
            editor = new EnhancedCellEditor(container, {
                itemId: 'test-item',
                column: mockColumn,
                value: 'Test Value',
                onSave: mockOnSave,
                onCancel: mockOnCancel
            });
        });

        test('should handle save errors', async () => {
            mockOnSave.mockRejectedValue(new Error('Save failed'));
            
            editor.startEditing();
            
            const input = container.querySelector('.cell-editor-input');
            input.value = 'New Value';
            input.dispatchEvent(new Event('input'));

            const saveBtn = container.querySelector('[data-action="save"]');
            saveBtn.click();

            // Wait for error handling
            await new Promise(resolve => setTimeout(resolve, 100));

            expect(container.querySelector('.cell-error-text')).toBeTruthy();
            expect(container.innerHTML).toContain('Save failed');
        });

        test('should show loading state during save', async () => {
            let resolveSave;
            mockOnSave.mockImplementation(() => new Promise(resolve => {
                resolveSave = resolve;
            }));
            
            editor.startEditing();
            
            const saveBtn = container.querySelector('[data-action="save"]');
            saveBtn.click();

            expect(container.querySelector('.cell-editor--loading')).toBeTruthy();
            expect(saveBtn.textContent).toContain('Saving...');

            // Resolve the save
            resolveSave();
            await new Promise(resolve => setTimeout(resolve, 100));

            expect(container.querySelector('.cell-editor--loading')).toBeFalsy();
        });
    });

    describe('Read-only Mode', () => {
        beforeEach(() => {
            editor = new EnhancedCellEditor(container, {
                itemId: 'test-item',
                column: mockColumn,
                value: 'Test Value',
                onSave: mockOnSave,
                onCancel: mockOnCancel,
                readOnly: true
            });
        });

        test('should not enter edit mode when read-only', () => {
            const displayElement = container.querySelector('.cell-display');
            displayElement.dispatchEvent(new Event('dblclick'));

            expect(container.querySelector('.cell-editor-input')).toBeFalsy();
        });

        test('should show readonly styling', () => {
            expect(container.querySelector('.cell-display--readonly')).toBeTruthy();
        });
    });

    describe('Cleanup', () => {
        test('should remove event listeners on destroy', () => {
            const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');
            
            editor = new EnhancedCellEditor(container, {
                itemId: 'test-item',
                column: mockColumn,
                value: 'Test Value',
                onSave: mockOnSave,
                onCancel: mockOnCancel
            });

            editor.destroy();

            expect(removeEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function));
        });
    });
}); 