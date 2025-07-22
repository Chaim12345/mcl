import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { emailVerificationService } from '../emailVerificationService.js';
import { emailService } from '../emailService.js';
import { prisma } from '../../db/prisma.js';

// Mock dependencies
vi.mock('../emailService.js');
vi.mock('../../utils/id.js', () => ({
  generateId: () => 'token-id-123'
}));

vi.mock('../../db/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $executeRaw: vi.fn(),
    $queryRaw: vi.fn(),
  }
}));

const mockEmailService = vi.mocked(emailService);
const mockPrisma = vi.mocked(prisma);

describe('EmailVerificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('sendVerificationEmail', () => {
    const userId = 'user-id-123';
    const email = 'test@example.com';
    const firstName = 'John';

    it('should send verification email successfully', async () => {
      mockPrisma.$executeRaw.mockResolvedValue(undefined);
      mockEmailService.sendEmail.mockResolvedValue(true);

      await expect(
        emailVerificationService.sendVerificationEmail(userId, email, firstName)
      ).resolves.not.toThrow();

      expect(mockPrisma.$executeRaw).toHaveBeenCalled();
      expect(mockEmailService.sendEmail).toHaveBeenCalledWith({
        to: email,
        subject: 'Verify Your Email - Project Management Platform',
        html: expect.stringContaining('Verify Your Email Address'),
        text: expect.stringContaining('verify your email address')
      });
    });

    it('should throw error if email sending fails', async () => {
      mockPrisma.$executeRaw.mockResolvedValue(undefined);
      mockEmailService.sendEmail.mockResolvedValue(false);

      await expect(
        emailVerificationService.sendVerificationEmail(userId, email, firstName)
      ).rejects.toThrow('Failed to send verification email');
    });
  });

  describe('verifyEmailToken', () => {
    const token = 'valid-token-123';

    it('should verify valid token successfully', async () => {
      const tokenData = {
        user_id: 'user-id-123',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
      };

      mockPrisma.$queryRaw.mockResolvedValue([tokenData]);
      mockPrisma.user.update.mockResolvedValue({} as any);
      mockPrisma.$executeRaw.mockResolvedValue(undefined);

      const result = await emailVerificationService.verifyEmailToken(token);

      expect(result).toEqual({
        success: true,
        userId: 'user-id-123'
      });
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-id-123' },
        data: { updatedAt: expect.any(Date) }
      });
      expect(mockPrisma.$executeRaw).toHaveBeenCalled(); // Token deletion
    });

    it('should return error for invalid token', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const result = await emailVerificationService.verifyEmailToken('invalid-token');

      expect(result).toEqual({
        success: false,
        error: 'Invalid verification token'
      });
    });

    it('should return error for expired token', async () => {
      const tokenData = {
        user_id: 'user-id-123',
        expires_at: new Date(Date.now() - 1000) // 1 second ago (expired)
      };

      mockPrisma.$queryRaw.mockResolvedValue([tokenData]);
      mockPrisma.$executeRaw.mockResolvedValue(undefined);

      const result = await emailVerificationService.verifyEmailToken(token);

      expect(result).toEqual({
        success: false,
        error: 'Verification token has expired'
      });
      expect(mockPrisma.$executeRaw).toHaveBeenCalled(); // Token deletion
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Database error'));

      const result = await emailVerificationService.verifyEmailToken(token);

      expect(result).toEqual({
        success: false,
        error: 'Failed to verify email token'
      });
    });
  });

  describe('resendVerificationEmail', () => {
    const userId = 'user-id-123';

    it('should resend verification email successfully', async () => {
      const user = {
        email: 'test@example.com',
        firstName: 'John'
      };

      mockPrisma.user.findUnique.mockResolvedValue(user as any);
      mockPrisma.$executeRaw.mockResolvedValue(undefined);
      mockEmailService.sendEmail.mockResolvedValue(true);

      await expect(
        emailVerificationService.resendVerificationEmail(userId)
      ).resolves.not.toThrow();

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: { email: true, firstName: true }
      });
    });

    it('should throw error if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        emailVerificationService.resendVerificationEmail(userId)
      ).rejects.toThrow('User not found');
    });
  });

  describe('hasPendingVerification', () => {
    const userId = 'user-id-123';

    it('should return true if user has pending verification', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ count: 1 }]);

      const result = await emailVerificationService.hasPendingVerification(userId);

      expect(result).toBe(true);
      expect(mockPrisma.$queryRaw).toHaveBeenCalled();
    });

    it('should return false if user has no pending verification', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ count: 0 }]);

      const result = await emailVerificationService.hasPendingVerification(userId);

      expect(result).toBe(false);
    });

    it('should return false if query returns no results', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const result = await emailVerificationService.hasPendingVerification(userId);

      expect(result).toBe(false);
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('should clean up expired tokens successfully', async () => {
      mockPrisma.$executeRaw.mockResolvedValue(undefined);

      await expect(
        emailVerificationService.cleanupExpiredTokens()
      ).resolves.not.toThrow();

      expect(mockPrisma.$executeRaw).toHaveBeenCalled();
    });
  });
});