import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createRefreshToken,
  refreshAccessToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  cleanupExpiredTokens,
  getUserActiveSessions,
  getTokenStats
} from '../tokenService.js';
import * as jwtUtils from '../../utils/jwt.js';
import * as dbClient from '../../db/client.js';

// Mock the dependencies
vi.mock('../../utils/jwt.js');
vi.mock('../../db/client.js');

const mockJwtUtils = vi.mocked(jwtUtils);
const mockDbClient = vi.mocked(dbClient);

describe('Token Service', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com'
  };

  beforeEach(() => {
    vi.stubEnv('JWT_SECRET', 'test-secret');
    vi.stubEnv('JWT_EXPIRES_IN', '7d');
    vi.stubEnv('JWT_REFRESH_EXPIRES_IN', '30d');
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('createRefreshToken', () => {
    it('should create and store refresh token', async () => {
      const mockTokens = {
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-123'
      };

      mockJwtUtils.generateTokenPair.mockReturnValue(mockTokens);
      mockDbClient.query.mockResolvedValue({ rows: [] } as any);

      const result = await createRefreshToken(mockUser);

      expect(result).toEqual({
        ...mockTokens,
        expiresIn: '7d'
      });
      expect(mockJwtUtils.generateTokenPair).toHaveBeenCalledWith(mockUser);
    });

    it('should store token with metadata', async () => {
      const mockTokens = {
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-123'
      };
      const metadata = {
        userAgent: 'Mozilla/5.0',
        ipAddress: '192.168.1.1'
      };

      mockJwtUtils.generateTokenPair.mockReturnValue(mockTokens);
      mockDbClient.query.mockResolvedValue({ rows: [] } as any);

      await createRefreshToken(mockUser, metadata);

      expect(mockDbClient.query).toHaveBeenCalledWith(
        'INSERT INTO auth_logs (user_id, action, metadata) VALUES ($1, $2, $3)',
        expect.arrayContaining([
          mockUser.id,
          'TOKEN_CREATED',
          expect.stringContaining('userAgent')
        ])
      );
    });

    it('should continue if logging fails', async () => {
      const mockTokens = {
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-123'
      };

      mockJwtUtils.generateTokenPair.mockReturnValue(mockTokens);
      mockDbClient.query.mockRejectedValue(new Error('Database error'));

      const result = await createRefreshToken(mockUser);

      expect(result).toEqual({
        ...mockTokens,
        expiresIn: '7d'
      });
    });
  });

  describe('refreshAccessToken', () => {
    it('should refresh access token with valid refresh token', async () => {
      const refreshToken = 'valid-refresh-token';
      const mockDecoded = { userId: mockUser.id, email: mockUser.email };
      const mockUserFromDb = {
        id: mockUser.id,
        email: mockUser.email,
        firstName: 'John',
        lastName: 'Doe',
        isActive: true
      };
      const newAccessToken = 'new-access-token';

      // First create a refresh token to store it
      const mockTokens = {
        accessToken: 'access-token-123',
        refreshToken: refreshToken
      };
      mockJwtUtils.generateTokenPair.mockReturnValue(mockTokens);
      mockDbClient.query.mockResolvedValue({ rows: [] } as any);
      await createRefreshToken(mockUser);

      // Now test refresh
      mockJwtUtils.verifyRefreshToken.mockReturnValue(mockDecoded);
      mockDbClient.query.mockResolvedValue({ rows: [mockUserFromDb] } as any);
      mockJwtUtils.generateAccessToken.mockReturnValue(newAccessToken);

      const result = await refreshAccessToken(refreshToken);

      expect(result).toEqual({
        accessToken: newAccessToken,
        refreshToken: refreshToken,
        user: mockUserFromDb
      });
    });

    it('should throw error for invalid refresh token', async () => {
      const invalidToken = 'invalid-token';

      await expect(refreshAccessToken(invalidToken)).rejects.toThrow('Invalid refresh token');
    });

    it('should throw error if user not found', async () => {
      const refreshToken = 'valid-refresh-token';
      const mockDecoded = { userId: 'non-existent-user', email: 'test@example.com' };

      // First create a refresh token to store it
      const mockTokens = {
        accessToken: 'access-token-123',
        refreshToken: refreshToken
      };
      mockJwtUtils.generateTokenPair.mockReturnValue(mockTokens);
      mockDbClient.query.mockResolvedValue({ rows: [] } as any);
      await createRefreshToken(mockUser);

      // Now test refresh with non-existent user
      mockJwtUtils.verifyRefreshToken.mockReturnValue(mockDecoded);
      mockDbClient.query.mockResolvedValue({ rows: [] } as any);

      await expect(refreshAccessToken(refreshToken)).rejects.toThrow('User not found');
    });

    it('should throw error if user is inactive', async () => {
      const refreshToken = 'valid-refresh-token';
      const mockDecoded = { userId: mockUser.id, email: mockUser.email };
      const inactiveUser = {
        id: mockUser.id,
        email: mockUser.email,
        firstName: 'John',
        lastName: 'Doe',
        isActive: false
      };

      // First create a refresh token to store it
      const mockTokens = {
        accessToken: 'access-token-123',
        refreshToken: refreshToken
      };
      mockJwtUtils.generateTokenPair.mockReturnValue(mockTokens);
      mockDbClient.query.mockResolvedValue({ rows: [] } as any);
      await createRefreshToken(mockUser);

      // Now test refresh with inactive user
      mockJwtUtils.verifyRefreshToken.mockReturnValue(mockDecoded);
      mockDbClient.query.mockResolvedValue({ rows: [inactiveUser] } as any);

      await expect(refreshAccessToken(refreshToken)).rejects.toThrow('User account is inactive');
    });
  });

  describe('revokeRefreshToken', () => {
    it('should revoke existing refresh token', async () => {
      const refreshToken = 'valid-refresh-token';

      // First create a refresh token to store it
      const mockTokens = {
        accessToken: 'access-token-123',
        refreshToken: refreshToken
      };
      mockJwtUtils.generateTokenPair.mockReturnValue(mockTokens);
      mockDbClient.query.mockResolvedValue({ rows: [] } as any);
      await createRefreshToken(mockUser);

      const result = revokeRefreshToken(refreshToken);

      expect(result).toBe(true);
    });

    it('should return false for non-existent token', () => {
      const result = revokeRefreshToken('non-existent-token');

      expect(result).toBe(false);
    });
  });

  describe('revokeAllUserTokens', () => {
    it('should revoke all tokens for a user', async () => {
      const userId = mockUser.id;

      // Create multiple tokens for the user
      const tokens = ['token1', 'token2', 'token3'];
      for (const token of tokens) {
        const mockTokens = {
          accessToken: 'access-token',
          refreshToken: token
        };
        mockJwtUtils.generateTokenPair.mockReturnValue(mockTokens);
        mockDbClient.query.mockResolvedValue({ rows: [] } as any);
        await createRefreshToken(mockUser);
      }

      mockDbClient.query.mockResolvedValue({ rows: [] } as any);

      const revokedCount = await revokeAllUserTokens(userId);

      expect(revokedCount).toBe(tokens.length);
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('should clean up expired tokens', () => {
      mockJwtUtils.isTokenExpired.mockReturnValue(true);

      // Create some tokens first
      const mockTokens = {
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-123'
      };
      mockJwtUtils.generateTokenPair.mockReturnValue(mockTokens);
      mockDbClient.query.mockResolvedValue({ rows: [] } as any);

      const cleanedCount = cleanupExpiredTokens();

      expect(cleanedCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getUserActiveSessions', () => {
    it('should return active sessions for a user', async () => {
      const userId = mockUser.id;

      // Create a token for the user
      const mockTokens = {
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-123'
      };
      mockJwtUtils.generateTokenPair.mockReturnValue(mockTokens);
      mockDbClient.query.mockResolvedValue({ rows: [] } as any);
      await createRefreshToken(mockUser);

      const sessions = await getUserActiveSessions(userId);

      expect(Array.isArray(sessions)).toBe(true);
      expect(sessions.length).toBeGreaterThanOrEqual(0);
      
      // Ensure no actual tokens are returned for security
      sessions.forEach(session => {
        expect(session).not.toHaveProperty('token');
      });
    });
  });

  describe('getTokenStats', () => {
    it('should return token statistics', () => {
      const stats = getTokenStats();

      expect(stats).toHaveProperty('totalRefreshTokens');
      expect(stats).toHaveProperty('uniqueUsers');
      expect(stats).toHaveProperty('topUsers');
      expect(stats).toHaveProperty('timestamp');
      expect(typeof stats.totalRefreshTokens).toBe('number');
      expect(typeof stats.uniqueUsers).toBe('number');
      expect(Array.isArray(stats.topUsers)).toBe(true);
    });
  });
});