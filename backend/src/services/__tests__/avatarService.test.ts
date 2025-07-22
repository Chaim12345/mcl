import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { avatarService, UploadedFile } from '../avatarService.js';
import { userService } from '../userService.js';
import { promises as fs } from 'fs';

// Mock dependencies
vi.mock('../userService.js');
vi.mock('fs', () => ({
  promises: {
    writeFile: vi.fn(),
    unlink: vi.fn(),
    mkdir: vi.fn(),
    readdir: vi.fn(),
    access: vi.fn()
  }
}));

const mockUserService = vi.mocked(userService);
const mockFs = vi.mocked(fs);

describe('AvatarService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('uploadAvatar', () => {
    const userId = 'user-id-123';
    const validFile: UploadedFile = {
      fieldname: 'avatar',
      originalname: 'profile.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      buffer: Buffer.from('fake-image-data'),
      size: 1024 * 1024 // 1MB
    };

    it('should upload avatar successfully', async () => {
      const user = {
        id: userId,
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        avatar: null
      };

      mockUserService.getUserById.mockResolvedValue(user as any);
      mockFs.writeFile.mockResolvedValue(undefined);
      mockUserService.updateUser.mockResolvedValue({} as any);

      const result = await avatarService.uploadAvatar(userId, validFile);

      expect(result.success).toBe(true);
      expect(result.avatarUrl).toMatch(/^\/uploads\/avatars\/\d+-[a-f0-9]+\.jpg$/);
      expect(mockFs.writeFile).toHaveBeenCalled();
      expect(mockUserService.updateUser).toHaveBeenCalledWith(userId, {
        avatar: expect.stringMatching(/^\/uploads\/avatars\/\d+-[a-f0-9]+\.jpg$/)
      });
    });

    it('should replace existing avatar', async () => {
      const user = {
        id: userId,
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        avatar: '/uploads/avatars/old-avatar.jpg'
      };

      mockUserService.getUserById.mockResolvedValue(user as any);
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.unlink.mockResolvedValue(undefined);
      mockUserService.updateUser.mockResolvedValue({} as any);

      const result = await avatarService.uploadAvatar(userId, validFile);

      expect(result.success).toBe(true);
      expect(mockFs.unlink).toHaveBeenCalled(); // Old avatar should be deleted
    });

    it('should reject file that is too large', async () => {
      const largeFile: UploadedFile = {
        ...validFile,
        size: 10 * 1024 * 1024 // 10MB (exceeds 5MB limit)
      };

      const result = await avatarService.uploadAvatar(userId, largeFile);

      expect(result.success).toBe(false);
      expect(result.error).toContain('File size too large');
    });

    it('should reject invalid file type', async () => {
      const invalidFile: UploadedFile = {
        ...validFile,
        mimetype: 'text/plain',
        originalname: 'document.txt'
      };

      const result = await avatarService.uploadAvatar(userId, invalidFile);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid file type');
    });

    it('should reject empty file', async () => {
      const emptyFile: UploadedFile = {
        ...validFile,
        size: 0,
        buffer: Buffer.alloc(0)
      };

      const result = await avatarService.uploadAvatar(userId, emptyFile);

      expect(result.success).toBe(false);
      expect(result.error).toBe('File is empty');
    });

    it('should return error if user not found', async () => {
      mockUserService.getUserById.mockResolvedValue(null);

      const result = await avatarService.uploadAvatar(userId, validFile);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });

    it('should handle file write errors', async () => {
      const user = {
        id: userId,
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        avatar: null
      };

      mockUserService.getUserById.mockResolvedValue(user as any);
      mockFs.writeFile.mockRejectedValue(new Error('Write failed'));

      const result = await avatarService.uploadAvatar(userId, validFile);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to upload avatar');
    });
  });

  describe('deleteAvatar', () => {
    const userId = 'user-id-123';

    it('should delete avatar successfully', async () => {
      const user = {
        id: userId,
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        avatar: '/uploads/avatars/avatar.jpg'
      };

      mockUserService.getUserById.mockResolvedValue(user as any);
      mockFs.unlink.mockResolvedValue(undefined);
      mockUserService.updateUser.mockResolvedValue({} as any);

      const result = await avatarService.deleteAvatar(userId);

      expect(result.success).toBe(true);
      expect(mockFs.unlink).toHaveBeenCalled();
      expect(mockUserService.updateUser).toHaveBeenCalledWith(userId, {
        avatar: null
      });
    });

    it('should return error if user not found', async () => {
      mockUserService.getUserById.mockResolvedValue(null);

      const result = await avatarService.deleteAvatar(userId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });

    it('should return error if user has no avatar', async () => {
      const user = {
        id: userId,
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        avatar: null
      };

      mockUserService.getUserById.mockResolvedValue(user as any);

      const result = await avatarService.deleteAvatar(userId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User has no avatar to delete');
    });
  });

  describe('avatarExists', () => {
    it('should return true if avatar file exists', async () => {
      mockFs.access.mockResolvedValue(undefined);

      const result = await avatarService.avatarExists('/uploads/avatars/avatar.jpg');

      expect(result).toBe(true);
      expect(mockFs.access).toHaveBeenCalled();
    });

    it('should return false if avatar file does not exist', async () => {
      mockFs.access.mockRejectedValue(new Error('File not found'));

      const result = await avatarService.avatarExists('/uploads/avatars/nonexistent.jpg');

      expect(result).toBe(false);
    });
  });

  describe('cleanupOrphanedAvatars', () => {
    it('should clean up orphaned avatar files', async () => {
      const files = ['avatar1.jpg', 'avatar2.png', 'orphaned.gif'];
      const users = [
        { id: 'user1', avatar: '/uploads/avatars/avatar1.jpg' },
        { id: 'user2', avatar: '/uploads/avatars/avatar2.png' }
      ];

      mockFs.readdir.mockResolvedValue(files as any);
      mockUserService.getAllUsersWithAvatars.mockResolvedValue(users as any);
      mockFs.unlink.mockResolvedValue(undefined);

      await avatarService.cleanupOrphanedAvatars();

      expect(mockFs.unlink).toHaveBeenCalledWith(expect.stringContaining('orphaned.gif'));
      expect(mockFs.unlink).toHaveBeenCalledTimes(1); // Only orphaned file should be deleted
    });

    it('should handle cleanup errors gracefully', async () => {
      mockFs.readdir.mockRejectedValue(new Error('Read directory failed'));

      await expect(avatarService.cleanupOrphanedAvatars()).resolves.not.toThrow();
    });
  });
});