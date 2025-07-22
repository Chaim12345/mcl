import { Request, Response, NextFunction } from 'express';
import { refreshAccessToken } from '../services/tokenService.js';
import { extractTokenFromHeader, isTokenExpired } from '../utils/jwt.js';

/**
 * Middleware to automatically refresh access tokens when they are about to expire
 * This middleware should be used after the authenticateToken middleware
 */
export const refreshAuthToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Skip if no user is authenticated or no token is present
    if (!req.user || !req.token) {
      next();
      return;
    }

    // Check if token is about to expire (within 5 minutes)
    const tokenExpirationThreshold = 5 * 60 * 1000; // 5 minutes in milliseconds
    const isExpiringSoon = isTokenExpired(req.token, tokenExpirationThreshold);

    if (!isExpiringSoon) {
      next();
      return;
    }

    // Get refresh token from request
    const refreshToken = req.headers['x-refresh-token'] as string;
    
    if (!refreshToken) {
      // No refresh token provided, continue without refreshing
      next();
      return;
    }

    // Refresh the access token
    const result = await refreshAccessToken(refreshToken);

    // Set the new access token in the response header
    res.setHeader('X-Access-Token', result.accessToken);
    res.setHeader('X-Refresh-Token', result.refreshToken);

    // Update the token in the request for downstream middleware
    req.token = result.accessToken;

    next();
  } catch (error) {
    // If refresh fails, continue without refreshing
    console.warn('Token refresh failed:', error instanceof Error ? error.message : 'Unknown error');
    next();
  }
};

/**
 * Extract refresh token from request
 */
export const extractRefreshToken = (req: Request): string | null => {
  // Try to get from header
  const refreshHeader = req.headers['x-refresh-token'];
  if (refreshHeader && typeof refreshHeader === 'string') {
    return refreshHeader;
  }

  // Try to get from body
  if (req.body && req.body.refreshToken) {
    return req.body.refreshToken;
  }

  // Try to get from cookies if cookie-parser middleware is used
  if (req.cookies && req.cookies.refreshToken) {
    return req.cookies.refreshToken;
  }

  return null;
};