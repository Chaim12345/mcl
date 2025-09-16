/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/vibe-test-utils';
import { VibeBoardDemo } from '@/components/demo/vibe-board-demo';
import { BrowserRouter } from 'react-router-dom';

// Mock services
const mockBoardService = {
  getBoards: vi.fn(),
  createBoard: vi.fn(),
  updateBoard: vi.fn(),
  deleteBoard: vi.fn(),
  getBoardItems: vi.fn(),
  createItem: vi.fn(),
  updateItem: vi.fn(),
  deleteItem: vi.fn(),
};

vi.mock('@/services/board-service', () => ({
  boardService: mockBoardService,
}));

function TestWrapper({ children }: { children: React.ReactNode }) {
  return <BrowserRouter>{children}</BrowserRouter>;
}

describe('Board Management Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock data
    mockBoardService.getBoards.mockResolvedValue([
      {
        id: '1',
        name: 'Test Board',
        description: 'Test board description',
        columns: [
          { id: 'status', name: 'Status', type: 'status' },
          { id: 'priority', name: 'Priority', type: 'priority' },
          { id: 'assignee', name: 'Assignee', type: 'person' },
        ],
      },
    ]);

    mockBoardService.getBoardItems.mockResolvedValue([
      {
        id: '1',
        name: 'Test Item 1',
        status: 'In Progress',
        priority: 'High',
        assignee: 'John Doe',
      },
      {
        id: '2',
        name: 'Test Item 2',
        status: 'Done',
        priority: 'Medium',
        assignee: 'Jane Smith',
      },
    ]);
  });

  describe('Board Table with Vibe Components', () => {
    it('renders board table using Vibe Table components', async () => {
      renderWithProviders(
        <TestWrapper>
          <VibeBoardDemo />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('vibe-table')).toBeInTheDocument();
        expect(screen.getByTestId('vibe-table-header')).toBeInTheDocument();
        expect(screen.getByTestId('vibe-table-body')).toBeInTheDocument();
      });

      // Should display board items
      expect(screen.getByText('Test Item 1')).toBeInTheDocument();
      expect(screen.getByText('Test Item 2')).toBeInTheDocument();
    });

    it('handles column sorting with Vibe Table', async () => {
      renderWithProviders(
        <TestWrapper>
          <VibeBoardDemo />
        </TestWrapper>
      );

      await waitFor(() => {
        const statusHeader = screen.getByText('Status');
        expect(statusHeader).toBeInTheDocument();
      });

      // Click on status column to sort
      const statusHeader = screen.getByText('Status');
      fireEvent.click(statusHeader);

      // Should trigger sorting functionality
      await waitFor(() => {
        expect(mockBoardService.getBoardItems).toHaveBeenCalled();
      });
    });

    it('supports row selection with Vibe Table', async () => {
      renderWithProviders(
        <TestWrapper>
          <VibeBoardDemo />
        </TestWrapper>
      );

      await waitFor(() => {
        const checkboxes = screen.getAllByTestId('vibe-checkbox');
        expect(checkboxes.length).toBeGreaterThan(0);
      });

      // Select first row
      const firstCheckbox = screen.getAllByTestId('vibe-checkbox')[0];
      fireEvent.click(firstCheckbox);

      // Should show bulk actions
      await waitFor(() => {
        expect(screen.getByText(/selected/i)).toBeInTheDocument();
      });
    });
  });

  describe('Item Creation with Vibe Modal', () => {
    it('opens item creation modal using Vibe Modal', async () => {
      renderWithProviders(
        <TestWrapper>
          <VibeBoardDemo />
        </TestWrapper>
      );

      // Click add item button
      const addButton = screen.getByTestId('vibe-button');
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByTestId('vibe-modal')).toBeInTheDocument();
        expect(screen.getByText(/add new item/i)).toBeInTheDocument();
      });
    });

    it('creates new item through Vibe form components', async () => {
      mockBoardService.createItem.mockResolvedValue({
        id: '3',
        name: 'New Item',
        status: 'To Do',
        priority: 'Low',
      });

      renderWithProviders(
        <TestWrapper>
          <VibeBoardDemo />
        </TestWrapper>
      );

      // Open modal
      const addButton = screen.getByTestId('vibe-button');
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByTestId('vibe-modal')).toBeInTheDocument();
      });

      // Fill form using Vibe components
      const nameField = screen.getByTestId('vibe-textfield');
      const statusDropdown = screen.getByTestId('vibe-dropdown');
      const saveButton = screen.getByText(/save/i);

      fireEvent.change(nameField, { target: { value: 'New Item' } });
      fireEvent.change(statusDropdown, { target: { value: 'To Do' } });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockBoardService.createItem).toHaveBeenCalledWith({
          name: 'New Item',
          status: 'To Do',
        });
      });
    });
  });

  describe('Item Editing with Vibe Components', () => {
    it('opens item editor using Vibe Modal', async () => {
      renderWithProviders(
        <TestWrapper>
          <VibeBoardDemo />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Item 1')).toBeInTheDocument();
      });

      // Click on item to edit
      const itemRow = screen.getByText('Test Item 1');
      fireEvent.click(itemRow);

      await waitFor(() => {
        expect(screen.getByTestId('vibe-modal')).toBeInTheDocument();
        expect(screen.getByText(/edit item/i)).toBeInTheDocument();
      });
    });

    it('updates item through Vibe form components', async () => {
      mockBoardService.updateItem.mockResolvedValue({
        id: '1',
        name: 'Updated Item',
        status: 'Done',
      });

      renderWithProviders(
        <TestWrapper>
          <VibeBoardDemo />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Item 1')).toBeInTheDocument();
      });

      // Open edit modal
      const itemRow = screen.getByText('Test Item 1');
      fireEvent.click(itemRow);

      await waitFor(() => {
        const nameField = screen.getByTestId('vibe-textfield');
        expect(nameField).toHaveValue('Test Item 1');
      });

      // Update item
      const nameField = screen.getByTestId('vibe-textfield');
      const updateButton = screen.getByText(/update/i);

      fireEvent.change(nameField, { target: { value: 'Updated Item' } });
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(mockBoardService.updateItem).toHaveBeenCalledWith('1', {
          name: 'Updated Item',
        });
      });
    });
  });

  describe('Filtering with Vibe Components', () => {
    it('opens filter panel using Vibe components', async () => {
      renderWithProviders(
        <TestWrapper>
          <VibeBoardDemo />
        </TestWrapper>
      );

      // Click filter button
      const filterButton = screen.getByText(/filter/i);
      fireEvent.click(filterButton);

      await waitFor(() => {
        expect(screen.getByText(/filters/i)).toBeInTheDocument();
        expect(screen.getAllByTestId('vibe-dropdown')).toHaveLength(3); // Status, Priority, Assignee
      });
    });

    it('applies filters using Vibe Dropdown components', async () => {
      renderWithProviders(
        <TestWrapper>
          <VibeBoardDemo />
        </TestWrapper>
      );

      // Open filters
      const filterButton = screen.getByText(/filter/i);
      fireEvent.click(filterButton);

      await waitFor(() => {
        const statusFilter = screen.getAllByTestId('vibe-dropdown')[0];
        expect(statusFilter).toBeInTheDocument();
      });

      // Apply status filter
      const statusFilter = screen.getAllByTestId('vibe-dropdown')[0];
      fireEvent.change(statusFilter, { target: { value: 'In Progress' } });

      // Apply filters
      const applyButton = screen.getByText(/apply/i);
      fireEvent.click(applyButton);

      await waitFor(() => {
        expect(mockBoardService.getBoardItems).toHaveBeenCalledWith(
          expect.objectContaining({
            filters: expect.objectContaining({
              status: 'In Progress',
            }),
          })
        );
      });
    });

    it('clears filters using Vibe Button', async () => {
      renderWithProviders(
        <TestWrapper>
          <VibeBoardDemo />
        </TestWrapper>
      );

      // Open filters and apply some
      const filterButton = screen.getByText(/filter/i);
      fireEvent.click(filterButton);

      await waitFor(() => {
        const clearButton = screen.getByText(/clear/i);
        expect(clearButton).toBeInTheDocument();
      });

      // Clear filters
      const clearButton = screen.getByText(/clear/i);
      fireEvent.click(clearButton);

      await waitFor(() => {
        expect(mockBoardService.getBoardItems).toHaveBeenCalledWith(
          expect.objectContaining({
            filters: {},
          })
        );
      });
    });
  });

  describe('Bulk Operations with Vibe Components', () => {
    it('performs bulk delete using Vibe components', async () => {
      mockBoardService.deleteItem.mockResolvedValue({ success: true });

      renderWithProviders(
        <TestWrapper>
          <VibeBoardDemo />
        </TestWrapper>
      );

      await waitFor(() => {
        const checkboxes = screen.getAllByTestId('vibe-checkbox');
        expect(checkboxes.length).toBeGreaterThan(1);
      });

      // Select multiple items
      const checkboxes = screen.getAllByTestId('vibe-checkbox');
      fireEvent.click(checkboxes[0]);
      fireEvent.click(checkboxes[1]);

      // Bulk delete
      const deleteButton = screen.getByText(/delete selected/i);
      fireEvent.click(deleteButton);

      // Confirm in modal
      await waitFor(() => {
        expect(screen.getByTestId('vibe-modal')).toBeInTheDocument();
      });

      const confirmButton = screen.getByText(/confirm/i);
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockBoardService.deleteItem).toHaveBeenCalledTimes(2);
      });
    });

    it('performs bulk status update using Vibe Dropdown', async () => {
      mockBoardService.updateItem.mockResolvedValue({ success: true });

      renderWithProviders(
        <TestWrapper>
          <VibeBoardDemo />
        </TestWrapper>
      );

      await waitFor(() => {
        const checkboxes = screen.getAllByTestId('vibe-checkbox');
        expect(checkboxes.length).toBeGreaterThan(1);
      });

      // Select items
      const checkboxes = screen.getAllByTestId('vibe-checkbox');
      fireEvent.click(checkboxes[0]);
      fireEvent.click(checkboxes[1]);

      // Bulk status update
      const statusDropdown = screen.getByTestId('bulk-status-dropdown');
      fireEvent.change(statusDropdown, { target: { value: 'Done' } });

      const updateButton = screen.getByText(/update selected/i);
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(mockBoardService.updateItem).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Drag and Drop Integration', () => {
    it('maintains drag and drop functionality with Vibe Table', async () => {
      renderWithProviders(
        <TestWrapper>
          <VibeBoardDemo />
        </TestWrapper>
      );

      await waitFor(() => {
        const tableRows = screen.getAllByTestId('vibe-table-row');
        expect(tableRows.length).toBeGreaterThan(1);
      });

      // Simulate drag and drop
      const firstRow = screen.getAllByTestId('vibe-table-row')[0];
      const secondRow = screen.getAllByTestId('vibe-table-row')[1];

      fireEvent.dragStart(firstRow);
      fireEvent.dragOver(secondRow);
      fireEvent.drop(secondRow);

      // Should maintain drag and drop functionality
      expect(firstRow).toHaveAttribute('draggable', 'true');
    });
  });

  describe('Performance with Large Datasets', () => {
    it('handles large datasets efficiently with Vibe Table', async () => {
      // Mock large dataset
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `item-${i}`,
        name: `Item ${i}`,
        status: i % 3 === 0 ? 'Done' : i % 3 === 1 ? 'In Progress' : 'To Do',
        priority: i % 3 === 0 ? 'High' : i % 3 === 1 ? 'Medium' : 'Low',
      }));

      mockBoardService.getBoardItems.mockResolvedValue(largeDataset);

      const startTime = performance.now();
      
      renderWithProviders(
        <TestWrapper>
          <VibeBoardDemo />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('vibe-table')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render within acceptable time (less than 1 second)
      expect(renderTime).toBeLessThan(1000);
    });
  });

  describe('Error Handling', () => {
    it('handles API errors gracefully with Vibe Toast', async () => {
      mockBoardService.getBoardItems.mockRejectedValue(new Error('API Error'));

      renderWithProviders(
        <TestWrapper>
          <VibeBoardDemo />
        </TestWrapper>
      );

      await waitFor(() => {
        const toast = screen.queryByTestId('vibe-toast');
        expect(toast).toBeInTheDocument();
        expect(toast).toHaveAttribute('data-type', 'negative');
      });
    });

    it('shows loading states using Vibe Skeleton', async () => {
      // Delay the API response
      mockBoardService.getBoardItems.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      renderWithProviders(
        <TestWrapper>
          <VibeBoardDemo />
        </TestWrapper>
      );

      // Should show loading skeleton
      expect(screen.getByTestId('vibe-skeleton')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByTestId('vibe-table')).toBeInTheDocument();
      });
    });
  });
});