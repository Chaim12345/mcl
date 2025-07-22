import { prisma } from '../db/prisma.js';
import { emailService } from './emailService.js';
import { generateId } from '../utils/id.js';
import crypto from 'crypto';

export interface EmailVerificationToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

/**
 * Email verification service for handling email verification tokens and processes
 */
class EmailVerificationService {
  private readonly TOKEN_EXPIRY_HOURS = 24; // 24 hours

  /**
   * Generate and send email verification token
   */
  async sendVerificationEmail(userId: string, email: string, firstName: string): Promise<void> {
    // Generate secure verification token
    const token = this.generateVerificationToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.TOKEN_EXPIRY_HOURS);

    // Store token in database (using raw SQL since we don't have a Prisma model for this)
    await prisma.$executeRaw`
      INSERT INTO email_verification_tokens (id, user_id, token, expires_at, created_at)
      VALUES (${generateId()}, ${userId}, ${token}, ${expiresAt}, ${new Date()})
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        token = EXCLUDED.token,
        expires_at = EXCLUDED.expires_at,
        created_at = EXCLUDED.created_at
    `;

    // Send verification email
    await this.sendVerificationEmailWithToken(email, firstName, token);
  }

  /**
   * Verify email verification token
   */
  async verifyEmailToken(token: string): Promise<{ success: boolean; userId?: string; error?: string }> {
    try {
      // Find token in database
      const result = await prisma.$queryRaw<Array<{ user_id: string; expires_at: Date }>>`
        SELECT user_id, expires_at 
        FROM email_verification_tokens 
        WHERE token = ${token}
        LIMIT 1
      `;

      if (result.length === 0) {
        return { success: false, error: 'Invalid verification token' };
      }

      const tokenData = result[0]!; // We know it exists because we checked result.length

      // Check if token has expired
      if (new Date() > tokenData.expires_at) {
        // Clean up expired token
        await this.deleteVerificationToken(token);
        return { success: false, error: 'Verification token has expired' };
      }

      // Mark user as verified (assuming we add an emailVerified field)
      await prisma.user.update({
        where: { id: tokenData.user_id },
        data: { 
          // Note: We would need to add emailVerified field to the User model
          // For now, we'll just update the updatedAt field
          updatedAt: new Date()
        },
      });

      // Clean up used token
      await this.deleteVerificationToken(token);

      return { success: true, userId: tokenData.user_id };
    } catch (error) {
      console.error('Error verifying email token:', error);
      return { success: false, error: 'Failed to verify email token' };
    }
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    await this.sendVerificationEmail(userId, user.email, user.firstName || 'User');
  }

  /**
   * Check if user has pending verification
   */
  async hasPendingVerification(userId: string): Promise<boolean> {
    const result = await prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*) as count
      FROM email_verification_tokens 
      WHERE user_id = ${userId} AND expires_at > ${new Date()}
    `;

    return (result[0]?.count ?? 0) > 0;
  }

  /**
   * Clean up expired verification tokens
   */
  async cleanupExpiredTokens(): Promise<void> {
    await prisma.$executeRaw`
      DELETE FROM email_verification_tokens 
      WHERE expires_at < ${new Date()}
    `;
  }

  /**
   * Generate a secure verification token
   */
  private generateVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Delete verification token
   */
  private async deleteVerificationToken(token: string): Promise<void> {
    await prisma.$executeRaw`
      DELETE FROM email_verification_tokens 
      WHERE token = ${token}
    `;
  }

  /**
   * Send verification email with token
   */
  private async sendVerificationEmailWithToken(
    email: string, 
    firstName: string, 
    token: string
  ): Promise<void> {
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #6366f1; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
            .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Verify Your Email Address</h1>
            </div>
            <div class="content">
              <p>Hi ${firstName},</p>
              
              <p>Thank you for signing up for Project Management Platform! To complete your registration, please verify your email address.</p>
              
              <p>Click the button below to verify your email:</p>
              
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
              
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; background: #e5e7eb; padding: 10px; border-radius: 4px;">${verificationUrl}</p>
              
              <div class="warning">
                <strong>Important:</strong> This verification link will expire in 24 hours.
              </div>
              
              <p>If you didn't create an account with us, you can safely ignore this email.</p>
              
              <p>Best regards,<br>The Project Management Platform Team</p>
            </div>
            <div class="footer">
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      Hi ${firstName},

      Thank you for signing up for Project Management Platform! To complete your registration, please verify your email address.

      Please visit the following link to verify your email:
      ${verificationUrl}

      This verification link will expire in 24 hours.

      If you didn't create an account with us, you can safely ignore this email.

      Best regards,
      The Project Management Platform Team
    `;

    const success = await emailService.sendEmail({
      to: email,
      subject: 'Verify Your Email - Project Management Platform',
      html,
      text,
    });

    if (!success) {
      throw new Error('Failed to send verification email');
    }
  }
}

// Export singleton instance
export const emailVerificationService = new EmailVerificationService();