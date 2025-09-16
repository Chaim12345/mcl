/**
 * @jest-environment jsdom
 */

import { BoardService } from '../../js/services/boardService.js';

// Mock fetch
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
};
global.localStorage = localStorageMock;

describe('BoardService', () => {
    let service;
    const mockBaseUrl = 'http://localhost:8080/api';

    beforeEach(() => {
        service = new BoardService(mockBaseUrl);
        fetch.mockClear();
        localStorage.clear();
    });

    describe('Initialization', () => {
        test('should initialize with correct base URL', () => {
            expect(service.baseUrl).toBe(mockBaseUrl);
            expect(service.cache).toBeDefined();
        });

        test('should handle custom headers', () => {
            const customService = new BoardService(mockBaseUrl, {
                headers: { 'Authorization': 'Bearer token123' }
            });
            expect(customService.headers['Authorization']).toBe('Bearer token123');
        });
    });

    describe('Board Creation', () => {
        test('should create a new board', async () => {
            const mockBoard = {
                id: 'board-123',
                name: 'Test Board',
                workspaceId: 'workspace-456',
                createdBy: 'user-789'
            };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockBoard)
            });

            const result = await service.createBoard({
                name: 'Test Board',
                workspaceId: 'workspace-456'
            });

            expect(result).toEqual(mockBoard);
            expect(fetch).toHaveBeenCalledWith(
                `${mockBaseUrl}/boards`,
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({
                        name: 'Test Board',
                        workspaceId: 'workspace-456'
                    })
                })
            );
        });

        test('should handle creation errors', async () => {
            fetch.mockResolvedValueOnce({
                ok: false,
                status: 400,
                json: () => Promise.resolve({ error: 'Invalid board data' })
            });

            await expect(service.createBoard({ name: '' }))
                .rejects
                .toThrow('Failed to create board');
        });

        test('should validate board data before creation', async () => {
            await expect(service.createBoard(null))
                .rejects
                .toThrow('Board data is required');

            await expect(service.createBoard({}))
                .rejects
                .toThrow('Board name is required');
        });
    });

    describe('Board Retrieval', () => {
        test('should get all boards', async () => {
            const mockBoards = [
                { id: 'board-1', name: 'Board 1' },
                { id: 'board-2', name: 'Board 2' }
            ];

            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockBoards)
            });

            const result = await service.getBoards();
            expect(result).toEqual(mockBoards);
            expect(fetch).toHaveBeenCalledWith(
                `${mockBaseUrl}/boards`,
                expect.any(Object)
            );
        });

        test('should get board by ID', async () => {
            const mockBoard = {
                id: 'board-123',
                name: 'Test Board',
                columns: []
            };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockBoard)
            });

            const result = await service.getBoard('board-123');
            expect(result).toEqual(mockBoard);
            expect(fetch).toHaveBeenCalledWith(
                `${mockBaseUrl}/boards/board-123`,
                expect.any(Object)
            );
        });

        test('should handle board not found', async () => {
            fetch.mockResolvedValueOnce({
                ok: false,
                status: 404
            });

            await expect(service.getBoard('nonexistent'))
                .rejects
                .toThrow('Board not found');
        });

        test('should cache board data', async () => {
            const mockBoard = { id: 'board-123', name: 'Cached Board' };
            
            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockBoard)
            });

            await service.getBoard('board-123');
            expect(service.cache.get('board-board-123')).toEqual(mockBoard);

            // Second call should use cache
            await service.getBoard('board-123');
            expect(fetch).toHaveBeenCalledTimes(1);
        });
    });

    describe('Board Updates', () => {
        test('should update board details', async () => {
            const mockUpdatedBoard = {
                id: 'board-123',
                name: 'Updated Board Name',
                description: 'New Description'
            };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockUpdatedBoard)
            });

            const result = await service.updateBoard('board-123', {
                name: 'Updated Board Name',
                description: 'New Description'
            });

            expect(result).toEqual(mockUpdatedBoard);
            expect(fetch).toHaveBeenCalledWith(
                `${mockBaseUrl}/boards/board-123`,
                expect.objectContaining({
                    method: 'PUT',
                    body: JSON.stringify({
                        name: 'Updated Board Name',
                        description: 'New Description'
                    })
                })
            );
        });

        test('should invalidate cache on update', async () => {
            const mockBoard = { id: 'board-123', name: 'Old Name' };
            
            // First, cache the board
            service.cache.set('board-board-123', mockBoard);
            
            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ ...mockBoard, name: 'New Name' })
            });

            await service.updateBoard('board-123', { name: 'New Name' });
            
            // Cache should be invalidated
            expect(service.cache.get('board-board-123')).toBeUndefined();
        });
    });

    describe('Board Deletion', () => {
        test('should delete a board', async () => {
            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ success: true })
            });

            const result = await service.deleteBoard('board-123');
            expect(result).toEqual({ success: true });
            expect(fetch).toHaveBeenCalledWith(
                `${mockBaseUrl}/boards/board-123`,
                expect.objectContaining({ method: 'DELETE' })
            );
        });

        test('should remove from cache on deletion', async () => {
            service.cache.set('board-board-123', { id: 'board-123', name: 'Test' });
            
            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ success: true })
            });

            await service.deleteBoard('board-123');
            expect(service.cache.get('board-board-123')).toBeUndefined();
        });
    });

    describe('Board Columns', () => {
        test('should add a column to board', async () => {
            const mockColumn = {
                id: 'col-1',
                name: 'To Do',
                position: 1
            };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockColumn)
            });

            const result = await service.addColumn('board-123', {
                name: 'To Do',
                position: 1
            });

            expect(result).toEqual(mockColumn);
            expect(fetch).toHaveBeenCalledWith(
                `${mockBaseUrl}/boards/board-123/columns`,
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({
                        name: 'To Do',
                        position: 1
                    })
                })
            );
        });

        test('should update column details', async () => {
            const mockUpdatedColumn = {
                id: 'col-1',
                name: 'In Progress',
                position: 2
            };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockUpdatedColumn)
            });

            const result = await service.updateColumn('board-123', 'col-1', {
                name: 'In Progress'
            });

            expect(result).toEqual(mockUpdatedColumn);
        });

        test('should delete a column', async () => {
            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ success: true })
            });

            const result = await service.deleteColumn('board-123', 'col-1');
            expect(result).toEqual({ success: true });
        });

        test('should reorder columns', async () => {
            const mockBoard = {
                id: 'board-123',
                columns: [
                    { id: 'col-1', position: 2 },
                    { id: 'col-2', position: 1 }
                ]
            };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockBoard)
            });

            const result = await service.reorderColumns('board-123', ['col-2', 'col-1']);
            expect(result).toEqual(mockBoard);
        });
    });

    describe('Board Search and Filtering', () => {
        test('should search boards by name', async () => {
            const mockResults = [
                { id: 'board-1', name: 'Test Board Alpha' },
                { id: 'board-2', name: 'Another Test Board' }
            ];

            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResults)
            });

            const result = await service.searchBoards('test');
            expect(result).toEqual(mockResults);
            expect(fetch).toHaveBeenCalledWith(
                `${mockBaseUrl}/boards/search?q=test`,
                expect.any(Object)
            );
        });

        test('should filter boards by workspace', async () => {
            const mockBoards = [
                { id: 'board-1', workspaceId: 'workspace-123' },
                { id: 'board-2', workspaceId: 'workspace-123' }
            ];

            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockBoards)
            });

            const result = await service.getBoardsByWorkspace('workspace-123');
            expect(result).toEqual(mockBoards);
        });

        test('should get boards by owner', async () => {
            const mockBoards = [
                { id: 'board-1', createdBy: 'user-123' },
                { id: 'board-2', createdBy: 'user-123' }
            ];

            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockBoards)
            });

            const result = await service.getBoardsByOwner('user-123');
            expect(result).toEqual(mockBoards);
        });
    });

    describe('Board Sharing and Permissions', () => {
        test('should share board with user', async () => {
            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ success: true })
            });

            const result = await service.shareBoard('board-123', 'user-456', 'read');
            expect(result).toEqual({ success: true });
            expect(fetch).toHaveBeenCalledWith(
                `${mockBaseUrl}/boards/board-123/share`,
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({
                        userId: 'user-456',
                        permission: 'read'
                    })
                })
            );
        });

        test('should update board permissions', async () => {
            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ success: true })
            });

            const result = await service.updatePermission('board-123', 'user-456', 'write');
            expect(result).toEqual({ success: true });
        });

        test('should remove board access', async () => {
            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ success: true })
            });

            const result = await service.removeAccess('board-123', 'user-456');
            expect(result).toEqual({ success: true });
        });
    });

    describe('Caching and Performance', () => {
        test('should use cache for get operations', async () => {
            const mockBoard = { id: 'board-123', name: 'Cached Board' };
            
            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockBoard)
            });

            // First call - hit API
            await service.getBoard('board-123');
            expect(fetch).toHaveBeenCalledTimes(1);

            // Second call - use cache
            await service.getBoard('board-123');
            expect(fetch).toHaveBeenCalledTimes(1);
        });

        test('should invalidate cache on modifications', async () => {
            const mockBoard = { id: 'board-123', name: 'Board' };
            
            service.cache.set('board-board-123', mockBoard);
            
            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockBoard)
            });

            await service.updateBoard('board-123', { name: 'Updated' });
            
            expect(service.cache.get('board-board-123')).toBeUndefined();
        });

        test('should cache board lists', async () => {
            const mockBoards = [{ id: 'board-1' }, { id: 'board-2' }];
            
            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockBoards)
            });

            await service.getBoards();
            await service.getBoards();
            
            expect(fetch).toHaveBeenCalledTimes(1);
        });

        test('should handle cache expiration', async () => {
            const mockBoard = { id: 'board-123', name: 'Board' };
            
            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockBoard)
            });

            // Mock old cache entry
            const cacheEntry = {
                data: mockBoard,
                timestamp: Date.now() - 1000 * 60 * 5 // 5 minutes old
            };
            
            service.cache.set('board-board-123', cacheEntry);
            
            await service.getBoard('board-123');
            expect(fetch).toHaveBeenCalledTimes(1); // Should refresh cache
        });
    });

    describe('Error Handling', () => {
        test('should handle network errors', async () => {
            fetch.mockRejectedValueOnce(new Error('Network error'));
            
            await expect(service.getBoard('board-123'))
                .rejects
                .toThrow('Network error');
        });

        test('should handle server errors', async () => {
            fetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error'
            });

            await expect(service.getBoard('board-123'))
                .rejects
                .toThrow('HTTP 500: Internal Server Error');
        });

        test('should handle timeout', async () => {
            fetch.mockImplementation(() => 
                new Promise(resolve => setTimeout(resolve, 60000))
            );

            await expect(service.getBoard('board-123', 1000))
                .rejects
                .toThrow('Request timeout');
        });

        test('should retry on transient errors', async () => {
            const mockBoard = { id: 'board-123', name: 'Board' };
            
            fetch
                .mockResolvedValueOnce({
                    ok: false,
                    status: 503
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve(mockBoard)
                });

            const result = await service.getBoard('board-123');
            expect(result).toEqual(mockBoard);
            expect(fetch).toHaveBeenCalledTimes(2);
        });
    });

    describe('Event Emission', () => {
        test('should emit events on board creation', async () => {
            const mockBoard = { id: 'board-123', name: 'New Board' };
            const eventSpy = jest.fn();
            
            service.on('boardCreated', eventSpy);
            
            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockBoard)
            });

            await service.createBoard({ name: 'New Board' });
            
            expect(eventSpy).toHaveBeenCalledWith(mockBoard);
        });

        test('should emit events on board updates', async () => {
            const mockBoard = { id: 'board-123', name: 'Updated Board' };
            const eventSpy = jest.fn();
            
            service.on('boardUpdated', eventSpy);
            
            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockBoard)
            });

            await service.updateBoard('board-123', { name: 'Updated Board' });
            
            expect(eventSpy).toHaveBeenCalledWith(mockBoard);
        });

        test('should emit events on board deletion', async () => {
            const eventSpy = jest.fn();
            
            service.on('boardDeleted', eventSpy);
            
            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ success: true })
            });

            await service.deleteBoard('board-123');
            
            expect(eventSpy).toHaveBeenCalledWith('board-123');
        });
    });

    describe('Validation', () => {
        test('should validate board IDs', () => {
            expect(() => service.validateBoardId(null)).toThrow('Board ID is required');
            expect(() => service.validateBoardId('')).toThrow('Board ID is required');
            expect(() => service.validateBoardId('invalid-id')).toThrow('Invalid board ID format');
            expect(() => service.validateBoardId('valid-board-id')).not.toThrow();
        });

        test('should validate board data', () => {
            expect(() => service.validateBoardData(null)).toThrow('Board data is required');
            expect(() => service.validateBoardData({})).toThrow('Board name is required');
            expect(() => service.validateBoardData({ name: '' })).toThrow('Board name is required');
            expect(() => service.validateBoardData({ name: 'Valid Name' })).not.toThrow();
        });

        test('should validate column data', () => {
            expect(() => service.validateColumnData(null)).toThrow('Column data is required');
            expect(() => service.validateColumnData({})).toThrow('Column name is required');
            expect(() => service.validateColumnData({ name: '' })).toThrow('Column name is required');
            expect(() => service.validateColumnData({ name: 'Valid Name' })).not.toThrow();
        });
    });
});