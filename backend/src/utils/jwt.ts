import jwt from 'jsonwebtoken';
import { User } from '../models/types.js';

export interface JWTPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Generate JWT access token
 */
export const generateAccessToken = (user: Pick<User, 'id' | 'email'>): string => {
  const jwtSecret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }

  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
  };

  return jwt.sign(payload, jwtSecret, { 
    expiresIn,
    issuer: 'project-management-platform',
    audience: 'project-management-users'
  } as jwt.SignOptions);
};

/**
 * Generate JWT refresh token (longer expiration)
 */
export const generateRefreshToken = (user: Pick<User, 'id' | 'email'>): string => {
  const jwtSecret = process.env.JWT_SECRET;
  
  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }

  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
  };

  return jwt.sign(payload, jwtSecret, { 
    expiresIn: '30d', // Refresh tokens last longer
    issuer: 'project-management-platform',
    audience: 'project-management-refresh'
  } as jwt.SignOptions);
};

/**
 * Generate both access and refresh tokens
 */
export const generateTokenPair = (user: Pick<User, 'id' | 'email'>): TokenPair => {
  return {
    accessToken: generateAccessToken(user),
    refreshToken: generateRefreshToken(user),
  };
};

/**
 * Verify JWT token and return payload
 */
export const verifyToken = (token: string): JWTPayload => {
  const jwtSecret = process.env.JWT_SECRET;
  
  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    }
    throw error;
  }
};

/**
 * Verify refresh token specifically
 */
export const verifyRefreshToken = (token: string): JWTPayload => {
  const jwtSecret = process.env.JWT_SECRET;
  
  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }

  try {
    const decoded = jwt.verify(token, jwtSecret, {
      audience: 'project-management-refresh'
    }) as JWTPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid refresh token');
    }
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Refresh token expired');
    }
    throw error;
  }
};

/**
 * Extract token from Authorization header
 */
export const extractTokenFromHeader = (authHeader: string | undefined): string | null => {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1] || null;
};

/**
 * Get token expiration time
 */
export const getTokenExpiration = (token: string): Date | null => {
  try {
    const decoded = jwt.decode(token) as JWTPayload;
    if (!decoded || !decoded.exp) {
      return null;
    }
    return new Date(decoded.exp * 1000);
  } catch {
    return null;
  }
};

/**
 * Check if token is expired
 * @param token JWT token to check
 * @param thresholdMs Optional threshold in milliseconds to consider a token as expired before its actual expiration
 */
export const isTokenExpired = (token: string, thresholdMs?: number): boolean => {
  const expiration = getTokenExpiration(token);
  if (!expiration) {
    return true;
  }
  
  if (thresholdMs) {
    // Check if token will expire within the threshold
    const thresholdDate = new Date(Date.now() + thresholdMs);
    return expiration < thresholdDate;
  }
  
  return expiration < new Date();
};