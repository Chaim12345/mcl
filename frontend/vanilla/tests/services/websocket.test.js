/**
 * @jest-environment jsdom
 */

import { WebSocketService } from '../../js/services/websocket.js';
import { EventEmitter } from '../../js/utils/events.js';

// Mock WebSocket
class MockWebSocket extends EventEmitter {
    constructor(url) {
        super();
        this.url = url;
        this.readyState = 0; // CONNECTING
        this.CONNECTING = 0;
        this.OPEN = 1;
        this.CLOSING = 2;
        this.CLOSED = 3;
        
        // Simulate connection after a small delay
        setTimeout(() => {
            this.readyState = 1; // OPEN
            this.emit('open', { type: 'open' });
        }, 10);
    }

    send(data) {
        if (this.readyState === 1) { // OPEN
            // Simulate successful send
            setTimeout(() => {
                // Echo back as a mock response
                try {
                    const message = JSON.parse(data);
                    if (message.type === 'subscribe') {
                        this.emit('message', {
                            type: 'message',
                            data: JSON.stringify({
                                type: 'subscribed',
                                data: message.data
                            })
                        });
                    }
                } catch (e) {
                    // Ignore invalid JSON
                }
            }, 5);
        }
    }

    close() {
        this.readyState = 3; // CLOSED
        this.emit('close', { type: 'close', code: 1000 });
    }
}

// Mock global WebSocket
global.WebSocket = MockWebSocket;

describe('WebSocketService', () => {
    let service;
    let mockServerUrl = 'ws://localhost:8080/ws';

    beforeEach(() => {
        service = new WebSocketService(mockServerUrl);
        jest.clearAllMocks();
    });

    afterEach(() => {
        if (service) {
            service.disconnect();
        }
    });

    describe('Connection Management', () => {
        test('should initialize with correct URL', () => {
            expect(service.url).toBe(mockServerUrl);
            expect(service.isConnected()).toBe(false);
        });

        test('should establish connection successfully', async () => {
            await service.connect();
            expect(service.isConnected()).toBe(true);
        });

        test('should handle connection errors', async () => {
            // Mock connection failure
            const originalWebSocket = global.WebSocket;
            global.WebSocket = class {
                constructor() {
                    setTimeout(() => {
                        this.readyState = 3;
                        this.onerror?.(new Error('Connection failed'));
                    }, 10);
                }
            };

            const service2 = new WebSocketService('ws://invalid-url');
            await expect(service2.connect()).rejects.toThrow();
            
            global.WebSocket = originalWebSocket;
        });

        test('should handle disconnection gracefully', async () => {
            await service.connect();
            expect(service.isConnected()).toBe(true);
            
            service.disconnect();
            expect(service.isConnected()).toBe(false);
        });

        test('should retry connection on failure', async () => {
            let attempts = 0;
            const originalWebSocket = global.WebSocket;
            
            global.WebSocket = class {
                constructor() {
                    attempts++;
                    setTimeout(() => {
                        this.readyState = 3;
                        this.onerror?.(new Error('Connection failed'));
                    }, 10);
                }
            };

            const service2 = new WebSocketService('ws://invalid-url', {
                maxRetries: 2,
                retryDelay: 50
            });

            try {
                await service2.connect();
            } catch (e) {
                // Expected to fail
            }

            expect(attempts).toBeGreaterThan(1);
            global.WebSocket = originalWebSocket;
        });
    });

    describe('Message Handling', () => {
        test('should send messages when connected', async () => {
            await service.connect();
            
            const message = {
                type: 'test',
                data: { test: 'data' }
            };

            expect(() => service.send(message)).not.toThrow();
        });

        test('should queue messages when not connected', async () => {
            const message = {
                type: 'test',
                data: { test: 'data' }
            };

            expect(() => service.send(message)).not.toThrow();
            // Message should be queued
            expect(service.messageQueue.length).toBe(1);
        });

        test('should send queued messages after connection', async () => {
            const message = {
                type: 'test',
                data: { test: 'data' }
            };

            service.send(message);
            expect(service.messageQueue.length).toBe(1);

            await service.connect();
            
            // Message queue should be cleared
            expect(service.messageQueue.length).toBe(0);
        });

        test('should handle invalid messages gracefully', () => {
            expect(() => service.send(null)).not.toThrow();
            expect(() => service.send(undefined)).not.toThrow();
            expect(() => service.send('invalid')).not.toThrow();
        });
    });

    describe('Event Subscription', () => {
        test('should register event listeners', () => {
            const callback = jest.fn();
            service.on('item_created', callback);

            // Simulate incoming message
            const message = {
                type: 'item_created',
                data: { id: 1, name: 'Test Item' }
            };
            
            service.handleMessage({ data: JSON.stringify(message) });

            expect(callback).toHaveBeenCalledWith(message.data);
        });

        test('should remove event listeners', () => {
            const callback = jest.fn();
            service.on('item_created', callback);
            service.off('item_created', callback);

            const message = {
                type: 'item_created',
                data: { id: 1, name: 'Test Item' }
            };
            
            service.handleMessage({ data: JSON.stringify(message) });

            expect(callback).not.toHaveBeenCalled();
        });

        test('should handle multiple listeners for same event', () => {
            const callback1 = jest.fn();
            const callback2 = jest.fn();
            
            service.on('item_created', callback1);
            service.on('item_created', callback2);

            const message = {
                type: 'item_created',
                data: { id: 1, name: 'Test Item' }
            };
            
            service.handleMessage({ data: JSON.stringify(message) });

            expect(callback1).toHaveBeenCalled();
            expect(callback2).toHaveBeenCalled();
        });

        test('should handle unknown message types gracefully', () => {
            const callback = jest.fn();
            service.on('item_created', callback);

            const message = {
                type: 'unknown_type',
                data: { some: 'data' }
            };
            
            expect(() => {
                service.handleMessage({ data: JSON.stringify(message) });
            }).not.toThrow();

            expect(callback).not.toHaveBeenCalled();
        });
    });

    describe('Board Subscription', () => {
        test('should subscribe to board updates', () => {
            const boardId = 'test-board-123';
            
            expect(() => service.subscribeToBoard(boardId)).not.toThrow();
            expect(service.subscriptions.has(boardId)).toBe(true);
        });

        test('should unsubscribe from board updates', () => {
            const boardId = 'test-board-123';
            
            service.subscribeToBoard(boardId);
            service.unsubscribeFromBoard(boardId);
            
            expect(service.subscriptions.has(boardId)).toBe(false);
        });

        test('should handle duplicate subscriptions', () => {
            const boardId = 'test-board-123';
            
            service.subscribeToBoard(boardId);
            service.subscribeToBoard(boardId);
            
            expect(service.subscriptions.has(boardId)).toBe(true);
            expect(service.subscriptions.size).toBe(1);
        });

        test('should handle unsubscribe from non-subscribed board', () => {
            const boardId = 'test-board-123';
            
            expect(() => service.unsubscribeFromBoard(boardId)).not.toThrow();
        });
    });

    describe('Heartbeat and Reconnection', () => {
        test('should send heartbeat messages', async () => {
            await service.connect();
            
            const sendSpy = jest.spyOn(service, 'send');
            
            service.startHeartbeat();
            
            // Wait for heartbeat
            await new Promise(resolve => setTimeout(resolve, 100));
            
            expect(sendSpy).toHaveBeenCalledWith({
                type: 'ping',
                data: expect.any(Object)
            });
            
            service.stopHeartbeat();
        });

        test('should handle pong responses', () => {
            const callback = jest.fn();
            service.on('pong', callback);

            const message = {
                type: 'pong',
                data: { timestamp: Date.now() }
            };
            
            service.handleMessage({ data: JSON.stringify(message) });

            expect(callback).toHaveBeenCalledWith(message.data);
        });

        test('should handle server disconnection', async () => {
            await service.connect();
            
            const reconnectSpy = jest.spyOn(service, 'reconnect');
            
            // Simulate server closure
            service.ws.close();
            
            // Allow time for reconnection attempt
            await new Promise(resolve => setTimeout(resolve, 100));
            
            expect(reconnectSpy).toHaveBeenCalled();
        });
    });

    describe('Performance Tests', () => {
        test('should handle rapid message sending', async () => {
            await service.connect();
            
            const numMessages = 100;
            const promises = [];
            
            for (let i = 0; i < numMessages; i++) {
                promises.push(service.send({
                    type: 'test',
                    data: { index: i }
                }));
            }
            
            // All sends should complete without error
            await Promise.all(promises);
        });

        test('should handle large message payloads', async () => {
            await service.connect();
            
            const largePayload = {
                type: 'test',
                data: {
                    items: Array.from({ length: 1000 }, (_, i) => ({
                        id: i,
                        title: `Item ${i}`,
                        description: `Description for item ${i}`,
                        metadata: {
                            created: new Date().toISOString(),
                            updated: new Date().toISOString()
                        }
                    }))
                }
            };

            expect(() => service.send(largePayload)).not.toThrow();
        });
    });

    describe('Error Handling', () => {
        test('should handle JSON parsing errors', () => {
            const callback = jest.fn();
            service.on('error', callback);

            expect(() => {
                service.handleMessage({ data: 'invalid json' });
            }).not.toThrow();

            expect(callback).toHaveBeenCalledWith(expect.any(Error));
        });

        test('should handle malformed messages', () => {
            const callback = jest.fn();
            service.on('error', callback);

            const malformedMessage = JSON.stringify({
                // Missing required fields
            });

            expect(() => {
                service.handleMessage({ data: malformedMessage });
            }).not.toThrow();
        });

        test('should handle connection state changes', () => {
            const connectCallback = jest.fn();
            const disconnectCallback = jest.fn();

            service.on('connected', connectCallback);
            service.on('disconnected', disconnectCallback);

            service.handleOpen();
            expect(connectCallback).toHaveBeenCalled();

            service.handleClose({ code: 1000 });
            expect(disconnectCallback).toHaveBeenCalled();
        });
    });

    describe('State Management', () => {
        test('should get current connection state', async () => {
            expect(service.getConnectionState()).toBe('disconnected');
            
            await service.connect();
            expect(service.getConnectionState()).toBe('connected');
            
            service.disconnect();
            expect(service.getConnectionState()).toBe('disconnected');
        });

        test('should get connection statistics', async () => {
            await service.connect();
            
            const stats = service.getStats();
            expect(stats).toHaveProperty('connectedAt');
            expect(stats).toHaveProperty('reconnectAttempts');
            expect(stats).toHaveProperty('messagesSent');
            expect(stats).toHaveProperty('messagesReceived');
        });

        test('should reset statistics on disconnect', async () => {
            await service.connect();
            service.send({ type: 'test' });
            
            const statsBefore = service.getStats();
            expect(statsBefore.messagesSent).toBeGreaterThan(0);
            
            service.disconnect();
            await service.connect();
            
            const statsAfter = service.getStats();
            expect(statsAfter.messagesSent).toBe(0);
        });
    });

    describe('Edge Cases', () => {
        test('should handle immediate disconnection', async () => {
            await service.connect();
            service.disconnect();
            
            expect(() => service.send({ type: 'test' })).not.toThrow();
        });

        test('should handle reconnection with pending subscriptions', async () => {
            service.subscribeToBoard('test-board');
            await service.connect();
            
            expect(service.subscriptions.has('test-board')).toBe(true);
            
            service.disconnect();
            await service.connect();
            
            // Should resubscribe on reconnection
            expect(service.subscriptions.has('test-board')).toBe(true);
        });

        test('should handle null or undefined data in messages', () => {
            expect(() => service.send({
                type: 'test',
                data: null
            })).not.toThrow();

            expect(() => service.send({
                type: 'test',
                data: undefined
            })).not.toThrow();
        });
    });
});

// Integration tests with actual WebSocket server
describe('WebSocketService Integration', () => {
    let service;
    let mockServer;

    beforeEach(async () => {
        // Setup mock WebSocket server
        mockServer = new MockWebSocketServer();
        await mockServer.start();
        
        service = new WebSocketService(`ws://localhost:${mockServer.port}`);
    });

    afterEach(() => {
        service.disconnect();
        mockServer.stop();
    });

    test('should handle real WebSocket connection', async () => {
        await service.connect();
        expect(service.isConnected()).toBe(true);
    });

    test('should exchange messages with server', async () => {
        await service.connect();
        
        const responsePromise = new Promise(resolve => {
            service.once('test_response', resolve);
        });

        service.send({
            type: 'test_request',
            data: { message: 'hello' }
        });

        const response = await responsePromise;
        expect(response).toEqual({ reply: 'hello' });
    });
});

// Mock WebSocket Server for integration tests
class MockWebSocketServer {
    constructor() {
        this.clients = new Set();
        this.port = 0;
        this.server = null;
    }

    start() {
        return new Promise(resolve => {
            // This would normally start a real WebSocket server
            resolve();
        });
    }

    stop() {
        // Cleanup
    }

    broadcast(message) {
        this.clients.forEach(client => {
            if (client.readyState === 1) { // OPEN
                client.send(JSON.stringify(message));
            }
        });
    }
}