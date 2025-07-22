import { prisma } from '../db/prisma.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { emailService } from './emailService.js';
import { generateId } from '../utils/id.js';
import { User } from '../models/types.js';

export interface CreateUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  avatar?: string;
}

export interface UserWithoutPassword extends Omit<User, 'password'> {}

/**
 * User management service for handling user operations
 */
class UserService {
  /**
   * Create a new user account
   */
  async createUser(userData: CreateUserData): Promise<UserWithoutPassword> {
    const { email, password, firstName, lastName } = userData;

    // Check if user already exists
    const existingUser = await this.findUserByEmail(email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash the password
    const hashedPassword = await hashPassword(password);

    // Create the user
    const user = await prisma.user.create({
      data: {
        id: generateId(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        isActive: true,
      },
    });

    // Send welcome email (non-blocking)
    this.sendWelcomeEmailAsync(email, firstName).catch(error => {
      console.error('Failed to send welcome email:', error);
    });

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Find user by email
   */
  async findUserByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: {
        email: email.toLowerCase().trim(),
      },
    });
  }

  /**
   * Find user by ID
   */
  async findUserById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: {
        id,
      },
    });
  }

  /**
   * Get user by ID without password
   */
  async getUserById(id: string): Promise<UserWithoutPassword | null> {
    const user = await prisma.user.findUnique({
      where: {
        id,
      },
    });

    if (!user) {
      return null;
    }

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Update user profile
   */
  async updateUser(id: string, updateData: UpdateUserData): Promise<UserWithoutPassword> {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const updateFields: any = {
      updatedAt: new Date(),
    };
    
    if (updateData.firstName !== undefined) {
      updateFields.firstName = updateData.firstName.trim();
    }
    
    if (updateData.lastName !== undefined) {
      updateFields.lastName = updateData.lastName.trim();
    }
    
    if (updateData.avatar !== undefined) {
      updateFields.avatar = updateData.avatar;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateFields,
    });

    const { password: _, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  /**
   * Update user's last login timestamp
   */
  async updateLastLogin(id: string): Promise<void> {
    await prisma.user.update({
      where: { id },
      data: {
        lastLogin: new Date(),
      },
    });
  }

  /**
   * Deactivate user account
   */
  async deactivateUser(id: string): Promise<UserWithoutPassword> {
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    const { password: _, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  /**
   * Activate user account
   */
  async activateUser(id: string): Promise<UserWithoutPassword> {
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        isActive: true,
        updatedAt: new Date(),
      },
    });

    const { password: _, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  /**
   * Change user password
   */
  async changePassword(id: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.findUserById(id);
    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await comparePassword(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const hashedNewPassword = await hashPassword(newPassword);

    // Update password
    await prisma.user.update({
      where: { id },
      data: {
        password: hashedNewPassword,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Validate user credentials
   */
  async validateCredentials(email: string, password: string): Promise<User | null> {
    const user = await this.findUserByEmail(email);
    if (!user || !user.isActive) {
      return null;
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  /**
   * Check if user exists and is active
   */
  async isUserActive(id: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { isActive: true },
    });

    return user?.isActive ?? false;
  }

  /**
   * Get user's full name
   */
  getUserFullName(user: UserWithoutPassword): string {
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    return `${firstName} ${lastName}`.trim() || user.email;
  }

  /**
   * Get all users with avatars (for cleanup purposes)
   */
  async getAllUsersWithAvatars(): Promise<Array<{ id: string; avatar: string | null }>> {
    return prisma.user.findMany({
      select: {
        id: true,
        avatar: true,
      },
      where: {
        avatar: {
          not: null,
        },
      },
    });
  }

  /**
   * Send welcome email asynchronously
   */
  private async sendWelcomeEmailAsync(email: string, firstName: string): Promise<void> {
    try {
      await emailService.sendWelcomeEmail(email, firstName);
    } catch (error) {
      console.error('Failed to send welcome email:', error);
    }
  }
}

// Export singleton instance
export const userService = new UserService();