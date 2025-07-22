import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { userService } from './userService.js';

export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

export interface AvatarUploadResult {
  success: boolean;
  avatarUrl?: string;
  error?: string;
}

/**
 * Avatar upload service for handling user profile pictures
 */
class AvatarService {
  private readonly UPLOAD_DIR = 'uploads/avatars';
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp'
  ];
  private readonly ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

  constructor() {
    this.ensureUploadDirectory();
  }

  /**
   * Upload and process user avatar
   */
  async uploadAvatar(userId: string, file: UploadedFile): Promise<AvatarUploadResult> {
    try {
      // Validate file
      const validation = this.validateFile(file);
      if (!validation.isValid) {
        return { success: false, error: validation.error || 'File validation failed' };
      }

      // Check if user exists
      const user = await userService.getUserById(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Generate unique filename
      const filename = this.generateFilename(file.originalname);
      const filepath = path.join(this.UPLOAD_DIR, filename);

      // Save file to disk
      await fs.writeFile(filepath, file.buffer);

      // Generate avatar URL
      const avatarUrl = `/uploads/avatars/${filename}`;

      // Delete old avatar if exists
      if (user.avatar) {
        await this.deleteOldAvatar(user.avatar);
      }

      // Update user's avatar URL in database
      await userService.updateUser(userId, { avatar: avatarUrl });

      return { success: true, avatarUrl };
    } catch (error) {
      console.error('Error uploading avatar:', error);
      return { success: false, error: 'Failed to upload avatar' };
    }
  }

  /**
   * Delete user's avatar
   */
  async deleteAvatar(userId: string): Promise<AvatarUploadResult> {
    try {
      const user = await userService.getUserById(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      if (!user.avatar) {
        return { success: false, error: 'User has no avatar to delete' };
      }

      // Delete file from disk
      await this.deleteOldAvatar(user.avatar);

      // Remove avatar URL from database
      await userService.updateUser(userId, {});

      return { success: true };
    } catch (error) {
      console.error('Error deleting avatar:', error);
      return { success: false, error: 'Failed to delete avatar' };
    }
  }

  /**
   * Get avatar file path from URL
   */
  getAvatarPath(avatarUrl: string): string {
    // Extract filename from URL (e.g., "/uploads/avatars/filename.jpg" -> "filename.jpg")
    const filename = path.basename(avatarUrl);
    return path.join(this.UPLOAD_DIR, filename);
  }

  /**
   * Check if avatar file exists
   */
  async avatarExists(avatarUrl: string): Promise<boolean> {
    try {
      const filepath = this.getAvatarPath(avatarUrl);
      await fs.access(filepath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate uploaded file
   */
  private validateFile(file: UploadedFile): { isValid: boolean; error?: string } {
    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      return { 
        isValid: false, 
        error: `File size too large. Maximum size is ${this.MAX_FILE_SIZE / (1024 * 1024)}MB` 
      };
    }

    // Check MIME type
    if (!this.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return { 
        isValid: false, 
        error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed' 
      };
    }

    // Check file extension
    const ext = path.extname(file.originalname).toLowerCase();
    if (!this.ALLOWED_EXTENSIONS.includes(ext)) {
      return { 
        isValid: false, 
        error: 'Invalid file extension. Only .jpg, .jpeg, .png, .gif, and .webp files are allowed' 
      };
    }

    // Check if file has content
    if (file.size === 0) {
      return { isValid: false, error: 'File is empty' };
    }

    return { isValid: true };
  }

  /**
   * Generate unique filename for uploaded file
   */
  private generateFilename(originalname: string): string {
    const ext = path.extname(originalname).toLowerCase();
    const hash = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now();
    return `${timestamp}-${hash}${ext}`;
  }

  /**
   * Delete old avatar file
   */
  private async deleteOldAvatar(avatarUrl: string): Promise<void> {
    try {
      const filepath = this.getAvatarPath(avatarUrl);
      await fs.unlink(filepath);
    } catch (error) {
      // Log error but don't throw - file might not exist
      console.warn('Could not delete old avatar file:', error);
    }
  }

  /**
   * Ensure upload directory exists
   */
  private async ensureUploadDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.UPLOAD_DIR, { recursive: true });
    } catch (error) {
      console.error('Failed to create upload directory:', error);
    }
  }

  /**
   * Clean up orphaned avatar files (files not referenced by any user)
   */
  async cleanupOrphanedAvatars(): Promise<void> {
    try {
      // Get all avatar files
      const files = await fs.readdir(this.UPLOAD_DIR);
      
      // Get all avatar URLs from database
      const users = await userService.getAllUsersWithAvatars();
      const usedAvatars = new Set(
        users
          .filter(user => user.avatar)
          .map(user => path.basename(user.avatar!))
      );

      // Delete files not referenced by any user
      for (const file of files) {
        if (!usedAvatars.has(file)) {
          const filepath = path.join(this.UPLOAD_DIR, file);
          await fs.unlink(filepath);
          console.log(`Deleted orphaned avatar: ${file}`);
        }
      }
    } catch (error) {
      console.error('Error cleaning up orphaned avatars:', error);
    }
  }
}

// Export singleton instance
export const avatarService = new AvatarService();