import { Router, Request, Response } from 'express';
import { query } from '../db/client.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateId } from '../utils/id.js';
import { createRefreshToken, revokeRefreshToken, refreshAccessToken } from '../services/tokenService.js';
import { emailService } from '../services/emailService.js';
import { authenticateToken } from '../middleware/auth.js';
import { 
  validate, 
  registerSchema, 
  loginSchema, 
  passwordResetRequestSchema, 
  passwordResetSchema,
  refreshTokenSchema 
} from '../utils/validation.js';
import crypto from 'crypto';

const router = Router();

/**
 * POST /api/auth/register
 * Register a new user account
 */
router.post('/register', validate(registerSchema), async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      res.status(409).json({
        code: 'USER_EXISTS',
        message: 'User already exists'
      });
      return;
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Generate user ID
    const userId = generateId();

    // Create user
    const result = await query(
      `INSERT INTO users (id, email, password, "firstName", "lastName", "isActive", "createdAt", "updatedAt") 
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) 
       RETURNING id, email, "firstName", "lastName", "isActive", "createdAt"`,
      [userId, email.toLowerCase(), hashedPassword, firstName, lastName, true]
    );

    const user = result.rows[0];

    // Generate tokens
    const tokenData = await createRefreshToken(
      { id: user.id, email: user.email },
      {
        userAgent: req.headers['user-agent'] || undefined,
        ipAddress: req.ip || req.socket.remoteAddress || undefined
      }
    );

    // Send welcome email (non-blocking)
    if (emailService.isReady()) {
      emailService.sendWelcomeEmail(user.email, user.firstName)
        .catch(error => console.error('Failed to send welcome email:', error));
    }

    // Log successful registration
    await query(
      'INSERT INTO auth_logs (user_id, action, metadata) VALUES ($1, $2, $3)',
      [
        user.id,
        'USER_REGISTERED',
        JSON.stringify({
          userAgent: req.headers['user-agent'],
          ipAddress: req.ip || req.socket.remoteAddress,
          timestamp: new Date().toISOString()
        })
      ]
    ).catch(error => console.error('Failed to log registration:', error));

    res.status(201).json({
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          avatarUrl: null,
          createdAt: user.createdAt,
          updatedAt: user.createdAt
        },
        token: tokenData.accessToken,
        refreshToken: tokenData.refreshToken
      },
      message: 'User registered successfully'
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      code: 'REGISTRATION_ERROR',
      message: 'Registration failed'
    });
  }
});

/**
 * POST /api/auth/login
 * Authenticate user and return tokens
 */
router.post('/login', validate(loginSchema), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Get user from database
    const result = await query(
      'SELECT id, email, password, "firstName", "lastName", "isActive" FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      res.status(401).json({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid credentials'
      });
      return;
    }

    const user = result.rows[0];

    // Check if user is active
    if (!user.isActive) {
      res.status(403).json({
        code: 'ACCOUNT_INACTIVE',
        message: 'Account is inactive'
      });
      return;
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.password);

    if (!isValidPassword) {
      // Log failed login attempt
      await query(
        'INSERT INTO auth_logs (user_id, action, metadata) VALUES ($1, $2, $3)',
        [
          user.id,
          'LOGIN_FAILED',
          JSON.stringify({
            reason: 'invalid_password',
            userAgent: req.headers['user-agent'],
            ipAddress: req.ip || req.socket.remoteAddress,
            timestamp: new Date().toISOString()
          })
        ]
      ).catch(error => console.error('Failed to log failed login:', error));

      res.status(401).json({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid credentials'
      });
      return;
    }

    // Generate tokens
    const tokenData = await createRefreshToken(
      { id: user.id, email: user.email },
      {
        userAgent: req.headers['user-agent'] || undefined,
        ipAddress: req.ip || req.socket.remoteAddress || undefined
      }
    );

    // Log successful login
    await query(
      'INSERT INTO auth_logs (user_id, action, metadata) VALUES ($1, $2, $3)',
      [
        user.id,
        'LOGIN_SUCCESS',
        JSON.stringify({
          userAgent: req.headers['user-agent'],
          ipAddress: req.ip || req.socket.remoteAddress,
          timestamp: new Date().toISOString()
        })
      ]
    ).catch(error => console.error('Failed to log successful login:', error));

    res.json({
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          avatarUrl: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        token: tokenData.accessToken,
        refreshToken: tokenData.refreshToken
      },
      message: 'Login successful'
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      code: 'LOGIN_ERROR',
      message: 'Login failed'
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout user and invalidate refresh token
 */
router.post('/logout', validate(refreshTokenSchema), async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    // Revoke the refresh token
    const revoked = revokeRefreshToken(refreshToken);

    if (!revoked) {
      res.status(400).json({
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Invalid refresh token'
      });
      return;
    }

    res.json({
      data: {
        success: true
      },
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      code: 'LOGOUT_ERROR',
      message: 'Logout failed'
    });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', validate(refreshTokenSchema), async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    // Refresh the access token
    const result = await refreshAccessToken(refreshToken);

    res.json({
      data: {
        token: result.accessToken,
        refreshToken: result.refreshToken
      },
      message: 'Token refreshed successfully'
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    
    if (error instanceof Error) {
      if (error.message === 'Invalid refresh token' || error.message === 'Refresh token expired') {
        res.status(401).json({
          code: 'INVALID_REFRESH_TOKEN',
          message: error.message
        });
        return;
      }
      
      if (error.message === 'User not found' || error.message === 'User account is inactive') {
        res.status(403).json({
          code: 'USER_INACTIVE',
          message: error.message
        });
        return;
      }
    }

    res.status(500).json({
      code: 'REFRESH_ERROR',
      message: 'Token refresh failed'
    });
  }
});

/**
 * POST /api/auth/forgot-password
 * Request password reset email
 */
router.post('/forgot-password', validate(passwordResetRequestSchema), async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    // Get user from database
    const result = await query(
      'SELECT id, email, "firstName", "isActive" FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    // Always return success to prevent email enumeration attacks
    const successResponse = {
      data: {
        success: true
      },
      message: 'If an account with that email exists, a password reset link has been sent.'
    };

    if (result.rows.length === 0) {
      res.json(successResponse);
      return;
    }

    const user = result.rows[0];

    // Check if user is active
    if (!user.isActive) {
      res.json(successResponse);
      return;
    }

    // Generate reset token (expires in 1 hour)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store reset token in database
    await query(
      'UPDATE users SET "resetToken" = $1, "resetTokenExpiry" = $2 WHERE id = $3',
      [resetToken, resetTokenExpiry, user.id]
    );

    // Send password reset email
    if (emailService.isReady()) {
      const emailSent = await emailService.sendPasswordResetEmail(
        user.email,
        resetToken,
        user.firstName
      );

      if (!emailSent) {
        console.error('Failed to send password reset email to:', user.email);
      }
    } else {
      console.warn('Email service not configured. Password reset email not sent.');
    }

    // Log password reset request
    await query(
      'INSERT INTO auth_logs (user_id, action, metadata) VALUES ($1, $2, $3)',
      [
        user.id,
        'PASSWORD_RESET_REQUESTED',
        JSON.stringify({
          userAgent: req.headers['user-agent'],
          ipAddress: req.ip || req.socket.remoteAddress,
          timestamp: new Date().toISOString()
        })
      ]
    ).catch(error => console.error('Failed to log password reset request:', error));

    res.json(successResponse);

  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({
      code: 'PASSWORD_RESET_REQUEST_ERROR',
      message: 'Password reset request failed'
    });
  }
});

/**
 * POST /api/auth/reset-password
 * Reset password using reset token
 */
router.post('/reset-password', validate(passwordResetSchema), async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;

    // Find user with valid reset token
    const result = await query(
      'SELECT id, email, "firstName", "resetTokenExpiry" FROM users WHERE "resetToken" = $1 AND "resetTokenExpiry" > NOW()',
      [token]
    );

    if (result.rows.length === 0) {
      res.status(400).json({
        code: 'INVALID_RESET_TOKEN',
        message: 'Invalid or expired reset token'
      });
      return;
    }

    const user = result.rows[0];

    // Hash new password
    const hashedPassword = await hashPassword(password);

    // Update password and clear reset token
    await query(
      'UPDATE users SET password = $1, "resetToken" = NULL, "resetTokenExpiry" = NULL, "updatedAt" = NOW() WHERE id = $2',
      [hashedPassword, user.id]
    );

    // Log password reset
    await query(
      'INSERT INTO auth_logs (user_id, action, metadata) VALUES ($1, $2, $3)',
      [
        user.id,
        'PASSWORD_RESET_COMPLETED',
        JSON.stringify({
          userAgent: req.headers['user-agent'],
          ipAddress: req.ip || req.socket.remoteAddress,
          timestamp: new Date().toISOString()
        })
      ]
    ).catch(error => console.error('Failed to log password reset:', error));

    res.json({
      data: {
        success: true
      },
      message: 'Password reset successful'
    });

  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      code: 'PASSWORD_RESET_ERROR',
      message: 'Password reset failed'
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user information
 */
router.get('/me', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        code: 'USER_NOT_FOUND',
        message: 'User not found'
      });
      return;
    }

    res.json({
      data: {
        id: req.user.id,
        email: req.user.email,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        avatarUrl: req.user.avatarUrl || null,
        createdAt: req.user.createdAt,
        updatedAt: req.user.updatedAt
      },
      message: 'User retrieved successfully'
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      code: 'GET_USER_ERROR',
      message: 'Failed to get current user'
    });
  }
});

export default router;