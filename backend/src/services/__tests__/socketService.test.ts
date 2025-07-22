import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { socketService } from '../socketService.js';
import { generateAccessToken } from '../../utils/jwt.js';
import { query } from '../../db/client.js';

// Mock database
vi.mock('../../db/client.js', () => ({
  query: vi.fn(),
}));

const mockQuery = vi.mocked(query);

describe('SocketService', () => {
  let httpServer: any;
  let io: SocketIOServer;
  let clientSocket: ClientSocket;
  let serverSocket: any;
  const port = 3002;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    avatar: null,
    isActive: true,
  };

  beforeEach(async () => {
    // Create HTTP server
    httpServer = createServer();
    
    // Initialize socket service
    io = socketService.initialize(httpServer);
    
    // Start server
    await new Promise<void>((resolve) => {
      httpServer.listen(port, resolve);
    });

    // Mock database queries
    mockQuery.mockImplementation((sql: string, params?: any[]) => {
      if (sql.includes('SELECT id, email')) {
        return Promise.resolve({ rows: [mockUser] });
      }
      if (sql.includes('workspace_members') && sql.includes('SELECT role')) {
        return Promise.resolve({ rows: [{ role: 'member' }] });
      }
      if (sql.includes('workspace_members') && sql.includes('SELECT 1')) {
        return Promise.resolve({ rows: [{ id: 1 }] });
      }
      if (sql.includes('boards b')) {
        return Promise.resolve({ rows: [{ id: 'board-1' }] });
      }
      return Promise.resolve({ rows: [] });
    });
  });

  afterEach(async () => {
    if (clientSocket && clientSocket.connected) {
      clientSocket.disconnect();
    }
    if (httpServer) {
      await new Promise<void>((resolve) => {
        httpServer.close(resolve);
      });
    }
    vi.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should authenticate user with valid token', async () => {
      const token = generateAccessToken(mockUser);
      
      return new Promise<void>((resolve, reject) => {
        clientSocket = Client(`http://localhost:${port}`, {
          auth: { token },
        });

        clientSocket.on('connect', () => {
          expect(clientSocket.connected).toBe(true);
          resolve();
        });

        clientSocket.on('connect_error', (error) => {
          reject(error);
        });

        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });
    });

    it('should reject connection without token', async () => {
      return new Promise<void>((resolve, reject) => {
        clientSocket = Client(`http://localhost:${port}`);

        clientSocket.on('connect', () => {
          reject(new Error('Should not connect without token'));
        });

        clientSocket.on('connect_error', (error) => {
          expect(error.message).toContain('Authentication');
          resolve();
        });

        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });
    });

    it('should reject connection with invalid token', async () => {
      return new Promise<void>((resolve, reject) => {
        clientSocket = Client(`http://localhost:${port}`, {
          auth: { token: 'invalid-token' },
        });

        clientSocket.on('connect', () => {
          reject(new Error('Should not connect with invalid token'));
        });

        clientSocket.on('connect_error', (error) => {
          expect(error.message).toContain('Authentication');
          resolve();
        });

        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });
    });
  });

  describe('Workspace Events', () => {
    beforeEach(async () => {
      const token = generateAccessToken(mockUser);
      
      return new Promise<void>((resolve, reject) => {
        clientSocket = Client(`http://localhost:${port}`, {
          auth: { token },
        });

        clientSocket.on('connect', resolve);
        clientSocket.on('connect_error', reject);
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });
    });

    it('should allow user to join workspace with access', async () => {
      return new Promise<void>((resolve, reject) => {
        clientSocket.on('workspace-joined', (data) => {
          expect(data.workspaceId).toBe('workspace-1');
          expect(data.role).toBe('member');
          resolve();
        });

        clientSocket.on('error', (error) => {
          reject(new Error(error.message));
        });

        clientSocket.emit('join-workspace', 'workspace-1');
        setTimeout(() => reject(new Error('Event timeout')), 5000);
      });
    });

    it('should deny access to workspace without permission', async () => {
      // Mock no access
      mockQuery.mockImplementation((sql: string) => {
        if (sql.includes('SELECT id, email')) {
          return Promise.resolve({ rows: [mockUser] });
        }
        return Promise.resolve({ rows: [] });
      });

      return new Promise<void>((resolve, reject) => {
        clientSocket.on('error', (error) => {
          expect(error.type).toBe('WORKSPACE_ACCESS_DENIED');
          resolve();
        });

        clientSocket.on('workspace-joined', () => {
          reject(new Error('Should not join workspace without access'));
        });

        clientSocket.emit('join-workspace', 'workspace-1');
        setTimeout(() => reject(new Error('Event timeout')), 5000);
      });
    });
  });

  describe('Board Events', () => {
    beforeEach(async () => {
      const token = generateAccessToken(mockUser);
      
      return new Promise<void>((resolve, reject) => {
        clientSocket = Client(`http://localhost:${port}`, {
          auth: { token },
        });

        clientSocket.on('connect', resolve);
        clientSocket.on('connect_error', reject);
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });
    });

    it('should allow user to join board with access', async () => {
      return new Promise<void>((resolve, reject) => {
        clientSocket.on('board-joined', (data) => {
          expect(data.boardId).toBe('board-1');
          resolve();
        });

        clientSocket.on('error', (error) => {
          reject(new Error(error.message));
        });

        clientSocket.emit('join-board', 'board-1');
        setTimeout(() => reject(new Error('Event timeout')), 5000);
      });
    });

    it('should handle typing indicators', async () => {
      // First join the board
      await new Promise<void>((resolve, reject) => {
        clientSocket.on('board-joined', resolve);
        clientSocket.on('error', reject);
        clientSocket.emit('join-board', 'board-1');
        setTimeout(() => reject(new Error('Event timeout')), 3000);
      });

      // Test typing indicator
      return new Promise<void>((resolve, reject) => {
        // Create second client to receive typing indicator
        const token = generateAccessToken(mockUser);
        const secondClient = Client(`http://localhost:${port}`, {
          auth: { token },
        });

        secondClient.on('connect', () => {
          secondClient.emit('join-board', 'board-1');
          
          secondClient.on('user-typing', (data) => {
            expect(data.boardId).toBe('board-1');
            expect(data.isTyping).toBe(true);
            secondClient.disconnect();
            resolve();
          });

          // Send typing indicator from first client
          setTimeout(() => {
            clientSocket.emit('typing', {
              boardId: 'board-1',
              itemId: 'item-1',
              isTyping: true,
            });
          }, 100);
        });

        setTimeout(() => {
          secondClient.disconnect();
          reject(new Error('Event timeout'));
        }, 5000);
      });
    });
  });

  describe('Real-time Updates', () => {
    beforeEach(async () => {
      const token = generateAccessToken(mockUser);
      
      return new Promise<void>((resolve, reject) => {
        clientSocket = Client(`http://localhost:${port}`, {
          auth: { token },
        });

        clientSocket.on('connect', () => {
          clientSocket.emit('join-board', 'board-1');
          clientSocket.on('board-joined', resolve);
        });
        clientSocket.on('connect_error', reject);
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });
    });

    it('should broadcast board updates', async () => {
      return new Promise<void>((resolve, reject) => {
        // Create second client to receive updates
        const token = generateAccessToken(mockUser);
        const secondClient = Client(`http://localhost:${port}`, {
          auth: { token },
        });

        secondClient.on('connect', () => {
          secondClient.emit('join-board', 'board-1');
          
          secondClient.on('board-updated', (data) => {
            expect(data.boardId).toBe('board-1');
            expect(data.type).toBe('item_updated');
            expect(data.itemId).toBe('item-1');
            secondClient.disconnect();
            resolve();
          });

          // Send update from first client
          setTimeout(() => {
            clientSocket.emit('board-update', {
              boardId: 'board-1',
              type: 'item_updated',
              itemId: 'item-1',
              changes: { name: 'Updated Item' },
            });
          }, 100);
        });

        setTimeout(() => {
          secondClient.disconnect();
          reject(new Error('Event timeout'));
        }, 5000);
      });
    });

    it('should broadcast item moves', async () => {
      return new Promise<void>((resolve, reject) => {
        // Create second client to receive moves
        const token = generateAccessToken(mockUser);
        const secondClient = Client(`http://localhost:${port}`, {
          auth: { token },
        });

        secondClient.on('connect', () => {
          secondClient.emit('join-board', 'board-1');
          
          secondClient.on('item-moved', (data) => {
            expect(data.boardId).toBe('board-1');
            expect(data.itemId).toBe('item-1');
            expect(data.fromPosition).toBe(0);
            expect(data.toPosition).toBe(2);
            secondClient.disconnect();
            resolve();
          });

          // Send move from first client
          setTimeout(() => {
            clientSocket.emit('item-move', {
              boardId: 'board-1',
              itemId: 'item-1',
              fromPosition: 0,
              toPosition: 2,
            });
          }, 100);
        });

        setTimeout(() => {
          secondClient.disconnect();
          reject(new Error('Event timeout'));
        }, 5000);
      });
    });
  });

  describe('Service Methods', () => {
    it('should broadcast to workspace', () => {
      const spy = vi.spyOn(io, 'to');
      
      socketService.broadcastToWorkspace('workspace-1', 'test-event', { data: 'test' });
      
      expect(spy).toHaveBeenCalledWith('workspace:workspace-1');
    });

    it('should broadcast to board', () => {
      const spy = vi.spyOn(io, 'to');
      
      socketService.broadcastToBoard('board-1', 'test-event', { data: 'test' });
      
      expect(spy).toHaveBeenCalledWith('board:board-1');
    });

    it('should return Socket.io instance', () => {
      const instance = socketService.getIO();
      expect(instance).toBe(io);
    });
  });
});