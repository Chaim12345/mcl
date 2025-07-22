import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { userService } from '../userService.js';
import { emailService } from '../emailService.js';
import { prisma } from '../../db/prisma.js';
import { hashPassword } from '../../utils/password.js';

// Mock dependencies
vi.mock('../emailService.js');
vi.mock('../../utils/password.js');
vi.mock('../../utils/id.js', () => ({
  generateId: () => 'test-id-123'
}));

vi.mock('../../db/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    }
  }
}));

const mockEmailService = vi.mocked(emailService);
const mockHashPassword = vi.mocked(hashPassword);
const mockPrisma = vi.mocked(prisma);

describe('UserService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('createUser', () => {
    const userData = {
      email: 'test@example.com',
      password: 'TestPassword123!',
      firstName: 'John',
      lastName: 'Doe'
    };

    it('should create a new user successfully', async () => {
      const hashedPassword = 'hashed-password';
      const createdUser = {
        id: 'test-id-123',
        email: 'test@example.com',
        password: hashedPassword,
        firstName: 'John',
        lastName: 'Doe',
        avatar: null,
        isActive: true,
        lastLogin: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockHashPassword.mockResolvedValue(hashedPassword);
      mockPrisma.user.create.mockResolvedValue(createdUser);
      mockEmailService.sendWelcomeEmail.mockResolvedValue(true);

      const result = await userService.createUser(userData);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' }
      });
      expect(mockHashPassword).toHaveBeenCalledWith('TestPassword123!');
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          id: 'test-id-123',
          email: 'test@example.com',
          password: hashedPassword,
          firstName: 'John',
          lastName: 'Doe',
          isActive: true
        }
      });
      expect(result).toEqual({
        id: 'test-id-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        avatar: null,
        isActive: true,
        lastLogin: null,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      });
    });

    it('should throw error if user already exists', async () => {
      const existingUser = { id: 'existing-id', email: 'test@example.com' };
      mockPrisma.user.findUnique.mockResolvedValue(existingUser as any);

      await expect(userService.createUser(userData)).rejects.toThrow(
        'User with this email already exists'
      );
    });

    it('should handle email sending failure gracefully', async () => {
      const hashedPassword = 'hashed-password';
      const createdUser = {
        id: 'test-id-123',
        email: 'test@example.com',
        password: hashedPassword,
        firstName: 'John',
        lastName: 'Doe',
        avatar: null,
        isActive: true,
        lastLogin: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockHashPassword.mockResolvedValue(hashedPassword);
      mockPrisma.user.create.mockResolvedValue(createdUser);
      mockEmailService.sendWelcomeEmail.mockRejectedValue(new Error('Email failed'));

      // Should not throw error even if email fails
      const result = await userService.createUser(userData);
      expect(result.id).toBe('test-id-123');
    });
  });

  describe('findUserByEmail', () => {
    it('should find user by email', async () => {
      const user = { id: 'user-id', email: 'test@example.com' };
      mockPrisma.user.findUnique.mockResolvedValue(user as any);

      const result = await userService.findUserByEmail('test@example.com');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' }
      });
      expect(result).toEqual(user);
    });

    it('should return null if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await userService.findUserByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });

    it('should normalize email to lowercase', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await userService.findUserByEmail('TEST@EXAMPLE.COM');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' }
      });
    });
  });

  describe('updateUser', () => {
    const userId = 'user-id-123';
    const updateData = {
      firstName: 'Jane',
      lastName: 'Smith'
    };

    it('should update user successfully', async () => {
      const existingUser = { id: userId, email: 'test@example.com' };
      const updatedUser = {
        id: userId,
        email: 'test@example.com',
        password: 'hashed-password',
        firstName: 'Jane',
        lastName: 'Smith',
        avatar: null,
        isActive: true,
        lastLogin: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.user.findUnique.mockResolvedValue(existingUser as any);
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const result = await userService.updateUser(userId, updateData);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          firstName: 'Jane',
          lastName: 'Smith',
          updatedAt: expect.any(Date)
        }
      });
      expect(result).toEqual({
        id: userId,
        email: 'test@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        avatar: null,
        isActive: true,
        lastLogin: null,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      });
    });

    it('should throw error if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(userService.updateUser(userId, updateData)).rejects.toThrow(
        'User not found'
      );
    });
  });

  describe('validateCredentials', () => {
    const email = 'test@example.com';
    const password = 'TestPassword123!';

    it('should return user for valid credentials', async () => {
      const user = {
        id: 'user-id',
        email,
        password: 'hashed-password',
        isActive: true
      };

      mockPrisma.user.findUnique.mockResolvedValue(user as any);
      
      // Mock password comparison
      const { comparePassword } = await import('../../utils/password.js');
      vi.mocked(comparePassword).mockResolvedValue(true);

      const result = await userService.validateCredentials(email, password);

      expect(result).toEqual(user);
    });

    it('should return null for invalid password', async () => {
      const user = {
        id: 'user-id',
        email,
        password: 'hashed-password',
        isActive: true
      };

      mockPrisma.user.findUnique.mockResolvedValue(user as any);
      
      const { comparePassword } = await import('../../utils/password.js');
      vi.mocked(comparePassword).mockResolvedValue(false);

      const result = await userService.validateCredentials(email, password);

      expect(result).toBeNull();
    });

    it('should return null for inactive user', async () => {
      const user = {
        id: 'user-id',
        email,
        password: 'hashed-password',
        isActive: false
      };

      mockPrisma.user.findUnique.mockResolvedValue(user as any);

      const result = await userService.validateCredentials(email, password);

      expect(result).toBeNull();
    });

    it('should return null for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await userService.validateCredentials(email, password);

      expect(result).toBeNull();
    });
  });

  describe('getUserFullName', () => {
    it('should return full name when both first and last names exist', () => {
      const user = {
        id: 'user-id',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe'
      } as any;

      const result = userService.getUserFullName(user);

      expect(result).toBe('John Doe');
    });

    it('should return email when names are null', () => {
      const user = {
        id: 'user-id',
        email: 'test@example.com',
        firstName: null,
        lastName: null
      } as any;

      const result = userService.getUserFullName(user);

      expect(result).toBe('test@example.com');
    });

    it('should return first name only when last name is null', () => {
      const user = {
        id: 'user-id',
        email: 'test@example.com',
        firstName: 'John',
        lastName: null
      } as any;

      const result = userService.getUserFullName(user);

      expect(result).toBe('John');
    });
  });
});