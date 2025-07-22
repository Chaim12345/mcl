import { 
  generateTokenPair, 
  verifyRefreshToken, 
  generateAccessToken,
  generateRefreshToken,
  isTokenExpired
} from '../utils/jwt.js';
import { query } from '../db/client.js';
import { User } from '../models/types.js';

// In-memory store for refresh tokens with user mapping
// In production, use Redis with appropriate expiration
interface TokenRecord {
  token: string;
  userId: string;
  issuedAt: Date;
  expiresAt: Date;
  userAgent?: string | undefined;
  ipAddress?: string | undefined;
}

const refreshTokenStore = new Map<string, TokenRecord>();

export interface RefreshTokenResult {
  accessToken: string;
  refreshToken: string;
  user: Pick<User, 'id' | 'email' | 'firstName' | 'lastName'>;
}

export interface TokenMetadata {
  userAgent?: string | undefined;
  ipAddress?: string | undefined;
}

/**
 * Create and store refresh token for user
 */
export const createRefreshToken = async (
  user: Pick<User, 'id' | 'email'>, 
  metadata?: TokenMetadata
): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}> => {
  // Generate token pair
  const tokens = generateTokenPair(user);
  
  // Calculate expiration (30 days from now)
  const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '30d';
  const expiresInMs = expiresIn.endsWith('d') 
    ? parseInt(expiresIn.slice(0, -1)) * 24 * 60 * 60 * 1000
    : 30 * 24 * 60 * 60 * 1000; // Default to 30 days
  
  const expiresAt = new Date(Date.now() + expiresInMs);
  
  // Store refresh token with metadata
  refreshTokenStore.set(tokens.refreshToken, {
    token: tokens.refreshToken,
    userId: user.id,
    issuedAt: new Date(),
    expiresAt,
    userAgent: metadata?.userAgent || undefined,
    ipAddress: metadata?.ipAddress || undefined
  });
  
  // Log token creation in database for audit purposes
  try {
    await query(
      'INSERT INTO auth_logs (user_id, action, metadata) VALUES ($1, $2, $3)',
      [
        user.id, 
        'TOKEN_CREATED', 
        JSON.stringify({
          tokenType: 'refresh',
          userAgent: metadata?.userAgent,
          ipAddress: metadata?.ipAddress,
          issuedAt: new Date().toISOString(),
          expiresAt: expiresAt.toISOString()
        })
      ]
    );
  } catch (error) {
    console.error('Failed to log token creation:', error);
    // Non-critical error, continue without failing
  }
  
  return {
    ...tokens,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  };
};

/**
 * Refresh access token using refresh token
 */
export const refreshAccessToken = async (refreshToken: string): Promise<RefreshTokenResult> => {
  // Check if refresh token exists in store
  const tokenRecord = refreshTokenStore.get(refreshToken);
  
  if (!tokenRecord) {
    throw new Error('Invalid refresh token');
  }

  try {
    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    
    // Check if token is expired based on our records
    if (tokenRecord.expiresAt < new Date()) {
      refreshTokenStore.delete(refreshToken);
      throw new Error('Refresh token expired');
    }
    
    // Get user from database to ensure they still exist and is active
    const result = await query(
      'SELECT id, email, "firstName", "lastName", "isActive" FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      // Remove invalid refresh token
      refreshTokenStore.delete(refreshToken);
      throw new Error('User not found');
    }
    
    const user = result.rows[0];
    
    // Check if user is active
    if (!user.isActive) {
      refreshTokenStore.delete(refreshToken);
      throw new Error('User account is inactive');
    }

    // Generate new access token
    const newAccessToken = generateAccessToken(user);
    
    // Optionally rotate refresh token for enhanced security
    // This is a security best practice but requires more client-side handling
    if (process.env.ROTATE_REFRESH_TOKENS === 'true') {
      // Remove old refresh token
      refreshTokenStore.delete(refreshToken);
      
      // Generate new refresh token
      const newRefreshToken = generateRefreshToken(user);
      
      // Store new refresh token
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      
      refreshTokenStore.set(newRefreshToken, {
        ...tokenRecord,
        token: newRefreshToken,
        issuedAt: new Date(),
        expiresAt
      });
      
      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        user,
      };
    }
    
    return {
      accessToken: newAccessToken,
      refreshToken, // Keep the same refresh token
      user,
    };
  } catch (error) {
    // Remove invalid refresh token
    refreshTokenStore.delete(refreshToken);
    throw error;
  }
};

/**
 * Revoke refresh token (logout)
 */
export const revokeRefreshToken = (refreshToken: string): boolean => {
  const tokenRecord = refreshTokenStore.get(refreshToken);
  
  if (tokenRecord) {
    // Log token revocation for audit purposes
    try {
      query(
        'INSERT INTO auth_logs (user_id, action, metadata) VALUES ($1, $2, $3)',
        [
          tokenRecord.userId, 
          'TOKEN_REVOKED', 
          JSON.stringify({
            tokenType: 'refresh',
            revokedAt: new Date().toISOString(),
            userAgent: tokenRecord.userAgent,
            ipAddress: tokenRecord.ipAddress
          })
        ]
      ).catch(err => console.error('Failed to log token revocation:', err));
    } catch (error) {
      console.error('Failed to log token revocation:', error);
      // Non-critical error, continue without failing
    }
  }
  
  return refreshTokenStore.delete(refreshToken);
};

/**
 * Revoke all refresh tokens for a user
 */
export const revokeAllUserTokens = async (userId: string): Promise<number> => {
  let revokedCount = 0;
  
  // Find all tokens for this user
  const tokensToRevoke: string[] = [];
  
  refreshTokenStore.forEach((record, token) => {
    if (record.userId === userId) {
      tokensToRevoke.push(token);
    }
  });
  
  // Log mass token revocation
  try {
    await query(
      'INSERT INTO auth_logs (user_id, action, metadata) VALUES ($1, $2, $3)',
      [
        userId, 
        'ALL_TOKENS_REVOKED', 
        JSON.stringify({
          count: tokensToRevoke.length,
          revokedAt: new Date().toISOString()
        })
      ]
    );
  } catch (error) {
    console.error('Failed to log mass token revocation:', error);
    // Non-critical error, continue without failing
  }
  
  // Revoke all tokens
  tokensToRevoke.forEach(token => {
    if (refreshTokenStore.delete(token)) {
      revokedCount++;
    }
  });
  
  return revokedCount;
};

/**
 * Clean up expired refresh tokens
 */
export const cleanupExpiredTokens = (): number => {
  let cleanedCount = 0;
  const now = new Date();
  
  refreshTokenStore.forEach((record, token) => {
    if (record.expiresAt < now || isTokenExpired(token)) {
      refreshTokenStore.delete(token);
      cleanedCount++;
    }
  });
  
  return cleanedCount;
};

/**
 * Get active sessions for a user
 */
export const getUserActiveSessions = async (userId: string): Promise<TokenRecord[]> => {
  const sessions: TokenRecord[] = [];
  
  refreshTokenStore.forEach(record => {
    if (record.userId === userId) {
      // Don't include the actual token in the response for security
      const { token, ...sessionInfo } = record;
      sessions.push(sessionInfo as TokenRecord);
    }
  });
  
  return sessions;
};

/**
 * Get refresh token statistics
 */
export const getTokenStats = () => {
  // Count tokens by user
  const userTokenCounts = new Map<string, number>();
  
  refreshTokenStore.forEach(record => {
    const currentCount = userTokenCounts.get(record.userId) || 0;
    userTokenCounts.set(record.userId, currentCount + 1);
  });
  
  // Find users with most tokens
  const topUsers: {userId: string, count: number}[] = [];
  userTokenCounts.forEach((count, userId) => {
    topUsers.push({ userId, count });
  });
  
  topUsers.sort((a, b) => b.count - a.count);
  
  return {
    totalRefreshTokens: refreshTokenStore.size,
    uniqueUsers: userTokenCounts.size,
    topUsers: topUsers.slice(0, 5),
    timestamp: new Date().toISOString(),
  };
};